const express = require('express');
const router = express.Router();
const {
  addFamilyMember,
  getFamilyMembers,
  removeFamilyMember,
  getFamilyExpenseSummary
} = require('../controllers/familyController');
const authMiddleware = require('../middleware/authMiddleware');

// Add a family member
router.post('/add', authMiddleware, addFamilyMember);

// Get all family members
router.get('/', authMiddleware, getFamilyMembers);

// Remove family member
router.delete('/:memberId', authMiddleware, removeFamilyMember);

// Get combined family expense summary
router.get('/summary/expenses', authMiddleware, getFamilyExpenseSummary);

module.exports = router;
