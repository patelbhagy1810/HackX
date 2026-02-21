'use strict';

const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema({
    eventName: { type: String, required: true }, // LOG-03: LOCKED after creation
    location: {
        type:        { type: String, enum: ['Point'], default: 'Point' },
        coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    active:          { type: Boolean, default: true },
    confidenceScore: { type: Number,  default: 0, min: 0, max: 99.9 },
    severity:        { type: String,  enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' },
    status:          { type: String,  enum: ['VERIFIED', 'DISPUTED', 'DEBUNKED', 'RESOLVED', 'MONITORING'], default: 'MONITORING' },
    reportCount:     { type: Number,  default: 1 },
    conclusion:      { type: String,  default: 'ANALYSIS: New incident detected.' },
    lastUpdated:     { type: Date,    default: Date.now },
    sourceReports:   [{ type: mongoose.Schema.Types.ObjectId, ref: 'Report' }],
    // Denormalised reporter list for duplicate check & severity calc
    reporters: [{
        userId:       mongoose.Schema.Types.ObjectId,
        userRole:     String,
        userSeverity: String,
    }],
}, { timestamps: true });

EventSchema.index({ location: '2dsphere' });
EventSchema.index({ active: 1 });

module.exports = mongoose.model('Event', EventSchema);
