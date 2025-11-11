import React, { useState, useEffect } from 'react';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useMedia } from '@/hooks/useMedia';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, X, Image, Video, FileText, Music, RefreshCw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Button {
  text: string;
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  url?: string;
  phone_number?: string;
  sample?: string;
}

interface CreateTemplateFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

const CreateTemplateForm: React.FC<CreateTemplateFormProps> = ({ onSuccess, onCancel }) => {
  const { client, isLoading: clientLoading, getOriginalClientCredentials } = useClientAuth();
  const { media, isLoading: mediaLoading, syncMediaWithDatabase } = useMedia();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNameError, setTemplateNameError] = useState<string>('');
  const [duplicateCheckTimeout, setDuplicateCheckTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (duplicateCheckTimeout) {
        clearTimeout(duplicateCheckTimeout);
      }
    };
  }, [duplicateCheckTimeout]);


  // Form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [language, setLanguage] = useState('en');
  const [category, setCategory] = useState('MARKETING');
  const [msgType, setMsgType] = useState('text');
  const [header, setHeader] = useState('');
  const [body, setBody] = useState('');
  const [footer, setFooter] = useState('');
  const [headerSample, setHeaderSample] = useState('');
  const [bodySample, setBodySample] = useState('');
  const [mediaType, setMediaType] = useState('image');
  const [headerFileUrl, setHeaderFileUrl] = useState('');
  const [selectedMediaId, setSelectedMediaId] = useState('');
  const [showMediaSelector, setShowMediaSelector] = useState(false);

  // Buttons state
  const [buttons, setButtons] = useState<Button[]>([]);
  const [showButtons, setShowButtons] = useState(false);

  // Duplicate check function
  const checkTemplateNameDuplicate = async (name: string) => {
    if (!name.trim() || !client) {
      setTemplateNameError('');
      return;
    }

    // Validate template name format (alphanumeric, underscore, hyphen only)
    const validNamePattern = /^[a-zA-Z0-9_-]+$/;
    if (!validNamePattern.test(name.trim())) {
      setTemplateNameError('Template name can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('templates')
        .select('id')
        .eq('template_name', name.trim())
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking template name:', error);
        setTemplateNameError('Error checking template name. Please try again.');
        return;
      }

      if (data) {
        setTemplateNameError('A template with this name already exists');
      } else {
        setTemplateNameError('');
      }
    } catch (error) {
      console.error('Error checking template name:', error);
      setTemplateNameError('Error checking template name. Please try again.');
    }
  };

  const handleAddButton = () => {
    if (buttons.length >= 3) {
      toast.error('Maximum 3 buttons allowed');
      return;
    }
    setButtons([...buttons, { text: '', type: 'QUICK_REPLY' }]);
  };

  const handleRemoveButton = (index: number) => {
    setButtons(buttons.filter((_, i) => i !== index));
  };

  const handleButtonChange = (index: number, field: keyof Button, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = { ...newButtons[index], [field]: value };
    setButtons(newButtons);
  };

  // Media handling functions
  const getMediaByType = (type: string) => {
    return media.filter(item => item.media_type === type);
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="h-4 w-4" />;
      case 'video':
        return <Video className="h-4 w-4" />;
      case 'doc':
        return <FileText className="h-4 w-4" />;
      case 'audio':
        return <Music className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const handleMediaSelect = async (mediaId: string) => {
    const selectedMedia = media.find(item => item.media_id === mediaId);
    if (selectedMedia) {
      // Get original client credentials for media URL
      const originalCredentials = await getOriginalClientCredentials();
      if (!originalCredentials) {
        toast.error('Unable to fetch client credentials');
        return;
      }

      const mediaUrl = `https://theultimate.io/WAApi/media/download?userid=${originalCredentials.user_id}&mediaId=${mediaId}`;
      
      setSelectedMediaId(mediaId);
      setHeaderFileUrl(mediaUrl);
      setShowMediaSelector(false);
      toast.success(`Selected media: ${selectedMedia.name}`);
    }
  };

  const handleRefreshMedia = async () => {
    try {
      await syncMediaWithDatabase();
      toast.success('Media refreshed successfully');
    } catch (error) {
      toast.error('Failed to refresh media');
    }
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    if (!client?.whatsapp_api_key || !client?.user_id || !client?.whatsapp_number) {
      setError('Missing API credentials. Please contact your administrator.');
      return;
    }

    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (!body.trim()) {
      setError('Template body is required');
      return;
    }

    // Validate buttons
    if (showButtons && buttons.length > 0) {
      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        if (!button.text.trim()) {
          setError(`Button ${i + 1} text is required`);
          return;
        }
        if (button.type === 'URL' && !button.url?.trim()) {
          setError(`Button ${i + 1} URL is required`);
          return;
        }
        if (button.type === 'PHONE_NUMBER' && !button.phone_number?.trim()) {
          setError(`Button ${i + 1} phone number is required`);
          return;
        }
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const requestBody: any = {
        userId: client.user_id,
        apiKey: client.whatsapp_api_key,
        password: client.password,
        wabaNumber: client.whatsapp_number,
        templateName: templateName.trim(),
        templateDescription: templateDescription.trim(),
        language,
        category,
        msgType,
        body: body.trim()
      };

      // Add optional fields
      if (header.trim()) requestBody.header = header.trim();
      if (footer.trim()) requestBody.footer = footer.trim();
      if (headerSample.trim()) requestBody.headerSample = headerSample.trim();
      if (bodySample.trim()) requestBody.bodySample = bodySample.trim();

      // Add media fields
      if (msgType === 'media') {
        requestBody.mediaType = mediaType;
        
        
        // Validate headerFile URL for media templates
        if (!headerFileUrl.trim()) {
          setError('Media file URL is required for media templates. Please provide a valid image, video, document, or audio URL.');
          setIsLoading(false);
          return;
        }

        requestBody.headerSampleFile = headerFileUrl.trim();
      }

      // Add buttons
      if (showButtons && buttons.length > 0) {
        requestBody.buttons = buttons;
      }


      const response = await fetch('http://localhost:3001/api/create-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('API Error Response:', data);
        throw new Error(data.error || data.details || 'Failed to create template');
      }

      if (data.success) {
        toast.success('Template created successfully!');
        onSuccess?.();
      } else {
        console.error('API Success but with error:', data);
        throw new Error(data.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setError(error instanceof Error ? error.message : 'Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };



  if (clientLoading) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading client data...</span>
        </CardContent>
      </Card>
    );
  }

  if (!client) {
    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Alert variant="destructive">
            <AlertDescription>Failed to load client data. Please refresh the page.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>Create New Template</CardTitle>
        <CardDescription>
          Create a WhatsApp Business template with text, media, and interactive buttons
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="templateName">Template Name *</Label>
              <Input
                id="templateName"
                value={templateName}
                onChange={(e) => {
                  setTemplateName(e.target.value);
                  
                  // Clear previous timeout
                  if (duplicateCheckTimeout) {
                    clearTimeout(duplicateCheckTimeout);
                  }
                  
                  // Set new timeout for duplicate check
                  const timeout = setTimeout(() => {
                    checkTemplateNameDuplicate(e.target.value);
                  }, 300);
                  
                  setDuplicateCheckTimeout(timeout);
                }}
                placeholder="e.g., welcome_message"
                required
                className={templateNameError ? 'border-red-500' : ''}
              />
              {templateNameError && (
                <p className="text-sm text-red-500">{templateNameError}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="templateDescription">Description</Label>
              <Input
                id="templateDescription"
                value={templateDescription}
                onChange={(e) => setTemplateDescription(e.target.value)}
                placeholder="Brief description of the template"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">Hindi</SelectItem>
                  <SelectItem value="mr">Marathi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MARKETING">Marketing</SelectItem>
                  <SelectItem value="UTILITY">Utility</SelectItem>
                  <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  <SelectItem value="ACCOUNT_UPDATE">Account Update</SelectItem>
                  <SelectItem value="ISSUE_RESOLUTION">Issue Resolution</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="msgType">Message Type</Label>
              <Select value={msgType} onValueChange={setMsgType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="media">Media</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Template Content */}
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="media">Media</TabsTrigger>
              <TabsTrigger value="buttons">Buttons</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="header">Header (Optional)</Label>
                <Input
                  id="header"
                  value={header}
                  onChange={(e) => setHeader(e.target.value)}
                  placeholder="Template header text"
                />
                <p className="text-sm text-muted-foreground">
                  Use {'{{1}}'}, {'{{2}}'}, etc. for variables
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="body">Body *</Label>
                <Textarea
                  id="body"
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Main message content"
                  rows={4}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Use {'{{1}}'}, {'{{2}}'}, etc. for variables
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="footer">Footer (Optional)</Label>
                <Input
                  id="footer"
                  value={footer}
                  onChange={(e) => setFooter(e.target.value)}
                  placeholder="Template footer text"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headerSample">Header Sample</Label>
                  <Input
                    id="headerSample"
                    value={headerSample}
                    onChange={(e) => setHeaderSample(e.target.value)}
                    placeholder="Sample values for header variables"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bodySample">Body Sample</Label>
                  <Input
                    id="bodySample"
                    value={bodySample}
                    onChange={(e) => setBodySample(e.target.value)}
                    placeholder="Sample values for body variables"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="media" className="space-y-4">
              {msgType === 'media' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="mediaType">Media Type</Label>
                    <Select value={mediaType} onValueChange={setMediaType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="image">Image</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                        <SelectItem value="document">Document</SelectItem>
                        <SelectItem value="audio">Audio</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Media Selection Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Select Media File</Label>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setShowMediaSelector(!showMediaSelector)}
                        >
                          {showMediaSelector ? 'Hide Media' : 'Browse Media'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleRefreshMedia}
                          disabled={mediaLoading}
                        >
                          <RefreshCw className={`h-4 w-4 ${mediaLoading ? 'animate-spin' : ''}`} />
                        </Button>
                      </div>
                    </div>

                    {showMediaSelector && (
                      <Card className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium">Available Media Files</h4>
                            <Badge variant="secondary">
                              {getMediaByType(mediaType === 'document' ? 'doc' : mediaType).length} files
                            </Badge>
                          </div>
                          
                          {mediaLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2 className="h-6 w-6 animate-spin" />
                              <span className="ml-2">Loading media...</span>
                            </div>
                          ) : getMediaByType(mediaType === 'document' ? 'doc' : mediaType).length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <FileText className="h-12 w-12 mx-auto mb-2" />
                              <p>No {mediaType} files found</p>
                              <p className="text-sm">Upload media files to your WhatsApp Business account first</p>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                              {getMediaByType(mediaType === 'document' ? 'doc' : mediaType).map((mediaItem) => (
                                <div
                                  key={mediaItem.media_id}
                                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                                    selectedMediaId === mediaItem.media_id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                                  }`}
                                  onClick={() => handleMediaSelect(mediaItem.media_id)}
                                >
                                  <div className="flex items-center gap-3">
                                    {getMediaIcon(mediaItem.media_type)}
                                    <div>
                                      <p className="font-medium text-sm">{mediaItem.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {mediaItem.description || 'No description'}
                                      </p>
                                    </div>
                                  </div>
                                  <Badge variant={selectedMediaId === mediaItem.media_id ? 'default' : 'secondary'}>
                                    {selectedMediaId === mediaItem.media_id ? 'Selected' : 'Select'}
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </Card>
                    )}

                    {/* Manual URL Input */}
                    <div className="space-y-2">
                      <Label htmlFor="headerFileUrl">Media File URL *</Label>
                      <div className="flex items-center gap-2">
                        <Input
                          id="headerFileUrl"
                          value={headerFileUrl}
                          onChange={(e) => setHeaderFileUrl(e.target.value)}
                          placeholder="https://example.com/your-media-file.jpg"
                          required
                          className={selectedMediaId ? 'border-green-500' : ''}
                        />
                        {selectedMediaId && (
                          <Badge variant="default" className="bg-green-500">
                            <Check className="h-3 w-3 mr-1" />
                            Selected
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {selectedMediaId ? 
                          'Media file selected from your WhatsApp Business account' : 
                          'Provide a publicly accessible URL for your media file (image, video, document, or audio). The file must be accessible via HTTP/HTTPS.'
                        }
                      </p>
                      {selectedMediaId && (
                        <p className="text-sm text-green-600 font-medium">
                          ✓ Media file URL automatically generated from your selection
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="buttons" className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="showButtons"
                  checked={showButtons}
                  onCheckedChange={setShowButtons}
                />
                <Label htmlFor="showButtons">Add Interactive Buttons</Label>
              </div>

              {showButtons && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Buttons (Max 3)</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddButton}
                      disabled={buttons.length >= 3}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Button
                    </Button>
                  </div>

                  {buttons.map((button, index) => (
                    <Card key={index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <Badge variant="secondary">Button {index + 1}</Badge>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveButton(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Button Text *</Label>
                          <Input
                            value={button.text}
                            onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                            placeholder="Button text"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Button Type</Label>
                          <Select
                            value={button.type}
                            onValueChange={(value) => handleButtonChange(index, 'type', value as any)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="QUICK_REPLY">Quick Reply</SelectItem>
                              <SelectItem value="URL">URL</SelectItem>
                              <SelectItem value="PHONE_NUMBER">Phone Number</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {button.type === 'URL' && (
                          <div className="space-y-2">
                            <Label>URL *</Label>
                            <Input
                              value={button.url || ''}
                              onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                              placeholder="https://example.com"
                              required
                            />
                            <Input
                              value={button.sample || ''}
                              onChange={(e) => handleButtonChange(index, 'sample', e.target.value)}
                              placeholder="Sample URL (optional)"
                            />
                          </div>
                        )}

                        {button.type === 'PHONE_NUMBER' && (
                          <div className="space-y-2">
                            <Label>Phone Number *</Label>
                            <Input
                              value={button.phone_number || ''}
                              onChange={(e) => handleButtonChange(index, 'phone_number', e.target.value)}
                              placeholder="+1234567890"
                              required
                            />
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !!templateNameError}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Template
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default CreateTemplateForm;
