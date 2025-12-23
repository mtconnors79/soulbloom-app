#!/usr/bin/env node
/**
 * MongoDB Index Management Script
 *
 * Creates and verifies indexes on MongoDB collections for optimal query performance.
 * Run with: npm run db:indexes
 *
 * Index Strategy:
 * - Primary queries use user_id + date fields
 * - Secondary indexes on commonly filtered/sorted fields
 * - Sparse indexes on optional nested fields
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/soulbloom_mongo';

async function createIndexes() {
  console.log('🔧 MongoDB Index Management Script');
  console.log('==================================\n');

  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log(`✓ Connected to MongoDB: ${MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')}\n`);

    const db = mongoose.connection.db;

    // =====================================================
    // CHECKIN_RESPONSES COLLECTION
    // =====================================================
    console.log('📋 Collection: checkin_responses');
    console.log('-'.repeat(40));

    const checkinResponses = db.collection('checkin_responses');

    // Index 1: user_id + created_at (PRIMARY - most common query)
    await createIndex(checkinResponses, 'idx_user_created', { user_id: 1, created_at: -1 });

    // Index 2: user_id + time_bucket + created_at (for daily mood details)
    await createIndex(checkinResponses, 'idx_user_bucket_created', { user_id: 1, time_bucket: 1, created_at: -1 });

    // Index 3: ai_analysis.risk_level (for finding high-risk check-ins)
    await createIndex(checkinResponses, 'idx_risk_level', { 'ai_analysis.risk_level': 1 }, { sparse: true });

    // Index 4: ai_analysis.sentiment (for sentiment analytics)
    await createIndex(checkinResponses, 'idx_sentiment', { 'ai_analysis.sentiment': 1 }, { sparse: true });

    // Index 5: mood_rating (for mood distribution queries)
    await createIndex(checkinResponses, 'idx_mood_rating', { mood_rating: 1 });

    // Index 6: user_id + ai_analysis.risk_level (for finding distressed users)
    await createIndex(checkinResponses, 'idx_user_risk', { user_id: 1, 'ai_analysis.risk_level': 1 }, { sparse: true });

    console.log('');

    // =====================================================
    // ACTIVITY_LOGS COLLECTION
    // =====================================================
    console.log('📋 Collection: activity_logs');
    console.log('-'.repeat(40));

    const activityLogs = db.collection('activity_logs');

    // Index 1: user_id + completed_at (PRIMARY - most common query)
    await createIndex(activityLogs, 'idx_user_completed', { user_id: 1, completed_at: -1 });

    // Index 2: user_id + activity_type + completed_at (for activity-specific queries)
    await createIndex(activityLogs, 'idx_user_type_completed', { user_id: 1, activity_type: 1, completed_at: -1 });

    // Index 3: activity_type alone (for analytics)
    await createIndex(activityLogs, 'idx_activity_type', { activity_type: 1 });

    console.log('');

    // =====================================================
    // SUMMARY
    // =====================================================
    console.log('📊 Index Summary');
    console.log('-'.repeat(40));

    const checkinIndexes = await checkinResponses.indexes();
    const activityIndexes = await activityLogs.indexes();

    console.log(`checkin_responses: ${checkinIndexes.length} indexes`);
    checkinIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log(`\nactivity_logs: ${activityIndexes.length} indexes`);
    activityIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ MongoDB index setup complete!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

/**
 * Create an index if it doesn't already exist
 */
async function createIndex(collection, name, keys, options = {}) {
  try {
    // Check if index already exists
    const existingIndexes = await collection.indexes();
    const indexExists = existingIndexes.some(idx => {
      // Compare key objects
      const existingKeys = JSON.stringify(idx.key);
      const newKeys = JSON.stringify(keys);
      return existingKeys === newKeys;
    });

    if (indexExists) {
      console.log(`  ⏭️  Index exists: ${JSON.stringify(keys)}`);
      return;
    }

    // Create the index
    await collection.createIndex(keys, { name, ...options });
    console.log(`  ✅ Created: ${name} ${JSON.stringify(keys)}`);
  } catch (error) {
    if (error.code === 85 || error.code === 86) {
      // Index already exists with different name or different options
      console.log(`  ⚠️  Index conflict (exists with different name): ${JSON.stringify(keys)}`);
    } else {
      console.error(`  ❌ Failed to create ${name}: ${error.message}`);
    }
  }
}

// Run the script
createIndexes();
