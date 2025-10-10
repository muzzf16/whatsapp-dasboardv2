import Sidebar from './Sidebar';
import Header from './Header';

export default function Layout({ children, view, setView, sessions, currentConnectionId, handleSelectSession }) {
  return (
    <div className="flex h-screen bg-white">
      <Sidebar 
        view={view} 
        setView={setView} 
        sessions={sessions}
        currentConnectionId={currentConnectionId}
        handleSelectSession={handleSelectSession}
      />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="flex-1 p-6 bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  );
}
