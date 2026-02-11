const Manager = require('./Manager');
const databaseService = require('../databaseService');

let manager;

const initWhatsApp = (socketIo) => {
    manager = new Manager(socketIo);
    manager.init();
};

const startConnection = (connectionId) => {
    return manager.startConnection(connectionId);
};

const disconnectConnection = async (connectionId) => {
    await manager.disconnectConnection(connectionId);
};

const disconnectAllConnections = async () => {
    await manager.disconnectAll();
};

const sendMessage = async (connectionId, to, message, file) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendMessage(to, message, file);
    } else {
        throw new Error('Connection not found.');
    }
};

const sendBroadcastMessage = async (connectionId, numbers, message, file, delay) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        await connection.sendBroadcastMessage(numbers, message, file, delay);
    } else {
        throw new Error('Connection not found.');
    }
};

const getStatus = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getStatus();
    }
    return { status: 'disconnected' };
};

const getDiagnostics = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getDiagnostics();
    }
    return { status: 'disconnected' };
};

const getQRCode = (connectionId) => {
    const connection = manager.getConnection(connectionId);
    if (connection) {
        return connection.getQRCode();
    }
    return { qr: null };
};

const getMessages = async (connectionId) => {
    // Improved: Fetch from DB directly.
    try {
        const rows = await databaseService.getMessages(connectionId, 'incoming');
        const messages = rows.map(row => ({
            from: row.sender,
            sender: row.sender,
            pushName: row.push_name,
            senderName: row.push_name,
            text: row.message,
            timestamp: row.timestamp,
            groupName: row.group_name
        }));
        return { messages };
    } catch (err) {
        return { messages: [] };
    }
};

const getOutgoingMessages = async (connectionId) => {
    try {
        const rows = await databaseService.getMessages(connectionId, 'outgoing');
        const messages = rows.map(row => ({
            to: row.recipient,
            text: row.message,
            timestamp: row.timestamp,
            file: row.file_name,
            status: 'sent'
        }));
        return { messages };
    } catch (err) {
        return { messages: [] };
    }
};

const getDashboardStats = async (connectionId) => {
    try {
        return await databaseService.getDashboardStats(connectionId);
    } catch (err) {
        console.error('Error getting dashboard stats from DB:', err);
        return { totalSent: 0, totalSentMonth: 0 };
    }
};

const getAllConnections = () => {
    return manager.getAllConnections();
};

module.exports = {
    initWhatsApp,
    startConnection,
    disconnectConnection,
    disconnectAllConnections,
    sendMessage,
    sendBroadcastMessage,
    getStatus,
    getQRCode,
    getMessages,
    getOutgoingMessages,
    getAllConnections,
    getDiagnostics,
    getDashboardStats,
};
