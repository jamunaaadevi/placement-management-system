const express = require('express');
const router = express.Router();
const { 
    applyToDrive,
    getMyApplications,
    getApplicationsForDrive,
    updateApplicationStatus,
    bulkUpdateStatus
} = require('../controllers/applicationController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// GET /api/applications/my
router.get('/my', authMiddleware, requireRole('STUDENT'), getMyApplications);

// GET /api/applications/drive/:driveId
router.get('/drive/:driveId', authMiddleware, requireRole('ADMIN'), getApplicationsForDrive);

// PATCH /api/applications/bulk-status
router.patch('/bulk-status', authMiddleware, requireRole('ADMIN'), bulkUpdateStatus);

// PATCH /api/applications/:id/status
router.patch('/:id/status', authMiddleware, requireRole('ADMIN'), updateApplicationStatus);

// POST /api/applications/:driveId
router.post('/:driveId', authMiddleware, requireRole('STUDENT'), applyToDrive);

module.exports = router;