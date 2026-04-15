import React, { useState, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import { Send } from 'lucide-react';
import { getTemplates } from '../lib/templateStore';
import BroadcastTracker from './BroadcastTracker';
import { API_BASE } from '../lib/api';

// --- Utility functions ---

/**
 * Extracts template variable names from a message string.
 * E.g. "Hello {{name}}, your code is {{code}}" → ["name", "code"]
 */
const extractVariables = (text) => {
    const matches = text.match(/\{\{(.*?)\}\}/g) || [];
    return matches.map(v => v.slice(2, -2));
};

/**
 * Parses a raw recipient row (CSV-like) and personalizes the message
 * by replacing {{variable}} placeholders with column values.
 *
 * @param {string} row          - A single line: "number,val1,val2,..."
 * @param {string} messageText  - The template message with {{placeholders}}
 * @param {string[]} variables  - Ordered list of variable names from the message
 * @returns {{ to: string, text: string }}
 */
const personalizeRow = (row, messageText, variables) => {
    const columns = row.split(/,/).map(c => c.trim());
    const number = columns[0];

    let personalizedText = messageText;
    variables.forEach((variable, index) => {
        const value = columns[index + 1] || '';
        personalizedText = personalizedText.replace(
            new RegExp(`\\{\\{${variable}\\}\\}`, 'g'),
            value
        );
    });

    return { to: number, text: personalizedText };
};

/**
 * Parses multi-line recipient input and generates personalized messages.
 */
const buildPersonalizedMessages = (recipientsText, messageText) => {
    const variables = extractVariables(messageText);
    const rows = recipientsText
        .split(/\n/)
        .map(r => r.trim())
        .filter(Boolean);

    return rows.map(row => personalizeRow(row, messageText, variables));
};

// --- Sub-components ---

const SessionSelector = ({ connectedSessions, selectedSession, onSelect }) => (
    <div>
        <label htmlFor="campaign-session" className="block text-sm font-medium text-gray-700">
            1. Pilih Sesi Pengirim
        </label>
        <select
            id="campaign-session"
            value={selectedSession}
            onChange={(e) => onSelect(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            disabled={connectedSessions.length === 0}
        >
            <option value="">
                {connectedSessions.length > 0
                    ? 'Pilih sesi yang terhubung'
                    : 'Tidak ada sesi terhubung'}
            </option>
            {connectedSessions.map(session => (
                <option key={session.id} value={session.id}>{session.id}</option>
            ))}
        </select>
    </div>
);

const TemplateSelector = ({ templates, onSelect }) => (
    <div>
        <label htmlFor="campaign-templates" className="block text-sm font-medium text-gray-700">
            2. Gunakan Template (Opsional)
        </label>
        <select
            id="campaign-templates"
            onChange={(e) => onSelect(e.target.value)}
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
        >
            <option value="">Pilih template...</option>
            {templates.map(template => (
                <option key={template.id} value={template.id}>{template.name}</option>
            ))}
        </select>
    </div>
);

const MessageEditor = ({ message, onChange, detectedVariables }) => (
    <div>
        <label htmlFor="campaign-message" className="block text-sm font-medium text-gray-700">
            3. Tulis atau Edit Pesan
        </label>
        <textarea
            id="campaign-message"
            rows="4"
            value={message}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Pesan yang akan dikirim..."
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        />
        {detectedVariables.length > 0 && (
            <p className="mt-1 text-xs text-gray-500">
                Variabel terdeteksi: {detectedVariables.map(v => `{{${v}}}`).join(', ')}
            </p>
        )}
    </div>
);

const RecipientInput = ({ recipients, onChange, detectedVariables }) => {
    const formatHint = detectedVariables.length > 0
        ? `nomor_telepon,${detectedVariables.join(',')}`
        : 'nomor_telepon';

    return (
        <div>
            <label htmlFor="campaign-recipients" className="block text-sm font-medium text-gray-700">
                4. Masukkan Penerima dan Data
            </label>
            <textarea
                id="campaign-recipients"
                rows="6"
                value={recipients}
                onChange={(e) => onChange(e.target.value)}
                placeholder="Satu penerima per baris..."
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
            <p className="mt-1 text-xs text-gray-500">
                Format: <code>{formatHint}</code>. Contoh: <code>6281234567890,John</code>
            </p>
        </div>
    );
};

// --- Main component ---

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

    const connectedSessions = useMemo(
        () => sessions.filter(s => s.status === 'connected'),
        [sessions]
    );

    const detectedVariables = useMemo(
        () => extractVariables(message),
        [message]
    );

    const handleTemplateSelect = useCallback((templateId) => {
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setSelectedTemplate(template);
            setMessage(template.content);
        } else {
            setSelectedTemplate(null);
            setMessage('');
        }
    }, [templates]);

    const handleBroadcast = useCallback(async (e) => {
        e.preventDefault();

        if (!selectedSession || !recipients.trim() || !message.trim()) {
            showNotification('Sesi, penerima, dan pesan tidak boleh kosong.', 'error');
            return;
        }

        const personalizedMessages = buildPersonalizedMessages(recipients, message);

        if (personalizedMessages.length === 0) {
            showNotification('Tidak ada penerima yang valid.', 'error');
            return;
        }

        setIsBroadcasting(true);
        try {
            await axios.post(`${API_BASE}/${selectedSession}/broadcast-message`, {
                messages: personalizedMessages,
            });
            showNotification(
                `Broadcast ke ${personalizedMessages.length} nomor telah dimulai.`,
                'success'
            );
            setRecipients('');
        } catch (error) {
            console.error('Error starting broadcast:', error);
            showNotification(
                error.response?.data?.message || 'Gagal memulai broadcast.',
                'error'
            );
        } finally {
            setIsBroadcasting(false);
        }
    }, [selectedSession, recipients, message, showNotification]);

    return (
        <div className="bg-white p-6 rounded-lg shadow-md space-y-8">
            <h2 className="text-2xl font-semibold text-gray-700">Buat Campaign Broadcast</h2>

            <form onSubmit={handleBroadcast} className="space-y-6">
                <SessionSelector
                    connectedSessions={connectedSessions}
                    selectedSession={selectedSession}
                    onSelect={setSelectedSession}
                />

                <TemplateSelector
                    templates={templates}
                    onSelect={handleTemplateSelect}
                />

                <MessageEditor
                    message={message}
                    onChange={setMessage}
                    detectedVariables={detectedVariables}
                />

                <RecipientInput
                    recipients={recipients}
                    onChange={setRecipients}
                    detectedVariables={detectedVariables}
                />

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isBroadcasting || !selectedSession}
                        className="inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                    >
                        <Send className="-ml-1 mr-2 h-5 w-5" />
                        {isBroadcasting ? 'Memulai Broadcast...' : 'Kirim Broadcast'}
                    </button>
                </div>
            </form>

            <BroadcastTracker broadcasts={broadcasts} />
        </div>
    );
};

export default Campaign;