import React, { useContext } from 'react';
import { LayoutDashboard, MessageCircle, Users, FolderOpen, Settings, UserCog } from 'lucide-react'; // Added UserCog for admin
import { AuthContext } from '../context/AuthContext';

const MainSidebar = ({ activeTab, setActiveTab }) => {
    const { user } = useContext(AuthContext);

    const mainMenuItems = [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'whatsapp', label: 'Whatsapp', icon: MessageCircle },
        { id: 'account_manager', label: 'Account manager', icon: Users },
        { id: 'contacts', label: 'Contacts', icon: Users },
        { id: 'file_manager', label: 'File manager', icon: FolderOpen },
        { id: 'tools', label: 'Tools', icon: Settings },
    ];

    if (user && user.role === 'admin') {
        mainMenuItems.push({ id: 'users', label: 'User Management', icon: UserCog });
    }

    return (
        <div className="w-64 bg-[#1a1c23] text-white flex flex-col h-full hidden lg:flex flex-shrink-0">
            <div className="h-16 flex items-center px-6">
                <h1 className="text-xl font-bold flex items-center gap-2">
                    <MessageCircle className="w-6 h-6 text-white" fill="currentColor" />
                    SendApp
                </h1>
            </div>

            <nav className="flex-1 py-4 space-y-2">
                {mainMenuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`w-full flex items-center px-6 py-3 text-sm font-medium transition-colors relative
                                ${isActive ? 'text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'}
                            `}
                        >
                            {item.label}
                        </button>
                    );
                })}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button
                    onClick={() => {
                        localStorage.removeItem('token');
                        window.location.href = '/login';
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-400 hover:text-white hover:bg-gray-800 rounded-md transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                </button>
            </div>
        </div>
    );
};

export default MainSidebar;
