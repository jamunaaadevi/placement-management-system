const express = require('express');
const router = express.Router();
const { getProfile, getAllUsers } = require('../controllers/userController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// GET /api/users/profile - Any authenticated user
router.get('/profile', authMiddleware, getProfile);

// GET /api/users/all - Admin only
router.get('/all', authMiddleware, requireRole('ADMIN'), getAllUsers);

module.exports = router;