import React, { useState, useMemo } from 'react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminTemplates } from '@/hooks/useAdminTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, RefreshCw, Search, MessageSquare, FileText, Image, Video, Music, Calendar, Clock, Globe, Tag, Plus, Trash2, User, Building2, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AdminCreateTemplateForm from '@/components/AdminCreateTemplateForm';



const AdminTemplateManagement: React.FC = () => {
  const { admin } = useAdminAuth();
  const { 
    templates, 
    clients, 
    isLoading, 
    error, 
    syncAllTemplates, 
    deleteTemplate 
  } = useAdminTemplates();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);



  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_header?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_footer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.client?.organization_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by client
    if (selectedClient !== 'all') {
      filtered = filtered.filter(item => item.user_id === selectedClient);
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    // Filter by language
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter(item => item.language === selectedLanguage);
    }

    // Filter by media type
    if (selectedMediaType !== 'all') {
      filtered = filtered.filter(item => item.media_type === selectedMediaType);
    }

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(item => item.whatsapp_status === selectedStatus);
    }

    return filtered;
  }, [templates, searchTerm, selectedClient, selectedCategory, selectedLanguage, selectedMediaType, selectedStatus]);

  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'media':
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getLanguageName = (code: string) => {
    switch (code) {
      case 'en':
        return 'English';
      case 'mr':
        return 'Marathi';
      case 'hi':
        return 'Hindi';
      default:
        return code.toUpperCase();
    }
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
  };

  const handleDeleteTemplate = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete the template "${template.template_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteTemplate(template);
      toast.success(`Template "${template.template_name}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template. Please try again.');
    }
  };

  const handleSyncTemplates = async () => {
    try {
      await syncAllTemplates();
      toast.success('Templates synced successfully');
    } catch (error) {
      console.error('Error syncing templates:', error);
      toast.error('Failed to sync templates');
    }
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>Access denied. Admin privileges required.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showCreateForm ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold">Create New Template</h1>
            <Button
              onClick={() => setShowCreateForm(false)}
              variant="outline"
              size="sm"
            >
              Back to Templates
            </Button>
          </div>
          <AdminCreateTemplateForm
            onSuccess={() => {
              setShowCreateForm(false);
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Admin Template Management</h1>
              <p className="text-muted-foreground">
                Manage WhatsApp message templates for all clients
              </p>
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowCreateForm(true)}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Template
              </Button>
              <Button onClick={handleSyncTemplates} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                {isLoading ? 'Syncing...' : 'Sync All Templates'}
              </Button>
            </div>
          </div>

      {/* Status Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span>Total Templates: {templates.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>Active Clients: {clients.length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Approved: {templates.filter(t => t.whatsapp_status === 'APPROVED').length}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-yellow-500" />
              <span>Pending: {templates.filter(t => t.whatsapp_status === 'PENDING').length}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates by name, content, or client..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={selectedClient} onValueChange={setSelectedClient}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by client" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.user_id}>
                {client.organization_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="MARKETING">Marketing</SelectItem>
            <SelectItem value="UTILITY">Utility</SelectItem>
            <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Languages</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="mr">Marathi</SelectItem>
            <SelectItem value="hi">Hindi</SelectItem>
          </SelectContent>
        </Select>
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="APPROVED">Approved</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="REJECTED">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({filteredTemplates.filter(t => t.category === 'MARKETING').length})</TabsTrigger>
          <TabsTrigger value="utility">Utility ({filteredTemplates.filter(t => t.category === 'UTILITY').length})</TabsTrigger>
          <TabsTrigger value="authentication">Authentication ({filteredTemplates.filter(t => t.category === 'AUTHENTICATION').length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplateGrid templates={filteredTemplates} onDeleteTemplate={handleDeleteTemplate} />
        </TabsContent>
        <TabsContent value="marketing" className="space-y-4">
          <TemplateGrid templates={filteredTemplates.filter(t => t.category === 'MARKETING')} onDeleteTemplate={handleDeleteTemplate} />
        </TabsContent>
        <TabsContent value="utility" className="space-y-4">
          <TemplateGrid templates={filteredTemplates.filter(t => t.category === 'UTILITY')} onDeleteTemplate={handleDeleteTemplate} />
        </TabsContent>
        <TabsContent value="authentication" className="space-y-4">
          <TemplateGrid templates={filteredTemplates.filter(t => t.category === 'AUTHENTICATION')} onDeleteTemplate={handleDeleteTemplate} />
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredTemplates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedClient !== 'all' || selectedCategory !== 'all' || selectedLanguage !== 'all' || selectedStatus !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'No templates have been created yet.'}
            </p>
          </CardContent>
        </Card>
      )}
        </>
      )}
    </div>
  );
};

interface TemplateGridProps {
  templates: any[];
  onDeleteTemplate: (template: any) => void;
}

const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, onDeleteTemplate }) => {
  const getMediaTypeIcon = (type: string) => {
    switch (type) {
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'media':
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDate = (timestamp: number) => {
    return format(new Date(timestamp), 'MMM dd, yyyy HH:mm');
  };

  const getLanguageName = (code: string) => {
    switch (code) {
      case 'en':
        return 'English';
      case 'mr':
        return 'Marathi';
      case 'hi':
        return 'Hindi';
      default:
        return code.toUpperCase();
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {templates.map((template) => (
        <Card key={template.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {getMediaTypeIcon(template.media_type)}
                <Badge 
                  variant="outline" 
                  className={
                    template.whatsapp_status === 'APPROVED' || template.whatsapp_status === 'enabled' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : template.whatsapp_status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : template.whatsapp_status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }
                >
                  {template.whatsapp_status}
                </Badge>
                <Badge 
                  variant="outline" 
                  className={
                    template.system_status === 'APPROVED' || template.system_status === 'enabled' 
                      ? 'bg-green-100 text-green-800 border-green-200' 
                      : template.system_status === 'PENDING'
                      ? 'bg-yellow-100 text-yellow-800 border-yellow-200'
                      : template.system_status === 'REJECTED'
                      ? 'bg-red-100 text-red-800 border-red-200'
                      : 'bg-gray-100 text-gray-800 border-gray-200'
                  }
                >
                  {template.system_status}
                </Badge>
              </div>
              <Badge variant="outline" className="text-xs">
                {template.media_type}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h3 className="font-semibold text-lg mb-1">{template.template_name}</h3>
              {template.client && (
                <div className="flex items-center space-x-1 text-sm text-muted-foreground mb-2">
                  <User className="h-3 w-3" />
                  <span>{template.client.organization_name}</span>
                </div>
              )}
            </div>
            
            {template.template_header && (
              <div className="text-sm">
                <span className="font-medium">Header:</span> {template.template_header}
              </div>
            )}
            
            {template.template_body && (
              <div className="text-sm">
                <span className="font-medium">Body:</span> {template.template_body}
              </div>
            )}
            
            {template.template_footer && (
              <div className="text-sm">
                <span className="font-medium">Footer:</span> {template.template_footer}
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center space-x-2">
                <Globe className="h-3 w-3" />
                <span>{getLanguageName(template.language)}</span>
                <Tag className="h-3 w-3" />
                <span>{template.category}</span>
              </div>
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Created: {formatDate(template.creation_time)}</span>
              </div>
            </div>
            
            {/* Delete Button */}
            <div className="pt-2 border-t flex justify-end">
              <Button
                onClick={() => onDeleteTemplate(template)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                title="Delete template"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminTemplateManagement;
