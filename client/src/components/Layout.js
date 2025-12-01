import React, { useState } from 'react';
import {
    LayoutDashboard,
    MessageSquare,
    Radio,
    Calendar,
    Webhook,
    FileText,
    Menu,
    X,
    LogOut
} from 'lucide-react';
import StatusBadge from './StatusBadge';

const Layout = ({ children, activeTab, setActiveTab, activeConnection, onDisconnect, connections }) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const menuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'messages', label: 'Kirim Pesan', icon: MessageSquare },
        { id: 'broadcast', label: 'Broadcast', icon: Radio },
        { id: 'schedule', label: 'Jadwal Pesan', icon: Calendar },
        { id: 'webhook', label: 'Webhook', icon: Webhook },
        { id: 'logs', label: 'Riwayat Pesan', icon: FileText },
    ];

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                ></div>
            )}

            {/* Sidebar */}
            <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex items-center justify-center h-16 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-primary-600">WA Dashboard</h1>
                </div>

                <div className="p-4">
                    <div className="mb-6">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu Utama</p>
                        <nav className="space-y-1">
                            {menuItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.id}
                                        onClick={() => {
                                            setActiveTab(item.id);
                                            setIsSidebarOpen(false);
                                        }}
                                        className={`flex items-center w-full px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-150 ${activeTab === item.id
                                                ? 'bg-primary-50 text-primary-700'
                                                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mr-3 ${activeTab === item.id ? 'text-primary-600' : 'text-gray-400'}`} />
                                        {item.label}
                                    </button>
                                );
                            })}
                        </nav>
                    </div>

                    {/* Connection Status in Sidebar */}
                    <div className="mt-auto pt-6 border-t border-gray-200">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Koneksi Aktif</p>
                        {activeConnection ? (
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm font-medium text-gray-700 truncate">{activeConnection.connectionId}</span>
                                    <StatusBadge status={activeConnection.status} />
                                </div>
                                <button
                                    onClick={() => onDisconnect(activeConnection.connectionId)}
                                    className="flex items-center text-xs text-red-600 hover:text-red-800 transition-colors"
                                >
                                    <LogOut className="w-3 h-3 mr-1" /> Putus Koneksi
                                </button>
                            </div>
                        ) : (
                            <div className="text-sm text-gray-500 italic">Tidak ada koneksi aktif</div>
                        )}
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-gray-200 lg:px-8">
                    <button
                        onClick={toggleSidebar}
                        className="text-gray-500 focus:outline-none lg:hidden"
                    >
                        <Menu className="w-6 h-6" />
                    </button>

                    <div className="flex items-center">
                        <h2 className="text-lg font-semibold text-gray-800">
                            {menuItems.find(i => i.id === activeTab)?.label || 'Dashboard'}
                        </h2>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Right side header items (e.g. user profile, notifications) could go here */}
                    </div>
                </header>

                {/* Content Body */}
                <main className="flex-1 overflow-y-auto bg-gray-50 p-6 lg:p-8">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;
