const mongoose = require('mongoose');

const systemSettingSchema = new mongoose.Schema({
  category: {
    type: String,
    required: true,
    enum: ['general', 'email', 'branding', 'features', 'security', 'api', 'backup'],
    index: true
  },
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  },
  dataType: {
    type: String,
    enum: ['string', 'number', 'boolean', 'object', 'array'],
    default: 'string'
  },
  description: {
    type: String,
    trim: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  isEditable: {
    type: Boolean,
    default: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

systemSettingSchema.pre('save', function() {
  this.updatedAt = Date.now();
});

systemSettingSchema.index({ category: 1, key: 1 });

module.exports = mongoose.model('SystemSetting', systemSettingSchema);
