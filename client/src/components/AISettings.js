import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../lib/api';
import { Bot, Save, FileSpreadsheet, Key, Terminal, AlertCircle, CheckCircle, Upload } from 'lucide-react';

const AISettings = () => {
    const [config, setConfig] = useState({
        systemInstruction: '',
        modelName: 'gemini-2.0-flash',
        apiKey: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState({ message: '', type: '' });
    const [autoReplyFile, setAutoReplyFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/ai-config`);
            if (res.data.success) {
                setConfig(res.data.config);
            }
        } catch (error) {
            console.error("Error fetching AI config:", error);
            showNotification('Failed to load AI configuration.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const res = await axios.post(`${API_URL}/api/ai-config`, config);
            if (res.data.success) {
                setConfig(res.data.config);
                showNotification('AI configuration saved successfully!', 'success');
            }
        } catch (error) {
            console.error("Error saving AI config:", error);
            showNotification('Failed to save AI configuration.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleAutoReplyUpload = async () => {
        if (!autoReplyFile) {
            showNotification('Please select an Excel file first.', 'error');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('file', autoReplyFile);

        try {
            const res = await axios.post(`${API_URL}/api/auto-reply/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.status === 'success') {
                showNotification(res.data.message, 'success');
                setAutoReplyFile(null);
                const fileInput = document.getElementById('auto-reply-upload');
                if (fileInput) fileInput.value = '';
            } else {
                showNotification(res.data.message, 'error');
            }
        } catch (error) {
            console.error("Error uploading auto-reply:", error);
            showNotification('Failed to upload Auto-Reply file.', 'error');
        } finally {
            setUploading(false);
        }
    };

    const showNotification = (message, type) => {
        setNotification({ message, type });
        setTimeout(() => setNotification({ message: '', type: '' }), 4000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 animate-pulse">
                <Bot className="w-10 h-10 mb-3 opacity-50" />
                <p>Loading configuration...</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 font-sans">
            {notification.message && (
                <div className={`fixed top-8 right-8 p-4 rounded-xl shadow-lg border text-sm font-medium animate-in slide-in-from-right z-50 flex items-center gap-3 bg-white ${notification.type === 'success' ? 'text-green-600 border-green-100' : 'text-red-600 border-red-100'}`}>
                    {notification.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <span>{notification.message}</span>
                </div>
            )}

            {/* AI Configuration Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-purple-50/30">
                    <div className="flex items-center">
                        <div className="p-2 bg-purple-100 text-purple-600 rounded-lg mr-3">
                            <Bot className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">AI Agent Settings (Gemini)</h2>
                            <p className="text-xs text-gray-500">Configure your intelligent assistant behavior</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSave} className="p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Model Name</label>
                            <input
                                type="text"
                                value={config.modelName}
                                onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                                className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm"
                                placeholder="e.g. gemini-2.0-flash"
                            />
                            <p className="mt-2 text-xs text-gray-500">Ensure this model is available for your API Key.</p>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">API Key (Optional)</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Key className="h-4 w-4 text-gray-400" />
                                </div>
                                <input
                                    type="password"
                                    value={config.apiKey || ''}
                                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                                    className="block w-full pl-10 pr-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm"
                                    placeholder="Leave empty to use server .env"
                                />
                            </div>
                            <p className="mt-2 text-xs text-gray-500">Overrides GEMINI_API_KEY from server environment if set.</p>
                        </div>
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-sm font-semibold text-gray-700">System Instruction (Prompt)</label>
                            <div className="text-xs text-gray-400 flex items-center bg-gray-100 px-2 py-1 rounded">
                                <Terminal className="w-3 h-3 mr-1" />
                                {config.systemInstruction.length} chars
                            </div>
                        </div>
                        <textarea
                            value={config.systemInstruction}
                            onChange={(e) => setConfig({ ...config, systemInstruction: e.target.value })}
                            rows="12"
                            className="block w-full p-4 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition-all font-mono text-sm leading-relaxed resize-y"
                            placeholder="Define the AI's persona, tone, and constraints here..."
                        />
                        <p className="mt-2 text-xs text-gray-500">This prompt defines how the AI behaves and responds to customer messages.</p>
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex justify-end">
                        <button
                            type="submit"
                            disabled={saving}
                            className="flex items-center justify-center py-2.5 px-6 rounded-xl shadow-lg shadow-purple-500/20 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:bg-gray-300 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                        >
                            {saving ? 'Saving...' : <><Save className="w-4 h-4 mr-2" /> Save Configuration</>}
                        </button>
                    </div>
                </form>
            </div>

            {/* Auto-Reply Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-blue-50/30">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-800">Auto-Reply Keywords</h2>
                            <p className="text-xs text-gray-500">Upload Excel file for deterministic keyword responses</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex-1 space-y-2">
                        <div className="text-sm text-gray-600 leading-relaxed">
                            <p>Upload an Excel file containing keywords and their corresponding auto-replies.</p>
                            <p className="mt-1">The system prioritizes these exact matches before falling back to the AI Agent.</p>
                        </div>
                        <a href="/template_auto_reply.xlsx" download className="inline-flex items-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-2">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Download Template
                        </a>
                    </div>

                    <div className="w-full md:w-auto flex flex-col gap-3">
                        <input
                            id="auto-reply-upload"
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setAutoReplyFile(e.target.files[0])}
                            className="hidden"
                        />
                        <label
                            htmlFor="auto-reply-upload"
                            className={`flex items-center justify-center px-4 py-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${autoReplyFile ? 'border-blue-500 bg-blue-50/50' : 'border-gray-200 hover:border-blue-400 hover:bg-gray-50'}`}
                        >
                            <div className="text-center">
                                {autoReplyFile ? (
                                    <>
                                        <FileSpreadsheet className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                                        <span className="text-sm font-medium text-gray-900 block">{autoReplyFile.name}</span>
                                        <span className="text-xs text-blue-600 font-semibold">Click to change</span>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                                        <span className="text-sm font-medium text-gray-500">Click to upload Excel</span>
                                    </>
                                )}
                            </div>
                        </label>

                        <button
                            type="button"
                            onClick={handleAutoReplyUpload}
                            disabled={uploading || !autoReplyFile}
                            className="w-full py-2.5 px-4 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all shadow-sm"
                        >
                            {uploading ? 'Uploading...' : 'Upload & Update'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AISettings;
