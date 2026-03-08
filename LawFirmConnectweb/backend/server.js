const path = require('path');
const rootEnvPath = path.join(__dirname, '..', '..', '.env');

require('dotenv').config({ path: rootEnvPath });

const environment = process.env.APPLICATION_ENV === 'production' ? '.env.production' : '.env.development';
require('dotenv').config({ path: path.join(__dirname, '..', '..', environment), override: true });



const mongoose = require('mongoose');
const app = require('./app');

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

const connectDB = async () => {
    try {
        console.log(`Connecting to MongoDB with URI: ${MONGO_URI.replace(/\/\/[^@]+@/, '//****:****@')}`);
        await mongoose.connect(MONGO_URI, { dbName: 'lawfirmDB' });
        console.log(`MongoDB Connected: ${mongoose.connection.host}, DB: ${mongoose.connection.db.databaseName}`);
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

// Online tracking: userId -> Set<socketId>
const onlineUsersMap = new Map();

io.on('connection', (socket) => {
    let currentUserId = null;

    // Join user to their own room
    socket.on('join', (userId) => {
        currentUserId = userId;
        socket.join(userId);

        // Track online status
        if (!onlineUsersMap.has(userId)) {
            onlineUsersMap.set(userId, new Set());
        }
        onlineUsersMap.get(userId).add(socket.id);

        // Broadcast that this user is online
        socket.broadcast.emit('userOnline', userId);

        // Send full online users list to newly connected client
        const onlineUserIds = Array.from(onlineUsersMap.keys());
        socket.emit('onlineUsers', onlineUserIds);
    });

    // Typing indicators
    socket.on('typing', ({ senderId, recipientId }) => {
        io.to(recipientId).emit('typing', { senderId });
    });

    socket.on('stopTyping', ({ senderId, recipientId }) => {
        io.to(recipientId).emit('stopTyping', { senderId });
    });

    socket.on('disconnect', () => {
        if (currentUserId && onlineUsersMap.has(currentUserId)) {
            const sockets = onlineUsersMap.get(currentUserId);
            sockets.delete(socket.id);
            if (sockets.size === 0) {
                onlineUsersMap.delete(currentUserId);
                io.emit('userOffline', currentUserId);
            }
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

