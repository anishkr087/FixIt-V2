const express = require('express');
const customerController = require('./CustomerController');

const router = express.Router();

// Middleware to validate phone format
const validatePhone = (req, res, next) => {
  let phone = (req.body ? req.body.phone : null) || req.params.phone;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }

  // Replace leading space with '+' if it was decoded as a space
  if (phone.startsWith(' ')) {
    phone = '+' + phone.trim();
  }

  // Normalize 10-digit numbers to have the +91 prefix
  if (/^[0-9]{10}$/.test(phone)) {
    phone = '+91' + phone;
  }

  const phoneRegex = /^(\+91)?[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }

  // Sync the normalized phone back to the request parameters/body
  if (req.params.phone) {
    req.params.phone = phone;
  }
  if (req.body && req.body.phone) {
    req.body.phone = phone;
  }

  next();
};

router.post('/profile', validatePhone, customerController.updateProfile);
router.get('/bookings/:phone', validatePhone, customerController.getBookings);
router.get('/partners', customerController.getPartners);

module.exports = router;
