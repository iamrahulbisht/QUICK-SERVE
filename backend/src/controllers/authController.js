const User = require('../models/User');
const jwt = require('jsonwebtoken');

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Register new user
exports.signup = async (req, res) => {
    try {
        const { name, email, username, mobile, password, role } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: userExists.email === email ? 'Email already exists' : 'Username already taken'
            });
        }

        const user = await User.create({
            name,
            email,
            username,
            mobile,
            password,
            role: role || 'customer'
        });

        res.status(201).json({
            success: true,
            message: 'Account created successfully!'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Login user
exports.login = async (req, res) => {
    try {
        const { identifier, password, role } = req.body;

        const user = await User.findOne({
            $or: [{ email: identifier }, { username: identifier }]
        });

        if (!user) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        if (user.role !== role) {
            return res.status(401).json({
                success: false,
                error: `This account is registered as ${user.role === 'admin' ? 'Admin' : 'Customer'}. Please select the correct role.`
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get current user
exports.getMe = async (req, res) => {
    res.json({
        success: true,
        user: req.user
    });
};