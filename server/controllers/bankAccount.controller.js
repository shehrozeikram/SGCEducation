const BankAccount = require('../models/BankAccount');
const { ApiError } = require('../middleware/error.middleware');
const { getInstitutionId } = require('../utils/userUtils');

/**
 * @desc    Get all bank accounts
 * @route   GET /api/v1/bank-accounts
 * @access  Private
 */
exports.getBankAccounts = async (req, res, next) => {
  try {
    const institutionId = getInstitutionId(req.user);
    
    // Build query based on user role and filters
    const query = {};
    if (req.user.role !== 'super_admin' && institutionId) {
      query.institutions = institutionId;
    } else if (req.query.institution) {
      query.institutions = req.query.institution;
    }

    if (req.query.isActive !== undefined) {
      query.isActive = req.query.isActive === 'true';
    } else {
      // By default, return only active accounts unless specified
      query.isActive = true;
    }

    const bankAccounts = await BankAccount.find(query)
      .populate('institutions', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: bankAccounts.length,
      data: bankAccounts
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single bank account
 * @route   GET /api/v1/bank-accounts/:id
 * @access  Private
 */
exports.getBankAccount = async (req, res, next) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id)
      .populate('institutions', 'name code')
      .populate('createdBy', 'name email');

    if (!bankAccount) {
      throw new ApiError(404, `Bank account not found with id of ${req.params.id}`);
    }

    res.status(200).json({
      success: true,
      data: bankAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new bank account
 * @route   POST /api/v1/bank-accounts
 * @access  Private (Super Admin)
 */
exports.createBankAccount = async (req, res, next) => {
  try {
    // Only super admin can create bank accounts for now or institution admins
    if (req.user.role !== 'super_admin') {
      const institutionId = getInstitutionId(req.user);
      if (institutionId) {
        // Only override if the user didn't specify or if they are not allowed to set multiple
        req.body.institutions = [institutionId];
      }
    } else {
      // Ensure institutions is an array
      if (req.body.institutions && !Array.isArray(req.body.institutions)) {
        req.body.institutions = [req.body.institutions];
      } else if (!req.body.institutions) {
        req.body.institutions = [];
      }
    }

    // Add user to req.body
    req.body.createdBy = req.user.id;

    const bankAccount = await BankAccount.create(req.body);

    res.status(201).json({
      success: true,
      data: bankAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bank account
 * @route   PUT /api/v1/bank-accounts/:id
 * @access  Private (Super Admin)
 */
exports.updateBankAccount = async (req, res, next) => {
  try {
    let bankAccount = await BankAccount.findById(req.params.id);

    if (!bankAccount) {
      throw new ApiError(404, `Bank account not found with id of ${req.params.id}`);
    }

    // If not super admin, ensure they can't change the institutions array to ones they don't own
    if (req.user.role !== 'super_admin') {
      const institutionId = getInstitutionId(req.user);
      if (institutionId && req.body.institutions) {
         req.body.institutions = [institutionId];
      }
    } else {
      // Ensure institutions is an array
      if (req.body.institutions && !Array.isArray(req.body.institutions)) {
        req.body.institutions = [req.body.institutions];
      }
    }

    bankAccount = await BankAccount.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      data: bankAccount
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete bank account
 * @route   DELETE /api/v1/bank-accounts/:id
 * @access  Private (Super Admin)
 */
exports.deleteBankAccount = async (req, res, next) => {
  try {
    const bankAccount = await BankAccount.findById(req.params.id);

    if (!bankAccount) {
      throw new ApiError(404, `Bank account not found with id of ${req.params.id}`);
    }

    await bankAccount.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};
