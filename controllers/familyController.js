const User = require('../models/User');
const Expense = require('../models/Expense');
const mongoose = require('mongoose');

async function getConnectedFamilyIds(userId) {
  const currentUser = await User.findById(userId).select('family');
  const outgoing = (currentUser?.family || []).map((id) => id.toString());
  const incomingDocs = await User.find({ family: userId }).select('_id');
  const incoming = incomingDocs.map((doc) => doc._id.toString());

  return [...new Set([...outgoing, ...incoming])].filter((id) => id !== userId.toString());
}

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

    // Add bidirectional family link so both users see each other
    user.family.push(member._id);
    await user.save();

    const memberUser = await User.findById(member._id);
    const memberHasCurrentUser = memberUser.family.some((id) => id.equals(user._id));
    if (!memberHasCurrentUser) {
      memberUser.family.push(user._id);
      await memberUser.save();
    }

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

    const connectedIds = await getConnectedFamilyIds(req.user.id);
    const members = await User.find({ _id: { $in: connectedIds } }).select('username email');

    const enrichedFamily = await Promise.all(members.map(async (member) => {
      const memberConnected = await getConnectedFamilyIds(member._id);
      return {
        _id: member._id,
        username: member.username,
        email: member.email,
        isInSomeFamily: memberConnected.length > 0
      };
    }));

    res.status(200).json({ family: enrichedFamily });
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

    // Remove reverse relationship as well
    const memberUser = await User.findById(memberId);
    if (memberUser) {
      memberUser.family = memberUser.family.filter((id) => id.toString() !== user._id.toString());
      await memberUser.save();
    }

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

    const connectedIds = await getConnectedFamilyIds(req.user.id);
    const ids = [user._id.toString(), ...connectedIds];
    const objectIds = ids.map((id) => new mongoose.Types.ObjectId(id));
    const users = await User.find({ _id: { $in: objectIds } }).select('username email');
    const userMap = new Map(users.map((u) => [u._id.toString(), u]));

    const currentUserInSomeFamily = connectedIds.length > 0;

    const summary = await Expense.aggregate([
      { $match: { user: { $in: objectIds } } },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    const categoryBreakdown = await Expense.aggregate([
      { $match: { user: { $in: objectIds } } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);

    const individualBreakdownRaw = await Expense.aggregate([
      { $match: { user: { $in: objectIds } } },
      {
        $group: {
          _id: '$user',
          total: { $sum: '$amount' },
          entries: { $sum: 1 }
        }
      },
      { $sort: { total: -1 } }
    ]);

    const individualBreakdown = ids.map((id) => {
      const idString = id.toString();
      const row = individualBreakdownRaw.find((r) => r._id.toString() === idString);
      const profile = userMap.get(idString);
      return {
        userId: idString,
        username: profile?.username || 'Unknown',
        email: profile?.email || '',
        totalExpenses: row?.total || 0,
        totalEntries: row?.entries || 0
      };
    });

    res.status(200).json({
      familySize: ids.length,
      currentUserInSomeFamily,
      totalExpenses: summary[0]?.total || 0,
      totalEntries: summary[0]?.count || 0,
      categoryBreakdown,
      individualBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
