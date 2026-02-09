import React from 'react';
import { ArrowDownLeft, ArrowUpRight, FileText, Search, MessageSquare, Clock, User } from 'lucide-react';

const MessageLog = ({ activeTab, setActiveTab, messageFilter, setMessageFilter, messages, outgoingMessages, messagesEndRef, onReply }) => {
    const renderMessageList = (msgs, type) => {
        const filteredMessages = msgs.filter(msg =>
            JSON.stringify(msg).toLowerCase().includes(messageFilter.toLowerCase())
        );

        if (filteredMessages.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                        <MessageSquare className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="font-medium">No messages found</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search or check back later</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                {filteredMessages.map((msg, index) => (
                    <div key={index} className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-4 flex-1">
                                <div className={`p-3 rounded-full flex-shrink-0 ${type === 'incoming' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                                    {type === 'incoming' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="font-bold text-gray-900 truncate">
                                                {type === 'incoming'
                                                    ? (msg.pushName ? `${msg.pushName} (${msg.sender?.split('@')[0] || msg.from?.split('@')[0]})` : (msg.sender?.split('@')[0] || msg.from?.split('@')[0]))
                                                    : `To: ${msg.to}`}
                                            </span>
                                            {msg.groupName && (
                                                <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs font-medium truncate max-w-[150px]">
                                                    {msg.groupName}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center text-xs text-gray-400 whitespace-nowrap">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(msg.timestamp || msg.messageTimestamp * 1000).toLocaleString()}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-700 whitespace-pre-wrap break-words leading-relaxed font-sans">
                                        {msg.text || <span className="italic text-gray-400">[Media/System Message]</span>}
                                    </div>
                                </div>
                            </div>

                            {type === 'incoming' && (
                                <button
                                    onClick={() => onReply(msg.from?.split('@')[0] || msg.sender, '')}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                    title="Reply to Message"
                                >
                                    <MessageSquare className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        );
    };

    return (
        <div className="lg:col-span-2 space-y-6 h-full font-sans">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
                {/* Header & Controls */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white sticky top-0 z-10">
                    <div className="flex bg-gray-100/80 p-1.5 rounded-xl self-start md:self-auto">
                        <button
                            onClick={() => setActiveTab('incoming')}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'incoming'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            <ArrowDownLeft className="w-4 h-4" />
                            Inbox
                        </button>
                        <button
                            onClick={() => setActiveTab('outgoing')}
                            className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all flex items-center gap-2 ${activeTab === 'outgoing'
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            <ArrowUpRight className="w-4 h-4" />
                            Sent
                        </button>
                    </div>

                    <div className="relative flex-1 max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search messages..."
                            value={messageFilter}
                            onChange={(e) => setMessageFilter(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-sm"
                        />
                    </div>
                </div>

                {/* Message List */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50/50 scroll-smooth">
                    {activeTab === 'incoming' ? renderMessageList(messages, 'incoming') : renderMessageList(outgoingMessages, 'outgoing')}
                </div>
            </div>
        </div>
    );
};

export default MessageLog;
