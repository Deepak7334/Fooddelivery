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
    const user = await User.create({ name, email, password: hashed, phone, address, role: 'customer' });
    
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
router.post('/firebase-login', async (req, res) => {
  try {
    const { idToken, name, loginProvider } = req.body;
    if (!idToken) return res.status(400).json({ success: false, message: 'No ID token provided' });

    const { getAuth, getApps } = require('../services/firebase');
    if (getApps().length === 0) {
      return res.status(500).json({ success: false, message: 'Firebase Admin not configured on server' });
    }

    const decodedToken = await getAuth().verifyIdToken(idToken);
    const { uid, phone_number, email } = decodedToken;

    // Try to find user by firebaseUid, or phone, or email
    let user = await User.findOne({ 
      $or: [
        { firebaseUid: uid },
        ...(phone_number ? [{ phone: phone_number }] : []),
        ...(email ? [{ email: email }] : [])
      ]
    });

    if (user) {
      // Update missing firebase fields if we matched by phone/email
      if (!user.firebaseUid) {
        user.firebaseUid = uid;
        user.loginProvider = loginProvider || 'phone';
        await user.save();
      }
    } else {
      // Create new customer
      user = new User({
        firebaseUid: uid,
        phone: phone_number,
        email: email,
        name: name || 'JDkart Customer',
        role: 'customer',
        loginProvider: loginProvider || 'phone'
      });
      await user.save();
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
    console.error('Firebase Login Error:', err);
    res.status(401).json({ success: false, message: 'Invalid or expired Firebase token' });
  }
});

// @GET /api/auth/me
router.get('/me', require('../middleware/auth').protect, async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      phone: req.user.phone,
      address: req.user.address,
      addresses: req.user.addresses || [],
      restaurantId: req.user.restaurantId,
    },
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

    let updateFields = {};
    let changes = [];

    // Compare fields and log changes
    if (name && name !== currentUser.name) {
      updateFields.name = name;
      changes.push({ field: 'Name', oldValue: currentUser.name || '', newValue: name });
    }
    if (phone !== undefined && phone !== currentUser.phone) {
      updateFields.phone = phone;
      changes.push({ field: 'Mobile Number', oldValue: currentUser.phone || '', newValue: phone });
    }
    if (address !== undefined && address !== currentUser.address) {
      updateFields.address = address;
      changes.push({ field: 'Address', oldValue: currentUser.address || '', newValue: address });
    }
    if (profileImage !== undefined && profileImage !== currentUser.profileImage) {
      updateFields.profileImage = profileImage;
      // We don't strictly need to log base64 image strings in the audit log
    }
    
    if (password) {
      updateFields.password = await bcrypt.hash(password, 10);
    }
    
    // Handle new address for multiple addresses
    if (newAddress) {
      currentUser.addresses.push(newAddress);
      updateFields.addresses = currentUser.addresses;
      if (!currentUser.phone && newAddress.alternatePhone) {
        updateFields.phone = newAddress.alternatePhone;
      }
    }

    // Perform update if there are changes
    if (Object.keys(updateFields).length > 0) {
      const updatedUser = await User.findByIdAndUpdate(
        req.user._id,
        updateFields,
        { new: true }
      ).select('-password');

      // Save audit log if non-password fields were changed
      if (changes.length > 0) {
        const ProfileAuditLog = require('../models/ProfileAuditLog');
        await ProfileAuditLog.create({
          userId: req.user._id,
          changes
        });
      }

      return res.json({ success: true, user: updatedUser });
    }

    // If nothing changed
    const user = await User.findById(req.user._id).select('-password');
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
