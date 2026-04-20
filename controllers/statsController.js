const db = require('../config/db');

// Basic placement statistics
const getBasicStats = async (req, res) => {
    try {
        // Total placed students
        const [placedCount] = await db.query(
            'SELECT COUNT(DISTINCT student_id) as total_placed FROM Placements'
        );

        // Total unplaced students
        const [unplacedCount] = await db.query(
            'SELECT COUNT(*) as total_unplaced FROM StudentProfiles WHERE is_placed = FALSE'
        );

        // Average package
        const [avgPackage] = await db.query(
            'SELECT ROUND(AVG(package_lpa), 2) as avg_package FROM Placements'
        );

        // Highest package
        const [highestPackage] = await db.query(
            'SELECT MAX(package_lpa) as highest_package FROM Placements'
        );

        // Total applications
        const [totalApps] = await db.query(
            'SELECT COUNT(*) as total_applications FROM Applications'
        );

        // Total drives
        const [totalDrives] = await db.query(
            'SELECT COUNT(*) as total_drives FROM Drives'
        );

        res.status(200).json({
            success: true,
            stats: {
                total_placed: placedCount[0].total_placed || 0,
                total_unplaced: unplacedCount[0].total_unplaced || 0,
                avg_package: avgPackage[0].avg_package || 0,
                highest_package: highestPackage[0].highest_package || 0,
                total_applications: totalApps[0].total_applications || 0,
                total_drives: totalDrives[0].total_drives || 0
            }
        });

    } catch (error) {
        console.error('Get basic stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Top companies by placements
const getTopCompaniesByPlacements = async (req, res) => {
    try {
        const limit = req.query.limit || 5;

        const [companies] = await db.query(
            `SELECT 
                company_name,
                COUNT(*) as placements_count,
                ROUND(AVG(package_lpa), 2) as avg_package,
                MAX(package_lpa) as highest_package
            FROM Placements
            GROUP BY company_name
            ORDER BY placements_count DESC, avg_package DESC
            LIMIT ?`,
            [parseInt(limit)]
        );

        res.status(200).json({
            success: true,
            count: companies.length,
            companies: companies
        });

    } catch (error) {
        console.error('Get top companies error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Department-wise placement statistics
const getDepartmentWiseStats = async (req, res) => {
    try {
        const [stats] = await db.query(
            `SELECT 
                sp.department,
                COUNT(*) as total_students,
                SUM(CASE WHEN sp.is_placed = TRUE THEN 1 ELSE 0 END) as placed_count,
                ROUND(SUM(CASE WHEN sp.is_placed = TRUE THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 2) as placement_percentage,
                ROUND(AVG(CASE WHEN p.package_lpa IS NOT NULL THEN p.package_lpa END), 2) as avg_package
            FROM StudentProfiles sp
            LEFT JOIN Placements p ON sp.user_id = p.student_id
            GROUP BY sp.department
            ORDER BY placement_percentage DESC`
        );

        res.status(200).json({
            success: true,
            count: stats.length,
            departments: stats
        });

    } catch (error) {
        console.error('Get department stats error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Company-wise selection ratio (selected / total applied)
const getCompanySelectionRatio = async (req, res) => {
    try {
        const [ratios] = await db.query(
            `SELECT 
                cp.company_name,
                d.drive_id,
                d.role_title,
                COUNT(a.application_id) as total_applications,
                SUM(CASE WHEN a.status = 'SELECTED' THEN 1 ELSE 0 END) as selected_count,
                ROUND(SUM(CASE WHEN a.status = 'SELECTED' THEN 1 ELSE 0 END) * 100.0 / COUNT(a.application_id), 2) as selection_percentage
            FROM Drives d
            JOIN Users u ON d.company_id = u.user_id
            JOIN CompanyProfiles cp ON u.user_id = cp.user_id
            LEFT JOIN Applications a ON d.drive_id = a.drive_id
            GROUP BY d.drive_id, cp.company_name, d.role_title
            HAVING total_applications > 0
            ORDER BY selection_percentage DESC`
        );

        res.status(200).json({
            success: true,
            count: ratios.length,
            drives: ratios
        });

    } catch (error) {
        console.error('Get selection ratio error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Students with multiple applications but still unplaced
const getUnplacedWithMultipleApplications = async (req, res) => {
    try {
        const minApplications = req.query.min || 3;

        const [students] = await db.query(
            `SELECT 
                u.user_id,
                u.name,
                u.email,
                sp.department,
                sp.cgpa,
                sp.backlogs,
                COUNT(a.application_id) as total_applications,
                SUM(CASE WHEN a.status = 'REJECTED' THEN 1 ELSE 0 END) as rejected_count,
                MAX(a.status) as latest_status
            FROM Users u
            JOIN StudentProfiles sp ON u.user_id = sp.user_id
            JOIN Applications a ON u.user_id = a.student_id
            WHERE sp.is_placed = FALSE
            GROUP BY u.user_id, u.name, u.email, sp.department, sp.cgpa, sp.backlogs
            HAVING total_applications >= ?
            ORDER BY total_applications DESC, sp.cgpa DESC`,
            [parseInt(minApplications)]
        );

        res.status(200).json({
            success: true,
            count: students.length,
            students: students
        });

    } catch (error) {
        console.error('Get unplaced with multiple applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

module.exports = {
    getBasicStats,
    getTopCompaniesByPlacements,
    getDepartmentWiseStats,
    getCompanySelectionRatio,
    getUnplacedWithMultipleApplications
};