'use strict';

const express                = require('express');
const User                   = require('../models/User');
const Event                  = require('../models/Event');
const { protect, adminOnly } = require('../middleware/auth');
const router                 = express.Router();

// All admin routes require auth + admin role
router.use(protect, adminOnly);

// GET /api/admin/users
router.get('/users',  protect, adminOnly, async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/admin/users/:id — ban or promote
router.put('/users/:id', protect, adminOnly, async (req, res) => {
    try {
        const { banned, role } = req.body;
        const update = {};
        if (typeof banned === 'boolean') update.banned = banned;
        if (['citizen', 'verified_source', 'admin'].includes(role)) update.role = role;

        const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select('-password');
        if (!user) return res.status(404).json({ error: 'User not found' });

        const io = req.app.get('io');
        io.to('admin').emit('admin_log', {
            timestamp: new Date().toLocaleTimeString(),
            message:   `👤 User "${user.username}" updated — ${JSON.stringify(update)}`,
            type:      'info',
        });

        res.json({ success: true, user });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/events — all events including resolved
router.get('/events', protect, adminOnly, async (req, res) => {
    try {
        const events = await Event.find().sort({ lastUpdated: -1 });
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/admin/stats
router.get('/stats', protect, adminOnly, async (req, res) => {
    try {
        const [totalUsers, activeEvents, totalEvents] = await Promise.all([
            User.countDocuments(),
            Event.countDocuments({ active: true }),
            Event.countDocuments(),
        ]);
        res.json({ totalUsers, activeEvents, totalEvents });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
