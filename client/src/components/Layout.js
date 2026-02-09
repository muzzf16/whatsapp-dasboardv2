import React, { useState } from 'react';
import MainSidebar from './MainSidebar';

const Layout = ({ children, activeTab: propActiveTab, setActiveTab: propSetActiveTab, activeConnection, onDisconnect, connections }) => {
    // Local state for tabs if not controlled by parent, though it seems controlled
    const [localActiveTab, setLocalActiveTab] = useState('dashboard');

    const activeTab = propActiveTab || localActiveTab;
    const setActiveTab = propSetActiveTab || setLocalActiveTab;

    return (
        <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
            {/* Main Dark Sidebar */}
            <MainSidebar activeTab={activeTab} setActiveTab={setActiveTab} />

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {children}
            </div>
        </div>
    );
};

export default Layout;
