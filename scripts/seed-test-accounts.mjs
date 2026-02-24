import fs from 'node:fs';
import path from 'node:path';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

function readEnvFile() {
  const envPath = path.resolve(process.cwd(), '.env');
  const raw = fs.readFileSync(envPath, 'utf8');
  const result = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    result[key] = value;
  }

  return result;
}

async function upsertUser(db, { email, password, role, subscription_status, full_name }) {
  const users = db.collection('Users');
  const passwordHash = await bcrypt.hash(password, 10);
  const now = new Date();

  const result = await users.findOneAndUpdate(
    { email },
    {
      $set: {
        email,
        password: passwordHash,
        role,
        subscription_status,
        full_name,
        updated_at: now
      },
      $setOnInsert: {
        created_at: now
      }
    },
    {
      upsert: true,
      returnDocument: 'after'
    }
  );

  return result;
}

async function upsertPoints(db, userId, balance) {
  const points = db.collection('Points');
  const now = new Date();

  await points.updateOne(
    { user_id: userId },
    {
      $set: {
        user_id: userId,
        balance,
        total_earned: Math.max(balance, 0),
        total_spent: 0,
        last_updated: now
      }
    },
    { upsert: true }
  );
}

async function main() {
  const env = readEnvFile();
  const uri = env.MONGODB_URI;

  if (!uri) {
    throw new Error('MONGODB_URI not found in .env');
  }

  await mongoose.connect(uri, { dbName: 'club_wine' });
  const db = mongoose.connection.db;

  const testAccounts = [
    {
      email: 'admin@clubwine.com',
      password: 'Admin@2026',
      role: 'ADMIN',
      subscription_status: 'ACTIVE_MEMBER',
      full_name: 'Admin User',
      points: 0
    },
    {
      email: 'member@clubwine.com',
      password: 'Member@2026',
      role: 'user',
      subscription_status: 'ACTIVE_MEMBER',
      full_name: 'Member User',
      points: 6500000
    },
    {
      email: 'guest@clubwine.com',
      password: 'Guest@2026',
      role: 'user',
      subscription_status: 'GUEST',
      full_name: 'Guest User',
      points: 0
    }
  ];

  for (const account of testAccounts) {
    const updatedUser = await upsertUser(db, account);
    await upsertPoints(db, updatedUser._id, account.points);
    console.log(`Seeded ${account.email} as ${account.role}/${account.subscription_status}`);
  }

  await mongoose.disconnect();
  console.log('Test account seed complete');
}

main().catch(async (error) => {
  console.error('Seed failed:', error);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
