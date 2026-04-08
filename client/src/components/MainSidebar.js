import React, { useContext } from 'react';
import {
    LayoutDashboard,
    MessageCircle,
    Users,
    FolderOpen,
    Settings,
    UserCog,
    LogOut,
    X,
    Sparkles,
} from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const MainSidebar = ({ activeTab, setActiveTab, isMobileMenuOpen = false, onCloseMobileMenu = () => { } }) => {
    const { user } = useContext(AuthContext);

    // Daftar menu utama.
    // Catatan: setiap item punya id (untuk routing internal tab), label, dan icon komponen.
    const mainMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
        { id: 'account_manager', label: 'Account Manager', icon: Users },
        { id: 'contacts', label: 'Contacts', icon: Users },
        { id: 'file_manager', label: 'File Manager', icon: FolderOpen },
        { id: 'tools', label: 'Automation Tools', icon: Settings },
    ];

    // Menu admin hanya muncul jika role user = admin.
    if (user && user.role === 'admin') {
        mainMenuItems.push({ id: 'users', label: 'User Management', icon: UserCog });
    }

    // Logout sederhana: hapus token lalu redirect ke halaman login.
    const handleLogout = () => {
        localStorage.removeItem('token');
        window.location.href = '/login';
    };

    // Saat user klik menu di mobile, kita langsung tutup drawer agar UX lebih nyaman.
    const handleMenuClick = (menuId) => {
        setActiveTab(menuId);
        onCloseMobileMenu();
    };

    // Dipisah ke variabel supaya markup sidebar desktop dan mobile bisa reuse 1 sumber.
    const sidebarBody = (
        <>
            <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
                <h1 className="text-lg font-semibold tracking-tight flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                    </span>
                    WA Dashboard
                </h1>
                <button
                    onClick={onCloseMobileMenu}
                    className="lg:hidden p-2 rounded-lg text-slate-300 hover:bg-white/10 hover:text-white"
                    aria-label="Close menu"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* Nav utama. overflow-y-auto menjaga menu tetap bisa discroll saat item bertambah. */}
            <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
                {mainMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => handleMenuClick(item.id)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all rounded-xl border
                                ${isActive
                                    ? 'bg-white/15 text-white border-white/25 shadow-lg shadow-black/20'
                                    : 'text-slate-300 border-transparent hover:text-white hover:bg-white/10 hover:border-white/10'
                                }`}
                        >
                            <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-300' : 'text-slate-400'}`} />
                            <span className="truncate">{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Zona aksi bawah: sekarang khusus untuk logout */}
            <div className="p-3 border-t border-white/10">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                    Logout
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Desktop sidebar (hidden di mobile, muncul mulai breakpoint lg) */}
            <aside className="w-72 bg-slate-950/95 text-white backdrop-blur-xl border-r border-white/10 hidden lg:flex lg:flex-col flex-shrink-0">
                {sidebarBody}
            </aside>

            {/* Mobile drawer + overlay */}
            <div className={`fixed inset-0 z-40 lg:hidden transition ${isMobileMenuOpen ? 'pointer-events-auto' : 'pointer-events-none'}`}>
                <button
                    className={`absolute inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity ${isMobileMenuOpen ? 'opacity-100' : 'opacity-0'}`}
                    onClick={onCloseMobileMenu}
                    aria-label="Close overlay"
                />
                <aside className={`absolute inset-y-0 left-0 w-72 bg-slate-950 text-white border-r border-white/10 shadow-2xl transform transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                    {sidebarBody}
                </aside>
            </div>
        </>
    );
};

export default MainSidebar;
