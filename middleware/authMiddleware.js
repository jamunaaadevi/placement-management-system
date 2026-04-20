const jwt = require('jsonwebtoken');

// Verify JWT token and attach user info to request
const authMiddleware = (req, res, next) => {
    try {
        // 1. Get token from Authorization header
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ 
                success: false, 
                error: 'No token provided' 
            });
        }

        // 2. Extract token (format: "Bearer <token>")
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid token format' 
            });
        }

        // 3. Verify token signature and decode payload
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // decoded = { userId: 1, role: "STUDENT", iat: ..., exp: ... }

        // 4. Attach user info to request object
        req.user = {
            userId: decoded.userId,
            role: decoded.role
        };

        // 5. Move to next middleware/controller
        next();

    } catch (error) {
        // Token expired, invalid signature, or malformed
        return res.status(401).json({ 
            success: false, 
            error: 'Invalid or expired token' 
        });
    }
};
// Check if user has required role
const requireRole = (...allowedRoles) => {
    return (req, res, next) => {
        // req.user is already set by authMiddleware
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                error: 'Authentication required' 
            });
        }

        // Check if user's role is in the allowed roles
        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ 
                success: false, 
                error: 'Access forbidden: insufficient permissions' 
            });
        }

        next();
    };
};

// Export both
module.exports = { authMiddleware, requireRole };

