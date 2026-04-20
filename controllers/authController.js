const bcrypt = require('bcrypt');
const db = require('../config/db');
const jwt = require('jsonwebtoken');

// Register new user
const register = async (req, res) => {
    try {
        const { name, email, password, phone, role } = req.body;

        // 1. Validate input (basic check)
        if (!name || !email || !password || !role) {
            return res.status(400).json({ 
                success: false, 
                error: 'Name, email, password, and role are required' 
            });
        }

        // 2. Check if user already exists
        const [existingUser] = await db.query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );

        if (existingUser.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'Email already registered' 
            });
        }

        // 3. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Insert user into database
        const [result] = await db.query(
            'INSERT INTO Users (name, email, password_hash, phone, role) VALUES (?, ?, ?, ?, ?)',
            [name, email, hashedPassword, phone, role]
        );

        // 5. Send success response
        res.status(201).json({
            success: true,
            message: 'User registered successfully',
            userId: result.insertId
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error during registration' 
        });
    }
};



// Login user
const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                success: false, 
                error: 'Email and password are required' 
            });
        }

        // 2. Check if user exists
        const [users] = await db.query(
            'SELECT * FROM Users WHERE email = ?',
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        const user = users[0];  // Get the first (and only) user

        // 3. Compare password with stored hash
        const isPasswordCorrect = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                success: false, 
                error: 'Invalid credentials' 
            });
        }

        // 4. Generate JWT token
        const token = jwt.sign(
            { userId: user.user_id, role: user.role },  // Payload
            process.env.JWT_SECRET,                      // Secret key
            { expiresIn: '24h' }                         // Options
        );

        // 5. Send token back
        res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                userId: user.user_id,
                name: user.name,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Server error during login' 
        });
    }
};

// Export both functions
module.exports = { register, login };