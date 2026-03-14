import Sidebar from '@/components/layout/Sidebar';
import DashboardTopBar from '@/components/layout/DashboardTopBar';

export const metadata = { title: 'Dashboard — ScorX' };

export default function DashboardLayout({ children }) {
  return (
    <div className="flex h-screen overflow-hidden bg-dark-400">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <DashboardTopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
