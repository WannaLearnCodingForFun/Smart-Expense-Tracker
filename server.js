/**
 * Smart Expense Tracker - Server
 * Express backend with MongoDB
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const expenseRoutes = require('./routes/expenseRoutes');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

// ============ Middleware ============
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ============ Routes ============
app.use('/api/expenses', expenseRoutes);

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============ MongoDB Connection ============
mongoose.connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    console.log('Make sure MongoDB is running: brew services start mongodb-community');
  });

// ============ Error Handling Middleware ============
app.use((err, req, res, next) => {
  console.error('Error:', err);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({
      error: 'Validation failed',
      details: messages.join(', ')
    });
  }

  // Mongoose cast error (invalid ID)
  if (err.name === 'CastError') {
    return res.status(400).json({ error: 'Invalid expense ID' });
  }

  // Default server error
  res.status(500).json({
    error: 'Server error',
    message: err.message || 'Something went wrong'
  });
});

// ============ Start Server ============
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
