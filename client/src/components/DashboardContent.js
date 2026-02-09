import React, { useMemo } from 'react';
import { Search, Send, FileText, CheckCircle, Smartphone, Activity } from 'lucide-react';
import StatusBadge from './StatusBadge';

const DashboardContent = ({ activeConnection, connections, messages }) => {
    // Calculate stats from real data
    const stats = useMemo(() => {
        const totalSent = messages.filter(m => m.fromMe).length;
        const totalReceived = messages.filter(m => !m.fromMe).length;
        const connectedCount = connections.filter(c => c.status === 'connected').length;

        return {
            totalSent,
            totalReceived,
            connectedCount,
            totalConnections: connections.length
        };
    }, [messages, connections]);

    return (
        <div className="flex-1 flex flex-col h-full bg-gray-50/50 overflow-hidden font-sans">
            {/* Header */}
            <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <input
                            type="text"
                            className="pl-10 pr-4 py-2.5 bg-gray-100/50 border-none rounded-xl text-gray-600 text-sm focus:ring-2 focus:ring-green-500/20 focus:bg-white transition-all w-64"
                            placeholder="Search..."
                        />
                        <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    </div>
                </div>

                <div className="flex items-center space-x-6">
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden sm:block">
                            <div className="text-sm font-semibold text-gray-800">Admin User</div>
                            <div className="text-xs text-gray-500">Administrator</div>
                        </div>
                        <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-green-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg ring-2 ring-white">
                            AU
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto p-8 scroll-smooth">
                <div className="max-w-7xl mx-auto space-y-8">
                    {/* Welcome Section */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Overview</h1>
                            <p className="text-gray-500 mt-1">Here is what's happening with your WhatsApp connections.</p>
                        </div>
                        <div className="flex gap-3">
                            {/* Date or other secondary info could go here */}
                            <span className="px-4 py-2 bg-white rounded-lg text-sm text-gray-600 shadow-sm border border-gray-100">
                                {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </span>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Connected Devices */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Smartphone className="w-16 h-16 text-blue-500" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-blue-50/80 rounded-xl text-blue-600 relative z-10">
                                    <Smartphone className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Connections</p>
                                    <h3 className="text-2xl font-bold text-gray-800">{stats.connectedCount}<span className="text-gray-400 text-lg font-normal">/{stats.totalConnections}</span></h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <div className={`w-2 h-2 rounded-full ${stats.connectedCount > 0 ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                {stats.connectedCount > 0 ? 'System Operational' : 'Action Required'}
                            </div>
                        </div>

                        {/* Messages Sent */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Send className="w-16 h-16 text-emerald-500" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-emerald-50/80 rounded-xl text-emerald-600 relative z-10">
                                    <Send className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Sent Messages</p>
                                    <h3 className="text-2xl font-bold text-gray-800">{stats.totalSent}</h3>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full" style={{ width: '70%' }}></div>
                            </div>
                        </div>

                        {/* Messages Received */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <FileText className="w-16 h-16 text-indigo-500" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-indigo-50/80 rounded-xl text-indigo-600 relative z-10">
                                    <FileText className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Received Messages</p>
                                    <h3 className="text-2xl font-bold text-gray-800">{stats.totalReceived}</h3>
                                </div>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-indigo-500 h-full rounded-full" style={{ width: '45%' }}></div>
                            </div>
                        </div>

                        {/* System Status */}
                        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative overflow-hidden group hover:shadow-md transition-shadow">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Activity className="w-16 h-16 text-amber-500" />
                            </div>
                            <div className="flex items-center gap-4 mb-4">
                                <div className="p-3 bg-amber-50/80 rounded-xl text-amber-600 relative z-10">
                                    <Activity className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-500">System Status</p>
                                    <h3 className="text-2xl font-bold text-gray-800">OK</h3>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                                <CheckCircle className="w-4 h-4" />
                                All services running
                            </div>
                        </div>
                    </div>

                    {/* Active Connections List */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-bold text-gray-800">Connection Status</h2>
                            <button className="text-sm text-blue-600 font-medium hover:text-blue-700">View All</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50/50">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Session ID</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Platform</th>
                                        <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Activity</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {connections.length === 0 ? (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-8 text-center text-gray-500">
                                                No connections found. Go to Account Manager to add one.
                                            </td>
                                        </tr>
                                    ) : (
                                        connections.map((conn) => (
                                            <tr key={conn.connectionId} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 mr-3">
                                                            <Smartphone className="w-4 h-4" />
                                                        </div>
                                                        <span className="font-medium text-gray-900">{conn.connectionId}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={conn.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                                    WhatsApp
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-sm">
                                                    Just now
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardContent;
