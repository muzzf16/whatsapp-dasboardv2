import React from 'react';
import { ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react';

const MessageLog = ({ activeTab, setActiveTab, messageFilter, setMessageFilter, messages, outgoingMessages, messagesEndRef }) => {
    const renderMessageList = (msgs, type) => {
        const filteredMessages = msgs.filter(msg =>
            JSON.stringify(msg).toLowerCase().includes(messageFilter.toLowerCase())
        );

        if (filteredMessages.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                    <FileText className="w-12 h-12 mb-2 opacity-50" />
                    <p>Tidak ada pesan.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredMessages.map((msg, index) => (
                    <div key={index} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3">
                                <div className={`p-2 rounded-full ${type === 'incoming' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                    {type === 'incoming' ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-gray-900">
                                        {type === 'incoming' ? (msg.pushName || msg.sender) : `To: ${msg.to}`}
                                    </p>
                                    <p className="text-xs text-gray-500 mb-1">
                                        {new Date(msg.timestamp || msg.messageTimestamp * 1000).toLocaleString()}
                                    </p>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                                        {msg.text || '[Media/Other]'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    return (
        <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setActiveTab('incoming')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'incoming'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Pesan Masuk
                        </button>
                        <button
                            onClick={() => setActiveTab('outgoing')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'outgoing'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-900'
                                }`}
                        >
                            Pesan Keluar
                        </button>
                    </div>

                    <input
                        type="text"
                        placeholder="Cari pesan..."
                        value={messageFilter}
                        onChange={(e) => setMessageFilter(e.target.value)}
                        className="px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                    {activeTab === 'incoming' ? renderMessageList(messages, 'incoming') : renderMessageList(outgoingMessages, 'outgoing')}
                </div>
            </div>
        </div>
    );
};

export default MessageLog;
