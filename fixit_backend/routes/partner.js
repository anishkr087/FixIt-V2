const express = require('express');
const jwt = require('jsonwebtoken');
const dbHelper = require('../db_helper');

const router = express.Router();

// Middleware to verify token
const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32');
    req.partnerId = decoded.id;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Onboard / Complete Profile
router.post('/onboard', authMiddleware, async (req, res) => {
  const { name, serviceCategory, experience, serviceArea } = req.body;
  try {
    let sanitizedCategory = serviceCategory ? serviceCategory.trim() : '';
    if (sanitizedCategory) {
      sanitizedCategory = sanitizedCategory
        .split(',')
        .map(cat => {
          return cat.trim()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
        })
        .filter(Boolean)
        .join(',');
    }

    const partner = await dbHelper.updatePartnerById(
      req.partnerId,
      { name, serviceCategory: sanitizedCategory, experience: Number(experience), serviceArea }
    );
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json(partner);
  } catch (err) {
    console.error('Error in /partner/onboard route:', err);
    res.status(500).json({ error: err.message || 'Failed to update profile' });
  }
});

// Verify KYC (Aadhaar)
router.post('/kyc', authMiddleware, async (req, res) => {
  const { aadhaar } = req.body;
  if (!aadhaar || aadhaar.length !== 12) {
    return res.status(400).json({ error: 'Invalid 12-digit Aadhaar number' });
  }

  try {
    const partner = await dbHelper.updatePartnerById(
      req.partnerId,
      { 
        kycVerified: true, 
        documents: { idProof: aadhaar } 
      }
    );
    if (!partner) return res.status(404).json({ error: 'Partner not found' });
    res.json(partner);
  } catch (err) {
    console.error('Error in /partner/kyc route:', err);
    res.status(500).json({ error: err.message || 'Failed to update KYC status' });
  }
});

// Get partner earnings and transaction history
router.get('/earnings', authMiddleware, async (req, res) => {
  try {
    const partner = await dbHelper.findPartnerById(req.partnerId);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    const transactions = await dbHelper.getPartnerTransactions(req.partnerId);

    // Calculate today's earnings (net revenue generated from completed jobs today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let todayEarnings = 0;
    transactions.forEach(tx => {
      const txDate = new Date(tx.createdAt);
      if (txDate >= today) {
        if (tx.type === 'earning' || tx.type === 'commission_deduction') {
          todayEarnings += tx.amount;
        }
      }
    });

    res.json({
      walletBalance: partner.walletBalance || 0,
      todayEarnings,
      jobsCompleted: partner.jobsCompleted || 0,
      transactions
    });
  } catch (err) {
    console.error('Failed to get earnings:', err);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

// Request a withdrawal from wallet to bank account
router.post('/withdraw', authMiddleware, async (req, res) => {
  const { amount } = req.body;
  
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return res.status(400).json({ error: 'Please enter a valid positive withdrawal amount' });
  }

  const withdrawAmount = Number(amount);

  try {
    const partner = await dbHelper.findPartnerById(req.partnerId);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    if (partner.walletBalance < withdrawAmount) {
      return res.status(400).json({ error: 'Insufficient wallet balance' });
    }

    const newBalance = partner.walletBalance - withdrawAmount;

    // Deduct from partner wallet balance
    await dbHelper.updatePartnerById(req.partnerId, { walletBalance: newBalance });

    // Create withdrawal transaction record
    await dbHelper.createTransaction({
      partnerId: req.partnerId,
      type: 'withdrawal',
      amount: -withdrawAmount,
      description: 'Withdrawn to Bank'
    });

    // Fetch refreshed transaction list
    const transactions = await dbHelper.getPartnerTransactions(req.partnerId);

    res.json({
      message: 'Withdrawal processed successfully',
      walletBalance: newBalance,
      transactions
    });
  } catch (err) {
    console.error('Failed to process withdrawal:', err);
    res.status(500).json({ error: 'Failed to process withdrawal' });
  }
});

// Clear outstanding negative balance (pay dues)
router.post('/clear-dues', authMiddleware, async (req, res) => {
  try {
    const partner = await dbHelper.findPartnerById(req.partnerId);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    if (partner.walletBalance >= 0) {
      return res.status(400).json({ error: 'No outstanding dues to pay.' });
    }

    const amountPaid = Math.abs(partner.walletBalance);

    // Update wallet balance to 0
    const updatedPartner = await dbHelper.updatePartnerById(req.partnerId, {
      walletBalance: 0
    });

    // Create platform payout transaction record
    await dbHelper.createTransaction({
      partnerId: req.partnerId,
      type: 'earning', // recorded as credit recharge
      amount: amountPaid,
      description: 'Cleared Outstanding Platform Dues'
    });

    // Fetch updated transaction list
    const transactions = await dbHelper.getPartnerTransactions(req.partnerId);

    res.json({
      message: 'Outstanding dues cleared successfully.',
      walletBalance: 0,
      partner: updatedPartner,
      transactions
    });
  } catch (err) {
    console.error('Failed to clear dues:', err);
    res.status(500).json({ error: 'Failed to process payment' });
  }
});

module.exports = router;
