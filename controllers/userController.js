const db = require('../config/db');

// Get current user's profile (protected route)
const getProfile = async (req, res) => {
    try {
        // req.user.userId is available because authMiddleware ran first
        const userId = req.user.userId;

        const [users] = await db.query(
            'SELECT user_id, name, email, phone, role, created_at FROM Users WHERE user_id = ?',
            [userId]
        );

        if (users.length === 0) {
            return res.status(404).json({ 
                success: false, 
                error: 'User not found' 
            });
        }

        res.status(200).json({
            success: true,
            user: users[0]
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
};

// Admin-only route (for testing role-based access)
const getAllUsers = async (req, res) => {
    try {
        const [users] = await db.query(
            'SELECT user_id, name, email, role, created_at FROM Users'
        );

        res.status(200).json({
            success: true,
            count: users.length,
            users: users
        });

    } catch (error) {
        console.error('Get all users error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error' 
        });
    }
};

module.exports = { getProfile, getAllUsers };