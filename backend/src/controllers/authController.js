const User = require('../models/User');
const jwt = require('jsonwebtoken');

const ADMIN_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'ADMIN123';

// Generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE
    });
};

// Register new user
exports.signup = async (req, res) => {
    try {
        const { name, email, username, mobile, password, role, adminAccessCode } = req.body;

        const userExists = await User.findOne({ $or: [{ email }, { username }] });
        
        if (userExists) {
            return res.status(400).json({
                success: false,
                error: userExists.email === email ? 'Email already exists' : 'Username already taken'
            });
        }

        let finalRole = 'customer';

        if (role === 'admin') {
            if (!adminAccessCode || adminAccessCode !== ADMIN_ACCESS_CODE) {
                return res.status(403).json({
                    success: false,
                    error: 'Invalid admin access code'
                });
            }
            finalRole = 'admin';
        }

        const user = await User.create({
            name,
            email,
            username,
            mobile,
            password,
            role: finalRole
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

// Update user profile
exports.updateProfile = async (req, res) => {
    try {
        const { name, email, mobile, currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // Check if email or username is being changed and if it's already taken
        if (email && email !== user.email) {
            const emailExists = await User.findOne({ email });
            if (emailExists) {
                return res.status(400).json({
                    success: false,
                    error: 'Email already in use'
                });
            }
        }

        // Update basic info
        if (name) user.name = name;
        if (email) user.email = email;
        if (mobile) user.mobile = mobile;

        // Handle password change
        if (currentPassword && newPassword) {
            const isMatch = await user.comparePassword(currentPassword);
            if (!isMatch) {
                return res.status(401).json({
                    success: false,
                    error: 'Current password is incorrect'
                });
            }
            user.password = newPassword;
        }

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                username: user.username,
                mobile: user.mobile,
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