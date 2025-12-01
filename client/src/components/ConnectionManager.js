import React from 'react';
import { Plus, Smartphone, Trash2, QrCode } from 'lucide-react';

const ConnectionManager = ({ newConnectionId, setNewConnectionId, activeConnectionId, setActiveConnectionId, connections, onAddConnection, onStartConnection, onDisconnect, onDisconnectAll, qrCodeUrl }) => {
    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            {/* Debug Info - Remove later */}
            <div className="bg-yellow-50 p-2 text-xs text-yellow-800 border-b border-yellow-100">
                Debug: ActiveID={activeConnectionId || 'None'}, QR={qrCodeUrl ? 'Yes' : 'No'}
            </div>
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Smartphone className="w-5 h-5 mr-2 text-primary-600" />
                    Manajemen Koneksi
                </h2>
            </div>

            <div className="p-6 space-y-6">
                {/* Add New Connection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Tambah Koneksi Baru</label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newConnectionId}
                            onChange={(e) => setNewConnectionId(e.target.value)}
                            placeholder="ID Koneksi (contoh: user1)"
                            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm px-4 py-2 border"
                        />
                        <button
                            onClick={onAddConnection}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                        >
                            <Plus className="w-4 h-4 mr-1" /> Tambah
                        </button>
                    </div>
                </div>

                {/* Connection List */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">Pilih Koneksi Aktif</label>
                        {connections.length > 0 && (
                            <button
                                onClick={onDisconnectAll}
                                className="text-xs text-rose-600 hover:text-rose-800 flex items-center"
                            >
                                <Trash2 className="w-3 h-3 mr-1" /> Hapus Semua
                            </button>
                        )}
                    </div>

                    {connections.length > 0 ? (
                        <div className="space-y-3">
                            <div className="flex gap-2">
                                <select
                                    value={activeConnectionId}
                                    onChange={(e) => setActiveConnectionId(e.target.value)}
                                    className="flex-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-lg border"
                                >
                                    {connections.map((conn) => (
                                        <option key={conn.connectionId} value={conn.connectionId}>
                                            {conn.connectionId} ({conn.status})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Connection Actions */}
                            <div className="flex gap-2">
                                {connections.find(c => c.connectionId === activeConnectionId)?.status !== 'connected' &&
                                    connections.find(c => c.connectionId === activeConnectionId)?.status !== 'connecting' &&
                                    connections.find(c => c.connectionId === activeConnectionId)?.status !== 'qr_ready' ? (
                                    <button
                                        onClick={() => onStartConnection(activeConnectionId)}
                                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500"
                                    >
                                        <Smartphone className="w-4 h-4 mr-2" /> Mulai Koneksi
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => onDisconnect(activeConnectionId)}
                                        className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Putus Koneksi
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500 italic">Belum ada koneksi.</p>
                    )}
                </div>

                {/* QR Code Display */}
                {qrCodeUrl && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-col items-center">
                        <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                            <QrCode className="w-4 h-4 mr-2" /> Scan QR Code
                        </h3>
                        <div className="bg-white p-2 rounded-lg shadow-sm">
                            <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                        </div>
                        <p className="text-xs text-gray-500 mt-2 text-center">
                            Buka WhatsApp di HP Anda &gt; Menu &gt; Perangkat Tertaut &gt; Tautkan Perangkat
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConnectionManager;
