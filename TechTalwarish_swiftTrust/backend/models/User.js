'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username:   { type: String, required: true, trim: true },
    email:      { type: String, required: true, unique: true, lowercase: true, trim: true },
    password:   { type: String, required: true, minlength: 6 },
    role:       { type: String, enum: ['citizen', 'verified_source', 'admin'], default: 'citizen' },
    trustScore: { type: Number, default: 50, min: 0, max: 100 },
    banned:     { type: Boolean, default: false },
}, { timestamps: true });

// Hash password before save
UserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Compare password
UserSchema.methods.matchPassword = function (entered) {
    return bcrypt.compare(entered, this.password);
};

module.exports = mongoose.model('User', UserSchema);
