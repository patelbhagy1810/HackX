'use strict';

const axios    = require('axios');
const FormData = require('form-data');

const PYTHON_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001/predict';
const TIMEOUT_MS         = parseInt(process.env.ML_TIMEOUT_MS) || 5000;
const ML_FALLBACK        = { verified: false, category: null, confidence: 0, fallback: true };

const checkImageContent = async (imageBuffer) => {
    if (!imageBuffer) return ML_FALLBACK;

    const form = new FormData();
    form.append('image', imageBuffer, { filename: 'report_image.jpg' });

    try {
        const response = await axios.post(PYTHON_SERVICE_URL, form, {
            headers: { ...form.getHeaders() },
            timeout: TIMEOUT_MS,
        });

        const { verified, detected_category, raw_detections, confidence } = response.data;

        console.log(`   🤖 AI Vision: [${raw_detections?.map(d => d.label).join(', ')}]`);
        if (verified) {
            console.log(`   ✅ Threat Confirmed: ${detected_category?.toUpperCase()} (${(confidence * 100).toFixed(1)}%)`);
        }

        return {
            verified:   Boolean(verified),
            category:   detected_category ?? null,
            confidence: confidence ?? 0,
        };
    } catch (err) {
        const reason = err.code === 'ECONNABORTED' ? `Timeout after ${TIMEOUT_MS}ms` : `Unreachable — ${err.message}`;
        console.warn(`   ⚠️  ML Service: ${reason}. Using fallback.`);
        return ML_FALLBACK;
    }
};

module.exports = { checkImageContent };