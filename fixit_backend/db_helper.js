const mongoose = require('mongoose');
const Partner = require('./models/Partner');
const Transaction = require('./models/Transaction');

// In-memory fallback database
const mockPartners = {};
const mockTransactions = [];

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

const findPartnerByPhone = async (phone) => {
  if (isDbConnected()) {
    try {
      return await Partner.findOne({ phone });
    } catch (err) {
      console.error('MongoDB Error in findPartnerByPhone:', err);
    }
  }
  
  // Fallback to in-memory
  console.log(`[DB Fallback] Finding partner by phone: ${phone}`);
  return Object.values(mockPartners).find(p => p.phone === phone) || null;
};

const createPartner = async (partnerData) => {
  if (isDbConnected()) {
    try {
      const partner = new Partner(partnerData);
      return await partner.save();
    } catch (err) {
      console.error('MongoDB Error in createPartner:', err);
    }
  }

  // Fallback to in-memory
  console.log('[DB Fallback] Creating partner in memory:', partnerData);
  const id = 'mock_partner_' + Math.random().toString(36).substr(2, 9);
  const newPartner = {
    _id: id,
    rating: 5.0,
    jobsCompleted: 0,
    walletBalance: 0,
    isOnline: false,
    membershipTier: 'basic',
    kycVerified: false,
    location: { type: 'Point', coordinates: [0, 0] },
    documents: { idProof: '', skillCertificate: '' },
    createdAt: new Date(),
    ...partnerData
  };
  mockPartners[id] = newPartner;
  return newPartner;
};

const findPartnerById = async (id) => {
  if (isDbConnected()) {
    try {
      return await Partner.findById(id);
    } catch (err) {
      console.error('MongoDB Error in findPartnerById:', err);
    }
  }

  // Fallback to in-memory
  console.log(`[DB Fallback] Finding partner by ID: ${id}`);
  return mockPartners[id] || null;
};

const updatePartnerById = async (id, updateData) => {
  if (isDbConnected()) {
    try {
      return await Partner.findByIdAndUpdate(id, updateData, { new: true });
    } catch (err) {
      console.error('MongoDB Error in updatePartnerById:', err);
    }
  }

  // Fallback to in-memory
  console.log(`[DB Fallback] Updating partner ${id} in memory:`, updateData);
  if (mockPartners[id]) {
    const partner = mockPartners[id];
    
    // Merge nested fields (like documents) or update top-level fields
    Object.keys(updateData).forEach(key => {
      if (typeof updateData[key] === 'object' && updateData[key] !== null && !Array.isArray(updateData[key])) {
        partner[key] = { ...partner[key], ...updateData[key] };
      } else {
        partner[key] = updateData[key];
      }
    });
    
    return partner;
  }
  return null;
};

const findNearestOnlinePartners = async (lat, lng, category, maxDistanceMeters = 3000) => {
  if (isDbConnected()) {
    try {
      return await Partner.find({
        isOnline: true,
        serviceCategory: category,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [lng, lat]
            },
            $maxDistance: maxDistanceMeters
          }
        }
      });
    } catch (err) {
      console.error('MongoDB Error in findNearestOnlinePartners:', err);
    }
  }
  return [];
};

const createTransaction = async (transactionData) => {
  if (isDbConnected()) {
    try {
      const transaction = new Transaction(transactionData);
      return await transaction.save();
    } catch (err) {
      console.error('MongoDB Error in createTransaction:', err);
    }
  }

  // Fallback to in-memory
  console.log('[DB Fallback] Creating transaction in memory:', transactionData);
  const newTransaction = {
    _id: 'mock_tx_' + Math.random().toString(36).substr(2, 9),
    createdAt: new Date(),
    ...transactionData
  };
  mockTransactions.push(newTransaction);
  return newTransaction;
};

const getPartnerTransactions = async (partnerId) => {
  if (isDbConnected()) {
    try {
      return await Transaction.find({ partnerId }).sort({ createdAt: -1 });
    } catch (err) {
      console.error('MongoDB Error in getPartnerTransactions:', err);
    }
  }

  // Fallback to in-memory
  console.log(`[DB Fallback] Fetching transactions in memory for partner: ${partnerId}`);
  return mockTransactions
    .filter(tx => tx.partnerId.toString() === partnerId.toString())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

module.exports = {
  isDbConnected,
  findPartnerByPhone,
  createPartner,
  findPartnerById,
  updatePartnerById,
  findNearestOnlinePartners,
  createTransaction,
  getPartnerTransactions,
  mockPartners,
  mockTransactions
};
