const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // Phone number acts as the primary key
  phone: { type: String, required: true, unique: true },
  name: { type: String },
  email: { type: String },
  location: { type: String },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Customer', CustomerSchema);
