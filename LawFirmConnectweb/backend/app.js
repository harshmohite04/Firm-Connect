const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Middleware
const { errorHandler, notFound } = require('./src/middlewares/errorMiddleware');

// Routes
const authRoutes = require('./src/routes/authRoutes');
const portalRoutes = require('./src/routes/portalRoutes');
const caseRoutes = require('./src/routes/caseRoutes');
const scheduleRoutes = require('./src/routes/scheduleRoutes');
const messageRoutes = require('./src/routes/messageRoutes');
const contactRoutes = require('./src/routes/contactRoutes');
const teamRoutes = require('./src/routes/teamRoutes');

const app = express();

// Security and utility middleware
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS 
      ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:5173'],
    credentials: true
  })
);

// Enhanced Helmet configuration with Content Security Policy
// Enhanced Helmet configuration with Content Security Policy
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],  // Adjust for your frontend needs
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", process.env.RAG_API_URL || "http://localhost:8000", "https://api.deepseek.com"],
      frameSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
      frameAncestors: ["'self'", "http://localhost:5173"] // Allow frontend to embed
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource fetching
  crossOriginEmbedderPolicy: false, // May need to disable for some integrations
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  },
  xFrameOptions: false // Disable X-Frame-Options header to allow embedding
}));
app.use(morgan('dev'));
app.use(express.json());

// API Routes
app.use('/auth', authRoutes);
app.use('/portal', portalRoutes);
app.use('/cases', caseRoutes);
app.use('/schedule', scheduleRoutes);
app.use('/messages', messageRoutes);
app.use('/contact', contactRoutes);
app.use('/team', teamRoutes);
app.use('/payments', require('./src/routes/paymentRoutes'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health Check
app.get('/', (req, res) => {
    res.send('API is running...');
});

// Error Handling
app.use(notFound);
app.use(errorHandler);

module.exports = app;
