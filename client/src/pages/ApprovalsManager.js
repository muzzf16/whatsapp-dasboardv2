import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL as BASE_API_URL } from '../lib/api';
import { AuthContext } from '../context/AuthContext';
import { CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';

const STATUS_STYLES = {
    pending: 'bg-amber-50 text-amber-700 border-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const ApprovalsManager = () => {
    const { token, user } = useContext(AuthContext);
    const [approvals, setApprovals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [feedback, setFeedback] = useState({ message: '', type: '' });

    const canReview = useMemo(
        () => ['admin', 'supervisor'].includes(user?.role),
        [user?.role]
    );

    const requestConfig = useMemo(() => ({
        headers: {
            'x-auth-token': token,
        },
    }), [token]);

    const showFeedback = (message, type) => {
        setFeedback({ message, type });
        setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
    };

    const fetchApprovals = useCallback(async () => {
        try {
            const response = await axios.get(`${BASE_API_URL}/api/approvals`, requestConfig);
            setApprovals(response.data.data || []);
        } catch (error) {
            showFeedback(error.response?.data?.message || 'Gagal memuat approval queue.', 'error');
        } finally {
            setLoading(false);
        }
    }, [requestConfig]);

    useEffect(() => {
        fetchApprovals();
    }, [fetchApprovals]);

    const reviewApproval = async (id, action) => {
        try {
            await axios.post(`${BASE_API_URL}/api/approvals/${id}/${action}`, {}, requestConfig);
            showFeedback(action === 'approve' ? 'Approval disetujui.' : 'Approval ditolak.', 'success');
            fetchApprovals();
        } catch (error) {
            showFeedback(error.response?.data?.message || 'Gagal memproses approval.', 'error');
        }
    };

    return (
        <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
            {feedback.message && (
                <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${feedback.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
                    {feedback.message}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
                    <div>
                        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            Approval Queue
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {canReview ? 'Tinjau permintaan operator sebelum aksi sensitif dijalankan.' : 'Pantau status permintaan yang Anda ajukan.'}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={fetchApprovals}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                    >
                        Refresh
                    </button>
                </div>

                {loading ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Memuat approval queue...</div>
                ) : approvals.length === 0 ? (
                    <div className="px-6 py-12 text-center text-sm text-slate-500">Belum ada approval request.</div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {approvals.map((approval) => (
                            <div key={approval.id} className="space-y-4 px-6 py-5">
                                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                    <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className="text-sm font-semibold text-slate-900">{approval.summary || approval.action_type}</span>
                                            <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[approval.status] || 'border-slate-200 bg-slate-50 text-slate-600'}`}>
                                                {approval.status}
                                            </span>
                                        </div>
                                        <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                                            <span>Requester: {approval.requester_name || approval.requester_username || '-'}</span>
                                            <span>Dibuat: {new Date(approval.created_at).toLocaleString()}</span>
                                            {approval.approver_name && <span>Reviewer: {approval.approver_name}</span>}
                                        </div>
                                    </div>
                                    {canReview && approval.status === 'pending' && (
                                        <div className="flex shrink-0 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => reviewApproval(approval.id, 'approve')}
                                                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                                            >
                                                <CheckCircle2 className="h-4 w-4" />
                                                Approve
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => reviewApproval(approval.id, 'reject')}
                                                className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                                            >
                                                <XCircle className="h-4 w-4" />
                                                Reject
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                                    <pre className="whitespace-pre-wrap break-words font-mono">
                                        {JSON.stringify(approval.payload, null, 2)}
                                    </pre>
                                </div>

                                {approval.rejection_reason && (
                                    <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-xs text-rose-700">
                                        Alasan penolakan: {approval.rejection_reason}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                        <Clock3 className="h-4 w-4 text-amber-600" />
                        <span className="text-sm font-semibold">Pending</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{approvals.filter((item) => item.status === 'pending').length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        <span className="text-sm font-semibold">Approved</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{approvals.filter((item) => item.status === 'approved').length}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center gap-2 text-slate-800">
                        <XCircle className="h-4 w-4 text-rose-600" />
                        <span className="text-sm font-semibold">Rejected</span>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">{approvals.filter((item) => item.status === 'rejected').length}</p>
                </div>
            </div>
        </div>
    );
};

export default ApprovalsManager;
