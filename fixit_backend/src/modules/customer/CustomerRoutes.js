const express = require('express');
const customerController = require('./CustomerController');

const router = express.Router();

// Middleware to validate phone format
const validatePhone = (req, res, next) => {
  const phone = (req.body ? req.body.phone : null) || req.params.phone;
  if (!phone) {
    return res.status(400).json({ error: 'Phone number is required' });
  }
  const phoneRegex = /^(\+91)?[0-9]{10}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: 'Invalid phone number format.' });
  }
  next();
};

router.post('/profile', validatePhone, customerController.updateProfile);
router.get('/bookings/:phone', validatePhone, customerController.getBookings);
router.get('/partners', customerController.getPartners);

module.exports = router;
