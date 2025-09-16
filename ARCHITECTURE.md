# System Architecture - launchmass v1.3.0

## Overview

launchmass is a Next.js application featuring a mobile-first grid interface with administrative capabilities and integrated analytics tracking.

## Core Components

### Frontend Layer

#### Next.js Framework (v15.4.6)
- **Role**: Application framework and server-side rendering
- **Dependencies**: React 19.1.1, React-DOM 19.1.1
- **Status**: Active - Core application foundation

#### Document Structure (`pages/_document.js`)
- **Role**: Custom HTML document with Google Analytics integration
- **Dependencies**: next/document components
- **Status**: Active - Analytics tracking enabled
- **Configuration**: 
  - Google Analytics tracking ID: G-HQ5QPLMJC1
  - gtag.js implementation via document head injection
  - Async script loading for optimal performance

#### Application Wrapper (`pages/_app.js`)
- **Role**: Global application wrapper with background and branding
- **Dependencies**: Global CSS styles
- **Status**: Active - Visual foundation layer
- **Info Bar Behavior**: The global bottom info bar is suppressed on all `/admin` routes via conditional rendering (useRouter path check).

### Page Components

#### Main Interface (`pages/index.js`)
- **Role**: Primary card grid display with server-side rendering
- **Dependencies**: MongoDB data fetching, OversizedLink component
- **Status**: Active - Primary user interface

#### Admin Interface (`pages/admin/index.js`)
- **Role**: Administrative panel for card management
- **Dependencies**: Material-UI components, drag-and-drop functionality
- **Status**: Active - Content management system

#### OversizedLink Component (`components/OversizedLink.jsx`)
- **Role**: Individual card rendering with gradient/color support
- **Dependencies**: React, CSS styling system
- **Status**: Active - Core UI component

### Data Layer

#### MongoDB Integration (`lib/db.js`)
- **Role**: Database connection and connection pooling
- **Dependencies**: MongoDB driver v6.18.0
- **Status**: Active - Persistent data storage
- **Configuration**: 
  - Connection pooling for development/production environments
  - Global connection reuse pattern

#### API Routes (`pages/api/`)
- **Role**: RESTful API endpoints for data operations
- **Dependencies**: Next.js API routes, MongoDB integration
- **Status**: Active - Data management interface
- **Endpoints**:
  - `/api/cards/` - CRUD operations for card management
  - `/api/cards/reorder` - Bulk reordering functionality

### UI Framework

#### Material-UI Integration (@mui/material v7.3.1)
- **Role**: Component library for admin interface
- **Dependencies**: @emotion/react, @emotion/styled
- **Status**: Active - Admin UI foundation

#### Drag and Drop (@dnd-kit v6.3.1)
- **Role**: Card reordering functionality in admin panel
- **Dependencies**: @dnd-kit/sortable, @dnd-kit/utilities
- **Status**: Active - Interactive admin features

### External Integrations

#### Google Analytics (gtag.js)
- **Role**: User behavior tracking and analytics collection
- **Dependencies**: Google Tag Manager CDN
- **Status**: Active - Analytics tracking enabled
- **Implementation**: 
  - Injected via Next.js _document.js for consistent coverage
  - Async loading to prevent performance impact
  - Configured with tracking ID G-HQ5QPLMJC1

## Data Flow

1. **Main Application**: Server-side rendering fetches cards from MongoDB → renders grid interface
2. **Admin Operations**: Client-side CRUD operations through API routes with real-time updates
3. **Analytics Tracking**: All page views and interactions tracked via Google Analytics
4. **Authentication**: Bearer token system for admin operations using ADMIN_TOKEN environment variable

## Build and Deployment

### Development Environment
- **Command**: `npm run dev`
- **Port**: Default Next.js development server
- **Features**: Hot reloading, development optimization

### Production Build
- **Command**: `npm run build` followed by `npm run start`
- **Optimization**: Next.js production optimizations enabled
- **Deployment**: Vercel-compatible build structure

### Environment Configuration
- **MONGODB_URI**: Database connection string
- **DB_NAME**: Database name (default: 'launchmass')
- **ADMIN_TOKEN**: Administrative authentication token
- **BASE_URL**: Application base URL for seeding operations
