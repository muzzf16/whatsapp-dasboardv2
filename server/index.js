const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');
const whatsappRoutes = require('./routes/whatsappRoutes');
const { initWhatsApp } = require('./services/whatsappService');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 4000;

const io = new Server(server, {
    cors: {
        origin: ["http://localhost:3003", "http://localhost:3333"], // Izinkan koneksi dari frontend React
        methods: ["GET", "POST"]
    }
});

// Pasang middleware
app.use(cors());
app.use(express.json({ limit: '35mb' }));
app.use('/api', whatsappRoutes);

app.get('/', (req, res) => {
    res.send('<h1>WhatsApp API Backend</h1>');
});

// Socket connection
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
});

// initWhatsApp(io) is removed because sessions are now started via API call

server.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});