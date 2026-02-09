import React from 'react';
import { Send, Paperclip, MessageSquare, Image, FileText } from 'lucide-react';

const MessageSender = ({ sendTo, setSendTo, sendMessageText, setSendMessageText, activeConnection, isSending, onSendMessage, onFileChange }) => {
    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-gray-100 bg-gray-50/30">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mr-3">
                        <MessageSquare className="w-5 h-5" />
                    </div>
                    Send Message
                </h2>
                <p className="text-gray-500 text-sm mt-1 ml-12">Send a quick message to any number</p>
            </div>

            <form onSubmit={onSendMessage} className="p-6 space-y-6 flex-1 overflow-y-auto">
                <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-2">Recipient Number</label>
                    <input
                        type="text"
                        id="number"
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        placeholder="e.g. 6281234567890"
                        className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message Content</label>
                    <textarea
                        id="message"
                        rows="6"
                        value={sendMessageText}
                        onChange={(e) => setSendMessageText(e.target.value)}
                        placeholder="Type your message here..."
                        className="block w-full px-4 py-3 rounded-xl border-gray-200 bg-gray-50 text-gray-900 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder-gray-400 resize-none"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attachment (Optional)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-200 border-dashed rounded-xl hover:border-blue-400 hover:bg-blue-50/30 transition-all group cursor-pointer relative">
                        <input
                            id="file-upload"
                            name="file-upload"
                            type="file"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={onFileChange}
                            disabled={activeConnection?.status !== 'connected'}
                        />
                        <div className="space-y-2 text-center pointer-events-none">
                            <div className="mx-auto h-12 w-12 text-gray-400 group-hover:text-blue-500 transition-colors flex items-center justify-center bg-gray-100 rounded-full group-hover:bg-blue-100">
                                <Paperclip className="h-6 w-6" />
                            </div>
                            <div className="flex text-sm text-gray-600 justify-center">
                                <span className="font-medium text-blue-600">Click to upload</span>
                                <span className="pl-1">or drag and drop</span>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF up to 25MB</p>
                        </div>
                    </div>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSending || activeConnection?.status !== 'connected'}
                        className="w-full flex justify-center items-center py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none disabled:cursor-not-allowed transition-all transform active:scale-[0.99]"
                    >
                        {isSending ? (
                            <>Sending...</>
                        ) : (
                            <><Send className="w-5 h-5 mr-2" /> Send Message</>
                        )}
                    </button>
                    {activeConnection?.status !== 'connected' && (
                        <p className="text-xs text-center text-red-500 mt-3">
                            ⚠️ Please connect a device first
                        </p>
                    )}
                </div>
            </form>
        </div>
    );
};

export default MessageSender;
