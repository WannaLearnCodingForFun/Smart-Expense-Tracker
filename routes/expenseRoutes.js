
const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');


router.get('/', async (req, res, next) => {
  try {
    const { category, startDate, endDate } = req.query;
    const filter = {};

    // Filter by category if provided
    if (category && category !== 'all') {
      filter.category = category;
    }

    // Filter by date range if provided
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate + 'T23:59:59.999Z');
    }

    const expenses = await Expense.find(filter).sort({ date: -1 });
    res.json(expenses);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/expenses/stats
 * Get dashboard statistics (totals, monthly, by category)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const { month, year } = req.query;

    // Base match for date filtering (for monthly/category stats)
    let dateMatch = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);
      dateMatch = { date: { $gte: startDate, $lte: endDate } };
    }

    // Total expenses - ALL TIME (always)
    const totalPipeline = [
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const totalResult = await Expense.aggregate(totalPipeline);
    const totalExpenses = totalResult[0]?.total || 0;

    // Monthly total for selected month (or current month)
    const monthlyTotalPipeline = [
      { $match: dateMatch },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ];
    const monthlyTotalResult = await Expense.aggregate(monthlyTotalPipeline);
    const monthlyTotal = monthlyTotalResult[0]?.total || 0;

    // Monthly spending for bar chart (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyPipeline = [
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ];
    const monthlyData = await Expense.aggregate(monthlyPipeline);

    // Category distribution (pie chart) - all-time for better overview
    const categoryPipeline = [
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ];
    const categoryData = await Expense.aggregate(categoryPipeline);

    res.json({
      totalExpenses,
      monthlyTotal,
      monthlyData,
      categoryData
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/expenses/:id
 * Get single expense by ID
 */
router.get('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json(expense);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/expenses
 * Create new expense
 */
router.post('/', async (req, res, next) => {
  try {
    const { amount, category, description, date } = req.body;

    if (!amount || !category) {
      return res.status(400).json({
        error: 'Validation failed',
        details: 'Amount and category are required'
      });
    }

    const expense = new Expense({
      amount: parseFloat(amount),
      category,
      description: description || '',
      date: date ? new Date(date) : new Date()
    });

    await expense.save();
    res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/expenses/:id
 * Update existing expense
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { amount, category, description, date } = req.body;

    const updateData = {};
    if (amount !== undefined) updateData.amount = parseFloat(amount);
    if (category !== undefined) updateData.category = category;
    if (description !== undefined) updateData.description = description;
    if (date !== undefined) updateData.date = new Date(date);

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json(expense);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/expenses/:id
 * Delete expense
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const expense = await Expense.findByIdAndDelete(req.params.id);
    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }
    res.json({ message: 'Expense deleted successfully', expense });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
