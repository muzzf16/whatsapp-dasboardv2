import React from 'react';
import { Send, Paperclip, MessageSquare } from 'lucide-react';

const MessageSender = ({ sendTo, setSendTo, sendMessageText, setSendMessageText, activeConnection, isSending, onSendMessage, onFileChange }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <MessageSquare className="w-5 h-5 mr-2 text-primary-600" />
                    Kirim Pesan
                </h2>
            </div>

            <form onSubmit={onSendMessage} className="p-6 space-y-4">
                <div>
                    <label htmlFor="number" className="block text-sm font-medium text-gray-700 mb-1">Nomor Tujuan</label>
                    <input
                        type="text"
                        id="number"
                        value={sendTo}
                        onChange={(e) => setSendTo(e.target.value)}
                        placeholder="6281234567890"
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">Pesan</label>
                    <textarea
                        id="message"
                        rows="4"
                        value={sendMessageText}
                        onChange={(e) => setSendMessageText(e.target.value)}
                        placeholder="Ketik pesan Anda di sini..."
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lampiran File (Opsional)</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-lg hover:border-primary-400 transition-colors">
                        <div className="space-y-1 text-center">
                            <Paperclip className="mx-auto h-12 w-12 text-gray-400" />
                            <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" onChange={onFileChange} disabled={activeConnection?.status !== 'connected'} />
                                </label>
                                <p className="pl-1">or drag and drop</p>
                            </div>
                            <p className="text-xs text-gray-500">PNG, JPG, PDF up to 25MB</p>
                        </div>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isSending || activeConnection?.status !== 'connected'}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isSending ? 'Mengirim...' : <><Send className="w-4 h-4 mr-2" /> Kirim Pesan</>}
                </button>
            </form>
        </div>
    );
};

export default MessageSender;
