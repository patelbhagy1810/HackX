'use strict';

const exifParser = require('exif-parser');
const geolib     = require('geolib');

const GPS_TOLERANCE_M = 200;
const MAX_IMAGE_AGE_H = 24;
const MS_PER_HOUR     = 3_600_000;

const verifyImageMetadata = (imageBuffer, reportLocation) => {
    if (!imageBuffer) return { score: 0, verified: false, reason: 'No Image Provided' };

    try {
        const result = exifParser.create(imageBuffer).parse();

        if (!result.tags?.GPSLatitude || !result.tags?.GPSLongitude) {
            return { score: 0, verified: false, reason: 'No GPS Metadata (Likely Screenshot or Downloaded)' };
        }

        const distanceMeters = geolib.getDistance(
            { latitude: result.tags.GPSLatitude,  longitude: result.tags.GPSLongitude },
            { latitude: reportLocation.lat,        longitude: reportLocation.lon }
        );

        if (distanceMeters > GPS_TOLERANCE_M) {
            return { score: -0.5, verified: false, reason: `Location Mismatch: ${distanceMeters}m from report (max ${GPS_TOLERANCE_M}m)` };
        }

        if (!result.tags.DateTimeOriginal) {
            return { score: 0, verified: false, reason: 'No Timestamp in EXIF' };
        }

        const ageHours = Math.abs(Date.now() - result.tags.DateTimeOriginal * 1000) / MS_PER_HOUR;
        if (ageHours > MAX_IMAGE_AGE_H) {
            return { score: -0.2, verified: false, reason: `Old Image: ${ageHours.toFixed(1)}h ago (max ${MAX_IMAGE_AGE_H}h)` };
        }

        return { score: 0.5, verified: true, reason: `Verified — ${distanceMeters}m drift, ${ageHours.toFixed(1)}h old` };

    } catch {
        return { score: 0, verified: false, reason: 'Corrupt or Unreadable Image Data' };
    }
};

module.exports = { verifyImageMetadata };