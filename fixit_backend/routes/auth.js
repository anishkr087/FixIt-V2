const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const dbHelper = require('../db_helper');

const router = express.Router();

// Secure storage for active OTPs in memory: maps phone to { otpHash, expiresAt, attempts }
const activeOtps = {};
// Track OTP generation requests: maps phone to { requestsCount, lastRequestedAt, nextAllowedAt }
const resendTracker = {};

// Helper function to hash OTPs to prevent memory exposure
const hashOtp = (otp) => {
  return crypto.createHash('sha256').update(otp).digest('hex');
};

// Send OTP
router.post('/login', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  const now = Date.now();
  const tracker = resendTracker[phone];

  if (tracker) {
    // Reset tracker if last request was more than 15 minutes ago
    if (now - tracker.lastRequestedAt > 15 * 60 * 1000) {
      resendTracker[phone] = {
        requestsCount: 1,
        lastRequestedAt: now,
        nextAllowedAt: now + 2 * 60 * 1000 // Cooldown of 2 min for 1st resend
      };
    } else {
      // Limit to 2 resends (total 3 requests)
      if (tracker.requestsCount >= 3) {
        const minutesLeft = Math.ceil((tracker.lastRequestedAt + 15 * 60 * 1000 - now) / 60000);
        return res.status(429).json({ 
          error: `Maximum OTP resend limit reached. Please try again in ${minutesLeft} minutes.` 
        });
      }

      // Check if requested too early
      if (now < tracker.nextAllowedAt) {
        const secondsLeft = Math.ceil((tracker.nextAllowedAt - now) / 1000);
        return res.status(429).json({ 
          error: `Please wait ${secondsLeft} seconds before requesting a new OTP.` 
        });
      }

      // Increment request count and set next interval
      tracker.requestsCount += 1;
      tracker.lastRequestedAt = now;
      if (tracker.requestsCount === 2) {
        tracker.nextAllowedAt = now + 5 * 60 * 1000; // Cooldown of 5 min for 2nd resend
      } else {
        tracker.nextAllowedAt = Infinity; // Block further resends
      }
    }
  } else {
    // Initial OTP request
    resendTracker[phone] = {
      requestsCount: 1,
      lastRequestedAt: now,
      nextAllowedAt: now + 2 * 60 * 1000 // Cooldown of 2 min for 1st resend
    };
  }

  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  // Set expiration to 5 minutes from now
  const expiresAt = Date.now() + 5 * 60 * 1000;

  // Save generated OTP securely as hash with attempt tracking
  activeOtps[phone] = {
    otpHash: hashOtp(otp),
    expiresAt,
    attempts: 0
  };

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
    }
  } else {
    console.log(`[SMS Gateway] Twilio credentials missing in .env. Falling back to console-logging only.`);
  }

  res.json({ message: 'OTP sent successfully. Please check your messages.' });
});

// Helper validation function with attempt locking & timing attack resistance
const validateOtp = (phone, submittedOtp) => {
  const record = activeOtps[phone];
  if (!record) return false;

  const isExpired = Date.now() > record.expiresAt;
  if (isExpired) {
    delete activeOtps[phone];
    return false;
  }

  // Lock OTP if more than 3 invalid attempts
  if (record.attempts >= 3) {
    delete activeOtps[phone];
    return false;
  }

  record.attempts += 1;

  const submittedHash = hashOtp(submittedOtp);

  // Timing safe comparison to mitigate timing attacks
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(record.otpHash, 'hex'),
    Buffer.from(submittedHash, 'hex')
  );

  if (isMatch) {
    delete activeOtps[phone]; // Consume OTP once verified
    delete resendTracker[phone]; // Clear rate limits upon successful validation
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

  const isValid = validateOtp(phone, otp);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid, expired, or locked OTP. Please try again.' });
  }

  try {
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
      { id: partner._id, type: 'partner' }, 
      process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32', 
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

  const isValid = validateOtp(phone, otp);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid, expired, or locked OTP. Please try again.' });
  }

  // Issue a secure JWT token for customers
  const token = jwt.sign(
    { id: phone, type: 'customer' },
    process.env.JWT_SECRET || 'fallback_secret_longer_key_needed_32',
    { expiresIn: '30d' }
  );

  res.json({ success: true, message: 'OTP verified successfully', token });
});

module.exports = router;
