require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsappRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const aiRoutes = require('./routes/aiRoutes');
const userRoutes = require('./routes/userRoutes');
const contactRoutes = require('./routes/contactRoutes');
const { initWhatsApp } = require('./services/whatsappService');
const googleSheetsService = require('./services/googleSheetsService');
const { initMCP } = require('./services/mcpService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3000", "http://localhost:3001", "http://localhost:3003", "http://localhost:5173", "http://127.0.0.1:3000", "https://wa.kenes.biz.id", "https://www.wa.kenes.biz.id"],
        methods: ["GET", "POST", "PUT", "DELETE"],
        credentials: true
    }
});


// Initialize MCP Server (Must be before express.json parser for SSE transport)
try {
    initMCP(app);
} catch (error) {
    console.error('Failed to initialize MCP server:', error);
}

// Pasang middleware
app.use(cors());
app.use(express.json({ limit: '35mb' }));
app.use('/api', whatsappRoutes);
app.use('/api', schedulerRoutes);
app.use('/api', aiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/contacts', contactRoutes);

app.get('/', (req, res) => {
    res.send('<h1>WhatsApp API Backend</h1>');
});

// Socket connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});

// Init WhatsApp service dengan passing io
initWhatsApp(io);

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

// Global error handlers - log and avoid crashing the process from unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception thrown:', err);
});
