const User = require('../models/User');
const Expense = require('../models/Expense');

// Add a family member by email
exports.addFamilyMember = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    // Find the user to add
    const member = await User.findOne({ email: email.toLowerCase().trim() });
    if (!member) return res.status(404).json({ message: 'User not found' });

    // Prevent adding self
    if (member._id.equals(req.user.id)) {
      return res.status(400).json({ message: 'Cannot add yourself as a family member' });
    }

    // Add to family array if not already present
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const alreadyInFamily = user.family.some((id) => id.equals(member._id));
    if (alreadyInFamily) {
      return res.status(400).json({ message: 'User already in family' });
    }

    user.family.push(member._id);
    await user.save();
    const populatedUser = await User.findById(req.user.id).populate('family', 'username email');
    res.status(200).json({ message: 'Family member added', family: populatedUser.family });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Get all family members
exports.getFamilyMembers = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('family', 'username email');
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }
    res.status(200).json({ family: user.family });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Remove a family member
exports.removeFamilyMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    user.family = user.family.filter((id) => id.toString() !== memberId);
    await user.save();

    const populatedUser = await User.findById(req.user.id).populate('family', 'username email');
    res.status(200).json({ message: 'Family member removed', family: populatedUser.family });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

// Combined family expense summary (current user + family members)
exports.getFamilyExpenseSummary = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Current user not found' });
    }

    const ids = [user._id, ...user.family];
    const summary = await Expense.aggregate([
      { $match: { user: { $in: ids } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryBreakdown = await Expense.aggregate([
      { $match: { user: { $in: ids } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    res.status(200).json({
      familySize: ids.length,
      totalExpenses: summary[0]?.total || 0,
      totalEntries: summary[0]?.count || 0,
      categoryBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
