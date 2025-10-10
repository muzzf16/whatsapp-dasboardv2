import { Home, Users, Settings, BotMessageSquare, Circle, Send, FileText } from 'lucide-react';

const statusColorMap = {
  connected: 'text-green-500',
  disconnected: 'text-red-500',
  connecting: 'text-yellow-500',
  'waiting for QR scan': 'text-blue-500',
  'logged out': 'text-gray-500',
};

export default function Sidebar({ view, setView, sessions, currentConnectionId, handleSelectSession }) {
  return (
    <aside className="w-72 bg-gray-50 p-4 border-r border-gray-200 flex flex-col">
      <div className="text-2xl font-bold text-blue-600 mb-8 flex items-center gap-2">
        <BotMessageSquare size={32} />
        <span>WA-Dash</span>
      </div>
      
      <nav className="flex-grow">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Menu</h3>
        <ul>
          <li className="mb-4">
            <a href="#" onClick={() => setView('sessions')} className={`flex items-center p-2 rounded-lg font-medium ${view === 'sessions' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Users className="mr-3" />
              <span>Manajemen Sesi</span>
            </a>
          </li>
          <li className="mb-4">
            <a href="#" onClick={() => setView('campaign')} className={`flex items-center p-2 rounded-lg font-medium ${view === 'campaign' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <Send className="mr-3" />
              <span>Campaign</span>
            </a>
          </li>
          <li className="mb-4">
            <a href="#" onClick={() => setView('templates')} className={`flex items-center p-2 rounded-lg font-medium ${view === 'templates' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
              <FileText className="mr-3" />
              <span>Templates</span>
            </a>
          </li>
          {/* You can add other main menu items here, e.g., Settings */}
        </ul>

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-6 mb-2">Sesi Aktif</h3>
        <ul className="space-y-2">
          {sessions.map(session => (
            <li key={session.id}>
              <a 
                href="#" 
                onClick={() => handleSelectSession(session.id)} 
                className={`flex items-center p-2 rounded-lg font-medium ${currentConnectionId === session.id && view === 'dashboard' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
                <Circle size={8} className={`mr-3 ${statusColorMap[session.status] || 'text-gray-400'}`} fill="currentColor" />
                <span className="truncate">{session.id}</span>
              </a>
            </li>
          ))}
          {sessions.length === 0 && (
            <p className="text-sm text-gray-500 p-2">Tidak ada sesi.</p>
          )}
        </ul>
      </nav>

      <div>
        <a href="#" onClick={() => setView('settings')} className={`flex items-center p-2 rounded-lg font-medium ${view === 'settings' ? 'bg-blue-100 text-blue-600' : 'text-gray-600 hover:bg-gray-100'}`}>
          <Settings className="mr-3" />
          <span>Pengaturan</span>
        </a>
      </div>
    </aside>
  );
}