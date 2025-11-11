import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import AddClientForm from '@/components/AddClientForm';
import { 
  Building2, 
  Plus,
  Search,
  Eye,
  Trash2,
  Users,
  MessageSquare,
  FileText,
  Image,
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  CreditCard
} from 'lucide-react';

interface Client {
  id: string;
  org_id: string;
  business_name: string;
  email: string;
  phone_no: string;
  wt_business_no: string;
  api_key: string;
  user_id: string;
  password: string;
  is_active: boolean;
  subscription_plan: string;
  subscription_start_date: string;
  subscription_end_date: string;
  max_users: number;
  max_contacts: number;
  max_campaigns: number;
  created_at: string;
  updated_at: string;
}

interface ClientStats {
  client_id: string;
  user_count: number;
  contact_count: number;
  campaign_count: number;
  template_count: number;
  media_count: number;
}

export default function ClientManagement() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [clientStats, setClientStats] = useState<Record<string, ClientStats>>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddClient, setShowAddClient] = useState(false);
  const [deletingClient, setDeletingClient] = useState<string | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClients(data || []);

      // Fetch stats for all clients
      await fetchClientStats(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientStats = async (clientsData: Client[]) => {
    try {
      const stats: Record<string, ClientStats> = {};
      
      for (const client of clientsData) {
        // Get client users for this client
        const { data: users, error: usersError } = await supabase
          .from('client_users')
          .select('id')
          .eq('client_id', client.id);

        if (usersError) {
          console.error('Error fetching users for client:', client.id, usersError);
          continue;
        }

        const userIds = users?.map(u => u.id) || [];

        // Fetch counts for each type of data
        const [contactsResult, campaignsResult, templatesResult, mediaResult] = await Promise.all([
          supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .in('client_id', userIds),
          supabase
            .from('campaigns')
            .select('id', { count: 'exact', head: true })
            .in('client_id', userIds),
          supabase
            .from('templates')
            .select('id', { count: 'exact', head: true })
            .in('client_id', userIds),
          supabase
            .from('media')
            .select('id', { count: 'exact', head: true })
            .in('client_id', userIds)
        ]);

        stats[client.id] = {
          client_id: client.id,
          user_count: userIds.length,
          contact_count: contactsResult.count || 0,
          campaign_count: campaignsResult.count || 0,
          template_count: templatesResult.count || 0,
          media_count: mediaResult.count || 0
        };
      }

      setClientStats(stats);
    } catch (error) {
      console.error('Error fetching client stats:', error);
    }
  };

  const handleDeleteClient = async (clientId: string) => {
    try {
      setDeletingClient(clientId);
      
      // First, delete related client users
      await supabase
        .from('client_users')
        .delete()
        .eq('client_id', clientId);

      // Then delete the client
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', clientId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client deleted successfully"
      });

      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      toast({
        title: "Error",
        description: "Failed to delete client",
        variant: "destructive"
      });
    } finally {
      setDeletingClient(null);
    }
  };

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

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
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/admin/dashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Client Management
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage all client organizations
            </p>
          </div>
        </div>
        
        <Dialog open={showAddClient} onOpenChange={setShowAddClient}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
              <DialogDescription>
                Create a new client organization with all necessary details
              </DialogDescription>
            </DialogHeader>
            <AddClientForm
              onSuccess={() => {
                setShowAddClient(false);
                fetchClients();
              }}
              onCancel={() => setShowAddClient(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search clients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => (
          <Card key={client.id} className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    {client.business_name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    ID: {client.user_id}
                  </p>
                </div>
                <Badge className={client.is_active ? 'bg-green-500/20 text-green-700' : 'bg-red-500/20 text-red-700'}>
                  {client.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
              {/* Contact Info */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{client.email}</span>
                </div>
                {client.phone_no && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{client.phone_no}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Created: {new Date(client.created_at).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Subscription Info */}
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <Badge variant="outline">{client.subscription_plan}</Badge>
              </div>

              {/* Actual Stats */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-medium text-blue-600">
                    {clientStats[client.id]?.user_count || 0}
                  </div>
                  <div className="text-muted-foreground">Users</div>
                </div>
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-medium text-green-600">
                    {clientStats[client.id]?.contact_count || 0}
                  </div>
                  <div className="text-muted-foreground">Contacts</div>
                </div>
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-medium text-purple-600">
                    {clientStats[client.id]?.campaign_count || 0}
                  </div>
                  <div className="text-muted-foreground">Campaigns</div>
                </div>
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-medium text-orange-600">
                    {clientStats[client.id]?.template_count || 0}
                  </div>
                  <div className="text-muted-foreground">Templates</div>
                </div>
              </div>
              
              {/* Media Count */}
              <div className="text-center p-2 bg-yellow-50 rounded">
                <div className="font-medium text-yellow-600">
                  {clientStats[client.id]?.media_count || 0}
                </div>
                <div className="text-muted-foreground text-xs">Media Files</div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => navigate(`/admin/client/${client.id}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={() => handleDeleteClient(client.id)}
                  disabled={deletingClient === client.id}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {filteredClients.length === 0 && !loading && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {searchTerm ? 'No clients match your search criteria.' : 'Get started by adding your first client.'}
            </p>
            {!searchTerm && (
              <Button onClick={() => setShowAddClient(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Client
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Summary */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{clients.length}</div>
              <div className="text-sm text-muted-foreground">Total Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {clients.filter(c => c.is_active).length}
              </div>
              <div className="text-sm text-muted-foreground">Active Clients</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {clients.filter(c => c.subscription_plan === 'premium').length}
              </div>
              <div className="text-sm text-muted-foreground">Premium Plans</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {clients.filter(c => c.subscription_plan === 'enterprise').length}
              </div>
              <div className="text-sm text-muted-foreground">Enterprise Plans</div>
            </div>
          </div>
          
          {/* Total Usage Stats */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="text-lg font-semibold mb-4 text-center">Total Usage Across All Clients</h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-600">
                  {Object.values(clientStats).reduce((sum, stats) => sum + stats.user_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Users</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">
                  {Object.values(clientStats).reduce((sum, stats) => sum + stats.contact_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Contacts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-600">
                  {Object.values(clientStats).reduce((sum, stats) => sum + stats.campaign_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Campaigns</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">
                  {Object.values(clientStats).reduce((sum, stats) => sum + stats.template_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Templates</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-600">
                  {Object.values(clientStats).reduce((sum, stats) => sum + stats.media_count, 0)}
                </div>
                <div className="text-sm text-muted-foreground">Total Media</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}