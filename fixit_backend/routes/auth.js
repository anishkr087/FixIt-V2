const express = require('express');
const jwt = require('jsonwebtoken');
const dbHelper = require('../db_helper');

const router = express.Router();

// Temporary storage for active OTPs in memory: maps phone to { otp, expiresAt }
const activeOtps = {};

// Send OTP
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Set expiration to 5 minutes from now
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // Save generated OTP
  activeOtps[phone] = { otp, expiresAt };

  console.log(`\n======================================================`);
  console.log(`[OTP SYSTEM] Generated OTP for ${phone}: ${otp}`);
  console.log(`======================================================\n`);

  // Try to send via Twilio if config values are available
  const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER } = process.env;

  if (TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_PHONE_NUMBER) {
    try {
      const twilio = require('twilio');
      const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
      
      await client.messages.create({
        body: `Your FixIt verification code is: ${otp}. Valid for 5 minutes.`,
        from: TWILIO_PHONE_NUMBER,
        to: phone
      });
      console.log(`[Twilio SMS] Successfully sent OTP to ${phone}`);
    } catch (err) {
      console.error('[Twilio SMS Error] Failed to send SMS via Twilio:', err.message);
      // Even if Twilio fails, we continue so the developer can see the OTP printed in logs.
    }
  } else {
    console.log(`[SMS Gateway] Twilio credentials missing in .env. Falling back to console-logging only.`);
  }

  // Never return the OTP in the body for production, but we can write a message
  res.json({ message: 'OTP sent successfully. Please check your messages.' });
});

// Helper validation function
const validateOtp = (phone, submittedOtp) => {
  const record = activeOtps[phone];
  if (!record) return false;

  const isExpired = Date.now() > record.expiresAt;
  const isMatch = record.otp === submittedOtp;

  if (isMatch && !isExpired) {
    delete activeOtps[phone]; // Consume OTP once used successfully
    return true;
  }
  return false;
};

// Verify OTP (Partner Auth)
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  
  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  // Validate OTP
  const isValid = validateOtp(phone, otp);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  try {
    // Find partner or create new record
    let partner = await dbHelper.findPartnerByPhone(phone);
    let isNewUser = false;

    if (!partner) {
      isNewUser = true;
      partner = await dbHelper.createPartner({
        phone,
        kycVerified: false,
        membershipTier: 'basic'
      });
    } else if (!partner.name || !partner.serviceCategory) {
      isNewUser = true;
    }

    const token = jwt.sign(
      { id: partner._id }, 
      process.env.JWT_SECRET || 'fallback_secret', 
      { expiresIn: '30d' }
    );
    
    res.json({ token, partner, isNewUser });
  } catch (err) {
    console.error('Error verifying OTP:', err);
    res.status(500).json({ error: 'Internal server verification error' });
  }
});

// Verify OTP (Customer Auth)
router.post('/verify-otp-customer', async (req, res) => {
  const { phone, otp } = req.body;

  if (!phone || !otp) {
    return res.status(400).json({ error: 'Phone and OTP are required' });
  }

  // Validate OTP
  const isValid = validateOtp(phone, otp);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid or expired OTP' });
  }

  res.json({ success: true, message: 'OTP verified successfully' });
});

module.exports = router;
