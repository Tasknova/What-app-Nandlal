import { MessageSquare, Send, Users, FileText, Settings, BarChart3, UserPlus, Shield, HelpCircle, LayoutTemplate, Workflow, Clock, Upload, Layers, Target, LogOut, User, Bell, ChevronRight, Image, FileBarChart } from "lucide-react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useClientAuth } from '@/hooks/useClientAuth';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

const clientItems = [
  { 
    title: "Dashboard", 
    url: "/", 
    icon: BarChart3
  },
  { 
    title: "Campaigns", 
    url: "/campaigns", 
    icon: Target
  },

  { 
    title: "Reports", 
    url: "/reports", 
    icon: FileBarChart
  },

  { 
    title: "Templates", 
    url: "/templates", 
    icon: LayoutTemplate
  },
  { 
    title: "Contacts", 
    url: "/contacts", 
    icon: Users
  },

  { 
    title: "Media", 
    url: "/media", 
    icon: Image
  },
  { 
    title: "Support", 
    url: "/support", 
    icon: HelpCircle
  },
  { 
    title: "Settings", 
    url: "/settings", 
    icon: Settings
  },
];

const adminItems = [
  { 
    title: "Admin Dashboard", 
    url: "/admin", 
    icon: Shield
  },
  { 
    title: "Client Management", 
    url: "/admin/clients", 
    icon: UserPlus
  },
  { 
    title: "Template Management", 
    url: "/admin/templates", 
    icon: LayoutTemplate
  },
  { 
    title: "Reports", 
    url: "/reports", 
    icon: FileBarChart
  },

  { 
    title: "User Management", 
    url: "/users", 
    icon: Users
  },
  { 
    title: "Support", 
    url: "/support", 
    icon: HelpCircle
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentPath = location.pathname;
  const { admin, signOut: adminLogout, isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const { client, signOut: clientLogout, isAuthenticated: isClientAuthenticated } = useClientAuth();

  // Determine user type based on authentication state and current route
  const isAdminRoute = currentPath.startsWith('/admin') || currentPath === '/users';
  
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

  const handleLogout = () => {
    if (isAdmin) {
      adminLogout();
    } else if (isClient) {
      clientLogout();
    }
    navigate('/auth');
  };

  const getUserInitials = () => {
    if (isAdmin && admin) {
      return admin.full_name ? admin.full_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A';
    }
    if (isClient && client) {
      return client.business_name ? client.business_name.split(' ').map(n => n[0]).join('').toUpperCase() : 'C';
    }
    return 'U';
  };

  const getUserName = () => {
    if (isAdmin && admin) {
      return admin.full_name || 'Admin User';
    }
    if (isClient && client) {
      return client.business_name || 'Client User';
    }
    return 'User';
  };

  const getUserEmail = () => {
    if (isAdmin && admin) {
      return admin.email || 'admin@example.com';
    }
    if (isClient && client) {
      return client.email || 'client@example.com';
    }
    return 'user@example.com';
  };

  const getUserRole = () => {
    if (isAdmin) return 'Administrator';
    if (isClient) return 'Client';
    return 'User';
  };

  return (
    <Sidebar className="border-r border-border/50 bg-gradient-to-br from-background via-background to-muted/30 shadow-xl w-64 min-w-64 h-screen flex flex-col">
      <SidebarHeader className="border-b border-border/50 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10 p-4 shadow-sm">
        <div className="flex items-center justify-center w-full">
          <img 
            src="/logo2.png" 
            alt="Tasknova Logo" 
            className="h-12 w-full object-contain"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="px-3 py-4 overflow-y-auto flex-1">
                 {/* User Profile Section */}
         <div className="mb-6 rounded-xl bg-gradient-to-r from-muted/60 via-muted/40 to-muted/60 p-4 border border-border/50 shadow-md hover:shadow-lg transition-all duration-300 backdrop-blur-sm">
          <div className="flex items-center space-x-3">
                         <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-md">
               <AvatarImage src="" />
               <AvatarFallback className="bg-gradient-to-br from-primary via-primary/90 to-primary/80 text-white font-bold text-sm shadow-inner">
                 {getUserInitials()}
               </AvatarFallback>
             </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {getUserName()}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {getUserEmail()}
              </p>
                             <Badge variant="secondary" className="mt-1 text-xs bg-primary/10 text-primary border-primary/20 font-medium">
                 {getUserRole()}
               </Badge>
            </div>
          </div>
        </div>

                 <SidebarGroup>
           <SidebarGroupLabel className="text-xs font-semibold text-muted-foreground/80 uppercase tracking-wider px-3 mb-3">
             {isAdmin ? 'Administration' : 'Navigation'}
           </SidebarGroupLabel>

          <SidebarGroupContent>
            <SidebarMenu>
              {(isClient ? clientItems : adminItems).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink 
                      to={item.url} 
                      end 
                                             className={({ isActive }) => 
                         `group relative flex items-center w-full px-3 py-2.5 rounded-lg transition-all duration-300 ${
                           isActive 
                             ? "bg-gradient-to-r from-primary/15 via-primary/10 to-primary/5 text-primary border border-primary/30 shadow-md" 
                             : "text-muted-foreground hover:bg-gradient-to-r hover:from-muted/60 hover:via-muted/40 hover:to-muted/60 hover:text-foreground hover:shadow-sm"
                         }`
                       }
                    >
                      <div className="flex items-center w-full">
                                                 <div className={`mr-3 p-1.5 rounded-md transition-all duration-300 ${
                           location.pathname === item.url 
                             ? "bg-primary/15 text-primary shadow-sm" 
                             : "bg-muted/60 text-muted-foreground group-hover:bg-muted/80 group-hover:text-foreground group-hover:shadow-sm"
                         }`}>
                          <item.icon className="h-4 w-4" />
                        </div>
                                                 <div className="flex-1 min-w-0">
                           <div className="flex items-center justify-between">
                             <span className="text-sm font-medium truncate">{item.title}</span>
                             {item.badge && (
                               <Badge variant="destructive" className="ml-2 text-xs px-1.5 py-0.5">
                                 {item.badge}
                               </Badge>
                             )}
                           </div>
                         </div>
                        <ChevronRight className="h-3 w-3 text-muted-foreground/50 ml-2 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        
      </SidebarContent>

             <SidebarFooter className="border-t border-border/50 bg-gradient-to-t from-muted/40 via-muted/20 to-muted/10 p-4 shadow-inner">
        <div className="space-y-2">
                     <Button 
             variant="ghost" 
             size="sm" 
             className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-300 rounded-lg"
             onClick={handleLogout}
           >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
          <div className="text-xs text-muted-foreground text-center">
            v1.0.0 • WhatsApp Hub
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}