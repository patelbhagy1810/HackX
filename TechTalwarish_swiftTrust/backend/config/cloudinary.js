'use strict';

const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key:    process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer directly to Cloudinary (no temp file needed).
 * @param {Buffer} buffer
 * @param {string} folder
 * @returns {Promise<string>} secure_url
 */
const uploadToCloudinary = (buffer, folder = 'swifttrust') => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            { folder, resource_type: 'image' },
            (err, result) => {
                if (err) return reject(err);
                resolve(result.secure_url);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};

module.exports = { cloudinary, uploadToCloudinary };
