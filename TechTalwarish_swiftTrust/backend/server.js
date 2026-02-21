'use strict';

require('dotenv').config();

const express    = require('express');
const http       = require('http');
const cors       = require('cors');
const { Server } = require('socket.io');
const connectDB  = require('./config/db');

// Routes
const authRoutes   = require('./routes/auth');
const reportRoutes = require('./routes/reports');
const eventRoutes  = require('./routes/events');
const adminRoutes  = require('./routes/admin');

const app    = express();
const server = http.createServer(app);

// ── Socket.io ──
const io = new Server(server, {
    cors: { origin: process.env.CLIENT_URL || 'http://localhost:5173', methods: ['GET', 'POST'] },
});

// Namespaces
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    socket.on('join_public', () => {
        socket.join('public');
        socket.emit('admin_log', {
            timestamp: new Date().toLocaleTimeString(),
            message:   'Dashboard ready — UTE v2.0',
            type:      'info',
        });
    });

    socket.on('join_admin', () => {
        socket.join('admin');
        socket.emit('admin_log', {
            timestamp: new Date().toLocaleTimeString(),
            message:   'Dashboard ready — UTE v2.0',
            type:      'info',
        });
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
    });
});

// Make io available to routes via app
app.set('io', io);

// ── Middleware ──
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Routes ──
app.use('/api/auth',   authRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events',  eventRoutes);
app.use('/api/admin',   adminRoutes);

app.get('/api/health', (_req, res) => res.json({ status: 'ok', engine: 'UTE v2.0' }));

// ── Start ──
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
    server.listen(PORT, () => {
        console.log(`\n🚀 Swift Trust API running on http://localhost:${PORT}`);
        console.log(`🔌 Socket.io ready\n`);
    });
});

module.exports = { app, server, io };
