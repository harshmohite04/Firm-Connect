const Case = require('../models/Case');
const Event = require('../models/Event');
const createNotification = require('../utils/createNotification');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const AdmZip = require('adm-zip');
const axios = require('axios');
const FormData = require('form-data');

const PYTHON_RAG_SERVER = process.env.RAG_API_URL || 'http://localhost:8000';

// @desc    Get all cases (Lawyer View)
// @route   GET /cases
// @access  Private
const getCases = async (req, res, next) => {
    try {
        // Default to returning NOTHING to be safe (recordStatus: 0 is effectively "deleted" but here we want to match nothing for active cases first)
        // Better: Default to a query that returns nothing valid for a normal user unless specific logic adds to it.
        // OR: Initialize query but rely on the role checks to populate it validly.
        

        // Unified query: User sees case if they are:
        // 1. Keeping strictly to "creator" (clientId)
        // 2. Assigned lawyer or Lead attorney
        // 3. Team member
        
        let query = {
             recordStatus: 1,
             $or: [
                 { createdBy: req.user._id },
                 { assignedLawyers: req.user._id },
                 { leadAttorneyId: req.user._id },
                 { 'teamMembers.userId': req.user._id }
             ]
        };

        // Admin can view a specific member's cases via ?userId=
        if (req.user.role === 'ADMIN' && req.query.userId && req.user.organizationId) {
             query = {
                 recordStatus: 1,
                 organizationId: req.user.organizationId,
                 $or: [
                     { createdBy: req.query.userId },
                     { assignedLawyers: req.query.userId },
                     { leadAttorneyId: req.query.userId },
                     { 'teamMembers.userId': req.query.userId }
                 ]
             };
        }


        const cases = await Case.find(query)
            .populate('leadAttorneyId', 'firstName lastName email')
            .populate('assignedLawyers', 'firstName lastName email')
            .sort({ createdAt: -1 });

        // Transform response to remove client info if needed, but usually frontend ignores it.
        // Spec said "REMOVED client object".
        const transformedCases = cases.map(c => ({
            _id: c._id,
            title: c.title,
            leadAttorney: c.leadAttorneyId ? { name: `${c.leadAttorneyId.firstName} ${c.leadAttorneyId.lastName}` } : null,
            status: c.status,
            recordStatus: c.recordStatus,
            createdAt: c.createdAt
        }));

        res.json(transformedCases);
    } catch (error) {
        next(error);
    }
};

// @desc    Create new case
// @route   POST /cases
// @access  Private
const createCase = async (req, res, next) => {
    try {
        const { title, description, legalMatter, assignedLawyers } = req.body;
        console.log('Backend createCase - req.files:', req.files);
        console.log('Backend createCase - req.body keys:', Object.keys(req.body));

        let documents = [];
        if (req.files) {
            documents = req.files.map(file => ({
                fileName: file.originalname,
                // Use location for S3, fallback to local path construction
                filePath: file.location || `/uploads/${file.filename}`,
                category: 'General',
                uploadedBy: req.user._id,
                fileSize: file.size,
                recordStatus: 1
            }));
        }
        
        // Parse assignedLawyers if sent as JSON string in FormData
        let lawyers = [];
        if (assignedLawyers) {
             try {
                // If it's a string, parse it. If array, use it.
                lawyers = typeof assignedLawyers === 'string' ? JSON.parse(assignedLawyers) : assignedLawyers;
             } catch(e) {
                 lawyers = [assignedLawyers]; // Fallback single ID
             }
        }

        if (req.user.role === 'ADVOCATE') {
            lawyers.push(req.user._id);
            // Ensure uniqueness
            lawyers = [...new Set(lawyers.map(id => id.toString()))];
        }

        let newCase;
        try {
            newCase = await Case.create({
                title,
                description,
                legalMatter, 
                createdBy: req.user._id,
                organizationId: req.user.organizationId || null,
                assignedLawyers: lawyers,
                leadAttorneyId: req.user._id,
                status: 'Open',
                documents,
                recordStatus: 1,
                activityLog: [{
                    type: 'case_created',
                    description: `Case "${title}" created`,
                    performedBy: req.user._id,
                    createdAt: new Date()
                }]
            });
        } catch(dbError) {
             if(dbError.name === 'ValidationError') {
                 res.status(400);
                 throw new Error(`Validation Error: ${dbError.message}`);
             }
             throw dbError; 
        }

        // Notify assigned lawyers about the new case
        const io = req.app.get('socketio');
        const creatorName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        for (const lawyerId of lawyers) {
            if (lawyerId.toString() !== req.user._id.toString()) {
                await createNotification(io, {
                    recipient: lawyerId,
                    type: 'case',
                    title: 'New Case Assigned',
                    description: `${creatorName} assigned you to "${title}"`,
                    link: `/portal/cases/${newCase._id}`,
                    metadata: { caseId: newCase._id }
                });
            }
        }

        res.status(201).json(newCase);
    } catch (error) {
        next(error);
    }
};

// @desc    Get single case header/overview
// @route   GET /cases/:id
const getCaseById = async (req, res, next) => {
    try {
        const caseDoc = await Case.findOne({ _id: req.params.id, recordStatus: 1 })
            .populate('leadAttorneyId', 'firstName lastName email')
            .populate('assignedLawyers', 'firstName lastName email')
            .populate('teamMembers.userId', 'firstName lastName email')
            .populate('documents.uploadedBy', 'firstName lastName');

        if (!caseDoc) {
             res.status(404); throw new Error('Case not found');
        }
        res.json(caseDoc);
    } catch (error) { next(error); }
};

// @desc    Soft Delete case
// @route   DELETE /cases/:id/settings (or /cases/:id)
// Using standard DELETE /cases/:id for now as per spec
const deleteCase = async (req, res, next) => {
    try {
        const caseDoc = await Case.findById(req.params.id);
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }

        caseDoc.recordStatus = 0; // Soft delete
        await caseDoc.save();

        res.json({ message: 'Case deleted successfully' });
    } catch (error) { next(error); }
};

// --- TAB ENDPOINTS ---

// Documents
const getCaseDocuments = async (req, res, next) => {
    try {
        const caseDoc = await Case.findById(req.params.id).populate('documents.uploadedBy', 'firstName lastName');
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }
        
        const docs = caseDoc.documents.filter(d => d.recordStatus === 1);
        res.json(docs);
    } catch (error) { next(error); }
};



// Helper to run python script
const runTranscription = (filePath) => {
    return new Promise((resolve, reject) => {
        // Adjust path to where transcribe.py is located
        const scriptPath = path.join(__dirname, '../utils/transcribe.py');
        const process = spawn('python', [scriptPath, filePath]);

        let dataString = '';
        let errorString = '';

        process.stdout.on('data', (data) => {
            dataString += data.toString();
        });

        process.stderr.on('data', (data) => {
            errorString += data.toString();
        });

        process.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`Transcription script failed: ${errorString}`));
                return;
            }
            try {
                const json = JSON.parse(dataString);
                if (json.success) {
                    resolve(json.formatted_transcript);
                } else {
                    reject(new Error(json.error || 'Unknown error in transcription script'));
                }
            } catch (e) {
                reject(new Error(`Failed to parse script output: ${dataString}`));
            }
        });
    });
};

const uploadDocument = async (req, res, next) => {
    try {
        const { category } = req.body;
        if (!req.files) { res.status(400); throw new Error('No files'); }
        
        const caseDoc = await Case.findById(req.params.id);
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }

        const processedDocuments = [];

        // Helper to process files (Zip extraction, Ingestion, Transcription)
        const processFilesAndIngest = async (files, caseDoc, user, defaultCategory = 'General', authToken) => {
            const processedDocuments = [];

            // Helper function to process a single file
            const processSingleFile = async (fileData) => {
                const { originalname, mimetype, location, filename, path: localPath, size } = fileData;
                
                // Add original file document object
                const originalDoc = {
                    fileName: originalname,
                    filePath: location || `/uploads/${filename}`,
                    category: defaultCategory || 'General',
                    uploadedBy: user._id,
                    fileSize: size,
                    recordStatus: 1
                };
                processedDocuments.push(originalDoc);

                // Check if audio and needs transcription
                const isAudio = mimetype.startsWith('audio') || 
                                ['.mp3', '.wav', '.m4a', '.ogg'].includes(path.extname(originalname).toLowerCase());

                if (isAudio && localPath) {
                    try {
                        console.log(`Starting transcription for ${originalname}...`);
                        const transcriptText = await runTranscription(localPath);
                        
                        // Save transcript as a new file
                        const transcriptFileName = `Transcript - ${path.basename(originalname, path.extname(originalname))}.md`;
                        const transcriptSavePath = path.join('uploads', `${Date.now()}-${transcriptFileName}`);
                        fs.writeFileSync(transcriptSavePath, transcriptText);

                        const transcriptDoc = {
                            fileName: transcriptFileName,
                            filePath: `/uploads/${path.basename(transcriptSavePath)}`, 
                            category: 'Transcripts',
                            uploadedBy: user._id,
                            fileSize: Buffer.byteLength(transcriptText),
                            recordStatus: 1
                        };
                        processedDocuments.push(transcriptDoc);
                        
                        caseDoc.activityLog.push({
                            type: 'transcription_generated',
                            description: `Generated transcript for ${originalname}`,
                            performedBy: user._id
                        });
                    } catch (transcribeErr) {
                        console.error('Transcription error:', transcribeErr);
                        caseDoc.activityLog.push({
                            type: 'transcription_failed',
                            description: `Transcription failed for ${originalname}`,
                            performedBy: user._id
                        });
                    }
                }
            };

            // Process each uploaded file
            for (const f of files) {
                const fileExt = path.extname(f.originalname).toLowerCase();
                
                // Check if this is a zip file
                if (fileExt === '.zip') {
                    console.log(`Extracting zip file: ${f.originalname}`);
                    
                    try {
                        // Only extract if we have a local path
                        if (!f.path) {
                            console.log('Skipping zip extraction: No local file path (S3 storage?).');
                            continue;
                        }

                        const zip = new AdmZip(f.path);
                        const zipEntries = zip.getEntries();
                        
                        let extractedCount = 0;
                        
                        // Process each file in the zip
                        for (const entry of zipEntries) {
                            if (entry.isDirectory) continue; // Skip directories
                            
                            const entryName = entry.entryName;
                            const entryData = entry.getData();
                            
                            // Save extracted file to uploads directory
                            const extractedFileName = `${Date.now()}-${path.basename(entryName)}`;
                            const extractedFilePath = path.join('uploads', extractedFileName);
                            
                            fs.writeFileSync(extractedFilePath, entryData);
                            
                            // Create file object mimicking multer structure
                            const extractedFileData = {
                                originalname: path.basename(entryName),
                                mimetype: getMimeType(path.basename(entryName)),
                                filename: extractedFileName,
                                path: extractedFilePath,
                                size: entryData.length,
                                location: null // Local storage
                            };
                            
                            // Process this extracted file (including transcription if audio)
                            await processSingleFile(extractedFileData);
                            extractedCount++;
                            
                            // Trigger ingestion for this file
                            console.log(`[DEBUG] Calling ingestToRAG for extracted file: ${path.basename(entryName)}`);
                            await ingestToRAG(extractedFilePath, path.basename(entryName), caseDoc._id, authToken);
                        }
                        
                        // Delete the zip file itself (we don't want it in documents)
                        try {
                            fs.unlinkSync(f.path);
                        } catch (unlinkErr) {
                            console.error('Error deleting zip file:', unlinkErr);
                        }
                        
                        caseDoc.activityLog.push({
                            type: 'zip_extracted',
                            description: `Extracted ${extractedCount} files from ${f.originalname}`,
                            performedBy: user._id
                        });
                        
                    } catch (zipErr) {
                        console.error('Zip extraction error:', zipErr);
                        caseDoc.activityLog.push({
                            type: 'zip_extraction_failed',
                            description: `Failed to extract ${f.originalname}`,
                            performedBy: user._id
                        });
                    }
                } else {
                    // Regular file (not a zip)
                    await processSingleFile(f);
                    
                    // Trigger ingestion for regular files
                    if (f.path) {
                        await ingestToRAG(f.path, f.originalname, caseDoc._id, authToken);
                    }
                }
            }
            return processedDocuments;
        };

        const authToken = req.headers.authorization; // Assuming token is passed in Authorization header
        const newDocuments = await processFilesAndIngest(req.files, caseDoc, req.user, category, authToken);
        
        caseDoc.documents.push(...newDocuments);
        caseDoc.activityLog.push({
            type: 'document_uploaded',
            description: `Uploaded ${req.files.length} files`,
            performedBy: req.user._id
        });
        
        await caseDoc.save();

        // Notify case team about document upload
        const io = req.app.get('socketio');
        const uploaderName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        const teamIds = [
            ...(caseDoc.assignedLawyers || []),
            ...(caseDoc.teamMembers || []).map(m => m.userId)
        ];
        for (const memberId of teamIds) {
            if (memberId && memberId.toString() !== req.user._id.toString()) {
                await createNotification(io, {
                    recipient: memberId,
                    type: 'case',
                    title: 'Document Uploaded',
                    description: `${uploaderName} uploaded ${req.files.length} file(s) to "${caseDoc.title}"`,
                    link: `/portal/cases/${caseDoc._id}`,
                    metadata: { caseId: caseDoc._id }
                });
            }
        }

        res.status(201).json(caseDoc.documents.filter(d => d.recordStatus === 1));
    } catch (error) { next(error); }
};

// Helper to get MIME type from filename
function getMimeType(filename) {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        '.txt': 'text/plain',
        '.md': 'text/markdown',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.m4a': 'audio/mp4',
        '.ogg': 'audio/ogg'
    };
    return mimeTypes[ext] || 'application/octet-stream';
}

// Helper to trigger RAG ingestion
async function ingestToRAG(filePath, filename, caseId, authToken) {
    try {
        const PYTHON_SERVER = 'http://localhost:8000';
        console.log(`Triggering RAG ingestion for ${filename} to ${PYTHON_SERVER}...`);
        
        const formData = new FormData();
        formData.append('file', fs.createReadStream(filePath), { filename });
        formData.append('caseId', String(caseId));
        
        // Call Python server ingestion endpoint
        await axios.post(`${PYTHON_SERVER}/ingest`, formData, {
            headers: {
                ...formData.getHeaders(),
                'Authorization': authToken // Pass the Bearer token
            },
            timeout: 60000 // 60 second timeout
        });
        
        console.log(`Successfully ingested ${filename}`);
    } catch (error) {
        console.error(`Ingestion failed for ${filename}:`, error.message);
        // Don't throw - ingestion failure shouldn't block upload
    }
}

const deleteDocument = async (req, res, next) => {
    try {
        const { id, documentId } = req.params;
        const caseDoc = await Case.findById(id);
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }

        const doc = caseDoc.documents.find(d => d._id.toString() === documentId);
        if (doc) {
            doc.recordStatus = 0; // Soft delete
            caseDoc.activityLog.push({
                type: 'document_deleted',
                description: `Deleted document ${doc.fileName}`,
                performedBy: req.user._id
            });
            await caseDoc.save();
        }
        res.json({ message: 'Document deleted' });
    } catch (error) { next(error); }
};

// Activity
const getCaseActivity = async (req, res, next) => {
    try {
        const caseDoc = await Case.findById(req.params.id).populate('activityLog.performedBy', 'firstName lastName');
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }
        res.json(caseDoc.activityLog.reverse());
    } catch (error) { next(error); }
};

const addCaseActivity = async (req, res, next) => {
    try {
        const { description, type } = req.body;
        const caseDoc = await Case.findById(req.params.id);
        if (!caseDoc) { res.status(404); throw new Error('Case not found'); }
        
        caseDoc.activityLog.push({
            type: type || 'general',
            description,
            performedBy: req.user._id,
            createdAt: new Date()
        });
        await caseDoc.save();
        res.status(201).json(caseDoc.activityLog);
    } catch (error) { next(error); }
};

// Billing
const getCaseBilling = async (req, res, next) => {
    try {
        const caseDoc = await Case.findById(req.params.id);
        res.json(caseDoc.billing || []);
    } catch (error) { next(error); }
};

const addCaseBilling = async (req, res, next) => {
    try {
        const { amount, description, status, date, category } = req.body;
        const caseDoc = await Case.findById(req.params.id);
        
        let receiptUrl = '';
        if (req.file) {
             // Supports both S3 (location) and Local (filename)
             receiptUrl = req.file.location || `/uploads/${req.file.filename}`;
        }

        caseDoc.billing.push({
            amount, description, status, date: date || new Date(), receiptUrl
        });
        await caseDoc.save();

        // Notify team about new billing entry
        const io = req.app.get('socketio');
        const billerName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
        const billingTeamIds = [
            ...(caseDoc.assignedLawyers || []),
            ...(caseDoc.teamMembers || []).map(m => m.userId)
        ];
        for (const memberId of billingTeamIds) {
            if (memberId && memberId.toString() !== req.user._id.toString()) {
                await createNotification(io, {
                    recipient: memberId,
                    type: 'billing',
                    title: 'New Billing Entry',
                    description: `${billerName} added a billing entry of ${amount} to "${caseDoc.title}"`,
                    link: `/portal/cases/${caseDoc._id}`,
                    metadata: { caseId: caseDoc._id }
                });
            }
        }

        res.status(201).json(caseDoc.billing);
    } catch (error) { next(error); }
};

// Settings
const updateCaseSettings = async (req, res, next) => {
    try {
        const updates = req.body;
        const caseDoc = await Case.findById(req.params.id);
        
        if (updates.notifications) caseDoc.settings.notifications = { ...caseDoc.settings.notifications, ...updates.notifications };
        if (updates.title) caseDoc.title = updates.title;
        if (updates.description) caseDoc.description = updates.description;
        if (updates.status) caseDoc.status = updates.status;
        
        // Handle team add/remove if strictly requested via settings endpoint logic
        if (updates.team) {
            // updates.team.add = [{ userId, role }]
            // updates.team.remove = [userId]
            // This requires matching logic to assignedLawyers or teamMembers fields.
            // For now, simple direct field updates.
        }

        await caseDoc.save();

        // Notify team when status changes
        if (updates.status) {
            const io = req.app.get('socketio');
            const updaterName = `${req.user.firstName} ${req.user.lastName || ''}`.trim();
            const teamIds = [
                ...(caseDoc.assignedLawyers || []),
                ...(caseDoc.teamMembers || []).map(m => m.userId)
            ];
            for (const memberId of teamIds) {
                if (memberId && memberId.toString() !== req.user._id.toString()) {
                    await createNotification(io, {
                        recipient: memberId,
                        type: 'case',
                        title: 'Case Status Updated',
                        description: `${updaterName} changed "${caseDoc.title}" status to ${updates.status}`,
                        link: `/portal/cases/${caseDoc._id}`,
                        metadata: { caseId: caseDoc._id }
                    });
                }
            }
        }

        res.json(caseDoc);
    } catch (error) { next(error); }
};

// @desc    Get case health score
// @route   GET /cases/:id/health
// @access  Private
const getCaseHealth = async (req, res, next) => {
    try {
        const caseId = req.params.id;
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAhead = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const threeDaysAhead = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
        const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgoDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Fetch case, events, and investigation reports in parallel
        const [caseDoc, events, investigationData] = await Promise.all([
            Case.findOne({ _id: caseId, recordStatus: 1 }),
            Event.find({
                caseId,
                startDate: { $gte: sevenDaysAgo, $lte: thirtyDaysAhead }
            }),
            axios.get(`${PYTHON_RAG_SERVER}/investigation/reports/${caseId}`, {
                timeout: 5000,
                headers: req.headers.authorization ? { Authorization: req.headers.authorization } : {}
            }).then(r => r.data).catch(() => null)
        ]);

        if (!caseDoc) {
            res.status(404);
            throw new Error('Case not found');
        }

        const redFlags = [];

        // --- Dimension 1: Document Completeness (25 pts) ---
        const activeDocs = (caseDoc.documents || []).filter(d => d.recordStatus === 1);
        const docCategories = new Set(activeDocs.map(d => d.category));
        let docScore = 0;
        const requiredCategories = ['Court Filings', 'Evidence', 'Correspondence'];
        for (const cat of requiredCategories) {
            if (docCategories.has(cat)) {
                docScore += 8;
            } else {
                redFlags.push({
                    category: 'documents',
                    severity: 'critical',
                    message: `Missing ${cat}`,
                    actionable: `Upload ${cat.toLowerCase()} in Documents tab`
                });
            }
        }
        if (activeDocs.length >= 5) docScore += 1;
        docScore = Math.min(docScore, 25);

        // --- Dimension 2: Deadline Health (30 pts) ---
        let deadlineScore = 30;
        for (const event of events) {
            const start = new Date(event.startDate);
            if (start < now) {
                deadlineScore -= 10;
                redFlags.push({
                    category: 'deadlines',
                    severity: 'critical',
                    message: `Overdue: "${event.title}"`,
                    actionable: 'Reschedule or complete this event in Calendar'
                });
            } else if (start <= threeDaysAhead) {
                deadlineScore -= 5;
                redFlags.push({
                    category: 'deadlines',
                    severity: 'warning',
                    message: `Due within 3 days: "${event.title}"`,
                    actionable: 'Prepare for this upcoming deadline'
                });
            } else if (start <= sevenDaysAhead) {
                deadlineScore -= 2;
            }
        }
        deadlineScore = Math.max(deadlineScore, 0);

        // --- Dimension 3: Client & Billing (20 pts) ---
        let billingScore = 20;
        const billingEntries = caseDoc.billing || [];
        for (const entry of billingEntries) {
            if (entry.status === 'Unpaid') {
                const entryDate = new Date(entry.date);
                if (entryDate < thirtyDaysAgoDate) {
                    billingScore -= 5;
                    redFlags.push({
                        category: 'billing',
                        severity: 'critical',
                        message: `Unpaid invoice >30 days: ${entry.description || 'No description'}`,
                        actionable: 'Follow up on overdue payment in Billing tab'
                    });
                }
            } else if (entry.status === 'Pending') {
                billingScore -= 3;
                redFlags.push({
                    category: 'billing',
                    severity: 'warning',
                    message: `Pending invoice: ${entry.description || 'No description'}`,
                    actionable: 'Review pending billing entry'
                });
            }
        }
        if (caseDoc.status === 'Paused') {
            billingScore -= 5;
            redFlags.push({
                category: 'billing',
                severity: 'warning',
                message: 'Case is paused',
                actionable: 'Resume the case in Settings if work should continue'
            });
        }
        // Check for no activity in 14 days
        const recentActivity = (caseDoc.activityLog || []).find(
            a => new Date(a.createdAt) >= fourteenDaysAgo
        );
        if (!recentActivity) {
            billingScore -= 3;
            redFlags.push({
                category: 'billing',
                severity: 'info',
                message: 'No activity in 14 days',
                actionable: 'Check if case needs attention or can be closed'
            });
        }
        billingScore = Math.max(billingScore, 0);

        // --- Dimension 4: Evidence Integrity (25 pts) ---
        let evidenceScore = 25;
        let hasInvestigation = false;
        if (investigationData && Array.isArray(investigationData) && investigationData.length > 0) {
            hasInvestigation = true;
            // Use the most recent report
            const latestReport = investigationData[0];
            const structured = latestReport.structured_data || {};
            const conflicts = (structured.conflicts || []).filter(c => c.resolution_status !== 'resolved');
            const gaps = structured.evidence_gaps || [];
            const risks = (structured.risks || []).filter(r => r.level === 'high' || r.severity === 'high');

            for (const conflict of conflicts) {
                evidenceScore -= 5;
                redFlags.push({
                    category: 'evidence',
                    severity: 'critical',
                    message: `Unresolved conflict: ${conflict.description || 'Evidence contradiction'}`,
                    actionable: 'Review conflicts in Investigator Agent tab'
                });
            }
            for (const gap of gaps) {
                evidenceScore -= 3;
                redFlags.push({
                    category: 'evidence',
                    severity: 'warning',
                    message: `Evidence gap: ${gap.description || 'Missing evidence'}`,
                    actionable: 'Address evidence gap via investigation'
                });
            }
            for (const risk of risks) {
                evidenceScore -= 2;
            }
        } else {
            evidenceScore = 20;
            redFlags.push({
                category: 'evidence',
                severity: 'info',
                message: 'No investigation report available',
                actionable: 'Run an investigation to analyze evidence integrity'
            });
        }
        evidenceScore = Math.max(evidenceScore, 0);

        // --- Compute total ---
        const totalScore = docScore + deadlineScore + billingScore + evidenceScore;
        let rating;
        if (totalScore >= 80) rating = 'healthy';
        else if (totalScore >= 60) rating = 'needs_attention';
        else if (totalScore >= 40) rating = 'at_risk';
        else rating = 'critical';

        res.json({
            score: totalScore,
            rating,
            dimensions: [
                { name: 'documents', label: 'Document Completeness', score: docScore, maxScore: 25 },
                { name: 'deadlines', label: 'Deadline Health', score: deadlineScore, maxScore: 30 },
                { name: 'billing', label: 'Client & Billing', score: billingScore, maxScore: 20 },
                { name: 'evidence', label: 'Evidence Integrity', score: evidenceScore, maxScore: 25 }
            ],
            redFlags,
            computedAt: new Date().toISOString()
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getCases, createCase, getCaseById, deleteCase, // Main
    getCaseDocuments, uploadDocument, deleteDocument, // Documents
    getCaseActivity, addCaseActivity, // Activity
    getCaseBilling, addCaseBilling, // Billing
    updateCaseSettings, // Settings
    getCaseHealth // Health Score
};
