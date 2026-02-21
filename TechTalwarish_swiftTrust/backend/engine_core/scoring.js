'use strict';

const MAX_CONFIDENCE = 99.9;

const ROLE_WEIGHT = { verified_source: 1.0, citizen: 0.5, admin: 1.0 };
const SEV_TO_NUM  = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
const NUM_TO_SEV  = ['', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

const calculateReportPower = (user, forensicResult, aiResult) => {
    const userFactor    = ROLE_WEIGHT[user.role] ?? 0.5;
    const evidenceScore = Math.min(
        0.2
        + (forensicResult.verified ? 0.4 : 0)
        + (aiResult.verified       ? 0.4 : 0),
        1.0
    );
    return Math.min((userFactor * 0.4) + (evidenceScore * 0.6), 1.0);
};

// PRD 5.4 — Asymptotic Truth Protocol
// C_new = C_prev + ((100 - C_prev) × Δ_impact)
const applyAsymptoticTruth = (currentConfidence, deltaImpact, isNegation = false) => {
    const gap     = MAX_CONFIDENCE - currentConfidence;
    const delta   = gap * deltaImpact;
    const updated = isNegation
        ? currentConfidence - delta
        : currentConfidence + delta;
    return Math.min(Math.max(updated, 0), MAX_CONFIDENCE);
};

// Severity = weighted average of ALL reporter severity inputs (independent from confidence)
const deriveSeverity = (reporters = []) => {
    if (!reporters.length) return 'LOW';
    let weightedSum = 0, totalWeight = 0;
    for (const r of reporters) {
        const weight  = ROLE_WEIGHT[r.userRole] ?? 0.5;
        const sevNum  = SEV_TO_NUM[r.userSeverity] ?? 1;
        weightedSum  += sevNum * weight;
        totalWeight  += weight;
    }
    const avg   = weightedSum / totalWeight;
    const level = Math.min(Math.max(Math.round(avg), 1), 4);
    return NUM_TO_SEV[level];
};

module.exports = { calculateReportPower, applyAsymptoticTruth, deriveSeverity };