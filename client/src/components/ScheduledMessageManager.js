import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, Trash2, RefreshCw, Plus } from 'lucide-react';

const ScheduledMessageManager = ({ activeConnectionId, status }) => {
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [number, setNumber] = useState('');
    const [message, setMessage] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    const API_URL = 'https://api.kenes.biz.id';

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    const fetchScheduledMessages = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/schedule`);
            setScheduledMessages(res.data.data);
        } catch (error) {
            console.error("Error fetching scheduled messages:", error);
        }
    };

    useEffect(() => {
        fetchScheduledMessages();
        const interval = setInterval(fetchScheduledMessages, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const handleScheduleMessage = async (e) => {
        e.preventDefault();
        if (!activeConnectionId || status !== 'connected') {
            showNotification('Harus terhubung dengan WhatsApp untuk menjadwalkan pesan.', 'error');
            return;
        }
        if (!number || !message || !scheduledTime) {
            showNotification('Semua field harus diisi.', 'error');
            return;
        }

        setIsScheduling(true);
        try {
            await axios.post(`${API_URL}/api/schedule`, {
                connectionId: activeConnectionId,
                number,
                message,
                scheduledTime
            });
            showNotification('Pesan berhasil dijadwalkan!', 'success');
            setNumber('');
            setMessage('');
            setScheduledTime('');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error scheduling message:", error);
            showNotification(error.response?.data?.message || 'Gagal menjadwalkan pesan.', 'error');
        } finally {
            setIsScheduling(false);
        }
    };

    const handleSync = async () => {
        if (!activeConnectionId || status !== 'connected') {
            showNotification('Harus terhubung dengan WhatsApp untuk sinkronisasi.', 'error');
            return;
        }
        if (!spreadsheetId) {
            showNotification('Spreadsheet ID harus diisi.', 'error');
            return;
        }

        setIsSyncing(true);
        try {
            const res = await axios.post(`${API_URL}/api/schedule/sync`, {
                connectionId: activeConnectionId,
                spreadsheetId
            });
            showNotification(res.data.message, 'success');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error syncing with Google Sheets:", error);
            showNotification(error.response?.data?.message || 'Gagal sinkronisasi.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/api/schedule/${id}`);
            showNotification('Jadwal berhasil dihapus.', 'success');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error deleting scheduled message:", error);
            showNotification('Gagal menghapus jadwal.', 'error');
        }
    };

    return (
        <div className="space-y-6">
            {notification.message && (
                <div className={`fixed top-5 right-5 p-4 rounded-lg shadow-lg text-white transition-opacity duration-300 z-50 ${notification.type === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
                    <span>{notification.message}</span>
                </div>
            )}

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                        <Calendar className="w-5 h-5 mr-2 text-primary-600" />
                        Jadwalkan Pesan
                    </h2>
                </div>

                <div className="p-6">
                    {/* Google Sheets Sync Section */}
                    <div className="mb-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                            <RefreshCw className="w-4 h-4 mr-2" /> Sinkronisasi Google Sheets
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={spreadsheetId}
                                onChange={(e) => setSpreadsheetId(e.target.value)}
                                placeholder="Spreadsheet ID"
                                className="flex-1 px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                                disabled={status !== 'connected'}
                            />
                            <button
                                onClick={handleSync}
                                disabled={isSyncing || status !== 'connected'}
                                className="px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                            >
                                {isSyncing ? 'Syncing...' : 'Sync'}
                            </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                            Pastikan service account email memiliki akses "Viewer" ke spreadsheet.
                            <br />
                            Format kolom: Number, Message, Date (YYYY-MM-DD), Time (HH:mm)
                        </p>
                    </div>

                    <form onSubmit={handleScheduleMessage} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="sched-number" className="block text-sm font-medium text-gray-700 mb-1">Nomor Tujuan</label>
                                <input
                                    type="text"
                                    id="sched-number"
                                    value={number}
                                    onChange={(e) => setNumber(e.target.value)}
                                    placeholder="6281234567890"
                                    className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                                    disabled={status !== 'connected'}
                                />
                            </div>
                            <div>
                                <label htmlFor="sched-time" className="block text-sm font-medium text-gray-700 mb-1">Waktu Kirim</label>
                                <input
                                    type="datetime-local"
                                    id="sched-time"
                                    value={scheduledTime}
                                    onChange={(e) => setScheduledTime(e.target.value)}
                                    className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                                    disabled={status !== 'connected'}
                                />
                            </div>
                        </div>
                        <div>
                            <label htmlFor="sched-message" className="block text-sm font-medium text-gray-700 mb-1">Isi Pesan</label>
                            <textarea
                                id="sched-message"
                                rows="3"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Pesan..."
                                className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                                disabled={status !== 'connected'}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isScheduling || status !== 'connected'}
                            className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {isScheduling ? 'Menjadwalkan...' : <><Plus className="w-4 h-4 mr-2" /> Jadwalkan Pesan</>}
                        </button>
                    </form>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Daftar Pesan Terjadwal</h3>
                </div>
                <div className="p-6">
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                        {scheduledMessages.length === 0 ? (
                            <p className="text-gray-500 text-sm text-center py-4">Tidak ada pesan terjadwal.</p>
                        ) : (
                            scheduledMessages.map((msg) => (
                                <div key={msg.id} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex justify-between items-start hover:shadow-sm transition-shadow">
                                    <div>
                                        <p className="font-semibold text-sm text-gray-900">To: {msg.recipient}</p>
                                        <p className="text-sm text-gray-600 mt-1">{msg.message}</p>
                                        <div className="flex items-center mt-2 text-xs text-primary-600 font-medium">
                                            <Calendar className="w-3 h-3 mr-1" />
                                            {new Date(msg.scheduledTime).toLocaleString()}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="text-rose-500 hover:text-rose-700 p-2 rounded-full hover:bg-rose-50 transition-colors"
                                        title="Hapus Jadwal"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduledMessageManager;
