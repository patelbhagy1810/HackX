'use strict';

const express              = require('express');
const { protect }          = require('../middleware/auth');
const upload               = require('../middleware/upload');
const { uploadToCloudinary } = require('../config/cloudinary');
const Report               = require('../models/Report');
const { runTruthEngine }   = require('../engine_core/truthEngine');
const router               = express.Router();

const createReport = (req, res) => {
    res.send("Report created");
};
// POST /api/reports
// Headers: Authorization: Bearer <token>
// Form-Data: title, description, lat, lng, eventDate, severity, image (File)
router.post('/', protect, upload.single('image'), async (req, res) => {
    const io = req.app.get('io');

    try {
        const { title, description, lat, lng, eventDate, severity } = req.body;

        if (!title || !lat || !lng)
            return res.status(400).json({ error: 'title, lat and lng are required' });

        const parsedLat = parseFloat(lat);
        const parsedLng = parseFloat(lng);
        if (isNaN(parsedLat) || isNaN(parsedLng))
            return res.status(400).json({ error: 'lat and lng must be valid numbers' });

        // ── Image handling ──
        let imageUrl    = null;
        let imageBuffer = null;

        if (req.file) {
            imageBuffer = req.file.buffer;
            // Upload to Cloudinary for storage
            imageUrl = await uploadToCloudinary(imageBuffer, 'swifttrust/reports');
        }

        // ── Save raw report ──
        const savedReport = await Report.create({
            userId:       req.user._id,
            userRole:     req.user.role,
            title:        title.trim(),
            description:  description?.trim() ?? '',
            location: {
                type:        'Point',
                coordinates: [parsedLng, parsedLat],
            },
            imageUrl,
            eventDate:    eventDate ? new Date(eventDate) : new Date(),
            userSeverity: severity?.toUpperCase() || 'LOW',
        });

        // ── Build engine input ──
        const reportInput = {
            userId:       req.user._id,
            userRole:     req.user.role,
            title:        title.trim(),
            keywords:     title.trim().toLowerCase().split(/\s+/), // title words as keywords
            location:     { lat: parsedLat, lon: parsedLng },
            userSeverity: severity?.toUpperCase() || 'LOW',
            imageBuffer,  // raw buffer for EXIF + ML (not stored in DB)
        };

        // ── Run Truth Engine ──
        const { duplicate, event } = await runTruthEngine(reportInput, savedReport, io);

        if (duplicate) {
            return res.status(409).json({
                success:  false,
                duplicate: true,
                message:  'You have already submitted a report for this event.',
                event,
            });
        }

        res.status(201).json({ success: true, report: savedReport, event });

    } catch (err) {
        console.error('❌ Report error:', err);
        const io2 = req.app.get('io');
        io2?.to('admin').emit('admin_log', {
            timestamp: new Date().toLocaleTimeString(),
            message:   `❌ Engine error: ${err.message}`,
            type:      'error',
        });
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
