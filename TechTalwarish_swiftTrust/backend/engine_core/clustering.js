'use strict';

const geolib = require('geolib');
const natural = require('natural');

const stemmer = natural.PorterStemmer;

const SPATIAL_RADIUS_M    = 500;
const TITLE_SIM_THRESHOLD = 0.85;
const AUTO_MERGE_RADIUS_M = 50;

const findClosestEvent = (report, activeEvents) => {
    const reportStems = report.keywords.map(k => stemmer.stem(k.toLowerCase()));

    let bestMatch   = null;
    let minDistance = Infinity;

    for (const event of activeEvents) {
        const distance = geolib.getDistance(
            { latitude: report.location.lat,  longitude: report.location.lon },
            { latitude: event.location.coordinates[1], longitude: event.location.coordinates[0] }
        );

        if (distance > SPATIAL_RADIUS_M) continue;

        const eventStems = [...new Set(
            (event.reporters || []).flatMap(r =>
                (r.keywords || []).map(k => stemmer.stem(k.toLowerCase()))
            )
        )];

        const sharedKeywords = reportStems.some(s => eventStems.includes(s));

        const titleSim = natural.JaroWinklerDistance(
            report.title.toLowerCase(),
            event.eventName.toLowerCase()
        );

        if (sharedKeywords || titleSim > TITLE_SIM_THRESHOLD || distance < AUTO_MERGE_RADIUS_M) {
            if (distance < minDistance) {
                minDistance = distance;
                bestMatch   = event;
            }
        }
    }

    return { match: bestMatch, distance: minDistance };
};

module.exports = { findClosestEvent };