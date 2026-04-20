const db = require('../config/db');

// Apply to a drive
const applyToDrive = async (req, res) => {
    try {
        const studentId = req.user.userId;
        const driveId = req.params.driveId;

        // 1. Check if drive exists and is UPCOMING
        const [drives] = await db.query(
            'SELECT * FROM Drives WHERE drive_id = ? AND status = ?',
            [driveId, 'UPCOMING']
        );

        if (drives.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Drive not found or not available'
            });
        }

        const drive = drives[0];

        // 2. Check if deadline passed
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        if (drive.application_deadline < today) {
            return res.status(400).json({
                success: false,
                error: 'Application deadline has passed'
            });
        }

        // 3. Get student profile
        const [students] = await db.query(
            'SELECT * FROM StudentProfiles WHERE user_id = ?',
            [studentId]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Student profile not found. Please complete your profile first.'
            });
        }

        const student = students[0];

        // 4. Check if student is already placed (optional business rule)
        if (student.is_placed) {
            return res.status(403).json({
                success: false,
                error: 'You are already placed. Cannot apply to new drives.'
            });
        }

        // 5. Check eligibility: CGPA
        if (student.cgpa < drive.min_cgpa) {
            return res.status(403).json({
                success: false,
                error: `You do not meet the minimum CGPA requirement (${drive.min_cgpa})`
            });
        }

        // 6. Check eligibility: Backlogs
        if (student.backlogs > drive.max_backlogs) {
            return res.status(403).json({
                success: false,
                error: `You exceed the maximum backlogs allowed (${drive.max_backlogs})`
            });
        }

        // 7. Check eligibility: Department
        const [eligibleDepts] = await db.query(
            'SELECT * FROM DriveEligibleDepts WHERE drive_id = ? AND department = ?',
            [driveId, student.department]
        );

        if (eligibleDepts.length === 0) {
            return res.status(403).json({
                success: false,
                error: 'Your department is not eligible for this drive'
            });
        }

        // 8. Check if already applied
        const [existingApplications] = await db.query(
            'SELECT * FROM Applications WHERE student_id = ? AND drive_id = ?',
            [studentId, driveId]
        );

        if (existingApplications.length > 0) {
            return res.status(409).json({
                success: false,
                error: 'You have already applied to this drive'
            });
        }

        // 9. All checks passed - create application
        const [result] = await db.query(
            'INSERT INTO Applications (student_id, drive_id, status) VALUES (?, ?, ?)',
            [studentId, driveId, 'APPLIED']
        );

        res.status(201).json({
            success: true,
            message: 'Application submitted successfully',
            applicationId: result.insertId
        });

    } catch (error) {
        console.error('Apply to drive error:', error);
        
        // Handle duplicate application
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({
                success: false,
                error: 'You have already applied to this drive'
            });
        }

        res.status(500).json({
            success: false,
            error: 'Server error while submitting application'
        });
    }
};
// Get student's own applications
const getMyApplications = async (req, res) => {
    try {
        const studentId = req.user.userId;

        const [applications] = await db.query(
            `SELECT 
                a.application_id,
                a.status,
                a.applied_at,
                a.updated_at,
                d.drive_id,
                d.role_title,
                d.package_lpa,
                d.drive_date,
                d.application_deadline,
                cp.company_name,
                cp.industry
            FROM Applications a
            JOIN Drives d ON a.drive_id = d.drive_id
            JOIN Users u ON d.company_id = u.user_id
            JOIN CompanyProfiles cp ON u.user_id = cp.user_id
            WHERE a.student_id = ?
            ORDER BY a.applied_at DESC`,
            [studentId]
        );

        res.status(200).json({
            success: true,
            count: applications.length,
            applications: applications
        });

    } catch (error) {
        console.error('Get my applications error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Get all applications for a drive (admin only)
const getApplicationsForDrive = async (req, res) => {
    try {
        const driveId = req.params.driveId;

        // Check if drive exists
        const [drives] = await db.query(
            'SELECT * FROM Drives WHERE drive_id = ?',
            [driveId]
        );

        if (drives.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Drive not found'
            });
        }

        // Get all applications for this drive
        const [applications] = await db.query(
            `SELECT 
                a.application_id,
                a.status,
                a.applied_at,
                a.updated_at,
                u.user_id,
                u.name,
                u.email,
                sp.roll_number,
                sp.department,
                sp.cgpa,
                sp.tenth_percentage,
                sp.twelfth_percentage,
                sp.backlogs,
                sp.skills,
                sp.resume_link
            FROM Applications a
            JOIN Users u ON a.student_id = u.user_id
            JOIN StudentProfiles sp ON u.user_id = sp.user_id
            WHERE a.drive_id = ?
            ORDER BY sp.cgpa DESC, a.applied_at ASC`,
            [driveId]
        );

        res.status(200).json({
            success: true,
            driveId: parseInt(driveId),
            count: applications.length,
            applications: applications
        });

    } catch (error) {
        console.error('Get applications for drive error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};
// Update single application status (admin only)
const updateApplicationStatus = async (req, res) => {
    try {
        const applicationId = req.params.id;
        const { status } = req.body;

        // Valid status values
        const validStatuses = ['APPLIED', 'SHORTLISTED', 'ROUND_1', 'ROUND_2', 'ROUND_3', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Check if application exists
        const [applications] = await db.query(
            'SELECT * FROM Applications WHERE application_id = ?',
            [applicationId]
        );

        if (applications.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Application not found'
            });
        }

        const application = applications[0];

        // Update status
        await db.query(
            'UPDATE Applications SET status = ? WHERE application_id = ?',
            [status, applicationId]
        );

        // If status is SELECTED, create placement record and update student profile
        if (status === 'SELECTED') {
            // Get drive details
            const [drives] = await db.query(
                `SELECT d.*, cp.company_name 
                 FROM Drives d
                 JOIN Users u ON d.company_id = u.user_id
                 JOIN CompanyProfiles cp ON u.user_id = cp.user_id
                 WHERE d.drive_id = ?`,
                [application.drive_id]
            );

            const drive = drives[0];

            // Create placement record (check if not already exists)
            const [existingPlacement] = await db.query(
                'SELECT * FROM Placements WHERE application_id = ?',
                [applicationId]
            );

            if (existingPlacement.length === 0) {
                await db.query(
                    `INSERT INTO Placements (application_id, student_id, drive_id, company_name, role_title, package_lpa)
                     VALUES (?, ?, ?, ?, ?, ?)`,
                    [applicationId, application.student_id, application.drive_id, drive.company_name, drive.role_title, drive.package_lpa]
                );

                // Update student profile - mark as placed
                await db.query(
                    'UPDATE StudentProfiles SET is_placed = TRUE WHERE user_id = ?',
                    [application.student_id]
                );
            }
        }

        res.status(200).json({
            success: true,
            message: 'Application status updated successfully'
        });

    } catch (error) {
        console.error('Update application status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// Bulk update application statuses (admin only)
const bulkUpdateStatus = async (req, res) => {
    try {
        const { applicationIds, status } = req.body;

        // Validate input
        if (!applicationIds || !Array.isArray(applicationIds) || applicationIds.length === 0) {
            return res.status(400).json({
                success: false,
                error: 'applicationIds must be a non-empty array'
            });
        }

        const validStatuses = ['APPLIED', 'SHORTLISTED', 'ROUND_1', 'ROUND_2', 'ROUND_3', 'SELECTED', 'REJECTED', 'WITHDRAWN'];
        
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            });
        }

        // Update all applications
        const placeholders = applicationIds.map(() => '?').join(',');
        await db.query(
            `UPDATE Applications SET status = ? WHERE application_id IN (${placeholders})`,
            [status, ...applicationIds]
        );

        // If status is SELECTED, handle placements for all
        if (status === 'SELECTED') {
            for (const appId of applicationIds) {
                // Get application details
                const [apps] = await db.query(
                    'SELECT * FROM Applications WHERE application_id = ?',
                    [appId]
                );

                if (apps.length === 0) continue;

                const app = apps[0];

                // Get drive details
                const [drives] = await db.query(
                    `SELECT d.*, cp.company_name 
                     FROM Drives d
                     JOIN Users u ON d.company_id = u.user_id
                     JOIN CompanyProfiles cp ON u.user_id = cp.user_id
                     WHERE d.drive_id = ?`,
                    [app.drive_id]
                );

                if (drives.length === 0) continue;

                const drive = drives[0];

                // Create placement if not exists
                const [existingPlacement] = await db.query(
                    'SELECT * FROM Placements WHERE application_id = ?',
                    [appId]
                );

                if (existingPlacement.length === 0) {
                    await db.query(
                        `INSERT INTO Placements (application_id, student_id, drive_id, company_name, role_title, package_lpa)
                         VALUES (?, ?, ?, ?, ?, ?)`,
                        [appId, app.student_id, app.drive_id, drive.company_name, drive.role_title, drive.package_lpa]
                    );

                    // Mark student as placed
                    await db.query(
                        'UPDATE StudentProfiles SET is_placed = TRUE WHERE user_id = ?',
                        [app.student_id]
                    );
                }
            }
        }

        res.status(200).json({
            success: true,
            message: `Successfully updated ${applicationIds.length} applications to ${status}`
        });

    } catch (error) {
        console.error('Bulk update status error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

module.exports = { 
    applyToDrive,
    getMyApplications,
    getApplicationsForDrive,
    updateApplicationStatus,
    bulkUpdateStatus
};