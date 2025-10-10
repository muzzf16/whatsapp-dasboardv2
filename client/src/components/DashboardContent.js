import React from 'react';
import { ContentSpinner } from './Spinner';

const DashboardContent = ({ connectionId, isLoading, qrCodeUrl, status, handleSendMessage, sendTo, setSendTo, sendMessageText, setSendMessageText, isSending, messages, messagesEndRef }) => {
    return (
        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-8">
            {isLoading && <ContentSpinner />}

            {/* Kolom Kiri: QR Code dan Form Kirim Pesan */}
            <div className="lg:col-span-1 space-y-8">
                {status === 'waiting for QR scan' && qrCodeUrl && (
                    <div className="bg-white p-6 rounded-lg shadow-md text-center">
                        <h2 className="text-xl font-semibold mb-4">Pindai untuk Masuk</h2>
                        <img src={qrCodeUrl} alt="QR Code" className="mx-auto border-4 border-gray-200 rounded-lg"/>
                        <p className="mt-4 text-gray-600">Buka WhatsApp di ponsel Anda, lalu pindai kode ini.</p>
                    </div>
                )}

                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl font-semibold mb-4 border-b pb-2">Kirim Pesan</h2>
                    <form onSubmit={handleSendMessage} className="space-y-4">
                        <div>
                            <label htmlFor="number" className="block text-sm font-medium text-gray-700">Nomor Tujuan</label>
                            <input
                                type="text"
                                id="number"
                                value={sendTo}
                                onChange={(e) => setSendTo(e.target.value)}
                                placeholder="Contoh: 6281234567890"
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={status !== 'connected'}
                            />
                        </div>
                        <div>
                            <label htmlFor="message" className="block text-sm font-medium text-gray-700">Isi Pesan</label>
                            <textarea
                                id="message"
                                rows="4"
                                value={sendMessageText}
                                onChange={(e) => setSendMessageText(e.target.value)}
                                placeholder="Ketik pesan Anda di sini..."
                                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                disabled={status !== 'connected'}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSending || status !== 'connected'}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                        >
                            {isSending ? 'Mengirim...' : 'Kirim Sekarang'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Kolom Kanan: Log Pesan */}
            <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4 border-b pb-2">Log Pesan Masuk</h2>
                <div className="h-96 overflow-y-auto space-y-4 pr-2">
                   {messages.length > 0 ? messages.map((msg, index) => (
                        <div key={index} className="bg-gray-50 p-3 rounded-md border-l-4 border-green-500">
                            <p className="font-bold text-gray-800">{msg.sender || msg.from.split('@')[0]}</p>
                            <p className="text-gray-700">{msg.message || msg.text}</p>
                            <p className="text-xs text-gray-500 mt-1 text-right">{new Date(msg.timestamp).toLocaleString()}</p>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 mt-10">Belum ada pesan masuk.</p>
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>
    );
}

export default DashboardContent;
