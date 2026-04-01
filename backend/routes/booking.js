const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Booking = require('../models/Booking');
const Table = require('../models/Table');
const Restaurant = require('../models/Restaurant');
const User = require('../models/User');
const sendEmail = require('../utils/sendEmail');
const DEFAULT_SLOTS = [
  '09:00-11:00',
  '11:00-13:00',
  '13:00-15:00',
  '15:00-17:00',
  '18:00-20:00',
  '20:00-22:00'
];

// Customer routes
router.get('/availability/:restaurantId/:date', protect, async (req, res) => {
  try {
    const { restaurantId, date } = req.params;
    const targetDate = new Date(date);
    
    // Find tables for restaurant
    const tables = await Table.find({ restaurantId, isActive: true });
    
    // For each table, get available slots (mock/simple logic)
    const availableTables = tables.map(table => ({
      _id: table._id,
      number: table.number,
      maxGuests: table.maxGuests,
      availableSlots: DEFAULT_SLOTS // Enhanced later with real booking conflicts
    }));

    res.json({ tables: availableTables, date: targetDate });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/customer/bookings', protect, async (req, res) => {
  try {
    const { restaurantId, tableNumber, timeSlot, partySize, customerName, phone, notes, date } = req.body;
    
    // Validation
    if (!restaurantId || !tableNumber || !timeSlot || !partySize || !customerName || !phone) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Check availability (simple)
    const table = await Table.findOne({ restaurantId, number: tableNumber });
    if (!table) return res.status(400).json({ message: 'Table not found' });

    // Check conflict (mock)
    const conflictingBooking = await Booking.findOne({
      restaurantId,
      tableNumber,
      date,
      timeSlot,
      status: { $nin: ['cancelled', 'rejected'] }
    });
    if (conflictingBooking) return res.status(400).json({ message: 'Slot already booked' });

    // Create booking
    const booking = new Booking({
      restaurantId,
      tableId: table._id,
      tableNumber,
      userId: req.user.id,
      customerName,
      phone,
      date: new Date(date),
      timeSlot,
      partySize,
      notes
    });
    await booking.save();

    // Send notification to restaurant owner
    const restaurant = await Restaurant.findById(restaurantId).populate('ownerId');
    if (restaurant?.ownerId?.email) {
      await sendEmail({
        to: restaurant.ownerId.email,
        subject: `New Table Booking Request - Table ${tableNumber}`,
        html: `
          <h2>New Booking Request</h2>
          <p><strong>Table:</strong> ${tableNumber}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Time:</strong> ${timeSlot}</p>
          <p><strong>Guests:</strong> ${partySize}</p>
          <p><strong>Customer:</strong> ${customerName} (${phone})</p>
          <p><strong>Notes:</strong> ${notes || 'None'}</p>
          <p>Login to <a href="/restaurant">dashboard</a> to confirm/reject.</p>
        `
      });
    }

    res.status(201).json({ message: 'Booking created', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/customer/bookings/mine', protect, async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.user.id })
      .populate('restaurantId', 'name')
      .populate('tableId', 'number')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Restaurant routes (owner only)
router.put('/restaurant/bookings/:id/confirm', protect, authorize('restaurant'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('restaurantId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.restaurantId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = 'confirmed';
    await booking.save();

    // Notify customer
    await sendEmail({
      to: booking.phone, // Use phone for SMS later, temp email?
      subject: 'Booking Confirmed',
      html: `Your booking for Table ${booking.tableNumber} on ${booking.date.toDateString()} at ${booking.timeSlot} is confirmed!`
    });

    res.json({ message: 'Booking confirmed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/restaurant/bookings/:id/reject', protect, authorize('restaurant'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id).populate('restaurantId');
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    
    if (booking.restaurantId.ownerId.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    booking.status = 'rejected';
    await booking.save();

    res.json({ message: 'Booking rejected', booking });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/restaurant/bookings', protect, authorize('restaurant'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user.id });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const bookings = await Booking.find({ restaurantId: restaurant._id })
      .populate('tableId', 'number')
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ========== TABLE MANAGEMENT ==========
router.get('/restaurant/tables', protect, authorize('restaurant'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user.id });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const tables = await Table.find({ restaurantId: restaurant._id }).sort({ number: 1 });
    res.json(tables);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/restaurant/tables', protect, authorize('restaurant'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user.id });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const { number, maxGuests, description } = req.body;
    
    const existingTable = await Table.findOne({ restaurantId: restaurant._id, number });
    if (existingTable) return res.status(400).json({ message: 'Table number already exists' });

    const table = new Table({
      restaurantId: restaurant._id,
      number,
      maxGuests,
      description
    });
    await table.save();
    res.status(201).json(table);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/restaurant/tables/:id', protect, authorize('restaurant'), async (req, res) => {
  try {
    const restaurant = await Restaurant.findOne({ ownerId: req.user.id });
    if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

    const table = await Table.findOneAndDelete({ _id: req.params.id, restaurantId: restaurant._id });
    if (!table) return res.status(404).json({ message: 'Table not found' });

    res.json({ message: 'Table removed' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

