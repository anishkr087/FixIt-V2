const mongoose = require('mongoose');
const crypto = require('crypto');
const Partner = require('./models/Partner');
const Transaction = require('./models/Transaction');

// Key derivation from JWT_SECRET to ensure 32-byte key for AES-256-CBC
const ENCRYPTION_KEY = crypto.scryptSync(process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32', 'salt', 32);
const IV_LENGTH = 16;

function encryptText(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8');
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decryptText(text) {
  if (!text || !text.includes(':')) return text;
  const textParts = text.split(':');
  const iv = Buffer.from(textParts.shift(), 'hex');
  const encryptedText = Buffer.from(textParts.join(':'), 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', ENCRYPTION_KEY, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString('utf8');
}

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

const enforceDbConnection = () => {
  if (!isDbConnected()) {
    throw new Error('Database connection is not active. Operation rejected for security and consistency.');
  }
};

const findPartnerByPhone = async (phone) => {
  enforceDbConnection();
  return await Partner.findOne({ phone });
};

const createPartner = async (partnerData) => {
  enforceDbConnection();
  
  // Encrypt sensitive document IDs if provided
  const updatedData = { ...partnerData };
  if (updatedData.documents && updatedData.documents.idProof) {
    updatedData.documents.idProof = encryptText(updatedData.documents.idProof);
  }
  if (updatedData.bankDetails && updatedData.bankDetails.accountNumber) {
    updatedData.bankDetails.accountNumber = encryptText(updatedData.bankDetails.accountNumber);
  }
  
  const partner = new Partner(updatedData);
  const savedPartner = await partner.save();
  return decryptPartnerData(savedPartner);
};

const findPartnerById = async (id) => {
  enforceDbConnection();
  const partner = await Partner.findById(id);
  return decryptPartnerData(partner);
};

const updatePartnerById = async (id, updateData) => {
  enforceDbConnection();
  
  const updatedData = { ...updateData };
  if (updatedData.documents && updatedData.documents.idProof) {
    updatedData.documents.idProof = encryptText(updatedData.documents.idProof);
  }
  if (updatedData.bankDetails && updatedData.bankDetails.accountNumber) {
    updatedData.bankDetails.accountNumber = encryptText(updatedData.bankDetails.accountNumber);
  }

  const partner = await Partner.findByIdAndUpdate(id, updatedData, { new: true });
  return decryptPartnerData(partner);
};

const findNearestOnlinePartners = async (lat, lng, category, maxDistanceMeters = 3000) => {
  enforceDbConnection();
  const partners = await Partner.find({
    isOnline: true,
    walletBalance: { $gt: -500 }, // Filter out suspended partners (balance <= -500)
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
  return partners.map(decryptPartnerData);
};

const createTransaction = async (transactionData) => {
  enforceDbConnection();
  const transaction = new Transaction(transactionData);
  return await transaction.save();
};

const getPartnerTransactions = async (partnerId) => {
  enforceDbConnection();
  return await Transaction.find({ partnerId }).sort({ createdAt: -1 });
};

// Helper function to decrypt partner sensitive data before returning to code (never plain Aadhaar in DB)
function decryptPartnerData(partner) {
  if (!partner) return null;
  
  // Handle mongoose document mapping
  const partnerObj = partner.toObject ? partner.toObject() : partner;
  
  if (partnerObj.documents && partnerObj.documents.idProof) {
    try {
      partnerObj.documents.idProof = decryptText(partnerObj.documents.idProof);
    } catch (e) {
      console.error('Failed to decrypt Aadhaar ID:', e.message);
    }
  }
  if (partnerObj.bankDetails && partnerObj.bankDetails.accountNumber) {
    try {
      partnerObj.bankDetails.accountNumber = decryptText(partnerObj.bankDetails.accountNumber);
    } catch (e) {
      console.error('Failed to decrypt bank account number:', e.message);
    }
  }
  
  return partnerObj;
}

module.exports = {
  isDbConnected,
  findPartnerByPhone,
  createPartner,
  findPartnerById,
  updatePartnerById,
  findNearestOnlinePartners,
  createTransaction,
  getPartnerTransactions,
  encryptText,
  decryptText
};
