/**
 * Smart Expense Tracker - Server
 * Express backend with MongoDB
 */

require('dotenv').config();
const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Expense = require('./models/Expense');
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const familyRoutes = require('./routes/familyRoutes');
const authMiddleware = require('./middleware/authMiddleware');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/expense-tracker';

// ============ Middleware ============
app.use(cors());
app.use(express.json()); // Parse JSON request bodies

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// ============ Routes ============
app.use('/api/auth', authRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/family', familyRoutes);

// API index route: quick backend route reference
app.get('/api', (req, res) => {
  res.json({
    name: 'Smart Expense Tracker API',
    status: 'ok',
    routes: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login'
      },
      expenses: {
        list: 'GET /api/expenses',
        stats: 'GET /api/expenses/stats',
        getOne: 'GET /api/expenses/:id',
        create: 'POST /api/expenses',
        update: 'PUT /api/expenses/:id',
        remove: 'DELETE /api/expenses/:id'
      },
      family: {
        list: 'GET /api/family',
        add: 'POST /api/family/add',
        remove: 'DELETE /api/family/:memberId',
        summary: 'GET /api/family/summary/expenses'
      },
      debug: process.env.NODE_ENV !== 'production'
        ? ['GET /api/debug/all-expenses']
        : []
    },
    authNote: 'All /api/expenses and /api/family routes require Authorization: Bearer <token>'
  });
});

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/all-expenses', async (req, res, next) => {
    try {
      const expenses = await Expense.find({}).populate('user', 'username email').sort({ createdAt: -1 });
      res.json(expenses);
    } catch (error) {
      next(error);
    }
  });
}

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
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
