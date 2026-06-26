const mongoose = require('mongoose');

const PartnerSchema = new mongoose.Schema({
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  profilePhoto: { type: String },
  serviceCategory: { type: String }, // e.g., Electrician, Plumber
  experience: { type: Number },
  serviceArea: { type: String },
  documents: {
    idProof: { type: String },
    skillCertificate: { type: String }
  },
  bankDetails: {
    accountNumber: { type: String },
    ifsc: { type: String }
  },
  rating: { type: Number, default: 5.0 },
  jobsCompleted: { type: Number, default: 0 },
  walletBalance: { type: Number, default: 0 },
  isOnline: { type: Boolean, default: false },
  // membershipTier: { type: String, enum: ['basic', 'silver', 'gold'], default: 'basic' }, // Commented for future update
  membershipTier: { type: String, default: 'basic' },
  location: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  createdAt: { type: Date, default: Date.now }
});

PartnerSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Partner', PartnerSchema);
