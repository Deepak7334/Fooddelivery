# Table Booking System Implementation TODO

## Plan Summary
Add table booking system with time slots per table + notifications. Frontend: Booking/ (pages/, components/, services/, utils/). Backend: Models (Table, Booking), routes/booking.js, updates to Restaurant model/routes. Integration: Book button in RestaurantDetailPage.

## Steps (12 total)
- [x] **1. Create TODO.md** - Track progress (2024)
- [x] **2. Create frontend/src/pages/Booking/services/bookingApi.js** - API wrappers
- [x] **3. Create frontend/src/pages/Booking/utils/bookingUtils.js** - Helpers (time slots, validation)
- [x] **4. Create frontend/src/pages/Booking/components/BookingForm.jsx** - Booking form component
- [x] **5. Create frontend/src/pages/Booking/components/TableTimeSlots.jsx** - Time slots display
- [x] **6. Create frontend/src/pages/Booking/components/AvailabilityCalendar.jsx** - Calendar view
- [x] **7. Create frontend/src/pages/Booking/pages/TableBookingPage.jsx** - Main booking page
- [x] **8. Backend: Create backend/models/Table.js & backend/models/Booking.js**
- [x] **9. Backend: Create backend/routes/booking.js** + update server.js
- [x] **10. Edit frontend/src/App.jsx** - Add /booking/:restaurantId route
- [x] **11. Edit frontend/src/pages/customer/RestaurantDetailPage.jsx** - Add Book Table button
- [x] **12. Backend edits** - Restaurant.js model, customer.js/restaurant.js routes
- [ ] **13. Test** - npm run dev, node backend/server.js, end-to-end booking + notifications

**Instructions:** Update this file after each major step. Use checkboxes [x]. Run commands to test.

**Progress:** 12/13 complete ✅
