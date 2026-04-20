const express = require('express');
const router = express.Router();
const {
    getBasicStats,
    getTopCompaniesByPlacements,
    getDepartmentWiseStats,
    getCompanySelectionRatio,
    getUnplacedWithMultipleApplications
} = require('../controllers/statsController');

const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// GET /api/stats - Basic placement statistics (public or authenticated)
router.get('/', authMiddleware, getBasicStats);

// GET /api/stats/top-companies - Top companies by placements
router.get('/top-companies', authMiddleware, getTopCompaniesByPlacements);

// GET /api/stats/departments - Department-wise statistics
router.get('/departments', authMiddleware, getDepartmentWiseStats);

// GET /api/stats/selection-ratio - Company selection ratios
router.get('/selection-ratio', authMiddleware, getCompanySelectionRatio);

// GET /api/stats/unplaced-active - Unplaced students with multiple applications (admin only)
router.get('/unplaced-active', authMiddleware, requireRole('ADMIN'), getUnplacedWithMultipleApplications);

module.exports = router;