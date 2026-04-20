const express = require('express');
const router = express.Router();
const {
    createDrive,
    getAllDrives,
    getEligibleDrives,
    getDriveById
} = require('../controllers/driveController');

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// POST /api/drives - Create drive (company or admin only)
router.post('/', authMiddleware, requireRole('COMPANY', 'ADMIN'), createDrive);

// GET /api/drives - Get all upcoming drives (any authenticated user)
router.get('/', authMiddleware, getAllDrives);

// GET /api/drives/eligible - Get eligible drives (student only)
router.get('/eligible', authMiddleware, requireRole('STUDENT'), getEligibleDrives);

// GET /api/drives/:id - Get single drive details
router.get('/:id', authMiddleware, getDriveById);

module.exports = router;