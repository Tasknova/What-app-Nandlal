import React, { useState, useMemo } from 'react';
import { useTemplates } from '@/hooks/useTemplates';
import { useClientAuth } from '@/hooks/useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, RefreshCw, Search, MessageSquare, FileText, Image, Video, Music, Calendar, Clock, Globe, Tag, Plus, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import CreateTemplateForm from '@/components/CreateTemplateForm';
import TemplateViewModal from '@/components/TemplateViewModal';
import { toast } from 'sonner';

const TemplateManagement: React.FC = () => {
  const { templates, isLoading, error, lastSync, syncTemplatesWithDatabase, getTemplatesByCategory, getTemplatesByLanguage, getTemplatesByMediaType } = useTemplates();
  const { client, session, getOriginalClientCredentials } = useClientAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedMediaType, setSelectedMediaType] = useState<string>('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  const filteredTemplates = useMemo(() => {
    let filtered = templates;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.template_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_body?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_header?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.template_footer?.toLowerCase().includes(searchTerm.toLowerCase())
      );
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

    return filtered;
  }, [templates, searchTerm, selectedCategory, selectedLanguage, selectedMediaType]);

  const templatesByCategory = {
    marketing: getTemplatesByCategory('MARKETING'),
    utility: getTemplatesByCategory('UTILITY'),
    authentication: getTemplatesByCategory('AUTHENTICATION')
  };

  const templatesByLanguage = {
    english: getTemplatesByLanguage('en'),
    marathi: getTemplatesByLanguage('mr'),
    hindi: getTemplatesByLanguage('hi')
  };

  const templatesByMediaType = {
    text: getTemplatesByMediaType('text'),
    media: getTemplatesByMediaType('media'),
    image: getTemplatesByMediaType('image'),
    video: getTemplatesByMediaType('video'),
    audio: getTemplatesByMediaType('audio')
  };

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

  const handleSyncTemplates = async () => {
    await syncTemplatesWithDatabase();
  };

  const handleDeleteTemplate = async (template) => {
    if (!client) {
      toast.error('Client data not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete the template "${template.template_name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Get original client credentials for API calls
      const originalCredentials = await getOriginalClientCredentials();
      if (!originalCredentials) {
        toast.error('Unable to fetch client credentials');
        return;
      }

      // Debug: Log the client data being sent
      console.log('🔍 Delete template request data:', {
        userId: originalCredentials.user_id,
        password: originalCredentials.password ? '***' + originalCredentials.password.slice(-4) : 'NOT_SET',
        wabaNumber: originalCredentials.whatsapp_number,
        templateName: template.template_name,
        language: template.language
      });

      const response = await fetch('/api/delete-template', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: originalCredentials.user_id, // Use original client's user_id
          password: originalCredentials.password, // Use original client's password
          wabaNumber: originalCredentials.whatsapp_number, // Use original client's WhatsApp number
          templateName: template.template_name,
          language: template.language
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(`Template "${template.template_name}" deleted successfully`);
        // Refresh templates after deletion
        await syncTemplatesWithDatabase();
      } else {
        console.error('Delete template error details:', data);
        const errorMessage = data.error || 'Failed to delete template';
        const details = data.details ? `\nDetails: ${data.details}` : '';
        const apiUrl = data.apiUrl ? `\nAPI URL: ${data.apiUrl}` : '';
        toast.error(`${errorMessage}${details}${apiUrl}`);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template. Please try again.');
    }
  };

  const handleViewTemplate = (template: any) => {
    setSelectedTemplate(template);
    setShowViewModal(true);
  };

  const handleCloseViewModal = () => {
    setShowViewModal(false);
    setSelectedTemplate(null);
  };

  const handleDeleteAllTemplates = async () => {
    if (!client) {
      toast.error('Client data not available');
      return;
    }

    if (!confirm(`Are you sure you want to delete ALL ${filteredTemplates.length} templates? This action cannot be undone.`)) {
      return;
    }

    try {
      // Always fetch password from database to ensure we get the correct password field
      console.log('🔍 Fetching password from database...');
      const { data: clientData, error } = await supabase
        .from('client_users')
        .select('password')
        .eq('id', client.id)
        .single();
      
      if (error || !clientData) {
        toast.error('Failed to get client credentials');
        return;
      }
      
      // Get the actual password from the database
      const password = clientData.password;
      console.log('🔍 Using password from database');

      // Get the correct user_id - try different possible fields
      const userId = client.user_id || client.id || client.user_id_string;
      
      if (!userId) {
        toast.error('User ID not found in client data');
        return;
      }

      let deletedCount = 0;
      let failedCount = 0;

      for (const template of filteredTemplates) {
        try {
          const response = await fetch('/api/delete-template', {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              userId: userId,
              password: password,
              wabaNumber: client.whatsapp_number,
              templateName: template.template_name,
              language: template.language
            })
          });

          const data = await response.json();

          if (response.ok && data.success) {
            deletedCount++;
          } else {
            failedCount++;
            console.error(`Failed to delete template ${template.template_name}:`, data.error);
          }
        } catch (error) {
          failedCount++;
          console.error(`Error deleting template ${template.template_name}:`, error);
        }
      }

      // Refresh templates after bulk deletion
      await syncTemplatesWithDatabase();

      if (deletedCount > 0) {
        toast.success(`Successfully deleted ${deletedCount} templates`);
      }
      if (failedCount > 0) {
        toast.error(`Failed to delete ${failedCount} templates`);
      }
    } catch (error) {
      console.error('Error in bulk delete operation:', error);
      toast.error('Failed to complete bulk delete operation. Please try again.');
    }
  };

  if (!client) {
    return (
      <div className="flex items-center justify-center h-64">
        <Alert>
          <AlertDescription>Please log in to access template management.</AlertDescription>
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
          <CreateTemplateForm
            onSuccess={() => {
              setShowCreateForm(false);
              syncTemplatesWithDatabase();
            }}
            onCancel={() => setShowCreateForm(false)}
          />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="border-b pb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-gray-100 rounded-full">
                <FileText className="h-6 w-6 text-gray-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900">Template Management</h2>
            </div>
            <p className="text-gray-600 text-lg">
              Manage your WhatsApp message templates
            </p>
            <div className="flex space-x-2 mt-6">
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
                {isLoading ? 'Syncing...' : 'Sync Templates'}
              </Button>
              {filteredTemplates.length > 0 && (
                <Button 
                  onClick={handleDeleteAllTemplates} 
                  variant="destructive" 
                  size="sm"
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete All ({filteredTemplates.length})
                </Button>
              )}
            </div>
          </div>

      {/* Status Bar */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Total Templates: {templates.length}</span>
          <span>Marketing: {templatesByCategory.marketing.length}</span>
          <span>Utility: {templatesByCategory.utility.length}</span>
          <span>English: {templatesByLanguage.english.length}</span>
          <span>Marathi: {templatesByLanguage.marathi.length}</span>
        </div>
        {lastSync && (
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Last synced: {format(lastSync, 'MMM dd, yyyy HH:mm:ss')}</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search templates by name or content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
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
        <Select value={selectedMediaType} onValueChange={setSelectedMediaType}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by media type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="text">Text</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Templates Content */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Templates ({filteredTemplates.length})</TabsTrigger>
          <TabsTrigger value="marketing">Marketing ({templatesByCategory.marketing.length})</TabsTrigger>
          <TabsTrigger value="utility">Utility ({templatesByCategory.utility.length})</TabsTrigger>
          <TabsTrigger value="english">English ({templatesByLanguage.english.length})</TabsTrigger>
          <TabsTrigger value="marathi">Marathi ({templatesByLanguage.marathi.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <TemplateGrid templates={filteredTemplates} onDeleteTemplate={handleDeleteTemplate} onViewTemplate={handleViewTemplate} />
        </TabsContent>
        <TabsContent value="marketing" className="space-y-4">
          <TemplateGrid templates={templatesByCategory.marketing} onDeleteTemplate={handleDeleteTemplate} onViewTemplate={handleViewTemplate} />
        </TabsContent>
        <TabsContent value="utility" className="space-y-4">
          <TemplateGrid templates={templatesByCategory.utility} onDeleteTemplate={handleDeleteTemplate} onViewTemplate={handleViewTemplate} />
        </TabsContent>
        <TabsContent value="english" className="space-y-4">
          <TemplateGrid templates={templatesByLanguage.english} onDeleteTemplate={handleDeleteTemplate} onViewTemplate={handleViewTemplate} />
        </TabsContent>
        <TabsContent value="marathi" className="space-y-4">
          <TemplateGrid templates={templatesByLanguage.marathi} onDeleteTemplate={handleDeleteTemplate} onViewTemplate={handleViewTemplate} />
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {filteredTemplates.length === 0 && !isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No templates found</h3>
            <p className="text-muted-foreground text-center">
              {searchTerm || selectedCategory !== 'all' || selectedLanguage !== 'all' || selectedMediaType !== 'all'
                ? 'Try adjusting your filters to see more results.'
                : 'Your templates will appear here once synced.'}
            </p>
          </CardContent>
        </Card>
      )}
        </>
      )}

      {/* Template View Modal */}
      {showViewModal && (
        <TemplateViewModal
          template={selectedTemplate}
          onClose={handleCloseViewModal}
        />
      )}
    </div>
  );
};

interface TemplateGridProps {
  templates: any[];
  onDeleteTemplate: (template: any) => void;
  onViewTemplate: (template: any) => void;
}

const TemplateGrid: React.FC<TemplateGridProps> = ({ templates, onDeleteTemplate, onViewTemplate }) => {
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
              <h3 className="font-semibold text-sm truncate" title={template.template_name}>
                {template.template_name}
              </h3>
              <div className="flex items-center space-x-2 mt-1">
                <Globe className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{getLanguageName(template.language)}</span>
                <Tag className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{template.category}</span>
              </div>
            </div>
            
            {/* Template Content Preview */}
            <div className="space-y-2">
              {template.template_header && (
                <div className="text-xs text-muted-foreground">
                  <strong>Header:</strong> {template.template_header}
                </div>
              )}
              {template.template_body && (
                <div className="text-xs text-muted-foreground">
                  <strong>Body:</strong> {template.template_body.length > 100 
                    ? `${template.template_body.substring(0, 100)}...` 
                    : template.template_body}
                </div>
              )}
              {template.template_footer && (
                <div className="text-xs text-muted-foreground">
                  <strong>Footer:</strong> {template.template_footer}
                </div>
              )}
              {template.buttons1_title && (
                <div className="text-xs text-muted-foreground">
                  <strong>Button:</strong> {template.buttons1_title} ({template.buttons1_type})
                </div>
              )}
            </div>
            
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Calendar className="h-3 w-3" />
                <span>Created: {formatDate(template.creation_time)}</span>
              </div>
            </div>
            
                         {/* Action Buttons */}
             <div className="pt-2 border-t flex justify-end space-x-2">
               <Button
                 onClick={() => onViewTemplate(template)}
                 variant="ghost"
                 size="sm"
                 className="h-8 w-8 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                 title="View template details"
               >
                 <Eye className="h-4 w-4" />
               </Button>
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

export default TemplateManagement;