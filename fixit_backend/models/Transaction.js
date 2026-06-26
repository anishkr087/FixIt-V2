const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', required: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'JobRequest' },
  type: { type: String, enum: ['earning', 'withdrawal', 'commission_deduction'], required: true },
  amount: { type: Number, required: true },
  description: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Transaction', TransactionSchema);
