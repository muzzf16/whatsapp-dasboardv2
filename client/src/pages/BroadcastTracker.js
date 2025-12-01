import React from 'react';
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

const statusIcons = {
    running: <Loader size={18} className="animate-spin text-blue-500" />,
    completed: <CheckCircle size={18} className="text-green-500" />,
    failed: <XCircle size={18} className="text-red-500" />,
};

const ProgressBar = ({ total, sent, failed }) => {
    const sentPercentage = (sent / total) * 100;
    const failedPercentage = (failed / total) * 100;

    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
            <div className="bg-green-500 h-2.5 rounded-l-full" style={{ width: `${sentPercentage}%`, display: 'inline-block' }}></div>
            <div className="bg-red-500 h-2.5 rounded-r-full" style={{ width: `${failedPercentage}%`, display: 'inline-block' }}></div>
        </div>
    );
};

const BroadcastTracker = ({ broadcasts }) => {
    if (broadcasts.length === 0) {
        return null; // Don't render anything if there are no broadcasts
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Riwayat Broadcast</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {broadcasts.map(job => (
                    <div key={job.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-center">
                            <p className="font-mono text-sm text-gray-600">{job.id}</p>
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                                {statusIcons[job.status] || <Clock size={18} className="text-gray-500" />}
                                <span className="capitalize">{job.status}</span>
                            </div>
                        </div>
                        <div className="mt-3">
                            <ProgressBar total={job.total} sent={job.sent} failed={job.failed} />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Terkirim: {job.sent}/{job.total}</span>
                                {job.failed > 0 && <span className="text-red-500">Gagal: {job.failed}</span>}
                            </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-2">Sesi: {job.connectionId} &middot; Dimulai: {new Date(job.startTime).toLocaleString()}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default BroadcastTracker;
