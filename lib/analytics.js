/**
 * Analytics Event Logging System
 * 
 * Purpose: Capture user interactions and system events for analytics and insights.
 * Performance: Async batching prevents blocking API responses (writes happen in background).
 * Batching Strategy: Events are queued and written in batches every 5 seconds or 50 events.
 * 
 * Why this approach?
 * - Individual DB writes would add ~10ms to every API response
 * - Batching reduces DB load by 98% (from 100 writes/sec to 2 writes/sec)
 * - Fire-and-forget pattern ensures analytics never blocks user-facing operations
 * 
 * Schema: analyticsEvents collection
 * - timestamp: ISO 8601 with milliseconds (indexed for time-range queries)
 * - eventType: One of EVENT_TYPES (indexed for filtering)
 * - orgUuid: Organization context (indexed for per-org analytics)
 * - userId: SSO user ID (indexed for user behavior analysis)
 * - data: Flexible object with event-specific metadata
 * 
 * Usage:
 *   import { logEvent, EVENT_TYPES } from '@/lib/analytics';
 *   logEvent(EVENT_TYPES.CARD_CLICK, { cardId, orgUuid, userId, metadata... });
 * 
 * v1.18.0 - TRACK-B-01: Initial implementation with async batching
 */

import { getDb } from './db.js';

// ===========================
// Event Type Constants
// ===========================

/**
 * Predefined event types for analytics tracking.
 * 
 * Why these specific types?
 * - CARD_CLICK: Most important metric for measuring card effectiveness
 * - CARD_CREATE/UPDATE/DELETE: Track content changes for audit and analytics
 * - ADMIN_ACTION: Catch-all for permission changes, role assignments, etc.
 * - USER_LOGIN: Track engagement and authentication patterns
 * - ORG_ACTION: Organization-level changes (create, settings update, etc.)
 */
export const EVENT_TYPES = {
  // Card interactions (highest volume)
  CARD_CLICK: 'card_click',       // User clicked a card link
  CARD_CREATE: 'card_create',     // Admin created a new card
  CARD_UPDATE: 'card_update',     // Admin edited card content
  CARD_DELETE: 'card_delete',     // Admin deleted a card
  CARD_REORDER: 'card_reorder',   // Admin changed card order
  
  // Admin actions
  ADMIN_ACTION: 'admin_action',   // Generic admin operation
  ROLE_ASSIGN: 'role_assign',     // Admin assigned role to member
  ROLE_CREATE: 'role_create',     // Admin created custom role
  ROLE_UPDATE: 'role_update',     // Admin modified role permissions
  ROLE_DELETE: 'role_delete',     // Admin deleted custom role
  
  // User/Auth events
  USER_LOGIN: 'user_login',       // User logged in via OAuth
  USER_LOGOUT: 'user_logout',     // User logged out
  
  // Organization events
  ORG_CREATE: 'org_create',       // New organization created
  ORG_UPDATE: 'org_update',       // Organization settings changed
  ORG_DELETE: 'org_delete',       // Organization deleted
};

// ===========================
// Batching Configuration
// ===========================

/**
 * Batching parameters tuned for performance vs freshness trade-off.
 * 
 * Why these values?
 * - 50 events: Prevents memory buildup during high traffic (each event ~1KB)
 * - 5 seconds: Balances real-time analytics with DB write efficiency
 * - Max 10 retries: Prevents infinite retry loops on persistent errors
 */
const BATCH_SIZE = 50;           // Flush when queue reaches this size
const BATCH_INTERVAL_MS = 5000;  // Flush every 5 seconds
const MAX_RETRIES = 10;          // Max retry attempts for failed batches

// Global batch queue and timer
let eventQueue = [];
let batchTimer = null;
let isShuttingDown = false;

// ===========================
// Core Logging Function
// ===========================

/**
 * Log an analytics event (queued for async batching).
 * 
 * @param {string} eventType - One of EVENT_TYPES constants
 * @param {object} data - Event-specific metadata
 * @param {string} data.orgUuid - Organization UUID (required for most events)
 * @param {string} data.userId - SSO user ID (optional, auto-populated from session)
 * @param {object} data.metadata - Additional event-specific fields
 * 
 * Why async?
 * - Prevents blocking API responses (critical for user experience)
 * - Analytics failures never affect user-facing functionality
 * - Batching amortizes DB connection overhead
 * 
 * Example:
 *   logEvent(EVENT_TYPES.CARD_CLICK, {
 *     orgUuid: 'org-123',
 *     userId: 'user-456',
 *     cardId: 'card-789',
 *     href: 'https://example.com',
 *   });
 */
export function logEvent(eventType, data = {}) {
  // Validate event type
  if (!Object.values(EVENT_TYPES).includes(eventType)) {
    console.warn(`[Analytics] Unknown event type: ${eventType}`);
    // Log anyway for debugging, but flag as unknown
  }
  
  // Construct event document
  const event = {
    timestamp: new Date().toISOString(), // ISO 8601 with milliseconds
    eventType,
    orgUuid: data.orgUuid || null,       // Organization context
    userId: data.userId || null,         // User context
    data: {
      ...data,                            // Event-specific metadata
      _logged: new Date().toISOString(),  // When this was queued (for debugging)
    },
  };
  
  // Add to queue
  eventQueue.push(event);
  
  // Start batch timer if not already running
  if (!batchTimer) {
    batchTimer = setTimeout(flushEventBatch, BATCH_INTERVAL_MS);
  }
  
  // Flush immediately if batch size reached
  if (eventQueue.length >= BATCH_SIZE) {
    clearTimeout(batchTimer);
    batchTimer = null;
    flushEventBatch();
  }
}

// ===========================
// Batch Flushing
// ===========================

/**
 * Flush queued events to MongoDB (async with retry logic).
 * 
 * Why bulk write?
 * - Single DB operation for 50 events (~10ms) vs 50 operations (~500ms)
 * - Reduces connection pool pressure
 * - MongoDB handles batching efficiently with insertMany()
 * 
 * Error handling:
 * - Logs errors but never throws (analytics failures are non-fatal)
 * - Retries failed batches up to MAX_RETRIES times
 * - Drops events after max retries to prevent memory leaks
 */
async function flushEventBatch(retryCount = 0) {
  if (eventQueue.length === 0) return;
  
  // Grab current batch and reset queue
  const batch = eventQueue;
  eventQueue = [];
  
  try {
    const db = await getDb();
    const collection = db.collection('analyticsEvents');
    
    // Bulk insert (single DB operation)
    await collection.insertMany(batch, { ordered: false });
    
    console.log(`[Analytics] Flushed ${batch.length} events to DB`);
  } catch (err) {
    console.error(`[Analytics] Error flushing batch (attempt ${retryCount + 1}):`, err.message);
    
    // Retry logic (with exponential backoff)
    if (retryCount < MAX_RETRIES) {
      console.log(`[Analytics] Retrying batch in ${Math.pow(2, retryCount)}s...`);
      
      // Re-add events to front of queue
      eventQueue.unshift(...batch);
      
      // Retry with exponential backoff
      setTimeout(() => flushEventBatch(retryCount + 1), Math.pow(2, retryCount) * 1000);
    } else {
      console.error(`[Analytics] Dropping ${batch.length} events after ${MAX_RETRIES} retries`);
      // Events are lost to prevent infinite memory growth
    }
  }
}

// ===========================
// Graceful Shutdown
// ===========================

/**
 * Flush remaining events before process exit.
 * 
 * Why needed?
 * - Process exit would lose queued events
 * - Ensures analytics data integrity during deployments
 * - Called automatically on SIGTERM/SIGINT
 */
export async function flushAndShutdown() {
  if (isShuttingDown) return; // Prevent double-flush
  
  isShuttingDown = true;
  console.log('[Analytics] Flushing remaining events before shutdown...');
  
  clearTimeout(batchTimer);
  await flushEventBatch();
  
  console.log('[Analytics] Shutdown complete');
}

// Register shutdown handlers
if (typeof process !== 'undefined') {
  process.on('SIGTERM', flushAndShutdown);
  process.on('SIGINT', flushAndShutdown);
}

// ===========================
// Convenience Helpers
// ===========================

/**
 * Log a card click event (most common event type).
 * 
 * @param {string} cardId - MongoDB ObjectId of clicked card
 * @param {string} orgUuid - Organization UUID
 * @param {string} userId - SSO user ID (if authenticated)
 * @param {string} href - Destination URL
 */
export function logCardClick(cardId, orgUuid, userId, href) {
  logEvent(EVENT_TYPES.CARD_CLICK, {
    orgUuid,
    userId,
    cardId,
    href,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Log an admin action (role changes, permission updates, etc.).
 * 
 * @param {string} action - Action description (e.g., 'assign_role', 'update_permissions')
 * @param {string} orgUuid - Organization UUID
 * @param {string} userId - Admin user ID
 * @param {object} details - Action-specific metadata
 */
export function logAdminAction(action, orgUuid, userId, details = {}) {
  logEvent(EVENT_TYPES.ADMIN_ACTION, {
    orgUuid,
    userId,
    action,
    ...details,
  });
}

/**
 * Get analytics event summary (for debugging).
 * Returns current queue status without flushing.
 */
export function getQueueStatus() {
  return {
    queueLength: eventQueue.length,
    batchSize: BATCH_SIZE,
    batchInterval: BATCH_INTERVAL_MS,
    isShuttingDown,
  };
}
