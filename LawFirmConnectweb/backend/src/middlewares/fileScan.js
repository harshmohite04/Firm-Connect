const fs = require('fs');
const path = require('path');

let ClamScan;
try {
    ClamScan = require('clamscan');
} catch {
    ClamScan = null;
}

const CLAM_AV_ENABLED = process.env.CLAM_AV_ENABLED === 'true';
const SCAN_TIMEOUT = parseInt(process.env.CLAM_AV_TIMEOUT) || 30000;

let clamInstance = null;

const initClam = async () => {
    if (clamInstance) return clamInstance;
    if (!ClamScan) return null;

    try {
        const clamscan = await new ClamScan().init({
            removeInfected: false,
            quarantineInfected: false,
            scanLog: null,
            debugMode: false,
            fileList: null,
            scanRecursively: true,
            clamscan: {
                path: process.env.CLAM_AV_PATH || '/usr/bin/clamscan',
                scanArchives: true,
                active: true,
            },
            clamdscan: {
                path: process.env.CLAMD_PATH || '/usr/bin/clamdscan',
                multiscan: true,
                reloadDb: false,
                active: true,
                socket: process.env.CLAMD_SOCKET || null,
                host: process.env.CLAMD_HOST || '127.0.0.1',
                port: parseInt(process.env.CLAMD_PORT) || 3310,
            },
            preference: 'clamdscan',
        });
        clamInstance = clamscan;
        console.log('[FileScan] ClamAV initialized successfully');
        return clamInstance;
    } catch (err) {
        console.warn('[FileScan] ClamAV initialization failed:', err.message);
        return null;
    }
};

/**
 * Middleware to scan uploaded files for malware using ClamAV.
 * Works with both multer.single() and multer.array() uploads.
 * Gracefully degrades if ClamAV is not available (configurable via CLAM_AV_ENABLED).
 */
const scanFiles = async (req, res, next) => {
    if (!CLAM_AV_ENABLED) return next();

    // Collect files to scan from req.file (single) or req.files (array)
    const files = [];
    if (req.file) files.push(req.file);
    if (req.files && Array.isArray(req.files)) files.push(...req.files);

    if (files.length === 0) return next();

    // Skip scan for S3 uploads (no local path)
    const localFiles = files.filter(f => f.path);
    if (localFiles.length === 0) return next();

    const clam = await initClam();
    if (!clam) {
        console.warn('[FileScan] ClamAV not available. Allowing upload (fail-open).');
        return next();
    }

    try {
        for (const file of localFiles) {
            const scanPromise = clam.isInfected(file.path);
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Scan timeout')), SCAN_TIMEOUT)
            );

            const { isInfected, viruses } = await Promise.race([scanPromise, timeoutPromise]);

            if (isInfected) {
                console.error(`[FileScan] MALWARE DETECTED in ${file.originalname}: ${viruses.join(', ')}`);

                // Delete the infected file
                try {
                    fs.unlinkSync(file.path);
                } catch (unlinkErr) {
                    console.error('[FileScan] Failed to delete infected file:', unlinkErr.message);
                }

                return res.status(400).json({
                    message: `File "${file.originalname}" was rejected: malware detected.`,
                    infected: true,
                });
            }

            console.log(`[FileScan] ${file.originalname}: clean`);
        }

        next();
    } catch (err) {
        console.warn('[FileScan] Scan error:', err.message);
        // Fail-open: allow upload if scan itself fails
        next();
    }
};

module.exports = { scanFiles };
