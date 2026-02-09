import React, { useState } from 'react';
import { Plus, Smartphone, Trash2, QrCode, RefreshCw, AlertCircle, Wifi } from 'lucide-react';
import StatusBadge from './StatusBadge';

const ConnectionManager = ({
    newConnectionId,
    setNewConnectionId,
    activeConnectionId,
    setActiveConnectionId,
    connections,
    onAddConnection,
    onStartConnection,
    onDisconnect,
    onDisconnectAll,
    onReinitConnection,
    qrCodeUrl,
    diagnostics
}) => {
    const [showDebug, setShowDebug] = useState(false);

    const activeConnection = connections.find(c => c.connectionId === activeConnectionId);

    return (
        <div className="max-w-6xl mx-auto space-y-8 font-sans">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Connection Manager</h2>
                    <p className="text-gray-500 mt-1">Manage your WhatsApp sessions and connections</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowDebug(!showDebug)}
                        className="text-xs text-gray-400 hover:text-gray-600 underline"
                    >
                        {showDebug ? 'Hide Debug' : 'Show Debug'}
                    </button>
                    {connections.length > 0 && (
                        <button
                            onClick={onDisconnectAll}
                            className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center border border-red-100"
                        >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Disconnect All
                        </button>
                    )}
                </div>
            </div>

            {/* Debug Panel */}
            {showDebug && (
                <div className="bg-yellow-50 rounded-xl p-4 border border-yellow-100 text-sm font-mono text-yellow-800 animate-in fade-in slide-in-from-top-2">
                    <p><strong>Active ID:</strong> {activeConnectionId || 'None'}</p>
                    <p><strong>QR URL:</strong> {qrCodeUrl ? 'Present' : 'None'}</p>
                    {diagnostics && (
                        <div className="mt-2 pt-2 border-t border-yellow-200/50">
                            <p className="font-bold">Last Disconnect:</p>
                            <pre className="text-xs overflow-x-auto mt-1 p-2 bg-yellow-100/50 rounded">{JSON.stringify(diagnostics, null, 2)}</pre>
                        </div>
                    )}
                </div>
            )}

            {/* Add Connection Card */}
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                    <Plus className="w-5 h-5 mr-2 text-blue-500" />
                    New Connection
                </h3>
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Smartphone className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={newConnectionId}
                            onChange={(e) => setNewConnectionId(e.target.value)}
                            placeholder="Enter Session ID (e.g. marketing_phone)"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                    <button
                        onClick={onAddConnection}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium shadow-lg shadow-blue-500/30 transition-all flex items-center justify-center"
                    >
                        <Plus className="w-5 h-5 mr-2" />
                        Add Session
                    </button>
                </div>
            </div>

            {/* Connections Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {connections.map((conn) => {
                    const isActive = activeConnectionId === conn.connectionId;
                    const isConnected = conn.status === 'connected';

                    return (
                        <div
                            key={conn.connectionId}
                            onClick={() => setActiveConnectionId(conn.connectionId)}
                            className={`
                                relative rounded-2xl p-6 border transition-all cursor-pointer group hover:shadow-md
                                ${isActive ? 'bg-white border-blue-500 ring-2 ring-blue-500/10 shadow-lg' : 'bg-white border-gray-100 hover:border-blue-200'}
                            `}
                        >
                            {/* Card Header */}
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-3 rounded-xl ${isConnected ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                        <Smartphone className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-900">{conn.connectionId}</h4>
                                        <div className="mt-1">
                                            <StatusBadge status={conn.status} />
                                        </div>
                                    </div>
                                </div>
                                {isActive && (
                                    <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse shadow-sm shadow-blue-500"></div>
                                )}
                            </div>

                            {/* QR Code Section (Only for active card if needed) */}
                            {isActive && qrCodeUrl && conn.status !== 'connected' && (
                                <div className="mt-4 mb-4 p-4 bg-gray-50 rounded-xl border border-gray-100 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200">
                                    <h5 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Scan Code</h5>
                                    <div className="bg-white p-2 rounded-lg shadow-sm">
                                        <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                                    </div>
                                    <p className="text-xs text-center text-gray-400 mt-2 max-w-[200px]">Open WhatsApp &gt; Linked Devices &gt; Link a Device</p>
                                </div>
                            )}

                            {/* Actions Footer */}
                            <div className="mt-4 pt-4 border-t border-gray-50 flex gap-2">
                                {conn.status !== 'connected' && conn.status !== 'connecting' && conn.status !== 'qr_ready' ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onStartConnection(conn.connectionId); }}
                                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center shadow-sm shadow-emerald-500/20"
                                    >
                                        <Wifi className="w-4 h-4 mr-2" /> Connect
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDisconnect(conn.connectionId); }}
                                        className="flex-1 bg-white border border-gray-200 text-gray-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" /> Disconnect
                                    </button>
                                )}

                                {conn.status === 'logged out' && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onReinitConnection(conn.connectionId); }}
                                        className="px-3 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg transition-colors flex items-center justify-center"
                                        title="Re-Initialize Session"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Empty State */}
                {connections.length === 0 && (
                    <div className="col-span-full py-12 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                            <Smartphone className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-lg font-medium text-gray-500">No active sessions</p>
                        <p className="text-sm">Add a new connection ID above to get started</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ConnectionManager;
