'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Not authorised — no token' });
    }
    try {
        const token   = auth.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user      = await User.findById(decoded.id).select('-password');
        if (!req.user)       return res.status(401).json({ error: 'User not found' });
        if (req.user.banned) return res.status(403).json({ error: 'Account banned' });
        next();
    } catch {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user?.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

module.exports = { protect, adminOnly };