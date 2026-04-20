const db = require('../config/db');

// Create new drive (company or admin)
const createDrive = async (req, res) => {
    try {
        const companyId = req.user.userId;  // From authMiddleware
        const {
            role_title,
            package_lpa,
            description,
            min_cgpa,
            max_backlogs,
            drive_date,
            application_deadline,
            eligible_departments  // Array: ['CSE', 'IT', 'ECE']
        } = req.body;

        // 1. Validate input
        if (!role_title || !package_lpa || !eligible_departments || eligible_departments.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Role title, package, and eligible departments are required'
            });
        }

        // 2. Insert drive
        const [result] = await db.query(
            `INSERT INTO Drives (company_id, role_title, package_lpa, description, min_cgpa, max_backlogs, drive_date, application_deadline)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [companyId, role_title, package_lpa, description, min_cgpa || 0, max_backlogs || 0, drive_date, application_deadline]
        );

        const driveId = result.insertId;

        // 3. Insert eligible departments
        const deptValues = eligible_departments.map(dept => [driveId, dept]);
        await db.query(
            'INSERT INTO DriveEligibleDepts (drive_id, department) VALUES ?',
            [deptValues]
        );

        res.status(201).json({
            success: true,
            message: 'Drive created successfully',
            driveId: driveId
        });

    } catch (error) {
        console.error('Create drive error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error while creating drive'
        });
    }
};

// Get all upcoming drives
const getAllDrives = async (req, res) => {
    try {
        const [drives] = await db.query(
            `SELECT 
                d.drive_id,
                d.role_title,
                d.package_lpa,
                d.description,
                d.min_cgpa,
                d.max_backlogs,
                d.drive_date,
                d.application_deadline,
                d.status,
                d.created_at,
                cp.company_name,
                cp.industry,
                GROUP_CONCAT(ded.department) as eligible_departments
            FROM Drives d
            JOIN Users u ON d.company_id = u.user_id
            JOIN CompanyProfiles cp ON u.user_id = cp.user_id
            LEFT JOIN DriveEligibleDepts ded ON d.drive_id = ded.drive_id
            WHERE d.status = 'UPCOMING'
            GROUP BY d.drive_id
            ORDER BY d.application_deadline ASC`
        );

        res.status(200).json({
            success: true,
            count: drives.length,
            drives: drives
        });

    } catch (error) {
        console.error('Get drives error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Get eligible drives for logged-in student
const getEligibleDrives = async (req, res) => {
    try {
        const studentId = req.user.userId;

        // 1. Get student's profile
        const [students] = await db.query(
            'SELECT department, cgpa, backlogs FROM StudentProfiles WHERE user_id = ?',
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student profile not found'
            });
        }

        const { department, cgpa, backlogs } = students[0];

        // 2. Get drives where:
        // - Student's CGPA >= drive's min_cgpa
        // - Student's backlogs <= drive's max_backlogs
        // - Student's department is in eligible departments
        // - Deadline not passed
        // - Status is UPCOMING
        const [drives] = await db.query(
            `SELECT 
                d.drive_id,
                d.role_title,
                d.package_lpa,
                d.description,
                d.min_cgpa,
                d.max_backlogs,
                d.drive_date,
                d.application_deadline,
                d.status,
                cp.company_name,
                cp.industry,
                GROUP_CONCAT(ded.department) as eligible_departments
            FROM Drives d
            JOIN Users u ON d.company_id = u.user_id
            JOIN CompanyProfiles cp ON u.user_id = cp.user_id
            JOIN DriveEligibleDepts ded ON d.drive_id = ded.drive_id
            WHERE d.status = 'UPCOMING'
            AND d.application_deadline >= CURDATE()
            AND d.min_cgpa <= ?
            AND d.max_backlogs >= ?
            AND ded.department = ?
            GROUP BY d.drive_id
            ORDER BY d.application_deadline ASC`,
            [cgpa, backlogs, department]
        );

        res.status(200).json({
            success: true,
            count: drives.length,
            studentInfo: { department, cgpa, backlogs },
            drives: drives
        });

    } catch (error) {
        console.error('Get eligible drives error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Get single drive details
const getDriveById = async (req, res) => {
    try {
        const driveId = req.params.id;

        const [drives] = await db.query(
            `SELECT 
                d.*,
                cp.company_name,
                cp.industry,
                cp.website,
                cp.description as company_description,
                GROUP_CONCAT(ded.department) as eligible_departments
            FROM Drives d
            JOIN Users u ON d.company_id = u.user_id
            JOIN CompanyProfiles cp ON u.user_id = cp.user_id
            LEFT JOIN DriveEligibleDepts ded ON d.drive_id = ded.drive_id
            WHERE d.drive_id = ?
            GROUP BY d.drive_id`,
            [driveId]
        );

        if (drives.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Drive not found'
            });
        }

        res.status(200).json({
            success: true,
            drive: drives[0]
        });

    } catch (error) {
        console.error('Get drive by ID error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

module.exports = {
    createDrive,
    getAllDrives,
    getEligibleDrives,
    getDriveById
};