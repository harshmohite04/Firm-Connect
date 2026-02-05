/**
 * Audit Logger Utility
 * Logs security-relevant events for monitoring and compliance
 */

const fs = require('fs');
const path = require('path');

// Log levels
const LOG_LEVELS = {
    INFO: 'INFO',
    WARN: 'WARN',
    ERROR: 'ERROR',
    SECURITY: 'SECURITY'
};

// Event types for security auditing
const AUDIT_EVENTS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    ACCOUNT_UNLOCKED: 'ACCOUNT_UNLOCKED',
    REGISTRATION: 'REGISTRATION',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS',
    SENSITIVE_DATA_ACCESS: 'SENSITIVE_DATA_ACCESS',
    FILE_UPLOAD: 'FILE_UPLOAD',
    FILE_DELETE: 'FILE_DELETE'
};

/**
 * Log a security audit event
 * @param {string} eventType - Type of event from AUDIT_EVENTS
 * @param {Object} details - Event details
 * @param {string} userId - User ID (if available)
 * @param {string} ip - IP address (if available)
 */
const logAuditEvent = (eventType, details = {}, userId = null, ip = null) => {
    const timestamp = new Date().toISOString();
    
    const logEntry = {
        timestamp,
        level: LOG_LEVELS.SECURITY,
        eventType,
        userId,
        ip,
        details
    };

    // Format for console output
    const consoleMessage = `[${timestamp}] [AUDIT] [${eventType}] User: ${userId || 'anonymous'} IP: ${ip || 'unknown'} - ${JSON.stringify(details)}`;
    
    // Log to console (in production, use a proper logging service)
    console.log(consoleMessage);
    
    // Optionally write to file (for production, use a log aggregation service)
    if (process.env.AUDIT_LOG_FILE) {
        try {
            const logPath = path.resolve(process.env.AUDIT_LOG_FILE);
            fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
        } catch (err) {
            console.error('Failed to write audit log:', err.message);
        }
    }

    return logEntry;
};

/**
 * Log a login attempt
 * @param {boolean} success - Whether login was successful
 * @param {string} email - User email
 * @param {string} userId - User ID (if login succeeded)
 * @param {string} ip - Request IP
 * @param {string} reason - Failure reason (if applicable)
 */
const logLoginAttempt = (success, email, userId = null, ip = null, reason = null) => {
    const eventType = success ? AUDIT_EVENTS.LOGIN_SUCCESS : AUDIT_EVENTS.LOGIN_FAILURE;
    return logAuditEvent(eventType, { email, reason }, userId, ip);
};

/**
 * Log account lockout
 * @param {string} email - User email
 * @param {string} userId - User ID
 * @param {number} failedAttempts - Number of failed attempts
 * @param {Date} unlockTime - When account will unlock
 */
const logAccountLockout = (email, userId, failedAttempts, unlockTime) => {
    return logAuditEvent(AUDIT_EVENTS.ACCOUNT_LOCKED, {
        email,
        failedAttempts,
        unlockTime: unlockTime.toISOString()
    }, userId);
};

/**
 * Log user registration
 * @param {string} email - User email
 * @param {string} userId - New user ID
 * @param {string} ip - Request IP
 */
const logRegistration = (email, userId, ip = null) => {
    return logAuditEvent(AUDIT_EVENTS.REGISTRATION, { email }, userId, ip);
};

/**
 * Log unauthorized access attempt
 * @param {string} resource - Resource that was attempted to access
 * @param {string} userId - User ID (if authenticated)
 * @param {string} ip - Request IP
 */
const logUnauthorizedAccess = (resource, userId = null, ip = null) => {
    return logAuditEvent(AUDIT_EVENTS.UNAUTHORIZED_ACCESS, { resource }, userId, ip);
};

/**
 * Get client IP from request
 * @param {Object} req - Express request object
 * @returns {string} Client IP address
 */
const getClientIp = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           'unknown';
};

module.exports = {
    LOG_LEVELS,
    AUDIT_EVENTS,
    logAuditEvent,
    logLoginAttempt,
    logAccountLockout,
    logRegistration,
    logUnauthorizedAccess,
    getClientIp
};
