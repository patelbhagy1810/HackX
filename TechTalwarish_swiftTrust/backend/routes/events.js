'use strict';

const express          = require('express');
const Event            = require('../models/Event');
const { protect, adminOnly } = require('../middleware/auth');
const router           = express.Router();

// GET /api/events — fetch all active truth objects
router.get('/', protect , async (req, res) => {
    try {
        const events = await Event.find({ active: true })
            .sort({ lastUpdated: -1 })
            .select('-reporters -sourceReports'); // strip internals from public response
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/events/:id — single event
router.get('/:id', protect, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) return res.status(404).json({ error: 'Event not found' });
        res.json(event);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/events/:id/resolve — Admin only
router.put('/:id/resolve', protect, adminOnly, async (req, res) => {
    try {
        const event = await Event.findByIdAndUpdate(
            req.params.id,
            { active: false, status: 'RESOLVED', lastUpdated: new Date() },
            { new: true }
        );
        if (!event) return res.status(404).json({ error: 'Event not found' });

        // Notify all clients
        const io = req.app.get('io');
        io.to('public').emit('event_update', event);
        io.to('admin').emit('admin_log', {
            timestamp: new Date().toLocaleTimeString(),
            message:   `✅ Event RESOLVED — "${event.eventName}"`,
            type:      'success',
        });

        res.json({ success: true, event });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
