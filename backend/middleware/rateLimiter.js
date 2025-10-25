const rateLimit = require('express-rate-limit');

const subscribeLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // 5 attempts per IP
    message: 'Too many subscription attempts from this IP, please try again after an hour',
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 attempts per IP
    message: 'Too many login attempts from this IP, please try again after 15 minutes',
    standardHeaders: true,
    legacyHeaders: false
});

module.exports = {
    subscribeLimiter,
    loginLimiter
};