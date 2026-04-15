const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const auth = require('../middleware/authMiddleware');
const { auditMutatingRequests } = require('../middleware/securityMiddleware');
const { sanitizeFilename, isSafePath } = require('../utils/security');
const router = express.Router();

const UPLOADS_DIR = path.join(__dirname, '../uploads');
const ALLOWED_MIME_TYPES = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Multer storage config
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        cb(null, sanitizeFilename(file.originalname));
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 25 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        cb(null, ALLOWED_MIME_TYPES.has(file.mimetype));
    }
});

router.use(auth);
router.use(auditMutatingRequests('file'));

// GET list of files
router.get('/', async (req, res) => {
    try {
        const files = await fs.promises.readdir(UPLOADS_DIR);
        const fileStats = await Promise.all(
            files.map(async (filename) => {
                const filePath = path.join(UPLOADS_DIR, filename);
                const stats = await fs.promises.stat(filePath);
                return {
                    name: filename,
                    size: stats.size,
                    createdAt: stats.mtime,
                    url: `/api/files/download/${encodeURIComponent(filename)}`
                };
            })
        );
        // Sort by newest first
        fileStats.sort((a, b) => b.createdAt - a.createdAt);
        res.json({ success: true, files: fileStats });
    } catch (error) {
        console.error("Error reading files:", error);
        res.status(500).json({ success: false, message: "Gagal memuat file." });
    }
});

// POST upload file
router.post('/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Tidak ada file yang diunggah.' });
        }
        res.status(201).json({
            success: true,
            message: 'File berhasil diunggah.',
            file: {
                name: req.file.filename,
                size: req.file.size,
                createdAt: new Date(),
                url: `/api/files/download/${encodeURIComponent(req.file.filename)}`
            }
        });
    } catch (error) {
        console.error("Error uploading file:", error);
        res.status(500).json({ success: false, message: "Gagal mengunggah file." });
    }
});

// GET protected file download
router.get('/download/:filename', async (req, res) => {
    const { filename } = req.params;
    const filePath = path.join(UPLOADS_DIR, path.basename(filename));

    if (!isSafePath(UPLOADS_DIR, filePath)) {
        return res.status(403).json({ success: false, message: 'Invalid path.' });
    }

    try {
        await fs.promises.access(filePath, fs.constants.R_OK);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        return res.sendFile(path.resolve(filePath));
    } catch (error) {
        return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });
    }
});

// DELETE file
router.delete('/:filename', async (req, res) => {
    const { filename } = req.params;
    if (!filename) {
        return res.status(400).json({ success: false, message: 'Filename is required.' });
    }
    const filePath = path.join(UPLOADS_DIR, path.basename(filename));

    // Basic security check (prevent directory traversal)
    if (!isSafePath(UPLOADS_DIR, filePath)) {
         return res.status(403).json({ success: false, message: 'Invalid path.' });
    }

    try {
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File tidak ditemukan.' });
        }
        await fs.promises.unlink(filePath);
        res.json({ success: true, message: 'File berhasil dihapus.' });
    } catch (error) {
        console.error("Error deleting file:", error);
        res.status(500).json({ success: false, message: "Gagal menghapus file." });
    }
});

module.exports = router;
