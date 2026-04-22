require('dotenv').config();

if (!process.env.JWT_SECRET) {
    console.error("FATAL ERROR: JWT_SECRET is not defined in environment variables. Set a strong secret to secure the application.");
    process.exit(1);
}
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsappRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const fileRoutes = require('./routes/fileRoutes');
const approvalRoutes = require('./routes/approvalRoutes');
const { initWhatsApp } = require('./services/whatsapp');
const googleSheetsService = require('./services/googleSheetsService');
const { initMCP } = require('./services/mcpService');
const retentionService = require('./services/retentionService');
const authMiddleware = require('./middleware/authMiddleware');
const { authenticateSocket, securityHeaders } = require('./middleware/securityMiddleware');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;
const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000,http://localhost:3001,http://localhost:3003,http://localhost:5173,http://127.0.0.1:3000,https://wa.kenes.biz.id,https://www.wa.kenes.biz.id")
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);

const io = new Server(server, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});
io.use(authenticateSocket);

app.set('trust proxy', 1);
app.use(securityHeaders);

// Initialize MCP Server (Must be before express.json parser for SSE transport)
try {
    initMCP(app);
} catch (error) {
    console.error('Failed to initialize MCP server:', error);
}

// Pasang middleware
app.use(cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json({ limit: '35mb' }));
app.use('/api/users', userRoutes);
app.use('/api', whatsappRoutes);
app.use('/api', schedulerRoutes);
app.use('/api', aiRoutes);

app.use('/api/contacts', contactRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/approvals', approvalRoutes);
const path = require('path');
app.use('/uploads', authMiddleware, express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
    res.send('<h1>WhatsApp API Backend</h1>');
});

// Socket connection
io.on('connection', (socket) => {
    console.log('Authenticated realtime client connected:', socket.id, 'user:', socket.user?.id);
});

// Init WhatsApp service dengan passing io
initWhatsApp(io);
retentionService.init();

// Initialize Google Sheets integration at startup if configured
if (process.env.GOOGLE_SPREADSHEET_ID) {
    googleSheetsService.init().then(() => {
        console.log('Google Sheets service initialized.');
    }).catch(err => {
        console.error('Google Sheets service initialization failed:', err?.message || err);
    });
}


server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});

// Global handler for unhandled promise rejections to avoid server crash and centralize logs
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Depending on the app requirements, consider restarting the process or exiting
    // process.exit(1);
});

