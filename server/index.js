const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsappRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');
const { initWhatsApp } = require('./services/whatsappService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Pasang middleware
app.use(cors());
app.use(express.json({ limit: '35mb' }));
app.use('/api', whatsappRoutes);
app.use('/api', schedulerRoutes);

app.get('/', (req, res) => {
    res.send('<h1>WhatsApp API Backend</h1>');
});

// Socket connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});

// Init WhatsApp service dengan passing io
initWhatsApp(io);

server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
