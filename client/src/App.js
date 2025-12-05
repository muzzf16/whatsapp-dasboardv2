import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { API_URL } from './lib/api';
import Notification from './components/Notification';
import ConnectionManager from './components/ConnectionManager';
import MessageSender from './components/MessageSender';
import BroadcastSender from './components/BroadcastSender';
import WebhookManager from './components/WebhookManager';
import MessageLog from './components/MessageLog';
import ScheduledMessageManager from './components/ScheduledMessageManager';
import ExcelUpload from './components/ExcelUpload';
import Layout from './components/Layout';

// API_URL is centralized in src/lib/api.js. Make sure REACT_APP_API_URL is configured.

const socket = io(API_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    withCredentials: true,
});


export default function App() {
    const [connections, setConnections] = useState([]);
    const [activeConnectionId, setActiveConnectionId] = useState('');
    const [newConnectionId, setNewConnectionId] = useState('');

    const [qrCodes, setQrCodes] = useState({});
    const [diagnostics, setDiagnostics] = useState(null);
    const [messages, setMessages] = useState([]);
    const [outgoingMessages, setOutgoingMessages] = useState([]);
    const [messageFilter, setMessageFilter] = useState('');
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'messages', 'broadcast', 'schedule', 'webhook', 'logs'
    const [logTab, setLogTab] = useState('incoming'); // For MessageLog component internal tab

    const [sendTo, setSendTo] = useState('');
    const [sendMessageText, setSendMessageText] = useState('');
    const [selectedFile, setSelectedFile] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const [broadcastNumbers, setBroadcastNumbers] = useState('');
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [broadcastDelay, setBroadcastDelay] = useState(1000);
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    const [webhookUrl, setWebhookUrl] = useState('');
    const [webhookSecret, setWebhookSecret] = useState('');
    const [isSavingWebhook, setIsSavingWebhook] = useState(false);

    const [notification, setNotification] = useState({ message: '', type: '' });

    const messagesEndRef = useRef(null);

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    useEffect(() => {
        const fetchConnections = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/connections`);
                setConnections(res.data);
                if (res.data.length > 0 && !activeConnectionId) {
                    setActiveConnectionId(res.data[0].connectionId);
                }
            } catch (error) {
                console.error("Error fetching connections:", error);
            }
        };

        fetchConnections();
        const fetchInitialData = async () => {
            try {
                const webhookRes = await axios.get(`${API_URL}/api/webhook`);
                setWebhookUrl(webhookRes.data.webhookUrl);
                setWebhookSecret(webhookRes.data.webhookSecret);
            } catch (error) {
                console.error("Error fetching initial data:", error);
                showNotification('Gagal memuat data awal.', 'error');
            }
        };

        fetchInitialData();

        socket.on('status', async ({ connectionId, status, reason }) => {
            setConnections(prev => prev.map(c => c.connectionId === connectionId ? { ...c, status } : c));
            if (status === 'logged out') {
                showNotification(`Koneksi ${connectionId} telah logout. ${reason ? `(${reason})` : ''}`, 'error');
                if (connectionId === activeConnectionId) {
                    try {
                        const diagRes = await axios.get(`${API_URL}/api/${connectionId}/diagnostics`);
                        setDiagnostics(diagRes.data.data);
                    } catch (err) {
                        // ignore
                    }
                }
            }
        });

        socket.on('connect', () => {
            console.info('Socket connected to', API_URL, 'id:', socket.id);
        });

        socket.on('connect_error', (error) => {
            console.error('Socket connect error:', error);
            showNotification('Gagal terhubung ke server realtime (websocket). Periksa URL backend atau koneksi.', 'error');
        });

        socket.on('qr_code', ({ connectionId, qrUrl }) => {
            console.log(`QR Code received for ${connectionId}:`, qrUrl ? 'URL present' : 'null');
            setQrCodes(prev => ({ ...prev, [connectionId]: qrUrl }));
        });

        socket.on('new_message', ({ connectionId, log }) => {
            if (connectionId === activeConnectionId) {
                setMessages(prevMessages => [log, ...prevMessages]);
                showNotification(`Pesan baru dari ${log.senderName || log.from?.split('@')[0] || 'Seseorang'}`, 'info');
            }
        });

        socket.on('new_outgoing_message', ({ connectionId, log }) => {
            if (connectionId === activeConnectionId) {
                setOutgoingMessages(prevOutgoingMessages => [log, ...prevOutgoingMessages]);
            }
        });

        return () => {
            socket.off('status');
            socket.off('qr_code');
            socket.off('new_message');
            socket.off('new_outgoing_message');
        };
    }, [activeConnectionId]); // Kept activeConnectionId dependency for message filtering, but QR code is now global

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, outgoingMessages]);

    useEffect(() => {
        const fetchConnectionData = async () => {
            if (activeConnectionId) {
                try {
                    const messagesRes = await axios.get(`${API_URL}/api/${activeConnectionId}/messages`);
                    setMessages(messagesRes.data.messages);
                    const outgoingMessagesRes = await axios.get(`${API_URL}/api/${activeConnectionId}/outgoing-messages`);
                    setOutgoingMessages(outgoingMessagesRes.data.messages);
                    const qrRes = await axios.get(`${API_URL}/api/${activeConnectionId}/qrcode`);
                    setQrCodes(prev => ({ ...prev, [activeConnectionId]: qrRes.data.qrUrl }));
                    // fetch diagnostics
                    try {
                        const diagRes = await axios.get(`${API_URL}/api/${activeConnectionId}/diagnostics`);
                        setDiagnostics(diagRes.data.data);
                    } catch (err) {
                        // ignore diagnostics fetch errors
                        setDiagnostics(null);
                    }
                } catch (error) {
                    console.error(`Error fetching data for ${activeConnectionId}:`, error);
                }
            }
        };
        fetchConnectionData();
    }, [activeConnectionId]);

    const handleStartConnection = async (connectionId) => {
        try {
            await axios.post(`${API_URL}/api/connections/start`, { connectionId });
            setConnections(prev => {
                const exists = prev.find(c => c.connectionId === connectionId);
                if (exists) {
                    return prev.map(c => c.connectionId === connectionId ? { ...c, status: 'connecting' } : c);
                }
                return [...prev, { connectionId, status: 'connecting' }];
            });
            if (!activeConnectionId) setActiveConnectionId(connectionId);
            // Also switch to the new connection if it's explicitly started by user action (optional but good UX)
            setActiveConnectionId(connectionId);
            showNotification(`Koneksi ${connectionId} dimulai.`, 'success');
        } catch (error) {
            console.error("Error starting connection:", error);
            showNotification('Gagal memulai koneksi.', 'error');
        }
    };

    const handleAddConnection = async () => {
        if (!newConnectionId) {
            showNotification('Connection ID harus diisi.', 'error');
            return;
        }
        await handleStartConnection(newConnectionId);
        setNewConnectionId('');
    };

    const handleDisconnectConnection = async (connectionId) => {
        try {
            await axios.post(`${API_URL}/api/connections/disconnect`, { connectionId });
            setConnections(prev => prev.filter(c => c.connectionId !== connectionId));
            if (activeConnectionId === connectionId) {
                setActiveConnectionId(connections[0]?.connectionId || '');
            }
            showNotification(`Koneksi ${connectionId} diputus.`, 'success');
        } catch (error) {
            console.error("Error disconnecting connection:", error);
            showNotification('Gagal memutus koneksi.', 'error');
        }
    };

    const handleReinitConnection = async (connectionId) => {
        if (!window.confirm(`Apakah Anda yakin ingin menginisiasi ulang koneksi ${connectionId}? Ini akan menghapus status autentikasi dan menghasilkan QR baru.`)) return;
        try {
            await axios.post(`${API_URL}/api/connections/${connectionId}/reinit`);
            showNotification(`Koneksi ${connectionId} diinisiasi ulang. Scan QR baru untuk re-auth.`, 'success');
        } catch (error) {
            console.error("Error reinitializing connection:", error);
            showNotification('Gagal menginisiasi ulang koneksi.', 'error');
        }
    };

    const handleDisconnectAllConnections = async () => {
        try {
            await axios.post(`${API_URL}/api/connections/disconnect-all`);
            setConnections([]);
            setActiveConnectionId('');
            showNotification('Semua koneksi diputus.', 'success');
        } catch (error) {
            console.error("Error disconnecting all connections:", error);
            showNotification('Gagal memutus semua koneksi.', 'error');
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.size > 25 * 1024 * 1024) {
            showNotification('Ukuran file tidak boleh melebihi 25MB.', 'error');
            e.target.value = null;
            setSelectedFile(null);
            return;
        }
        setSelectedFile(file);
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        const activeConnection = connections.find(c => c.connectionId === activeConnectionId);
        if (!sendTo || (!sendMessageText && !selectedFile) || activeConnection?.status !== 'connected') {
            showNotification('Nomor dan (pesan atau file) harus diisi, dan status harus terhubung.', 'error');
            return;
        }
        setIsSending(true);

        let fileData = null;
        if (selectedFile) {
            const reader = new FileReader();
            reader.readAsDataURL(selectedFile);
            reader.onload = async () => {
                const base64 = reader.result.split(',')[1];
                fileData = {
                    name: selectedFile.name,
                    type: selectedFile.type,
                    base64: base64,
                };
                await sendMessageRequest(fileData);
            };
            reader.onerror = (error) => {
                console.error("Error reading file:", error);
                showNotification('Gagal membaca file.', 'error');
                setIsSending(false);
            };
        } else {
            await sendMessageRequest(null);
        }
    };

    const sendMessageRequest = async (file) => {
        try {
            await axios.post(`${API_URL}/api/${activeConnectionId}/send-message`, {
                number: sendTo,
                message: sendMessageText,
                file: file,
            });
            showNotification('Pesan berhasil dikirim!', 'success');
            setSendTo('');
            setSendMessageText('');
            setSelectedFile(null);
        } catch (error) {
            console.error("Error sending message:", error);
            showNotification(error.response?.data?.details || 'Gagal mengirim pesan.', 'error');
        } finally {
            setIsSending(false);
        }
    }

    const handleBroadcastMessage = async (e) => {
        e.preventDefault();
        const activeConnection = connections.find(c => c.connectionId === activeConnectionId);
        if (!broadcastNumbers || !broadcastMessage || activeConnection?.status !== 'connected') {
            showNotification('Nomor dan pesan broadcast harus diisi, dan status harus terhubung.', 'error');
            return;
        }
        setIsBroadcasting(true);
        const numbers = broadcastNumbers.split('\n').filter(n => n.trim() !== '');
        try {
            await axios.post(`${API_URL}/api/${activeConnectionId}/broadcast-message`, {
                numbers: numbers,
                message: broadcastMessage,
                delay: broadcastDelay,
            });
            showNotification('Pesan broadcast berhasil dikirim!', 'success');
            setBroadcastNumbers('');
            setBroadcastMessage('');
        } catch (error) {
            console.error("Error sending broadcast message:", error);
            showNotification(error.response?.data?.details || 'Gagal mengirim pesan broadcast.', 'error');
        } finally {
            setIsBroadcasting(false);
        }
    };

    const handleSaveWebhook = async (e) => {
        e.preventDefault();
        setIsSavingWebhook(true);
        try {
            await axios.post(`${API_URL}/api/webhook`, { url: webhookUrl, secret: webhookSecret });
            showNotification('Pengaturan webhook berhasil disimpan!', 'success');
        } catch (error) {
            console.error("Error saving webhook:", error);
            showNotification(error.response?.data?.message || 'Gagal menyimpan pengaturan webhook.', 'error');
        } finally {
            setIsSavingWebhook(false);
        }
    };

    const activeConnection = connections.find(c => c.connectionId === activeConnectionId);

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <ConnectionManager
                            newConnectionId={newConnectionId}
                            setNewConnectionId={setNewConnectionId}
                            activeConnectionId={activeConnectionId}
                            setActiveConnectionId={setActiveConnectionId}
                            connections={connections}
                            onAddConnection={handleAddConnection}
                            onStartConnection={handleStartConnection}
                            onDisconnect={handleDisconnectConnection}
                            onReinitConnection={handleReinitConnection}
                            onDisconnectAll={handleDisconnectAllConnections}
                            qrCodeUrl={qrCodes[activeConnectionId]}
                            diagnostics={diagnostics}
                        />
                    </div>
                );
            case 'messages':
                return (
                    <MessageSender
                        sendTo={sendTo}
                        setSendTo={setSendTo}
                        sendMessageText={sendMessageText}
                        setSendMessageText={setSendMessageText}
                        activeConnection={activeConnection}
                        isSending={isSending}
                        onSendMessage={handleSendMessage}
                        onFileChange={handleFileChange}
                    />
                );
            case 'broadcast':
                return (
                    <BroadcastSender
                        broadcastNumbers={broadcastNumbers}
                        setBroadcastNumbers={setBroadcastNumbers}
                        broadcastMessage={broadcastMessage}
                        setBroadcastMessage={setBroadcastMessage}
                        activeConnection={activeConnection}
                        isBroadcasting={isBroadcasting}
                        onBroadcastMessage={handleBroadcastMessage}
                        broadcastDelay={broadcastDelay}
                        setBroadcastDelay={setBroadcastDelay}
                    />
                );
            case 'schedule':
                return (
                    <div className="space-y-6">
                        <ExcelUpload
                            activeConnectionId={activeConnectionId}
                            status={activeConnection?.status}
                        />
                        <ScheduledMessageManager
                            activeConnectionId={activeConnectionId}
                            status={activeConnection?.status}
                        />
                    </div>
                );
            case 'webhook':
                return (
                    <WebhookManager
                        webhookUrl={webhookUrl}
                        setWebhookUrl={setWebhookUrl}
                        webhookSecret={webhookSecret}
                        setWebhookSecret={setWebhookSecret}
                        isSavingWebhook={isSavingWebhook}
                        onSaveWebhook={handleSaveWebhook}
                    />
                );
            case 'logs':
                return (
                    <MessageLog
                        activeTab={logTab}
                        setActiveTab={setLogTab}
                        messageFilter={messageFilter}
                        setMessageFilter={setMessageFilter}
                        messages={messages}
                        outgoingMessages={outgoingMessages}
                        messagesEndRef={messagesEndRef}
                        onReply={(to, text) => {
                            setSendTo(to);
                            setSendMessageText(text); // Optional: pre-fill text if needed, or just focus
                            setActiveTab('messages'); // Switch to message sender tab
                        }}
                    />
                );
            default:
                return <div>Pilih menu dari sidebar</div>;
        }
    };

    return (
        <Layout
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            activeConnection={activeConnection}
            onDisconnect={handleDisconnectConnection}
            connections={connections}
        >
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            {renderContent()}
        </Layout>
    );
}
