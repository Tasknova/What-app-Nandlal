import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Building2, 
  Users, 
  MessageSquare, 
  FileText, 
  Image, 
  BarChart3,
  Settings,
  LogOut,
  ArrowRight,
  TrendingUp,
  Activity,
  DollarSign
} from 'lucide-react';

interface DashboardStats {
  total_clients: number;
  active_clients: number;
  total_users: number;
  active_users: number;
  total_campaigns: number;
  total_messages: number;
  total_templates: number;
  total_media: number;
  total_contacts: number;
  total_contact_lists: number;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin, logout } = useAdminAuth();
  const [stats, setStats] = useState<DashboardStats>({
    total_clients: 0,
    active_clients: 0,
    total_users: 0,
    active_users: 0,
    total_campaigns: 0,
    total_messages: 0,
    total_templates: 0,
    total_media: 0,
    total_contacts: 0,
    total_contact_lists: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch various statistics
      const [
        { count: clientCount },
        { count: activeClientCount },
        { count: userCount },
        { count: activeUserCount },
        { count: campaignCount },
        { count: messageCount },
        { count: templateCount },
        { count: mediaCount },
        { count: contactCount },
        { count: contactListCount }
      ] = await Promise.all([
        supabase.from('clients').select('*', { count: 'exact', head: true }),
        supabase.from('clients').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('client_users').select('*', { count: 'exact', head: true }),
        supabase.from('client_users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('campaigns').select('*', { count: 'exact', head: true }),
        supabase.from('messages').select('*', { count: 'exact', head: true }),
        supabase.from('templates').select('*', { count: 'exact', head: true }),
        supabase.from('media').select('*', { count: 'exact', head: true }),
        supabase.from('contacts').select('*', { count: 'exact', head: true }),
        supabase.from('contact_lists').select('*', { count: 'exact', head: true })
      ]);

      setStats({
        total_clients: clientCount || 0,
        active_clients: activeClientCount || 0,
        total_users: userCount || 0,
        active_users: activeUserCount || 0,
        total_campaigns: campaignCount || 0,
        total_messages: messageCount || 0,
        total_templates: templateCount || 0,
        total_media: mediaCount || 0,
        total_contacts: contactCount || 0,
        total_contact_lists: contactListCount || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard statistics",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Welcome back, {admin?.full_name} ({admin?.role})
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={handleLogout}>
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/admin/clients')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Client Management</h3>
                <p className="text-sm text-muted-foreground">Manage all clients</p>
              </div>
              <ArrowRight className="h-5 w-5 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/admin/analytics')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Analytics</h3>
                <p className="text-sm text-muted-foreground">View detailed reports</p>
              </div>
              <BarChart3 className="h-5 w-5 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/admin/settings')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Settings</h3>
                <p className="text-sm text-muted-foreground">System configuration</p>
              </div>
              <Settings className="h-5 w-5 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-lg hover:shadow-xl transition-shadow cursor-pointer" onClick={() => navigate('/admin/templates')}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-lg">Template Management</h3>
                <p className="text-sm text-muted-foreground">Manage all templates</p>
              </div>
              <FileText className="h-5 w-5 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{stats.total_clients}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_clients} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.total_users}</div>
            <p className="text-xs text-muted-foreground">
              {stats.active_users} active
            </p>
          </CardContent>
        </Card>

        <Card className="border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Campaigns</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.total_campaigns}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_messages} messages sent
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Content</CardTitle>
            <FileText className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.total_templates}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_media} media files
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/10 to-orange-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.total_contacts}</div>
            <p className="text-xs text-muted-foreground">
              {stats.total_contact_lists} contact lists
            </p>
          </CardContent>
        </Card>

        <Card className="border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activity</CardTitle>
            <Activity className="h-4 w-4 text-cyan-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">{stats.total_messages}</div>
            <p className="text-xs text-muted-foreground">
              Total messages sent
            </p>
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Growth</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.active_clients}</div>
            <p className="text-xs text-muted-foreground">
              Active clients
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">System Overview</p>
                <p className="text-sm text-muted-foreground">All systems operational</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Just now
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">Client Management</p>
                <p className="text-sm text-muted-foreground">Ready to manage clients</p>
              </div>
              <div className="text-sm text-muted-foreground">
                Just now
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}