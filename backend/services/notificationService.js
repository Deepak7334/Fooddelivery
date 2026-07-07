const admin = require('./firebase');
const Notification = require('../models/Notification');
const User = require('../models/User');

class NotificationService {
  /**
   * Internal method to send notification via Socket.IO and/or FCM
   * and save it to the database.
   */
  static async sendNotification(userId, title, body, type, io) {
    try {
      // 1. Save to Database
      const notification = await Notification.create({
        userId,
        title,
        body,
        type,
      });

      // 2. Fetch User to get FCM Token
      const user = await User.findById(userId);

      // 3. Emit via Socket.IO if user is online
      if (io) {
        io.to(`user_${userId}`).emit('notification', notification);
      }

      // 4. Send via FCM if token exists
      if (user && user.fcmToken && admin.apps.length > 0) {
        const message = {
          notification: {
            title,
            body,
          },
          data: {
            type,
            notificationId: notification._id.toString(),
            url: '/', // Default URL to open when clicking the notification
          },
          token: user.fcmToken,
          android: {
            notification: {
              sound: 'default'
            }
          },
          apns: {
            payload: {
              aps: {
                sound: 'default'
              }
            }
          }
        };

        try {
          await admin.messaging().send(message);
        } catch (fcmError) {
          console.error(`FCM send error for user ${userId}:`, fcmError);
          // If token is invalid or unregistered, we could clear it here
          if (
            fcmError.code === 'messaging/invalid-registration-token' ||
            fcmError.code === 'messaging/registration-token-not-registered'
          ) {
            await User.findByIdAndUpdate(userId, { $set: { fcmToken: null } });
          }
        }
      }

      return notification;
    } catch (error) {
      console.error('Error in sendNotification service:', error);
      throw error;
    }
  }

  static async sendToRestaurant(restaurantId, title, body, type, io) {
    // Find all users associated with this restaurant (e.g., restaurant owner/staff)
    const users = await User.find({ restaurantId, role: 'restaurant' });
    const promises = users.map(user => 
      this.sendNotification(user._id, title, body, type, io)
    );
    await Promise.all(promises);
  }

  static async sendToStore(storeId, title, body, type, io) {
    // Find store owner associated with this store
    const users = await User.find({ storeId, role: 'store_owner' });
    const promises = users.map(user => 
      this.sendNotification(user._id, title, body, type, io)
    );
    await Promise.all(promises);
  }

  static async sendToCustomer(customerId, title, body, type, io) {
    await this.sendNotification(customerId, title, body, type, io);
  }

  static async sendToDeliveryPartner(partnerId, title, body, type, io) {
    await this.sendNotification(partnerId, title, body, type, io);
  }

  static async sendToAdmin(title, body, type, io) {
    // Find all admins
    const admins = await User.find({ role: 'admin' });
    const promises = admins.map(admin => 
      this.sendNotification(admin._id, title, body, type, io)
    );
    await Promise.all(promises);
  }
}

module.exports = NotificationService;
