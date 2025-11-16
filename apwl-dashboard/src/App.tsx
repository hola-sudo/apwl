import { useState } from 'react';
import { AuthGuard } from './components/auth/AuthGuard';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardStats } from './components/dashboard/DashboardStats';
import { ClientsList } from './components/clients/ClientsList';
import { useAuth } from './hooks/useAuth';

function App() {
  const [currentPage, setCurrentPage] = useState('dashboard');
  const { logout } = useAuth();

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-gray-600">Welcome to APWL Admin Panel</p>
            </div>
            <DashboardStats />
          </div>
        );
      case 'clients':
        return <ClientsList />;
      case 'agents':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Agents</h2>
            <p className="text-gray-600 mt-2">Agents management coming soon...</p>
          </div>
        );
      case 'templates':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Templates</h2>
            <p className="text-gray-600 mt-2">Template management coming soon...</p>
          </div>
        );
      case 'settings':
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
            <p className="text-gray-600 mt-2">Settings panel coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-gray-900">Page Not Found</h2>
            <p className="text-gray-600 mt-2">The requested page could not be found.</p>
          </div>
        );
    }
  };

  return (
    <AuthGuard>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar 
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          onLogout={logout}
        />
        <main className="flex-1 p-8">
          {renderCurrentPage()}
        </main>
      </div>
    </AuthGuard>
  );
}

export default App;
