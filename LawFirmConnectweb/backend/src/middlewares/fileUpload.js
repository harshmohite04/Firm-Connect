const multer = require('multer');
const path = require('path');

const { S3Client } = require('@aws-sdk/client-s3');
const multerS3 = require('multer-s3');

// Hybrid Storage Strategy
// Set USE_S3=true in .env to enable AWS S3
const useS3 = process.env.USE_S3 === 'true';

let storage;

if (useS3) {
    const s3 = new S3Client({
        region: process.env.AWS_REGION,
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
        }
    });

    storage = multerS3({
        s3: s3,
        bucket: process.env.S3_BUCKET_NAME,
        metadata: function (req, file, cb) {
            cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
            cb(null, `${Date.now().toString()}-${file.originalname}`);
        }
    });
} else {
    storage = multer.diskStorage({
        destination(req, file, cb) {
            cb(null, 'uploads/');
        },
        filename(req, file, cb) {
            cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
        },
    });
}

function checkFileType(file, cb) {
    // SECURITY: Validate both extension AND MIME type properly
    const allowedExtensions = /jpg|jpeg|png|pdf|doc|docx|txt|zip/;
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png', 
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
    ];
    
    const extname = allowedExtensions.test(
        require('path').extname(file.originalname).toLowerCase().replace('.', '')
    );
    const validMime = allowedMimeTypes.includes(file.mimetype);

    if (extname && validMime) {
        return cb(null, true);
    } else {
        cb(new Error('Invalid file type. Allowed: jpg, jpeg, png, pdf, doc, docx, txt, zip'));
    }
}

const upload = multer({
    storage,
    limits: { 
        fileSize: 50 * 1024 * 1024  // 50MB limit
    },
    fileFilter: function (req, file, cb) {
        // Actually use the file type validation
        checkFileType(file, cb);
    },
});

module.exports = upload;
