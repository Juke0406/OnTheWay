import knex from 'knex';
import path from 'path';
import fs from 'fs';

// Ensure the data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Database path
const dbPath = path.join(dataDir, 'ontheway.db');

// Initialize knex with SQLite3
export const db = knex({
  client: 'better-sqlite3',
  connection: {
    filename: dbPath
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn: any, cb: Function) => {
      // Enable foreign keys support
      conn.pragma('foreign_keys = ON');
      cb();
    }
  }
});

// Initialize database (run migrations)
export async function initializeDatabase() {
  try {
    // Check if tables exist
    const usersTableExists = await db.schema.hasTable('users');
    const listingsTableExists = await db.schema.hasTable('listings');
    const bidsTableExists = await db.schema.hasTable('bids');
    const reviewsTableExists = await db.schema.hasTable('reviews');

    // Create tables if they don't exist
    if (!usersTableExists) {
      await createUsersTable();
    }

    if (!listingsTableExists) {
      await createListingsTable();
    }

    if (!bidsTableExists) {
      await createBidsTable();
    }

    if (!reviewsTableExists) {
      await createReviewsTable();
    }

    console.log('Database initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
}

// Create users table
async function createUsersTable() {
  await db.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.integer('telegramId').notNullable().unique().index();
    table.string('username').nullable();
    table.string('firstName').nullable();
    table.string('lastName').nullable();
    table.float('rating').defaultTo(0);
    table.float('walletBalance').defaultTo(0);
    table.timestamps(true, true);
  });
}

// Create listings table
async function createListingsTable() {
  await db.schema.createTable('listings', (table) => {
    table.increments('id').primary();
    table.string('listingId').notNullable().unique().index();
    table.integer('userId').notNullable();
    table.string('userName').notNullable();
    table.string('requestType').notNullable();
    table.json('pickupLocation').nullable();
    table.json('dropoffLocation').nullable();
    table.json('requestDetails').notNullable();
    table.string('status').notNullable().defaultTo('pending');
    table.timestamps(true, true);
    table.json('acceptedBy').nullable();
    table.string('requesterOtp').nullable();
    table.string('courierOtp').nullable();
    table.float('minPrice').nullable();
    table.string('estimatedPrice').nullable();

    // Foreign key constraints
    table.foreign('userId').references('telegramId').inTable('users');
  });
}

// Create bids table
async function createBidsTable() {
  await db.schema.createTable('bids', (table) => {
    table.increments('id').primary();
    table.string('listingId').notNullable().index();
    table.integer('userId').notNullable();
    table.string('userName').notNullable();
    table.float('amount').notNullable();
    table.timestamp('timestamp').defaultTo(db.fn.now() as any);
    table.string('status').notNullable().defaultTo('pending');

    // Foreign key constraints
    table.foreign('listingId').references('listingId').inTable('listings');
    table.foreign('userId').references('telegramId').inTable('users');
  });
}

// Create reviews table
async function createReviewsTable() {
  await db.schema.createTable('reviews', (table) => {
    table.increments('id').primary();
    table.integer('fromUserId').notNullable();
    table.integer('toUserId').notNullable();
    table.string('listingId').notNullable();
    table.integer('rating').notNullable();
    table.string('comment').nullable();
    table.timestamps(true, true);

    // Foreign key constraints
    table.foreign('fromUserId').references('telegramId').inTable('users');
    table.foreign('toUserId').references('telegramId').inTable('users');
    table.foreign('listingId').references('listingId').inTable('listings');
  });
}