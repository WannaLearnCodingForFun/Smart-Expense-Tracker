/**
 * Expense Model
 * Defines the schema for storing expenses in MongoDB
 */

const mongoose = require('mongoose');

// Allowed categories for expenses
const CATEGORIES = ['Food', 'Travel', 'Shopping', 'Bills', 'Other'];

const expenseSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0, 'Amount cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: {
      values: CATEGORIES,
      message: '{VALUE} is not a valid category'
    }
  },
  description: {
    type: String,
    default: '',
    trim: true
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  }
}, {
  timestamps: true // Adds createdAt and updatedAt
});

// Index for faster queries by date and category
expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1 });

module.exports = mongoose.model('Expense', expenseSchema);
module.exports.CATEGORIES = CATEGORIES;
