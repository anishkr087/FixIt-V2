const mongoose = require('mongoose');

const JobRequestSchema = new mongoose.Schema({
  customerId: { type: String, required: true },
  problemDescription: { type: String, required: true },
  estimatedPrice: { type: Number, required: true },
  status: { 
    type: String, 
    enum: ['pending', 'accepted', 'on_the_way', 'reached', 'work_started', 'completed', 'cancelled'],
    default: 'pending'
  },
  assignedPartner: { type: mongoose.Schema.Types.ObjectId, ref: 'Partner', default: null },
  paymentMethod: { type: String, enum: ['UPI', 'COD'], default: 'COD' },
  customerLocation: {
    type: { type: String, default: 'Point' },
    coordinates: { type: [Number], required: true } // [longitude, latitude]
  },
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

JobRequestSchema.index({ customerLocation: '2dsphere' });

module.exports = mongoose.model('JobRequest', JobRequestSchema);
