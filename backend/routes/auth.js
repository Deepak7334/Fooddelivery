const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const generateOTP = require('../utils/generateOTP');
const sendEmail = require('../utils/sendEmail');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '30d' });
};

// Legacy numeric prefixes must not consume real initials such as "E. Kumar".
const sanitizeName = (value) =>
  typeof value === 'string' ? value.trim().replace(/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?\s+/, '') : '';

// `phone` is a unique sparse index, so the field must be absent (not '')
// when a customer has no number. Blank strings collide across accounts.
const normalizePhone = (value) => {
  if (value === undefined || value === null) return null;
  const digits = String(value)
    .replace(/\D/g, '')
    .replace(/^91(?=\d{10}$)/, '')
    .replace(/^0(?=\d{10}$)/, '');
  return digits.length > 0 ? digits : null;
};

// Never send credentials, OTPs or device tokens back to the client.
const PRIVATE_USER_FIELDS = ['password', 'emailOtp', 'emailOtpExpiry', 'fcmToken', 'firebaseUid', '__v'];

// Full profile (minus secrets) so web/app sessions keep role-specific fields
// such as storeId, deliveryStatus or serviceAreaIds after a profile save.
const publicUser = (user) => {
  const obj = typeof user.toObject === 'function' ? user.toObject() : { ...user };
  PRIVATE_USER_FIELDS.forEach((field) => delete obj[field]);
  return {
    ...obj,
    id: obj._id,
    name: obj.name || '',
    email: obj.email || '',
    phone: obj.phone || '',
    address: obj.address || '',
    addresses: obj.addresses || [],
    profileImage: obj.profileImage || '',
    restaurantId: obj.restaurantId || null,
    storeId: obj.storeId || null,
  };
};

// @POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email and password are required' });
    }
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      phone: normalizePhone(phone) || undefined,
      address,
      role: 'customer',
    });
    
    // Notify admin about new registration
    const NotificationService = require('../services/notificationService');
    const io = req.app.get('io');
    await NotificationService.sendToAdmin(
      'New User Registration',
      `${name} has just registered as a customer.`,
      'NEW_USER',
      io
    ).catch(err => console.error('Notification error:', err));

    const token = generateToken(user._id);
    res.status(201).json({
      success: true,
      token,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, phone: user.phone, address: user.address },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'Account is deactivated. Contact admin.' });
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    const token = generateToken(user._id);
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        restaurantId: user.restaurantId,
      },
    });
  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @POST /api/auth/send-email-otp
router.post('/send-email-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const otp = generateOTP();
    const expiry = new Date(Date.now() + 10 * 60000); // 10 mins

    let user = await User.findOne({ email });
    if (user) {
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      if (!user.loginProvider || user.loginProvider === 'local') {
        user.loginProvider = 'email_otp';
      }
      await user.save();
    } else {
      user = new User({
        email,
        emailOtp: otp,
        emailOtpExpiry: expiry,
        role: 'customer',
        loginProvider: 'email_otp',
      });
      await user.save();
    }

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 20px; background-color: #ffffff; border-radius: 12px; border: 1px solid #eaeaea;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #ff5722; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -1px;">JDkart</h1>
        </div>
        <h2 style="color: #1a1a1a; font-size: 20px; font-weight: 600; margin: 0 0 16px; text-align: center;">Verify your email</h2>
        <p style="color: #4a4a4a; font-size: 15px; line-height: 1.5; margin: 0 0 24px; text-align: center;">
          To complete your login, please enter the verification code below in the JDkart app.
        </p>
        <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
          <h1 style="color: #000000; font-size: 36px; font-weight: 700; letter-spacing: 8px; margin: 0;">${otp}</h1>
        </div>
        <p style="color: #888888; font-size: 13px; text-align: center; margin: 0;">
          This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.
        </p>
      </div>
    `;

    const emailResult = await sendEmail({
      to: email,
      subject: 'JDkart Verification Code',
      html: emailHtml,
    });

    if (!emailResult.success) {
      throw new Error(emailResult.error || 'Failed to send email via SMTP');
    }

    res.json({ success: true, message: 'OTP sent successfully to email' });
  } catch (err) {
    console.error('Send OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// @POST /api/auth/verify-email-otp
router.post('/verify-email-otp', async (req, res) => {
  try {
    const { email, otp, name } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required' });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.emailOtp || user.emailOtp !== otp) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }

    if (user.emailOtpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'OTP has expired' });
    }

    // Clear OTP
    user.emailOtp = null;
    user.emailOtpExpiry = null;
    if (name && !user.name) user.name = name;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        addresses: user.addresses || [],
        restaurantId: user.restaurantId,
      },
    });
  } catch (err) {
    console.error('Verify OTP Error:', err);
    res.status(500).json({ success: false, message: 'Failed to verify OTP' });
  }
});

// @POST /api/auth/firebase-login
// Dual-strategy verification:
// 1. Firebase Auth ID tokens (sent by Web frontend via Firebase Web SDK)
// 2. Google OAuth ID tokens (sent by Flutter mobile app via google_sign_in)
router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken, name, loginProvider = 'google' } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'No ID token provided' });

    let verifiedEmail = null;
    let verifiedName = name || null;
    let firebaseUid = null;
    let phoneNumber = null;

    // Strategy 1: Verify as Firebase Auth ID token (Web Frontend)
    try {
      const { getAuth, getApps } = require('../services/firebase');
      if (getApps().length > 0) {
        const decodedToken = await getAuth().verifyIdToken(idToken);
        if (decodedToken) {
          verifiedEmail = decodedToken.email;
          firebaseUid = decodedToken.uid;
          phoneNumber = decodedToken.phone_number;
          verifiedName = verifiedName || decodedToken.name;
        }
      }
    } catch (firebaseErr) {
      // Not a Firebase Auth token (likely Google OAuth ID token from mobile app). Fall through to Strategy 2.
    }

    // Strategy 2: Verify as Google OAuth ID token (Flutter Mobile App)
    if (!verifiedEmail) {
      const audiences = [
        process.env.GOOGLE_WEB_CLIENT_ID,
        process.env.GOOGLE_ANDROID_CLIENT_ID,
        '331203442565-4e95r580udt4hsjhj860ojotd94blm3p.apps.googleusercontent.com',
        '331203442565-7mn17n85280034sgjh724jf4rf0bcksa.apps.googleusercontent.com',
      ].filter(Boolean);

      try {
        const { OAuth2Client } = require('google-auth-library');
        const ticket = await new OAuth2Client().verifyIdToken({ idToken, audience: audiences });
        const payload = ticket.getPayload();
        if (payload && payload.email_verified === true) {
          verifiedEmail = payload.email;
          verifiedName = verifiedName || payload.name;
          firebaseUid = firebaseUid || payload.sub;
        }
      } catch (googleErr) {
        console.error('Google OAuth verification failed:', googleErr.message);
      }
    }

    if (!verifiedEmail) {
      return res.status(401).json({
        success: false,
        message: 'Google did not verify this sign-in. Invalid or expired token. Please try again or use Email OTP.',
      });
    }

    // Locate or create user record
    let user = await User.findOne({
      $or: [
        ...(firebaseUid ? [{ firebaseUid }] : []),
        { email: verifiedEmail },
        ...(phoneNumber ? [{ phone: phoneNumber }] : []),
      ],
    });

    if (!user) {
      user = new User({
        email: verifiedEmail,
        name: verifiedName || 'JDkart Customer',
        // Leave these unset rather than '' — both are unique sparse fields.
        phone: normalizePhone(phoneNumber) || undefined,
        firebaseUid: firebaseUid || undefined,
        role: 'customer',
        loginProvider,
      });
      await user.save();
    } else {
      if (user.role !== 'customer') {
        return res.status(403).json({ success: false, message: 'Please log in from the restaurant app.' });
      }
      let changed = false;
      if (!user.name && verifiedName) {
        user.name = verifiedName;
        changed = true;
      }
      if (!user.firebaseUid && firebaseUid) {
        user.firebaseUid = firebaseUid;
        changed = true;
      }
      if (!user.loginProvider) {
        user.loginProvider = loginProvider;
        changed = true;
      }
      if (changed) await user.save();
    }

    // Generate JWT
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '30d',
    });

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        address: user.address,
        addresses: user.addresses || [],
        restaurantId: user.restaurantId,
      },
    });
  } catch (err) {
    console.error('Unified Auth Error:', err);
    res.status(500).json({ success: false, message: 'Login failed. Please try again.' });
  }
});

// @GET /api/auth/me
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json({
    success: true,
    user: { ...publicUser(req.user), name: sanitizeName(req.user.name) },
  });
});

// @PUT /api/auth/profile
router.put('/profile', require('../middleware/auth').protect, async (req, res) => {
  try {
    const { name, password, phone, address, profileImage, newAddress } = req.body;

    // Fetch current user to compare
    const currentUser = await User.findById(req.user._id);
    if (!currentUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const setFields = {};
    const unsetFields = {};
    const changes = [];

    // Compare fields and log changes
    if (name !== undefined) {
      const cleanName = sanitizeName(name);
      if (!cleanName) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty.' });
      }
      if (cleanName !== currentUser.name) {
        setFields.name = cleanName;
        changes.push({ field: 'Name', oldValue: currentUser.name || '', newValue: cleanName });
      }
    }

    const profilePhone = phone !== undefined
      ? phone
      : (!currentUser.phone ? newAddress?.alternatePhone : undefined);
    if (profilePhone !== undefined) {
      const cleanPhone = normalizePhone(profilePhone);
      const hasPhoneInput = profilePhone != null && String(profilePhone).trim() !== '';
      if (hasPhoneInput && !/^\d{10}$/.test(cleanPhone || '')) {
        return res.status(400).json({
          success: false,
          message: 'Enter a valid 10-digit mobile number.',
        });
      }
      if (cleanPhone !== (currentUser.phone || null)) {
        if (!cleanPhone) {
          // Never persist '' — the unique sparse index only allows one blank.
          unsetFields.phone = '';
        } else {
          const taken = await User.findOne({
            phone: cleanPhone,
            _id: { $ne: currentUser._id },
          }).select('_id');
          if (taken) {
            return res.status(409).json({
              success: false,
              message: 'This mobile number is already linked to another account.',
            });
          }
          setFields.phone = cleanPhone;
        }
        changes.push({
          field: 'Mobile Number',
          oldValue: currentUser.phone || '',
          newValue: cleanPhone || '',
        });
      }
    }

    if (address !== undefined && address !== currentUser.address) {
      setFields.address = address;
      changes.push({ field: 'Address', oldValue: currentUser.address || '', newValue: address });
    }
    if (profileImage !== undefined && profileImage !== currentUser.profileImage) {
      setFields.profileImage = profileImage;
      // We don't strictly need to log base64 image strings in the audit log
    }

    if (password) {
      setFields.password = await bcrypt.hash(password, 10);
    }

    // Handle new address for multiple addresses
    if (newAddress) {
      currentUser.addresses.push(newAddress);
      setFields.addresses = currentUser.addresses;
    }

    // Support full array replacement (for edit/delete)
    if (req.body.addresses !== undefined) {
      setFields.addresses = req.body.addresses;
    }

    const hasSet = Object.keys(setFields).length > 0;
    const hasUnset = Object.keys(unsetFields).length > 0;

    if (!hasSet && !hasUnset) {
      return res.json({ success: true, user: publicUser(currentUser) });
    }

    const update = {};
    if (hasSet) update.$set = setFields;
    if (hasUnset) update.$unset = unsetFields;

    const updatedUser = await User.findByIdAndUpdate(req.user._id, update, {
      new: true,
    }).select('-password');
    if (!updatedUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Save audit log if non-password fields were changed
    if (changes.length > 0) {
      const ProfileAuditLog = require('../models/ProfileAuditLog');
      await ProfileAuditLog.create({ userId: req.user._id, changes });
    }

    return res.json({ success: true, user: publicUser(updatedUser) });
  } catch (err) {
    if (err && err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'That mobile number is already linked to another account.',
      });
    }
    console.error('Profile update error:', err);
    res.status(500).json({ success: false, message: 'Could not update your profile. Please try again.' });
  }
});

module.exports = router;
