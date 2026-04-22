import React, { useMemo, useState } from 'react';
import { Menu, Wifi, WifiOff } from 'lucide-react';
import MainSidebar from './MainSidebar';

// Peta nama tab -> judul header.
// Tujuannya agar judul di topbar selalu konsisten walaupun ID tab berbentuk snake_case.
const TAB_TITLES = {
    dashboard: 'Dashboard Overview',
    whatsapp: 'WhatsApp Messaging',
    account_manager: 'Account Manager',
    contacts: 'Contact Manager',
    file_manager: 'File Manager',
    tools: 'Automation Tools',
    users: 'User Management',
    approvals: 'Approval Queue',
};

const Layout = ({ children, activeTab: propActiveTab, setActiveTab: propSetActiveTab, activeConnection }) => {
    // Fallback state: dipakai kalau parent tidak mengontrol activeTab.
    const [localActiveTab, setLocalActiveTab] = useState('dashboard');
    // State untuk membuka/menutup sidebar mobile (drawer).
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Prioritas pakai prop dari parent; kalau tidak ada baru pakai state lokal.
    const activeTab = propActiveTab || localActiveTab;
    const setActiveTab = propSetActiveTab || setLocalActiveTab;

    // Memoized agar tidak menghitung ulang title di setiap render tanpa perubahan tab.
    const headerTitle = useMemo(() => TAB_TITLES[activeTab] || 'Dashboard', [activeTab]);
    // Digunakan untuk status pill (Connected vs status lain).
    const isConnected = activeConnection?.status === 'connected';

    return (
        <div className="flex h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-emerald-50/40 text-slate-900 overflow-hidden">
            <MainSidebar
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isMobileMenuOpen={isMobileMenuOpen}
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
            />

            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/70">
                    <div className="h-16 px-4 md:px-6 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => setIsMobileMenuOpen(true)}
                                className="lg:hidden p-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100"
                                aria-label="Open menu"
                            >
                                <Menu className="w-5 h-5" />
                            </button>
                            <div className="min-w-0">
                                <h1 className="text-base md:text-lg font-semibold text-slate-900 truncate">{headerTitle}</h1>
                                <p className="text-xs text-slate-500 truncate">WhatsApp Dashboard v2</p>
                            </div>
                        </div>

                        <div className={`inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full text-xs font-medium border ${isConnected ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                            {isConnected ? 'Connected' : (activeConnection?.status || 'No Active Session')}
                        </div>
                    </div>
                </header>

                <main className="flex-1 min-h-0 overflow-hidden">{children}</main>
            </div>
        </div>
    );
};

export default Layout;
