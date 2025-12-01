import React from 'react';
import { Webhook, Save } from 'lucide-react';

const WebhookManager = ({ webhookUrl, setWebhookUrl, webhookSecret, setWebhookSecret, isSavingWebhook, onSaveWebhook }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Webhook className="w-5 h-5 mr-2 text-primary-600" />
                    Konfigurasi Webhook
                </h2>
            </div>

            <form onSubmit={onSaveWebhook} className="p-6 space-y-4">
                <div>
                    <label htmlFor="webhook-url" className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                    <input
                        type="text"
                        id="webhook-url"
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://example.com/webhook"
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                    />
                </div>

                <div>
                    <label htmlFor="webhook-secret" className="block text-sm font-medium text-gray-700 mb-1">Webhook Secret</label>
                    <input
                        type="password"
                        id="webhook-secret"
                        value={webhookSecret}
                        onChange={(e) => setWebhookSecret(e.target.value)}
                        placeholder="Secret key untuk verifikasi signature"
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                    />
                </div>

                <button
                    type="submit"
                    disabled={isSavingWebhook}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isSavingWebhook ? 'Menyimpan...' : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
                </button>
            </form>
        </div>
    );
};

export default WebhookManager;
