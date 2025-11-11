import { ReactNode } from 'react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useLocation } from 'react-router-dom';

interface DashboardLayoutProps {
  children: ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { admin, isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const { client, isAuthenticated: isClientAuthenticated } = useClientAuth();
  const location = useLocation();
  
  // Determine user type based on authentication state and current route
  const isAdminRoute = location.pathname.startsWith('/admin') || location.pathname === '/users';
  
  // More explicit user type detection
  let isAdmin = false;
  let isClient = false;
  
  if (isAdminRoute && isAdminAuthenticated && admin) {
    isAdmin = true;
  } else if (!isAdminRoute && isClientAuthenticated && client) {
    isClient = true;
  }
  
  // Fallback: if we're on a client route and have client auth, show client interface
  if (!isAdmin && !isClient && isClientAuthenticated && client) {
    isClient = true;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          {/* Mobile Header */}
          <header className="lg:hidden h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="flex items-center justify-between px-4 h-full">
              <div className="flex items-center gap-4">
                <SidebarTrigger />
                <h1 className="text-lg font-semibold">
                  {isAdmin ? 'Admin Portal' : 'WhatsApp Hub'}
                </h1>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-8">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;