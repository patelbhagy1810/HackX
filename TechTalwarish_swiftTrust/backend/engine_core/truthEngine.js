'use strict';

const natural    = require('natural');
const clustering = require('./clustering');
const scoring    = require('./scoring');
const forensics  = require('./forensics');
const mlClient   = require('./mlClient');
const Event      = require('../models/Event');
const Report     = require('../models/Report');

const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

const DENIAL_ROOTS = new Set(['no', 'not', 'noth', 'fake', 'fals', 'clear', 'clean', 'safe', 'normal', 'hoax', 'lie', 'wrong']);

/**
 * Main Truth Engine — processes a report and emits Socket.io events.
 * @param {Object} reportInput  - Structured report data
 * @param {Object} savedReport  - Mongoose Report document (already saved)
 * @param {Object} io           - Socket.io instance for real-time emissions
 * @returns {Promise<Object>}   Updated or created Event document
 */
const runTruthEngine = async (reportInput, savedReport, io) => {
    const emitLog = (message, type = 'info') => {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] ${message}`);
        io.to('admin').emit('admin_log', { timestamp, message, type });
    };

    emitLog(`🔍 Processing report: "${reportInput.title}" from ${reportInput.userId}`, 'info');

    // ── Step 1: Digital Evidence Verification ──
    const forensicResult = forensics.verifyImageMetadata(reportInput.imageBuffer, reportInput.location);
    const aiResult       = await mlClient.checkImageContent(reportInput.imageBuffer);

    emitLog(`🔬 Forensic: ${forensicResult.reason} (score: ${forensicResult.score})`, forensicResult.verified ? 'success' : 'info');
    if (aiResult.verified) {
        emitLog(`🤖 AI Vision: ${aiResult.category?.toUpperCase()} detected (${(aiResult.confidence * 100).toFixed(1)}%)`, 'success');
    }

    // ── Step 2: Report Power ──
    const reportPower = scoring.calculateReportPower(
        { role: reportInput.userRole },
        forensicResult,
        aiResult
    );

    // ── Step 3: Update saved report with engine results ──
    await Report.findByIdAndUpdate(savedReport._id, {
        forensicScore:  forensicResult.score,
        forensicReason: forensicResult.reason,
        aiVerified:     aiResult.verified,
        aiCategory:     aiResult.category,
        aiConfidence:   aiResult.confidence,
        reportPower,
    });

    // ── Step 4: Fetch active events for clustering ──
    const activeEvents = await Event.find({ active: true });

    // ── Step 5: Duplicate user check ──
    const existingMatch = activeEvents.find(e =>
        e.reporters.some(r => r.userId.toString() === reportInput.userId.toString())
        && _isWithin500m(reportInput.location, e)
    );
    if (existingMatch) {
        emitLog(`⛔ Duplicate report — user ${reportInput.userId} already reported "${existingMatch.eventName}"`, 'error');
        return { duplicate: true, event: existingMatch };
    }

    // ── Step 6: Clustering ──
    const { match } = clustering.findClosestEvent(reportInput, activeEvents);

    // ── Step 7: NLP Intent (title only — prevents false positives from keywords) ──
    const stemmedTitle = tokenizer.tokenize(reportInput.title.toLowerCase()).map(t => stemmer.stem(t));
    const isNegation   = stemmedTitle.some(t => DENIAL_ROOTS.has(t));
    const denialToken  = stemmedTitle.find(t => DENIAL_ROOTS.has(t)) ?? null;

    if (isNegation) {
        emitLog(`⚠️ Conflict detected — Negative Intent words found: "${denialToken}"`, 'error');
    }

    let resultEvent;

    if (match) {
        resultEvent = await _mergeIntoEvent(match, reportInput, savedReport, reportPower, isNegation, emitLog);
    } else {
        resultEvent = await _createNewEvent(reportInput, savedReport, reportPower, emitLog);
    }

    // ── Step 8: Emit public event update ──
    io.to('public').emit('event_update', resultEvent);

    return { duplicate: false, event: resultEvent };
};

// ─────────────────────────────────────────────────────────────────────────────

const _mergeIntoEvent = async (event, input, savedReport, reportPower, isNegation, emitLog) => {
    emitLog(`📍 Merged into existing event — "${event.eventName}"`, 'info');

    // Add reporter to list
    event.reporters.push({
        userId:       input.userId,
        userRole:     input.userRole,
        userSeverity: input.userSeverity,
        keywords:     input.keywords,
    });

    // Asymptotic confidence update (PRD 5.4)
    const updatedConf = scoring.applyAsymptoticTruth(event.confidenceScore, reportPower, isNegation);
    event.confidenceScore = updatedConf;

    // Severity: weighted average of ALL reporters (independent from confidence)
    event.severity = scoring.deriveSeverity(event.reporters);

    event.reportCount  = event.reporters.length;
    event.lastUpdated  = new Date();
    event.sourceReports.push(savedReport._id);

    if (isNegation) {
        event.status     = 'DISPUTED';
        event.conclusion = `DISPUTED: Conflicting reports — confidence at ${updatedConf.toFixed(1)}%.`;
    } else {
        event.status     = updatedConf > 65 ? 'VERIFIED' : 'MONITORING';
        event.conclusion = updatedConf > 65
            ? `VERIFIED: Multiple sources confirm active threat (${updatedConf.toFixed(1)}% confidence).`
            : `MONITORING: New reports confirming event (${updatedConf.toFixed(1)}% confidence).`;
    }

    await event.save();

    emitLog(`✅ Report accepted — "${event.eventName}" | ${updatedConf.toFixed(1)}% confidence`, 'success');
    emitLog(`WS Push: event updated — "${event.eventName}"`, 'info');

    return event;
};

const _createNewEvent = async (input, savedReport, reportPower, emitLog) => {
    // PRD 5.4: Initial confidence from asymptotic formula
    const initialConf = scoring.applyAsymptoticTruth(0, reportPower * 0.45, false);

    const newEvent = await Event.create({
        eventName:       input.title.toUpperCase(), // LOG-03: LOCKED
        location: {
            type:        'Point',
            coordinates: [input.location.lon, input.location.lat],
        },
        confidenceScore: initialConf,
        severity:        scoring.deriveSeverity([{
            userRole:     input.userRole,
            userSeverity: input.userSeverity,
        }]),
        status:          'MONITORING',
        conclusion:      'ANALYSIS: New incident detected. Awaiting corroboration.',
        reportCount:     1,
        sourceReports:   [savedReport._id],
        reporters: [{
            userId:       input.userId,
            userRole:     input.userRole,
            userSeverity: input.userSeverity,
            keywords:     input.keywords,
        }],
    });

    emitLog(`🆕 New event created — "${newEvent.eventName}"`, 'success');
    emitLog(`✅ Report accepted — "${newEvent.eventName}" | ${initialConf.toFixed(1)}% confidence`, 'success');

    return newEvent;
};

const _isWithin500m = (location, event) => {
    const geolib = require('geolib');
    return geolib.getDistance(
        { latitude: location.lat,                       longitude: location.lon },
        { latitude: event.location.coordinates[1],      longitude: event.location.coordinates[0] }
    ) <= 500;
};

module.exports = { runTruthEngine };
