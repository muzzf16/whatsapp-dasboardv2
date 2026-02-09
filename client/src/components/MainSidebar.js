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
                            {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-r-md"></div>}
                            <Icon className={`w-5 h-5 mr-3 ${isActive ? 'text-green-500' : ''}`} />
                            {item.label}
                        </button>
                    );
                })}
            </nav>
        </div>
    );
};

export default MainSidebar;
