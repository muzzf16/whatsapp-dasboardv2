const StatusBadge = ({ status }) => {
    const statusMap = {
        connected: { text: 'Terhubung', color: 'bg-green-500' },
        connecting: { text: 'Menghubungkan...', color: 'bg-yellow-500' },
        disconnected: { text: 'Terputus', color: 'bg-red-500' },
        'waiting for QR scan': { text: 'Menunggu Scan QR', color: 'bg-blue-500' },
        'logged out': { text: 'Keluar', color: 'bg-gray-500' },
    };
    const { text, color } = statusMap[status] || { text: 'Unknown', color: 'bg-gray-500' };
    
    return (
        <div className="flex items-center space-x-2">
            <span className={`h-3 w-3 rounded-full ${color}`}></span>
            <span className="text-sm font-medium text-gray-700">{text}</span>
        </div>
    );
};

export default StatusBadge;
