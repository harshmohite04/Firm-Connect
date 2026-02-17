const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
    // Check if SMTP credentials are provided, otherwise fallback to console mock
    if (!process.env.SMTP_HOST || !process.env.SMTP_EMAIL) {
        console.log('⚠️  SMTP credentials not found in env. Using mock email service.');
        console.log(`[Email Service] Sending email to ${options.email}`);
        console.log(`[Email Service] Subject: ${options.subject}`);
        console.log(`[Email Service] Message Preview: ${options.message ? options.message.substring(0, 100) : 'No text content'}...`);
        return Promise.resolve();
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
        auth: {
            user: process.env.SMTP_EMAIL,
            pass: process.env.SMTP_PASSWORD,
        },
    });

    // Define email options
    const mailOptions = {
        from: `"${process.env.FROM_NAME || 'LawFirmConnect'}" <${process.env.FROM_EMAIL || process.env.SMTP_EMAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message, // Fallback plain text
        html: options.html    // HTML content
    };

    // Send email
    await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent to ${options.email}`);
};

module.exports = sendEmail;
