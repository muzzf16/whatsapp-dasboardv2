import React from 'react';
import { Radio, Send } from 'lucide-react';

const BroadcastSender = ({ broadcastNumbers, setBroadcastNumbers, broadcastMessage, setBroadcastMessage, activeConnection, isBroadcasting, onBroadcastMessage, broadcastDelay, setBroadcastDelay }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Radio className="w-5 h-5 mr-2 text-primary-600" />
                    Broadcast Pesan
                </h2>
            </div>

            <form onSubmit={onBroadcastMessage} className="p-6 space-y-4">
                <div>
                    <label htmlFor="broadcast-numbers" className="block text-sm font-medium text-gray-700 mb-1">Daftar Nomor (Satu per baris)</label>
                    <textarea
                        id="broadcast-numbers"
                        rows="5"
                        value={broadcastNumbers}
                        onChange={(e) => setBroadcastNumbers(e.target.value)}
                        placeholder="6281234567890&#10;6289876543210"
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border font-mono"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label htmlFor="broadcast-message" className="block text-sm font-medium text-gray-700 mb-1">Pesan Broadcast</label>
                    <textarea
                        id="broadcast-message"
                        rows="3"
                        value={broadcastMessage}
                        onChange={(e) => setBroadcastMessage(e.target.value)}
                        placeholder="Pesan untuk semua..."
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                </div>

                <div>
                    <label htmlFor="broadcast-delay" className="block text-sm font-medium text-gray-700 mb-1">Jeda Waktu (ms)</label>
                    <input
                        type="number"
                        id="broadcast-delay"
                        value={broadcastDelay}
                        onChange={(e) => setBroadcastDelay(Number(e.target.value))}
                        min="500"
                        step="100"
                        className="block w-full px-4 py-2 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm border"
                        disabled={activeConnection?.status !== 'connected'}
                    />
                    <p className="mt-1 text-xs text-gray-500">Minimal 500ms untuk menghindari spam.</p>
                </div>

                <button
                    type="submit"
                    disabled={isBroadcasting || activeConnection?.status !== 'connected'}
                    className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {isBroadcasting ? 'Mengirim Broadcast...' : <><Send className="w-4 h-4 mr-2" /> Kirim Broadcast</>}
                </button>
            </form>
        </div>
    );
};

export default BroadcastSender;
