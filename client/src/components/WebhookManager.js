import React from 'react';
import { Webhook, Save, Lock, AlertTriangle } from 'lucide-react';

const WebhookManager = ({ webhookUrl, setWebhookUrl, webhookSecret, setWebhookSecret, isSavingWebhook, onSaveWebhook }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden font-sans max-w-2xl mx-auto">
            <div className="p-6 border-b border-gray-100 bg-orange-50/30">
                <div className="flex items-center">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg mr-3">
                        <Webhook className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-gray-800">Webhook Configuration</h2>
                        <p className="text-xs text-gray-500">Configure real-time event notifications</p>
                    </div>
                </div>
            </div>

            <form onSubmit={onSaveWebhook} className="p-8 space-y-6">
                {/* Warning/Info Box */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex gap-3 text-sm text-blue-900">
                    <div className="mt-0.5">
                        <AlertTriangle className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="font-semibold">Security Note</p>
                        <p className="text-blue-800 text-xs leading-relaxed">
                            Webhooks are signed using HMAC-SHA256 with your secret key.
                            The signature is sent in the <code>X-Webhook-Signature</code> header.
                            Always verify this signature on your server to ensure authenticity.
                        </p>
                    </div>
                </div>

                <div className="space-y-5">
                    <div>
                        <label htmlFor="webhook-url" className="block text-sm font-semibold text-gray-700 mb-2">Payload URL</label>
                        <input
                            type="text"
                            id="webhook-url"
                            value={webhookUrl}
                            onChange={(e) => setWebhookUrl(e.target.value)}
                            placeholder="https://api.yourdomain.com/webhook"
                            className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-sm"
                        />
                    </div>

                    <div>
                        <label htmlFor="webhook-secret" className="block text-sm font-semibold text-gray-700 mb-2">Secret Key</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-gray-400" />
                            </div>
                            <input
                                type="password"
                                id="webhook-secret"
                                value={webhookSecret}
                                onChange={(e) => setWebhookSecret(e.target.value)}
                                placeholder="• • • • • • • • • • • •"
                                className="block w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-mono text-sm"
                            />
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Used to sign webhook payloads for verification.</p>
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-50">
                    <button
                        type="submit"
                        disabled={isSavingWebhook}
                        className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-orange-500/20 text-sm font-bold text-white bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                    >
                        {isSavingWebhook ? (
                            <>Saving Configuration...</>
                        ) : (
                            <><Save className="w-5 h-5 mr-2" /> Save Changes</>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default WebhookManager;
