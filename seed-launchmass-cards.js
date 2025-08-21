#!/usr/bin/env node

/**
 * LAUNCHMASS Database Seeding Script
 * Seeds the database with extracted URLs and titles from the provided HTML
 */

import { MongoClient } from 'mongodb';

const LAUNCHMASS_URI = "mongodb+srv://moldovancsaba:gbR86EK0bxumEpxq@mosaic-cluster.nm3s5dj.mongodb.net/?retryWrites=true&w=majority&appName=mosaic-cluster";
const LAUNCHMASS_DB = "launchmass";

// Extracted cards from the provided HTML
const cards = [
  {
    href: "https://api.togetherforvictory.com/backend",
    title: "Backend live",
    description: "SEYU Backend Dashboard and event management for administrators and success managers",
    background: "linear-gradient(90deg, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%)",
    order: 0
  },
  {
    href: "https://api.togetherforvictory.com/backend-fanxp",
    title: "Backend MLSZ FanXP",
    description: "MLSZ FanXP Backend Dashboard and event management for administrators and success managers",
    background: "linear-gradient(270deg, rgba(59, 0, 0, 1) 0%, rgba(128, 0, 0, 1) 35%, rgba(255, 0, 0, 1) 100%)",
    order: 1
  },
  {
    href: "https://api-dev.togetherforvictory.com/backend",
    title: "Backend DEV",
    description: "DEV Backend Dashboard and event management for administrators and success managers",
    background: "#3b3b3b",
    order: 2
  },
  {
    href: "https://api.togetherforvictory.com/credit-system",
    title: "Kredit rendszer",
    description: "SEYU Credit System and Dashboard",
    background: "linear-gradient(135deg, rgba(255, 215, 0, 1) 0%, rgba(255, 140, 0, 1) 100%)",
    order: 3
  },
  {
    href: "https://jira.seyu.hu",
    title: "JIRA",
    description: "Project management and issue tracking system",
    background: "#0052CC",
    order: 4
  },
  {
    href: "http://report.seyu.hu/jasperserver",
    title: "Report server",
    description: "Reporting and analytics dashboard",
    background: "linear-gradient(45deg, rgba(108, 117, 125, 1) 0%, rgba(73, 80, 87, 1) 100%)",
    order: 5
  },
  {
    href: "https://ai.seyu.hu/",
    title: "AI",
    description: "AI services and tools",
    background: "linear-gradient(135deg, rgba(138, 43, 226, 1) 0%, rgba(30, 144, 255, 1) 100%)",
    order: 6
  },
  {
    href: "https://api.togetherforvictory.com/backend/events",
    title: "Live events",
    description: "Real-time event management and monitoring",
    background: "linear-gradient(45deg, rgba(220, 20, 60, 1) 0%, rgba(255, 69, 0, 1) 100%)",
    order: 7
  },
  {
    href: "https://app-fanxp.togetherforvictory.com",
    title: "FanXP app",
    description: "MLSZ Official Fan Engagement application",
    background: "linear-gradient(270deg, rgba(59, 0, 0, 1) 0%, rgba(128, 0, 0, 1) 35%, rgba(255, 0, 0, 1) 100%)",
    order: 8
  },
  {
    href: "https://app.togetherforvictory.com",
    title: "Seyu App",
    description: "SEYU Official Fan Engagement Selfie App",
    background: "linear-gradient(139deg, rgba(131, 58, 180, 1) 0%, rgba(0, 132, 255, 1) 100%)",
    order: 9
  },
  {
    href: "https://speedtest.seyu.hu",
    title: "Speedtest",
    description: "Network speed testing tool",
    background: "linear-gradient(90deg, rgba(0, 123, 255, 1) 0%, rgba(40, 167, 69, 1) 100%)",
    order: 10
  },
  {
    href: "https://gallery.seyu.hu",
    title: "Gallery",
    description: "Image and media gallery",
    background: "linear-gradient(135deg, rgba(255, 193, 7, 1) 0%, rgba(255, 87, 34, 1) 100%)",
    order: 11
  }
];

async function seedLaunchmassDatabase() {
  console.log('🔄 Connecting to LAUNCHMASS MongoDB Atlas database...');
  console.log(`Database: ${LAUNCHMASS_DB}`);
  console.log(`Cards to seed: ${cards.length}`);
  
  try {
    // Create MongoDB client for LAUNCHMASS
    const client = new MongoClient(LAUNCHMASS_URI);
    
    // Connect to the database
    await client.connect();
    console.log('✅ Connected to LAUNCHMASS MongoDB Atlas successfully');
    
    // Access the launchmass database
    const db = client.db(LAUNCHMASS_DB);
    const cardsCollection = db.collection('cards');
    
    // Clear existing cards
    const existingCount = await cardsCollection.countDocuments();
    if (existingCount > 0) {
      console.log(`🗑️  Clearing ${existingCount} existing cards...`);
      await cardsCollection.deleteMany({});
      console.log('✅ Existing cards cleared');
    }
    
    // Prepare cards for insertion
    const now = new Date();
    const cardsToInsert = cards.map(card => ({
      ...card,
      createdAt: now,
      updatedAt: now
    }));
    
    // Insert new cards
    console.log(`📝 Inserting ${cardsToInsert.length} new cards...`);
    const insertResult = await cardsCollection.insertMany(cardsToInsert);
    console.log(`✅ Successfully inserted ${insertResult.insertedCount} cards`);
    
    // Verify the insertion
    const finalCount = await cardsCollection.countDocuments();
    console.log(`📊 Total cards in database: ${finalCount}`);
    
    // Show sample of inserted cards
    console.log('\n📄 Sample inserted cards:');
    const sampleCards = await cardsCollection.find({}).sort({ order: 1 }).limit(5).toArray();
    sampleCards.forEach((card, index) => {
      console.log(`  ${index + 1}. "${card.title}" -> ${card.href}`);
      if (card.description) console.log(`     Description: ${card.description}`);
      console.log(`     Order: ${card.order}, Background: ${card.background}`);
    });
    
    console.log('\n🚀 LAUNCHMASS database seeding completed successfully!');
    console.log('📍 The application is ready to display the cards');
    
    await client.close();
    
  } catch (error) {
    console.error('❌ Database seeding failed:');
    console.error(error.message);
    process.exit(1);
  }
}

seedLaunchmassDatabase();
