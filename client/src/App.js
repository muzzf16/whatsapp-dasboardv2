import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';

import Layout from './components/Layout';
import Notification from './components/Notification';
import DashboardContent from './components/DashboardContent';
import Sessions from './pages/Sessions';
import Settings from './pages/Settings';
import Campaign from './pages/Campaign';
import Templates from './pages/Templates';
import BroadcastTracker from './pages/BroadcastTracker';
import { FullPageSpinner } from './components/Spinner';


const API_URL = 'http://localhost:4000';
const socket = io(API_URL);

function App() {
    // === GLOBAL STATE ===
    const [view, setView] = useState('sessions');
    const [sessions, setSessions] = useState([]);
    const [currentConnectionId, setCurrentConnectionId] = useState(null);

    // === DASHBOARD-SPECIFIC STATE ===
    const [status, setStatus] = useState('disconnected');
    const [qrCode, setQrCode] = useState(null);
    const [messages, setMessages] = useState([]);
    
    // === FORM STATE ===
    const [sendTo, setSendTo] = useState('');
    const [sendMessageText, setSendMessageText] = useState('');
    const [isSending, setIsSending] = useState(false);
    
    // === UI STATE ===
    const [isAppLoading, setIsAppLoading] = useState(true);
    const [isDashboardLoading, setIsDashboardLoading] = useState(false);
    const [broadcasts, setBroadcasts] = useState([]); // State baru untuk broadcast

    const [notification, setNotification] = useState({ message: '', type: '' });
    const messagesEndRef = useRef(null);

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    const fetchSessions = useCallback(async () => {
        try {
            const response = await axios.get(`${API_URL}/api/connections`);
            setSessions(response.data);
            if (!currentConnectionId && response.data.length > 0) {
                handleSelectSession(response.data[0].id);
            }
        } catch (error) {
            console.error("Error fetching sessions:", error);
        } finally {
            setIsAppLoading(false);
        }
    }, [currentConnectionId]);

    const handleSelectSession = (connectionId) => {
        setCurrentConnectionId(connectionId);
        setView('dashboard');
    };

    // Effect for fetching all sessions and general socket listeners
    useEffect(() => {
        fetchSessions();

        const handleStatusUpdate = (data) => {
            setSessions(prevSessions =>
                prevSessions.map(s => s.id === data.connectionId ? { ...s, status: data.status } : s)
            );
            if (data.connectionId === currentConnectionId) {
                setStatus(data.status);
            }
        };

        socket.on('status', handleStatusUpdate);

        // Fetch initial broadcasts and listen for updates
        const fetchBroadcasts = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/broadcasts`);
                setBroadcasts(res.data);
            } catch (error) {
                console.error("Error fetching broadcasts:", error);
            }
        };
        fetchBroadcasts();

        const handleBroadcastUpdate = (updatedJob) => {
            setBroadcasts(prev => {
                const index = prev.findIndex(j => j.id === updatedJob.id);
                if (index !== -1) {
                    const newBroadcasts = [...prev];
                    newBroadcasts[index] = updatedJob;
                    return newBroadcasts;
                } else {
                    return [updatedJob, ...prev];
                }
            });
        };

        socket.on('broadcast_update', handleBroadcastUpdate);

        return () => {
            socket.off('status', handleStatusUpdate);
            socket.off('broadcast_update', handleBroadcastUpdate);
        };
    }, [fetchSessions, currentConnectionId]);

    // Effect for fetching data for the *currently selected* dashboard
    useEffect(() => {
        if (!currentConnectionId) return;

        const fetchDashboardData = async () => {
            setIsDashboardLoading(true);
            setQrCode(null); // Reset QR code on session change
            try {
                const statusRes = await axios.get(`${API_URL}/api/${currentConnectionId}/status`);
                setStatus(statusRes.data.status);

                if (statusRes.data.status === 'waiting for QR scan') {
                    const qrRes = await axios.get(`${API_URL}/api/${currentConnectionId}/qrcode`);
                    setQrCode(qrRes.data.qrUrl);
                }
                const messagesRes = await axios.get(`${API_URL}/api/${currentConnectionId}/messages`);
                setMessages(messagesRes.data.messages);
            } catch (error) {
                console.error(`Error fetching data for ${currentConnectionId}:`, error);
            } finally {
                setIsDashboardLoading(false);
            }
        };

        fetchDashboardData();

        const handleQrUpdate = (data) => {
            if (data.connectionId === currentConnectionId) {
                setQrCode(data.qrUrl);
            }
        };

        const handleNewMessage = (newMessage) => {
            if (newMessage.connectionId === currentConnectionId) {
                setMessages(prevMessages => [newMessage, ...prevMessages]);
            }
        };

        socket.on('qr_code', handleQrUpdate);
        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('qr_code', handleQrUpdate);
            socket.off('new_message', handleNewMessage);
        };
    }, [currentConnectionId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!sendTo || !sendMessageText || status !== 'connected') {
            showNotification('Nomor, pesan, dan status koneksi diperlukan.', 'error');
            return;
        }
        setIsSending(true);
        try {
            await axios.post(`${API_URL}/api/${currentConnectionId}/send-message`, { number: sendTo, message: sendMessageText });
            showNotification('Pesan berhasil dikirim!', 'success');
            setSendTo('');
            setSendMessageText('');
        } catch (error) {
            showNotification(error.response?.data?.details || 'Gagal mengirim pesan.', 'error');
        } finally {
            setIsSending(false);
        }
    };

    if (isAppLoading) {
        return <FullPageSpinner />;
    }

    return (
        <Layout 
            view={view} 
            setView={setView} 
            sessions={sessions}
            currentConnectionId={currentConnectionId}
            handleSelectSession={handleSelectSession}
        >
            <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ message: '', type: '' })} />
            
            {view === 'dashboard' && currentConnectionId && (
                <DashboardContent 
                    connectionId={currentConnectionId}
                    isLoading={isDashboardLoading} // Prop baru
                    qrCodeUrl={qrCode}
                    status={status}
                    handleSendMessage={handleSendMessage}
                    sendTo={sendTo}
                    setSendTo={setSendTo}
                    sendMessageText={sendMessageText}
                    setSendMessageText={setSendMessageText}
                    isSending={isSending}
                    messages={messages}
                    messagesEndRef={messagesEndRef}
                />
            )}

            {view === 'sessions' && (
                <Sessions 
                    sessions={sessions} 
                    fetchSessions={fetchSessions} 
                    handleSelectSession={handleSelectSession} 
                />
            )}

            {view === 'settings' && (
                <Settings showNotification={showNotification} />
            )}

            {view === 'campaign' && (
                <Campaign sessions={sessions} showNotification={showNotification} broadcasts={broadcasts} />
            )}

            {view === 'templates' && (
                <Templates showNotification={showNotification} />
            )}




        </Layout>
    );
}

export default App;