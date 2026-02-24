const ContactInquiry = require('../models/ContactInquiry');

const submitInquiry = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required.' });
    }

    const inquiry = await ContactInquiry.create({ name, email, phone, subject, message });

    res.status(201).json({ success: true, id: inquiry._id });
  } catch (error) {
    console.error('Contact form error:', error.message);
    res.status(500).json({ error: 'Failed to submit inquiry. Please try again later.' });
  }
};

module.exports = { submitInquiry };
