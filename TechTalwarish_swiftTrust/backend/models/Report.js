'use strict';

const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema({
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userRole:     { type: String, default: 'citizen' },
    title:        { type: String, required: true, trim: true },
    description:  { type: String, trim: true },
    location: {
        type:        { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    imageUrl:     { type: String, default: null },
    imageBuffer:  { type: Buffer,  default: null }, // kept in-memory for engine processing
    eventDate:    { type: Date,    default: Date.now },
    userSeverity: { type: String,  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    submissionTime: { type: Date,  default: Date.now },
    // Engine results
    forensicScore:   { type: Number, default: 0 },
    forensicReason:  { type: String, default: '' },
    aiVerified:      { type: Boolean, default: false },
    aiCategory:      { type: String,  default: null },
    aiConfidence:    { type: Number,  default: 0 },
    reportPower:     { type: Number,  default: 0 },
}, { timestamps: true });

ReportSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Report', ReportSchema);
