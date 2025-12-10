const SystemSetting = require('../models/SystemSetting');
const { ApiError } = require('../middleware/error.middleware');

/**
 * System Settings Service
 */
class SystemSettingService {
  /**
   * Get all settings
   */
  async getAllSettings(category = null, includePrivate = false) {
    const query = {};

    if (category) {
      query.category = category;
    }

    if (!includePrivate) {
      query.isPublic = true;
    }

    const settings = await SystemSetting.find(query).sort({ category: 1, key: 1 });

    return settings;
  }

  /**
   * Get settings grouped by category
   */
  async getSettingsByCategory() {
    const settings = await SystemSetting.find().sort({ category: 1, key: 1 });

    const grouped = {};
    settings.forEach(setting => {
      if (!grouped[setting.category]) {
        grouped[setting.category] = [];
      }
      grouped[setting.category].push(setting);
    });

    return grouped;
  }

  /**
   * Get single setting
   */
  async getSetting(key) {
    const setting = await SystemSetting.findOne({ key });

    if (!setting) {
      throw new ApiError(404, 'Setting not found');
    }

    return setting;
  }

  /**
   * Get setting value
   */
  async getSettingValue(key, defaultValue = null) {
    const setting = await SystemSetting.findOne({ key });
    return setting ? setting.value : defaultValue;
  }

  /**
   * Create setting
   */
  async createSetting(data, currentUser) {
    const existing = await SystemSetting.findOne({ key: data.key });

    if (existing) {
      throw new ApiError(400, 'Setting with this key already exists');
    }

    const setting = await SystemSetting.create({
      ...data,
      updatedBy: currentUser.id
    });

    return setting;
  }

  /**
   * Update setting
   */
  async updateSetting(key, value, currentUser) {
    const setting = await SystemSetting.findOne({ key });

    if (!setting) {
      throw new ApiError(404, 'Setting not found');
    }

    if (!setting.isEditable) {
      throw new ApiError(403, 'This setting cannot be edited');
    }

    setting.value = value;
    setting.updatedBy = currentUser.id;
    await setting.save();

    return setting;
  }

  /**
   * Update multiple settings
   */
  async updateMultipleSettings(updates, currentUser) {
    const results = [];

    for (const update of updates) {
      try {
        const setting = await this.updateSetting(update.key, update.value, currentUser);
        results.push({ key: update.key, success: true, setting });
      } catch (error) {
        results.push({ key: update.key, success: false, error: error.message });
      }
    }

    return results;
  }

  /**
   * Delete setting
   */
  async deleteSetting(key, currentUser) {
    const setting = await SystemSetting.findOne({ key });

    if (!setting) {
      throw new ApiError(404, 'Setting not found');
    }

    if (!setting.isEditable) {
      throw new ApiError(403, 'This setting cannot be deleted');
    }

    await SystemSetting.deleteOne({ key });

    return { message: 'Setting deleted successfully' };
  }

  /**
   * Initialize default settings
   */
  async initializeDefaultSettings() {
    const defaults = [
      {
        category: 'general',
        key: 'site_name',
        value: 'SGC Education',
        dataType: 'string',
        description: 'Name of the application',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'general',
        key: 'site_description',
        value: 'School and College Management System',
        dataType: 'string',
        description: 'Description of the application',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'email',
        key: 'smtp_host',
        value: 'smtp.gmail.com',
        dataType: 'string',
        description: 'SMTP server host',
        isPublic: false,
        isEditable: true
      },
      {
        category: 'email',
        key: 'smtp_port',
        value: 587,
        dataType: 'number',
        description: 'SMTP server port',
        isPublic: false,
        isEditable: true
      },
      {
        category: 'email',
        key: 'smtp_user',
        value: '',
        dataType: 'string',
        description: 'SMTP username',
        isPublic: false,
        isEditable: true
      },
      {
        category: 'email',
        key: 'from_email',
        value: 'noreply@sgceducation.com',
        dataType: 'string',
        description: 'From email address',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'branding',
        key: 'primary_color',
        value: '#667eea',
        dataType: 'string',
        description: 'Primary brand color',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'branding',
        key: 'secondary_color',
        value: '#764ba2',
        dataType: 'string',
        description: 'Secondary brand color',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'branding',
        key: 'logo_url',
        value: '/logo.png',
        dataType: 'string',
        description: 'Logo URL',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'features',
        key: 'enable_notifications',
        value: true,
        dataType: 'boolean',
        description: 'Enable notifications feature',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'features',
        key: 'enable_financial',
        value: true,
        dataType: 'boolean',
        description: 'Enable financial management',
        isPublic: true,
        isEditable: true
      },
      {
        category: 'security',
        key: 'session_timeout',
        value: 3600,
        dataType: 'number',
        description: 'Session timeout in seconds',
        isPublic: false,
        isEditable: true
      },
      {
        category: 'security',
        key: 'max_login_attempts',
        value: 5,
        dataType: 'number',
        description: 'Maximum login attempts before lockout',
        isPublic: false,
        isEditable: true
      }
    ];

    const results = [];

    for (const defaultSetting of defaults) {
      const existing = await SystemSetting.findOne({ key: defaultSetting.key });
      if (!existing) {
        const created = await SystemSetting.create(defaultSetting);
        results.push(created);
      }
    }

    return results;
  }
}

module.exports = new SystemSettingService();
