/**
 * Seed script - Add sample expenses to the database
 * Run: node scripts/seed.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Expense = require('../models/Expense');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

const sampleExpenses = [
  { amount: 45.99, category: 'Food', description: 'Grocery shopping', date: new Date() },
  { amount: 120.00, category: 'Travel', description: 'Gas for weekend trip', date: new Date(Date.now() - 86400000) },
  { amount: 89.50, category: 'Shopping', description: 'New running shoes', date: new Date(Date.now() - 2 * 86400000) },
  { amount: 250.00, category: 'Bills', description: 'Electric bill', date: new Date(Date.now() - 5 * 86400000) },
  { amount: 15.00, category: 'Food', description: 'Coffee with friends', date: new Date() },
  { amount: 75.00, category: 'Other', description: 'Charity donation', date: new Date(Date.now() - 7 * 86400000) },
  { amount: 35.00, category: 'Food', description: 'Restaurant dinner', date: new Date(Date.now() - 3 * 86400000) },
  { amount: 200.00, category: 'Travel', description: 'Hotel booking', date: new Date(Date.now() - 14 * 86400000) }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await Expense.insertMany(sampleExpenses);
    console.log(`✅ Added ${result.length} sample expenses`);

    process.exit(0);
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exit(1);
  }
}

seed();
