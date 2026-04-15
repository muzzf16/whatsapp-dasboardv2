import React, { useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Loader } from 'lucide-react';

// --- Sub-components ---

const StatusIcon = ({ status }) => {
    switch (status) {
        case 'running':
            return <Loader size={18} className="animate-spin text-blue-500" />;
        case 'completed':
            return <CheckCircle size={18} className="text-green-500" />;
        case 'failed':
            return <XCircle size={18} className="text-red-500" />;
        default:
            return <Clock size={18} className="text-gray-500" />;
    }
};

const ProgressBar = ({ total, sent, failed }) => {
    const sentPercentage = total > 0 ? (sent / total) * 100 : 0;
    const failedPercentage = total > 0 ? (failed / total) * 100 : 0;

    return (
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1 flex overflow-hidden">
            {sentPercentage > 0 && (
                <div
                    className="bg-green-500 h-2.5 transition-all duration-300"
                    style={{ width: `${sentPercentage}%` }}
                />
            )}
            {failedPercentage > 0 && (
                <div
                    className="bg-red-500 h-2.5 transition-all duration-300"
                    style={{ width: `${failedPercentage}%` }}
                />
            )}
        </div>
    );
};

const BroadcastJobCard = ({ job }) => (
    <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center">
            <p className="font-mono text-sm text-gray-600">{job.id}</p>
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <StatusIcon status={job.status} />
                <span className="capitalize">{job.status}</span>
            </div>
        </div>
        <div className="mt-3">
            <ProgressBar total={job.total} sent={job.sent} failed={job.failed} />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Terkirim: {job.sent}/{job.total}</span>
                {job.failed > 0 && (
                    <span className="text-red-500">Gagal: {job.failed}</span>
                )}
            </div>
        </div>
        <p className="text-xs text-gray-400 mt-2">
            Sesi: {job.connectionId} &middot; Dimulai: {new Date(job.startTime).toLocaleString()}
        </p>
    </div>
);

// --- Main component ---

const BroadcastTracker = ({ broadcasts }) => {
    const sortedBroadcasts = useMemo(
        () => [...broadcasts].sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
        [broadcasts]
    );

    if (sortedBroadcasts.length === 0) {
        return null;
    }

    return (
        <div className="bg-white p-6 rounded-lg shadow-md mt-8">
            <h2 className="text-2xl font-semibold text-gray-700 mb-4">Riwayat Broadcast</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedBroadcasts.map(job => (
                    <BroadcastJobCard key={job.id} job={job} />
                ))}
            </div>
        </div>
    );
};

export default BroadcastTracker;
