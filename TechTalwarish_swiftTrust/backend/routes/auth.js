'use strict';

const express = require('express');
const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const router  = express.Router();

const signToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ error: 'username, email and password are required' });

        const exists = await User.findOne({ email });
        if (exists) return res.status(409).json({ error: 'Email already registered' });

        // Only allow admin role if explicitly set (e.g. seeded)
        const assignedRole = ['citizen', 'verified_source'].includes(role) ? role : 'citizen';

        const user  = await User.create({ username, email, password, role: assignedRole });
        const token = signToken(user._id);

        res.status(201).json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role, trustScore: user.trustScore },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ error: 'email and password are required' });

        const user = await User.findOne({ email });
        if (!user || !(await user.matchPassword(password)))
            return res.status(401).json({ error: 'Invalid credentials' });

        if (user.banned) return res.status(403).json({ error: 'Account banned' });

        const token = signToken(user._id);
        res.json({
            token,
            user: { id: user._id, username: user.username, email: user.email, role: user.role, trustScore: user.trustScore },
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;