import React from 'react';
import {
    LayoutTemplate,
    User,
    MessageSquare,
    MessageCircle,
    Bot,
    LogOut,
    Database,
    List,
    FileText,
    Contact,
    Plus
} from 'lucide-react';

const SubSidebar = ({ activeSubTab, setActiveSubTab }) => {
    const features = [
        { id: 'report', label: 'Report', subLabel: 'Customize system interface', icon: LayoutTemplate },
        { id: 'profile', label: 'Profile', subLabel: 'Information WhatsApp account', icon: User },
        { id: 'bulk_messaging', label: 'Bulk messaging', subLabel: 'Send to multiple recipients', icon: MessageSquare },
        { id: 'autoresponder', label: 'Autoresponder', subLabel: 'Send a pre-written message', icon: MessageCircle },
        { id: 'chatbot', label: 'Chatbot', subLabel: 'Communicate with users', icon: Bot },
        { id: 'export_participants', label: 'Export participants', subLabel: 'Export participant list', icon: LogOut },
        { id: 'api', label: 'API', subLabel: 'API WhatsApp REST', icon: Database },
    ];

    const templates = [
        { id: 'button_template', label: 'Button template', subLabel: 'Create interactive button mes...', icon: List },
        { id: 'list_message_template', label: 'List message template', subLabel: 'Create list of items/options', icon: FileText },
    ];

    const contacts = [
        { id: 'contacts', label: 'Contacts', subLabel: 'Create, edit your contacts', icon: Contact },
    ];

    const MenuItem = ({ item }) => {
        const Icon = item.icon;
        const isActive = activeSubTab === item.id;
        return (
            <button
                onClick={() => setActiveSubTab(item.id)}
                className={`w-full flex items-start px-4 py-3 text-left transition-colors rounded-r-full
                    ${isActive ? 'bg-green-50 border-l-4 border-green-500' : 'hover:bg-gray-50 border-l-4 border-transparent'}
                `}
            >
                <Icon className={`w-5 h-5 mt-1 mr-3 ${isActive ? 'text-green-500' : 'text-gray-400'}`} />
                <div>
                    <div className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>{item.label}</div>
                    <div className="text-xs text-gray-400 truncate w-32">{item.subLabel}</div>
                </div>
            </button>
        )
    }

    return (
        <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-full hidden md:flex flex-shrink-0">
            <div className="p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-6">Report</h2>
                <button className="w-full bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-md flex items-center justify-center transition-colors shadow-sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add account
                </button>
            </div>

            <div className="flex-1 overflow-y-auto">
                <div className="mb-6">
                    <div className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">FEATURES</div>
                    {features.map(item => <MenuItem key={item.id} item={item} />)}
                </div>

                <div className="mb-6">
                    <div className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">TEMPLATE</div>
                    {templates.map(item => <MenuItem key={item.id} item={item} />)}
                </div>

                <div className="mb-6">
                    <div className="px-6 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">CONTACT</div>
                    {contacts.map(item => <MenuItem key={item.id} item={item} />)}
                </div>
            </div>
        </div>
    );
};

export default SubSidebar;
