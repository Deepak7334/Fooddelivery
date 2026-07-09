const mongoose = require('mongoose');

const profileAuditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  changes: [
    {
      field: {
        type: String,
        required: true,
      },
      oldValue: {
        type: String,
        default: '',
      },
      newValue: {
        type: String,
        default: '',
      },
    }
  ],
}, { timestamps: true });

module.exports = mongoose.model('ProfileAuditLog', profileAuditLogSchema);
