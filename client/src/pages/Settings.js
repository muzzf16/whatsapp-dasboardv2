import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save } from 'lucide-react';

const API_URL = 'http://localhost:4000/api';

const Settings = ({ showNotification }) => {
    const [webhookUrl, setWebhookUrl] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const fetchWebhookUrl = async () => {
            try {
                const response = await axios.get(`${API_URL}/webhook`);
                setWebhookUrl(response.data.webhookUrl || '');
            } catch (error) {
                console.error("Error fetching webhook URL:", error);
                showNotification('Gagal memuat URL webhook.', 'error');
            }
        };
        fetchWebhookUrl();
    }, [showNotification]);

    const handleSaveWebhook = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await axios.post(`${API_URL}/webhook`, { url: webhookUrl });
            showNotification('URL Webhook berhasil disimpan!', 'success');
        } catch (error) {
            console.error("Error saving webhook URL:", error);
            showNotification(error.response?.data?.message || 'Gagal menyimpan URL Webhook.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Pengaturan Webhook</h2>
            <p className="text-gray-600 mb-6">Server akan mengirim event (seperti pesan masuk) ke URL ini melalui metode POST. Pastikan endpoint Anda siap menerima payload JSON.</p>
            
            <form onSubmit={handleSaveWebhook} className="space-y-4">
                <div>
                    <label htmlFor="webhookUrl" className="block text-sm font-medium text-gray-700">Webhook URL</label>
                    <input
                        type="url"
                        id="webhookUrl"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://domain-anda.com/webhook-receiver"
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
                    >
                        <Save className="-ml-1 mr-2 h-5 w-5" />
                        {isSaving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Settings;
