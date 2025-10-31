require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const Subscriber = require('./models/subscriber');
const Admin = require('./models/admin');
const { transporter, getVerificationEmail } = require('./utils/email');
const authMiddleware = require('./middleware/auth');
const { subscribeLimiter, loginLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.PORT || 3000;

// NOTE: connect when starting the server (see start())
// We avoid starting DB operations until the connection is established

// Middleware
app.use(cors());
app.use(express.json());

// Create initial admin user
async function ensureAdminExists() {
    try {
        const adminExists = await Admin.findOne({ username: process.env.ADMIN_USERNAME });
        if (!adminExists) {
            await Admin.create({
                username: process.env.ADMIN_USERNAME,
                password: process.env.ADMIN_PASSWORD,
                email: process.env.ADMIN_EMAIL
            });
            console.log('Initial admin user created');
        }
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

// Subscribe endpoint with validation and rate limiting
app.post('/subscribe', subscribeLimiter, [
    body('email').isEmail().normalizeEmail()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { email } = req.body;
        
        // Check if already subscribed
        let subscriber = await Subscriber.findOne({ email });
        if (subscriber) {
            if (subscriber.verified) {
                return res.status(400).json({ message: 'Email already subscribed' });
            }
            // If not verified, generate new token and resend
            subscriber.verificationToken = crypto.randomBytes(32).toString('hex');
            subscriber.verificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
            await subscriber.save();
        } else {
            // Create new subscriber
            subscriber = new Subscriber({
                email,
                verificationToken: crypto.randomBytes(32).toString('hex'),
                verificationExpires: Date.now() + 24 * 60 * 60 * 1000
            });
            await subscriber.save();
        }

        // Send verification email
        await transporter.sendMail(getVerificationEmail(email, subscriber.verificationToken));

        res.json({ 
            success: true, 
            message: 'Please check your email to verify your subscription.' 
        });
    } catch (error) {
        console.error('Subscription error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error occurred' 
        });
    }
});

// Verify email endpoint
app.get('/verify/:token', async (req, res) => {
    try {
        const subscriber = await Subscriber.findOne({
            verificationToken: req.params.token,
            verificationExpires: { $gt: Date.now() }
        });

        if (!subscriber) {
            return res.status(400).json({ message: 'Invalid or expired verification token' });
        }

        subscriber.verified = true;
        subscriber.verificationToken = undefined;
        subscriber.verificationExpires = undefined;
        await subscriber.save();

        res.json({ message: 'Email verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Verification failed' });
    }
});

// Admin login
app.post('/admin/login', loginLimiter, async (req, res) => {
    try {
        const { username, password } = req.body;
        const admin = await Admin.findOne({ username });

        if (!admin || !(await admin.comparePassword(password))) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: admin._id, username: admin.username },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Login failed' });
    }
});

// Admin routes
app.get('/admin/subscribers', authMiddleware, async (req, res) => {
    try {
        const subscribers = await Subscriber.find().sort('-subscribedAt');
        res.json({ subscribers });
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch subscribers' });
    }
});

app.delete('/admin/subscribers/:id', authMiddleware, async (req, res) => {
    try {
        await Subscriber.findByIdAndDelete(req.params.id);
        res.json({ message: 'Subscriber removed' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to remove subscriber' });
    }
});

app.post('/admin/subscribers/:id/resend-verification', authMiddleware, async (req, res) => {
    try {
        const subscriber = await Subscriber.findById(req.params.id);
        if (!subscriber || subscriber.verified) {
            return res.status(400).json({ message: 'Invalid subscriber or already verified' });
        }

        subscriber.verificationToken = crypto.randomBytes(32).toString('hex');
        subscriber.verificationExpires = Date.now() + 24 * 60 * 60 * 1000;
        await subscriber.save();

        await transporter.sendMail(getVerificationEmail(subscriber.email, subscriber.verificationToken));
        res.json({ message: 'Verification email resent' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to resend verification' });
    }
});

// Initialize and start server
async function start() {
    try {
        console.log('Connecting to MongoDB...');
        // await the mongoose connection before doing any DB work
        await mongoose.connect(process.env.MONGODB_URI, {
            // mongoose 7+ uses sensible defaults, but explicit options are harmless
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('Connected to MongoDB');

        // Now it's safe to create initial admin user (DB is available)
        await ensureAdminExists();

        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

start().catch(console.error);