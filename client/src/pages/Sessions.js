import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Power, Eye } from 'lucide-react';
import { API_BASE } from '../lib/api';
const API_URL = API_BASE;

const Sessions = ({ sessions, fetchSessions, handleSelectSession }) => {
    const [newSessionId, setNewSessionId] = useState('');

    useEffect(() => {
        fetchSessions();
    }, [fetchSessions]);

    const handleStartSession = async (e) => {
        e.preventDefault();
        if (!newSessionId) {
            alert('Session ID tidak boleh kosong.');
            return;
        }
        try {
            await axios.post(`${API_URL}/connections/start`, { connectionId: newSessionId });
            setNewSessionId('');
            fetchSessions();
            alert(`Sesi ${newSessionId} sedang dimulai...`);
        } catch (error) {
            console.error("Error starting session:", error);
            alert('Gagal memulai sesi.');
        }
    };

    const handleDisconnect = async (connectionId) => {
        if (!window.confirm(`Apakah Anda yakin ingin memutus koneksi sesi ${connectionId}?`)) return;
        try {
            await axios.post(`${API_URL}/connections/${connectionId}/disconnect`);
            fetchSessions();
            alert(`Sesi ${connectionId} telah diputus.`);
        } catch (error) {
            console.error("Error disconnecting session:", error);
            alert('Gagal memutus sesi.');
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Mulai Sesi Baru</h2>
                <form onSubmit={handleStartSession} className="flex items-center gap-4">
                    <input
                        type="text"
                        value={newSessionId}
                        onChange={(e) => setNewSessionId(e.target.value)}
                        placeholder="Masukkan ID Sesi Unik (cth: toko-cabang-1)"
                        className="flex-grow block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        <Plus className="-ml-1 mr-2 h-5 w-5" />
                        Mulai Sesi
                    </button>
                </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold text-gray-700 mb-4">Sesi Aktif</h2>
                <div className="space-y-4">
                    {sessions.length > 0 ? sessions.map(session => (
                        <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                            <div>
                                <p className="font-semibold text-lg text-gray-800">{session.id}</p>
                                <p className="text-sm text-gray-500 capitalize">{session.status}</p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleSelectSession(session.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Tampilkan
                                </button>
                                <button
                                    onClick={() => handleDisconnect(session.id)}
                                    className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50"
                                >
                                    <Power className="mr-2 h-4 w-4" />
                                    Putuskan
                                </button>
                            </div>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-4">Tidak ada sesi aktif. Mulai sesi baru di atas.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Sessions;