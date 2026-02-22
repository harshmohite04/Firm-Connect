const path = require('path');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');

require('dotenv').config({ path: rootEnvPath });

const environment = process.env.APPLICATION_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', '..', environment), override: true });



const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

const connectDB = async () => {
    try {
        await mongoose.connect(MONGO_URI);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`Error: ${error.message}`);
        process.exit(1);
    }
};

connectDB();

const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
          : ["http://localhost:5173"],
        methods: ["GET", "POST"]
    }
});

// Store io instance to be used in controllers
app.set('socketio', io);

// Track online users: userId -> Set of socketIds
const onlineUsers = new Map();

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join user to their own room and track online status
    socket.on('join', (userId) => {
        socket.join(userId);
        socket.userId = userId;
        console.log(`User ${userId} joined room ${userId}`);

        // Track online status
        if (!onlineUsers.has(userId)) {
            onlineUsers.set(userId, new Set());
        }
        onlineUsers.get(userId).add(socket.id);

        // Broadcast to all that this user is online
        socket.broadcast.emit('userOnline', userId);

        // Send the full list of online users to the newly connected user
        socket.emit('onlineUsersList', Array.from(onlineUsers.keys()));
    });

    // Typing indicators - relay to target user
    socket.on('typing', ({ targetUserId }) => {
        if (socket.userId) {
            io.to(targetUserId).emit('typing', { userId: socket.userId });
        }
    });

    socket.on('stopTyping', ({ targetUserId }) => {
        if (socket.userId) {
            io.to(targetUserId).emit('stopTyping', { userId: socket.userId });
        }
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
        const userId = socket.userId;
        if (userId && onlineUsers.has(userId)) {
            onlineUsers.get(userId).delete(socket.id);
            if (onlineUsers.get(userId).size === 0) {
                onlineUsers.delete(userId);
                socket.broadcast.emit('userOffline', userId);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

