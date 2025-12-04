import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, FileText } from 'lucide-react';
import { getTemplates } from '../lib/templateStore';
import BroadcastTracker from './BroadcastTracker'; // Impor baru

import { API_BASE } from '../lib/api';
const API_URL = API_BASE;

const Campaign = ({ sessions, showNotification, broadcasts }) => {
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);

    const [selectedSession, setSelectedSession] = useState('');
    const [recipients, setRecipients] = useState('');
    const [message, setMessage] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    useEffect(() => {
        setTemplates(getTemplates());
    }, []);

    const handleTemplateSelect = (templateId) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setMessage(template.content);
        } else {
            setSelectedTemplate(null);
            setMessage('');
        }
    };

    const getVariablesFromMessage = () => {
        const variableRegex = /\{\{(.*?)\}\}/g;
        const matches = message.match(variableRegex) || [];
        return matches.map(v => v.slice(2, -2)); // remove {{ and }}
    };

    const handleBroadcast = async (e) => {
        e.preventDefault();
        const variables = getVariablesFromMessage();
        const recipientRows = recipients.split(/\n/).map(r => r.trim()).filter(r => r);

        if (!selectedSession || recipientRows.length === 0 || !message) {
            showNotification('Sesi, penerima, dan pesan tidak boleh kosong.', 'error');
            return;
        }

        const personalizedMessages = recipientRows.map(row => {
            const columns = row.split(/,/).map(c => c.trim());
            const number = columns[0];
            let personalizedText = message;

            variables.forEach((variable, index) => {
                const value = columns[index + 1] || ''; // +1 because column 0 is the number
                personalizedText = personalizedText.replace(new RegExp(`\\\{{${variable}\}\}`, 'g'), value);
            });

            return { to: number, text: personalizedText };
        });

        setIsBroadcasting(true);
        try {
            await axios.post(`${API_URL}/${selectedSession}/broadcast-message`, {
                messages: personalizedMessages,
            });
            showNotification(`Broadcast ke ${personalizedMessages.length} nomor telah dimulai.`, 'success');
            setRecipients('');
        } catch (error) {
            console.error("Error starting broadcast:", error);
            showNotification(error.response?.data?.message || 'Gagal memulai broadcast.', 'error');
        } finally {
            setIsBroadcasting(false);
        }
    };

    const connectedSessions = sessions.filter(s => s.status === 'connected');
    const detectedVariables = getVariablesFromMessage();

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
            <h2 className="text-2xl font-semibold text-gray-700">Buat Campaign Broadcast</h2>

            <form onSubmit={handleBroadcast} className="space-y-6">
                <div>
                    <label htmlFor="session" className="block text-sm font-medium text-gray-700">1. Pilih Sesi Pengirim</label>
                    <select id="session" value={selectedSession} onChange={(e) => setSelectedSession(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md" disabled={connectedSessions.length === 0}>
                        <option value="">{connectedSessions.length > 0 ? 'Pilih sesi yang terhubung' : 'Tidak ada sesi terhubung'}</option>
                        {connectedSessions.map(session => <option key={session.id} value={session.id}>{session.id}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="templates" className="block text-sm font-medium text-gray-700">2. Gunakan Template (Opsional)</label>
                    <select id="templates" onChange={(e) => handleTemplateSelect(e.target.value)} className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                        <option value="">Pilih template...</option>
                        {templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}
                    </select>
                </div>

                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700">3. Tulis atau Edit Pesan</label>
                    <textarea id="message" rows="4" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Pesan yang akan dikirim..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    {detectedVariables.length > 0 && <p className="mt-1 text-xs text-gray-500">Variabel terdeteksi: {detectedVariables.map(v => `{{${v}}}`).join(', ')}</p>}
                </div>

                <div>
                    <label htmlFor="recipients" className="block text-sm font-medium text-gray-700">4. Masukkan Penerima dan Data</label>
                    <textarea id="recipients" rows="6" value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="Satu penerima per baris..." className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
                    <p className="mt-1 text-xs text-gray-500">Format: `nomor_telepon{detectedVariables.length > 0 ? `,${detectedVariables.join(',')}` : ''}`. Contoh: `6281234567890,John`</p>
                </div>

                <div className="flex justify-end">
                    <button type="submit" disabled={isBroadcasting || !selectedSession} className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400">
                        <Send className="-ml-1 mr-2 h-5 w-5" />
                        {isBroadcasting ? 'Memulai Broadcast...' : 'Kirim Broadcast'}
                    </button>
                </div>
            </form>

            <BroadcastTracker broadcasts={broadcasts} />
        </div>
    );
}

export default Campaign;