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

io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // Join user to their own room
    socket.on('join', (userId) => {
        socket.join(userId);
        console.log(`User ${userId} joined room ${userId}`);
    });

    socket.on('disconnect', () => {
        console.log('Socket disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

