// src/app.js
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');
const AppError = require('./utils/AppError');

// Import module routers
const authRoutes = require('./modules/auth/auth.routes');
const profilesRoutes = require('./modules/profiles/profiles.routes');
const examsRoutes = require('./modules/exams/exams.routes');
const questionsRoutes = require('./modules/questions/questions.routes');
const attachmentsRoutes = require('./modules/attachments/attachments.routes');

const app = express();

// Enable CORS for all requests
app.use(cors());

// Parse incoming JSON and URLencoded requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount module routes
app.use('/api/auth', authRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api', questionsRoutes); // Handles /api/questions and nested routes
app.use('/api/attachments', attachmentsRoutes);

// Catch-all for unhandled routes
app.all('*', (req, res, next) => {
  next(new AppError(`المسار المطلوب غير موجود: ${req.originalUrl}`, 404));
});

// Wire up the global error handling middleware
app.use(errorHandler);

module.exports = app;
