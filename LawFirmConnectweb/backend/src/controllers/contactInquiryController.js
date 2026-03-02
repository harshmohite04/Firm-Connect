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

const getInquiries = async (req, res) => {
  try {
    const inquiries = await ContactInquiry.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: inquiries.length, inquiries });
  } catch (error) {
    console.error('Fetch inquiries error:', error.message);
    res.status(500).json({ error: 'Failed to fetch inquiries.' });
  }
};

const getInquiryById = async (req, res) => {
  try {
    const { id } = req.params;
    const inquiry = await ContactInquiry.findById(id);

    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' });
    }

    res.status(200).json({ success: true, inquiry });
  } catch (error) {
    console.error('Fetch inquiry error:', error.message);
    res.status(500).json({ error: 'Failed to fetch inquiry.' });
  }
};

module.exports = { submitInquiry, getInquiries, getInquiryById };
