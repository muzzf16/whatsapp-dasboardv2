import React from 'react';

const StatusBadge = ({ status }) => {
    const statusMap = {
        connected: { text: 'Terhubung', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
        connecting: { text: 'Menghubungkan...', color: 'bg-blue-100 text-blue-800 border-blue-200' },
        disconnected: { text: 'Terputus', color: 'bg-rose-100 text-rose-800 border-rose-200' },
        qr_ready: { text: 'Scan QR Code', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    };

    const { text, color } = statusMap[status] || { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${color}`}>
            <span className={`w-2 h-2 mr-1.5 rounded-full ${status === 'connected' ? 'bg-emerald-500' : status === 'disconnected' ? 'bg-rose-500' : 'bg-gray-400'} animate-pulse`}></span>
            {text}
        </span>
    );
};

export default StatusBadge;
