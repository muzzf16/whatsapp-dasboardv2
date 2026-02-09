import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE } from '../lib/api';
import { Calendar, Trash2, RefreshCw, Plus, Clock, MessageSquare, AlertCircle } from 'lucide-react';

const ScheduledMessageManager = ({ activeConnectionId, status }) => {
    const [scheduledMessages, setScheduledMessages] = useState([]);
    const [number, setNumber] = useState('');
    const [message, setMessage] = useState('');
    const [scheduledTime, setScheduledTime] = useState('');
    const [isRecurring, setIsRecurring] = useState(false);
    const [spreadsheetId, setSpreadsheetId] = useState('');
    const [isScheduling, setIsScheduling] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });

    // Use API_BASE so we connect to the configured backend server
    const API_URL = API_BASE;

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    const fetchScheduledMessages = async () => {
        try {
            const res = await axios.get(`${API_URL}/schedule`);
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
            showNotification('Must be connected to WhatsApp to schedule messages.', 'error');
            return;
        }
        if (!number || !message || !scheduledTime) {
            showNotification('All fields are required.', 'error');
            return;
        }

        setIsScheduling(true);
        try {
            await axios.post(`${API_URL}/schedule`, {
                connectionId: activeConnectionId,
                number,
                message,
                scheduledTime,
                isRecurring
            });
            showNotification('Message scheduled successfully!', 'success');
            setNumber('');
            setMessage('');
            setScheduledTime('');
            setIsRecurring(false);
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error scheduling message:", error);
            showNotification(error.response?.data?.message || 'Failed to schedule message.', 'error');
        } finally {
            setIsScheduling(false);
        }
    };

    const handleSync = async () => {
        if (!activeConnectionId || status !== 'connected') {
            showNotification('WhatsApp connection required for sync.', 'error');
            return;
        }
        if (!spreadsheetId) {
            showNotification('Spreadsheet ID is required.', 'error');
            return;
        }

        setIsSyncing(true);
        try {
            const res = await axios.post(`${API_URL}/schedule/sync`, {
                connectionId: activeConnectionId,
                spreadsheetId
            });
            showNotification(res.data.message, 'success');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error syncing with Google Sheets:", error);
            showNotification(error.response?.data?.message || 'Sync failed.', 'error');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleDelete = async (id) => {
        try {
            await axios.delete(`${API_URL}/schedule/${id}`);
            showNotification('Schedule deleted.', 'success');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error deleting scheduled message:", error);
            showNotification('Failed to delete schedule.', 'error');
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Are you sure you want to delete ALL scheduled messages?')) {
            return;
        }
        try {
            await axios.delete(`${API_URL}/schedule`);
            showNotification('All schedules deleted.', 'success');
            fetchScheduledMessages();
        } catch (error) {
            console.error("Error deleting all scheduled messages:", error);
            showNotification('Failed to delete all schedules.', 'error');
        }
    };

    return (
        <div className="space-y-6 font-sans">
            {notification.message && (
                <div className={`fixed top-8 right-8 p-4 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right z-50 flex items-center gap-3 bg-white ${notification.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
                    {notification.type === 'success' ? <div className="w-2 h-2 rounded-full bg-green-500" /> : <AlertCircle className="w-4 h-4" />}
                    <span>{notification.message}</span>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Schedule Form */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-blue-50/30">
                        <h2 className="text-lg font-bold text-gray-800 flex items-center">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                                <Calendar className="w-5 h-5" />
                            </div>
                            New Schedule
                        </h2>
                    </div>

                    <div className="p-6">
                        <form onSubmit={handleScheduleMessage} className="space-y-5">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div>
                                    <label htmlFor="sched-number" className="block text-sm font-semibold text-gray-700 mb-2">Recipient</label>
                                    <input
                                        type="text"
                                        id="sched-number"
                                        value={number}
                                        onChange={(e) => setNumber(e.target.value)}
                                        placeholder="e.g. 6281234567890"
                                        className="block w-full px-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all font-mono text-sm"
                                        disabled={status !== 'connected'}
                                    />
                                </div>
                                <div>
                                    <label htmlFor="sched-time" className="block text-sm font-semibold text-gray-700 mb-2">Send Time</label>
                                    <input
                                        type="datetime-local"
                                        id="sched-time"
                                        value={scheduledTime}
                                        onChange={(e) => setScheduledTime(e.target.value)}
                                        className="block w-full px-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all text-sm"
                                        disabled={status !== 'connected'}
                                    />
                                </div>
                            </div>

                            <div>
                                <label htmlFor="sched-message" className="block text-sm font-semibold text-gray-700 mb-2">Message</label>
                                <textarea
                                    id="sched-message"
                                    rows="4"
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder="Type your message..."
                                    className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all resize-none text-sm"
                                    disabled={status !== 'connected'}
                                />
                            </div>

                            <div className="flex items-center justify-between pt-2">
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="recurring-check"
                                        checked={isRecurring}
                                        onChange={(e) => setIsRecurring(e.target.checked)}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                                        disabled={status !== 'connected'}
                                    />
                                    <label htmlFor="recurring-check" className="ml-2 block text-sm text-gray-700 select-none cursor-pointer">
                                        Repeat monthly <span className="text-gray-400 text-xs">(Same date & time)</span>
                                    </label>
                                </div>

                                <button
                                    type="submit"
                                    disabled={isScheduling || status !== 'connected'}
                                    className="px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all flex items-center"
                                >
                                    {isScheduling ? 'Scheduling...' : <><Plus className="w-4 h-4 mr-2" /> Schedule Message</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Google Sheets Sync Card */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-gray-100 bg-green-50/30">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <div className="p-2 bg-green-100 text-green-600 rounded-lg mr-3">
                                <RefreshCw className="w-5 h-5" />
                            </div>
                            Sync Sheet
                        </h3>
                    </div>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                        <div>
                            <p className="text-sm text-gray-500 mb-4">Sync messages directly from a Google Sheet. Ensure the service account has "Viewer" access.</p>
                            <div className="space-y-3">
                                <label className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Spreadsheet ID</label>
                                <input
                                    type="text"
                                    value={spreadsheetId}
                                    onChange={(e) => setSpreadsheetId(e.target.value)}
                                    placeholder="e.g. 1BxiMVs0XRA5nFMd..."
                                    className="block w-full px-4 py-2.5 rounded-xl border-gray-200 bg-gray-50 focus:bg-white focus:border-green-500 focus:ring-2 focus:ring-green-500/20 transition-all text-xs font-mono"
                                    disabled={status !== 'connected'}
                                />
                            </div>
                        </div>
                        <button
                            onClick={handleSync}
                            disabled={isSyncing || status !== 'connected'}
                            className="w-full mt-6 py-2.5 border border-transparent rounded-xl shadow-md shadow-green-500/20 text-sm font-bold text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all"
                        >
                            {isSyncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    </div>
                </div>
            </div >

            {/* Scheduled List */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-800">Scheduled Queue</h3>
                    {scheduledMessages.length > 0 && (
                        <button
                            onClick={handleDeleteAll}
                            className="text-xs text-red-600 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 transition-all flex items-center"
                        >
                            <Trash2 className="w-3 h-3 mr-1.5" /> Clear Queue
                        </button>
                    )}
                </div>

                <div className="p-0">
                    {scheduledMessages.length === 0 ? (
                        <div className="py-12 flex flex-col items-center justify-center text-gray-400">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <Clock className="w-8 h-8 text-gray-300" />
                            </div>
                            <p className="text-sm">No messages scheduled</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                            {scheduledMessages.map((msg) => (
                                <div key={msg.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-4 group">
                                    <div className="p-2 rounded-full bg-blue-50 text-blue-500 mt-1">
                                        <MessageSquare className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <p className="text-sm font-bold text-gray-900">{msg.recipient}</p>
                                            <div className="flex items-center text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded-md">
                                                <Clock className="w-3 h-3 mr-1" />
                                                {new Date(msg.scheduledTime).toLocaleString()}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 line-clamp-2">{msg.message}</p>
                                        {msg.isRecurring && (
                                            <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                                                <RefreshCw className="w-3 h-3 mr-1" /> Monthly Recurring
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleDelete(msg.id)}
                                        className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                                        title="Delete"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
};

export default ScheduledMessageManager;
