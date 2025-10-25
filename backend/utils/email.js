const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verification email template
const getVerificationEmail = (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify/${token}`;
    
    return {
        from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
        to: email,
        subject: 'Verify your subscription',
        text: `Thank you for subscribing to TabletopTeacher! Please verify your email by clicking: ${verificationUrl}`,
        html: `
            <h1>Welcome to TabletopTeacher!</h1>
            <p>Thank you for subscribing to our mailing list.</p>
            <p>Please verify your email address by clicking the link below:</p>
            <p>
                <a href="${verificationUrl}" style="
                    background-color: #c06262;
                    color: white;
                    padding: 10px 20px;
                    text-decoration: none;
                    border-radius: 5px;
                    display: inline-block;
                ">Verify Email Address</a>
            </p>
            <p>If the button doesn't work, copy and paste this URL into your browser:</p>
            <p>${verificationUrl}</p>
        `
    };
};

module.exports = {
    transporter,
    getVerificationEmail
};