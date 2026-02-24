#!/usr/bin/env node
/**
 * Server Health Check Script
 * Run this on your production server to diagnose issues
 * Usage: node scripts/check-server-health.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

console.log('🔍 Starting Server Health Check...\n');

const results = {
  passed: [],
  warnings: [],
  failed: []
};

// Check 1: Node.js version
console.log('✓ Check 1: Node.js Version');
const nodeVersion = process.version;
console.log(`  Node version: ${nodeVersion}`);
const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
if (majorVersion >= 18) {
  results.passed.push('Node.js version is compatible (>= 18)');
} else {
  results.failed.push(`Node.js version ${nodeVersion} is too old. Need >= 18`);
}
console.log();

// Check 2: .env file
console.log('✓ Check 2: Environment File');
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  console.log('  .env file exists ✓');
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {
    MONGODB_URI: envContent.includes('MONGODB_URI=') && !envContent.match(/MONGODB_URI=\s*$/m),
    JWT_SECRET: envContent.includes('JWT_SECRET=') && !envContent.match(/JWT_SECRET=\s*$/m),
    XENDIT_SECRET_KEY: envContent.includes('XENDIT_SECRET_KEY=') && !envContent.match(/XENDIT_SECRET_KEY=\s*$/m)
  };
  
  console.log('  Environment variables:');
  for (const [key, exists] of Object.entries(envVars)) {
    console.log(`    ${key}: ${exists ? '✓' : '✗ MISSING'}`);
    if (exists) {
      results.passed.push(`${key} is set`);
    } else {
      results.failed.push(`${key} is missing or empty in .env`);
    }
  }
  results.passed.push('.env file exists');
} else {
  console.log('  .env file NOT FOUND ✗');
  results.failed.push('.env file does not exist');
}
console.log();

// Check 3: Dependencies
console.log('✓ Check 3: Required Dependencies');
const packageJsonPath = path.resolve(process.cwd(), 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const requiredDeps = ['mongoose', 'bcryptjs', 'jsonwebtoken', 'next', 'react'];
  
  for (const dep of requiredDeps) {
    try {
      require.resolve(dep);
      console.log(`  ${dep}: installed ✓`);
      results.passed.push(`${dep} is installed`);
    } catch {
      console.log(`  ${dep}: NOT INSTALLED ✗`);
      results.failed.push(`${dep} is not installed - run 'npm install'`);
    }
  }
} else {
  results.failed.push('package.json not found');
}
console.log();

// Check 4: MongoDB Connection
console.log('✓ Check 4: MongoDB Connection');
try {
  // Load .env manually
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }

  const mongoose = await import('mongoose');
  const MONGODB_URI = process.env.MONGODB_URI;
  
  if (!MONGODB_URI) {
    console.log('  MONGODB_URI not set ✗');
    results.failed.push('MONGODB_URI environment variable is not set');
  } else {
    console.log('  MONGODB_URI is set ✓');
    console.log('  Attempting connection...');
    
    await mongoose.default.connect(MONGODB_URI, { 
      dbName: 'club_wine',
      serverSelectionTimeoutMS: 10000
    });
    
    console.log('  MongoDB connected successfully ✓');
    console.log(`  Database: ${mongoose.default.connection.db.databaseName}`);
    
    // Test if Users collection exists
    const collections = await mongoose.default.connection.db.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);
    console.log(`  Collections found: ${collectionNames.length}`);
    
    if (collectionNames.includes('Users')) {
      const usersCount = await mongoose.default.connection.db.collection('Users').countDocuments();
      console.log(`  Users collection: ${usersCount} documents ✓`);
      results.passed.push(`MongoDB connected, ${usersCount} users found`);
    } else {
      console.log('  Users collection NOT FOUND ✗');
      results.warnings.push('Users collection does not exist - run seed script');
    }
    
    await mongoose.default.disconnect();
  }
} catch (error) {
  console.log(`  MongoDB connection FAILED ✗`);
  console.log(`  Error: ${error.message}`);
  results.failed.push(`MongoDB connection failed: ${error.message}`);
}
console.log();

// Check 5: Build files
console.log('✓ Check 5: Build Status');
const nextBuildPath = path.resolve(process.cwd(), '.next');
if (fs.existsSync(nextBuildPath)) {
  console.log('  .next directory exists ✓');
  results.passed.push('Next.js build exists');
} else {
  console.log('  .next directory NOT FOUND ✗');
  results.failed.push('.next build directory missing - run "npm run build"');
}
console.log();

// Summary
console.log('═'.repeat(60));
console.log('📊 HEALTH CHECK SUMMARY\n');

if (results.passed.length > 0) {
  console.log(`✅ PASSED (${results.passed.length}):`);
  results.passed.forEach(msg => console.log(`   • ${msg}`));
  console.log();
}

if (results.warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${results.warnings.length}):`);
  results.warnings.forEach(msg => console.log(`   • ${msg}`));
  console.log();
}

if (results.failed.length > 0) {
  console.log(`❌ FAILED (${results.failed.length}):`);
  results.failed.forEach(msg => console.log(`   • ${msg}`));
  console.log();
}

if (results.failed.length === 0) {
  console.log('🎉 All critical checks passed! Server should be working.\n');
  console.log('If login still fails, check:');
  console.log('  1. Server logs: pm2 logs <app-name>');
  console.log('  2. Browser console for client-side errors');
  console.log('  3. MongoDB Atlas IP whitelist includes your server IP');
  process.exit(0);
} else {
  console.log('❗ Fix the failed checks above and try again.\n');
  console.log('Common fixes:');
  console.log('  • npm install');
  console.log('  • npm run build');
  console.log('  • node scripts/seed-test-accounts.mjs');
  console.log('  • Check MongoDB Atlas Network Access (IP whitelist)');
  process.exit(1);
}
