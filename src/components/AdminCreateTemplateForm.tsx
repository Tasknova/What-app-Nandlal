import React, { useState, useEffect } from 'react';
import { useAdminTemplates } from '@/hooks/useAdminTemplates';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Button {
  text: string;
  type: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
  url?: string;
  phoneNumber?: string;
}

interface AdminCreateTemplateFormProps {
  onSuccess: () => void;
  onCancel: () => void;
  selectedClientId?: string; // Optional prop for when client is already selected
}

const AdminCreateTemplateForm: React.FC<AdminCreateTemplateFormProps> = ({ onSuccess, onCancel, selectedClientId }) => {
  const { clients, createTemplateForClient } = useAdminTemplates();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templateNameError, setTemplateNameError] = useState<string>('');

  // Form state
  const [clientId, setClientId] = useState(selectedClientId || '');
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

  // Buttons state
  const [buttons, setButtons] = useState<Button[]>([]);
  const [showButtons, setShowButtons] = useState(false);

  // Duplicate check function
  const checkTemplateNameDuplicate = async (name: string) => {
    if (!name.trim() || !clientId) {
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
        .eq('client_id', clientId)
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

  // Update clientId when selectedClientId prop changes
  useEffect(() => {
    if (selectedClientId) {
      setClientId(selectedClientId);
    }
  }, [selectedClientId]);

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

  const validateForm = () => {
    if (!clientId) {
      setError('Please select a client');
      return false;
    }
    if (!templateName.trim()) {
      setError('Template name is required');
      return false;
    }
    if (!body.trim()) {
      setError('Template body is required');
      return false;
    }
    if (msgType === 'media' && !headerFileUrl.trim()) {
      setError('Media URL is required for media templates');
      return false;
    }
    if (buttons.length > 0) {
      for (const button of buttons) {
        if (!button.text.trim()) {
          setError('All buttons must have text');
          return false;
        }
        if (button.type === 'URL' && !button.url?.trim()) {
          setError('URL buttons must have a URL');
          return false;
        }
        if (button.type === 'PHONE_NUMBER' && !button.phoneNumber?.trim()) {
          setError('Phone number buttons must have a phone number');
          return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setIsLoading(true);

      const templateData = {
        templateName: templateName.trim(),
        templateDescription: templateDescription.trim(),
        language,
        category,
        msgType,
        header: header.trim() || undefined,
        body: body.trim(),
        footer: footer.trim() || undefined,
        headerSample: headerSample.trim() || undefined,
        bodySample: bodySample.trim() || undefined,
        buttons: buttons.length > 0 ? buttons : undefined,
        mediaType: msgType === 'media' ? mediaType : undefined,
        headerSampleFile: headerFileUrl.trim() || undefined
      };

      await createTemplateForClient(clientId, templateData);
      
      toast.success('Template created successfully');
      onSuccess();
    } catch (error) {
      console.error('Error creating template:', error);
      setError(error instanceof Error ? error.message : 'Failed to create template');
      toast.error('Failed to create template');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setClientId(selectedClientId || '');
    setTemplateName('');
    setTemplateDescription('');
    setLanguage('en');
    setCategory('MARKETING');
    setMsgType('text');
    setHeader('');
    setBody('');
    setFooter('');
    setHeaderSample('');
    setBodySample('');
    setMediaType('image');
    setHeaderFileUrl('');
    setSelectedMediaId('');
    setButtons([]);
    setShowButtons(false);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Client Selection - Only show if no client is pre-selected */}
        {!selectedClientId && (
          <Card>
            <CardHeader>
              <CardTitle>Select Client</CardTitle>
              <CardDescription>
                Choose the client for which you want to create a template
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="client">Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.organization_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Template Details */}
        <Card>
          <CardHeader>
            <CardTitle>Template Details</CardTitle>
            <CardDescription>
              Configure the basic information for your WhatsApp template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="templateName">Template Name *</Label>
                <Input
                  id="templateName"
                  value={templateName}
                  onChange={(e) => {
                    setTemplateName(e.target.value);
                    // Debounce the duplicate check
                    setTimeout(() => checkTemplateNameDuplicate(e.target.value), 500);
                  }}
                  placeholder="Enter template name"
                  required
                  className={templateNameError ? 'border-red-500' : ''}
                />
                {templateNameError && (
                  <p className="text-sm text-red-500">{templateNameError}</p>
                )}
              </div>
              <div>
                <Label htmlFor="templateDescription">Description</Label>
                <Input
                  id="templateDescription"
                  value={templateDescription}
                  onChange={(e) => setTemplateDescription(e.target.value)}
                  placeholder="Enter template description"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="hi">Hindi</SelectItem>
                    <SelectItem value="mr">Marathi</SelectItem>
                    <SelectItem value="gu">Gujarati</SelectItem>
                    <SelectItem value="bn">Bengali</SelectItem>
                    <SelectItem value="ta">Tamil</SelectItem>
                    <SelectItem value="te">Telugu</SelectItem>
                    <SelectItem value="kn">Kannada</SelectItem>
                    <SelectItem value="ml">Malayalam</SelectItem>
                    <SelectItem value="pa">Punjabi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MARKETING">Marketing</SelectItem>
                    <SelectItem value="UTILITY">Utility</SelectItem>
                    <SelectItem value="AUTHENTICATION">Authentication</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
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
          </CardContent>
        </Card>

        {/* Template Content */}
        <Card>
          <CardHeader>
            <CardTitle>Template Content</CardTitle>
            <CardDescription>
              Define the content structure of your template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {msgType === 'media' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="mediaType">Media Type</Label>
                  <Select value={mediaType} onValueChange={setMediaType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="image">Image</SelectItem>
                      <SelectItem value="video">Video</SelectItem>
                      <SelectItem value="audio">Audio</SelectItem>
                      <SelectItem value="document">Document</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="headerFileUrl">Media URL *</Label>
                  <Input
                    id="headerFileUrl"
                    value={headerFileUrl}
                    onChange={(e) => setHeaderFileUrl(e.target.value)}
                    placeholder="Enter media file URL"
                    required={msgType === 'media'}
                  />
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="header">Header (Optional)</Label>
              <Input
                id="header"
                value={header}
                onChange={(e) => setHeader(e.target.value)}
                placeholder="Enter header text"
              />
            </div>

            <div>
              <Label htmlFor="body">Body *</Label>
              <Textarea
                id="body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Enter template body text"
                rows={4}
                required
              />
            </div>

            <div>
              <Label htmlFor="footer">Footer (Optional)</Label>
              <Input
                id="footer"
                value={footer}
                onChange={(e) => setFooter(e.target.value)}
                placeholder="Enter footer text"
              />
            </div>
          </CardContent>
        </Card>

        {/* Sample Values */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Values</CardTitle>
            <CardDescription>
              Provide sample values for testing your template
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="headerSample">Header Sample</Label>
              <Input
                id="headerSample"
                value={headerSample}
                onChange={(e) => setHeaderSample(e.target.value)}
                placeholder="Enter sample header value"
              />
            </div>
            <div>
              <Label htmlFor="bodySample">Body Sample</Label>
              <Input
                id="bodySample"
                value={bodySample}
                onChange={(e) => setBodySample(e.target.value)}
                placeholder="Enter sample body value"
              />
            </div>
          </CardContent>
        </Card>

        {/* Buttons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Interactive Buttons</CardTitle>
                <CardDescription>
                  Add up to 3 interactive buttons to your template
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowButtons(!showButtons)}
              >
                {showButtons ? 'Hide' : 'Show'} Buttons
              </Button>
            </div>
          </CardHeader>
          {showButtons && (
            <CardContent className="space-y-4">
              {buttons.map((button, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Button {index + 1}</h4>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveButton(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label>Button Text</Label>
                      <Input
                        value={button.text}
                        onChange={(e) => handleButtonChange(index, 'text', e.target.value)}
                        placeholder="Enter button text"
                      />
                    </div>
                    <div>
                      <Label>Button Type</Label>
                      <Select
                        value={button.type}
                        onValueChange={(value: 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER') =>
                          handleButtonChange(index, 'type', value)
                        }
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
                  </div>
                  {button.type === 'URL' && (
                    <div>
                      <Label>URL</Label>
                      <Input
                        value={button.url || ''}
                        onChange={(e) => handleButtonChange(index, 'url', e.target.value)}
                        placeholder="Enter URL"
                      />
                    </div>
                  )}
                  {button.type === 'PHONE_NUMBER' && (
                    <div>
                      <Label>Phone Number</Label>
                      <Input
                        value={button.phoneNumber || ''}
                        onChange={(e) => handleButtonChange(index, 'phoneNumber', e.target.value)}
                        placeholder="Enter phone number"
                      />
                    </div>
                  )}
                </div>
              ))}
              {buttons.length < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddButton}
                  className="w-full"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Button
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Form Actions */}
        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading || !!templateNameError}>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Create Template
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminCreateTemplateForm;

