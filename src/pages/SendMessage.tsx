import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Send, Plus, Users, MessageSquare, FileText, BookOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useClientData } from '@/hooks/useClientData';

interface Template {
  id: string;
  name: string;
  content: string;
  category: string;
  variables: string[];
}

const SendMessage = () => {
  const { client, session } = useClientAuth();
  const { templates, contacts, loading: dataLoading } = useClientData();
  
  const [recipients, setRecipients] = useState<string[]>([]);
  const [currentRecipient, setCurrentRecipient] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('text');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const { toast } = useToast();

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setMessage(template.content);
      setSelectedTemplate(templateId);
    }
  };

  const addFromContacts = (contactPhone: string) => {
    if (contactPhone && !recipients.includes(contactPhone)) {
      setRecipients([...recipients, contactPhone]);
    }
  };

  const addRecipient = () => {
    if (!currentRecipient.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive"
      });
      return;
    }

    // Validate phone number format
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(currentRecipient.replace(/\s+/g, ''))) {
      toast({
        title: "Error",
        description: "Please enter a valid phone number (e.g., +1234567890)",
        variant: "destructive"
      });
      return;
    }

    // Check for duplicate
    if (recipients.includes(currentRecipient)) {
      toast({
        title: "Error",
        description: "This phone number is already in your recipient list",
        variant: "destructive"
      });
      return;
    }

    setRecipients([...recipients, currentRecipient]);
    setCurrentRecipient('');
  };

  const removeRecipient = (phone: string) => {
    setRecipients(recipients.filter(r => r !== phone));
  };

  const handleSendMessage = async () => {
    console.log('Client state:', client);
    console.log('Session state:', session);
    
    if (!client || !session) {
      toast({
        title: "Error",
        description: "You are not logged in. Please log in and try again.",
        variant: "destructive"
      });
      return;
    }

    if (recipients.length === 0 || !message.trim()) {
      toast({
        title: "Error",
        description: "Please add recipients and enter a message",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Send messages through the WhatsApp API
      const sendPromises = recipients.map(async (recipient) => {
        const { data, error } = await supabase.functions.invoke('send-whatsapp-message', {
          body: {
            recipient_phone: recipient,
            message_content: message,
            message_type: messageType
          },
          headers: {
            'Authorization': `Bearer ${session?.token || ''}`
          }
        });
        
        if (error) {
          console.error('Error sending to', recipient, ':', error);
          throw new Error(`Failed to send to ${recipient}: ${error.message}`);
        }
        
        // Check if the response indicates failure
        if (data && !data.success) {
          throw new Error(data.error || `Failed to send to ${recipient}`);
        }
        
        return data;
      });

      const results = await Promise.all(sendPromises);
      
      // Check if all messages were sent successfully
      const successCount = results.filter(result => result?.success).length;
      const failedCount = recipients.length - successCount;
      
      if (successCount > 0) {
        toast({
          title: "Success",
          description: `${successCount} message(s) sent successfully${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
        });
      } else {
        toast({
          title: "Error",
          description: "All messages failed to send. Please check your API configuration.",
          variant: "destructive"
        });
      }

      // Reset form
      setRecipients([]);
      setMessage('');
      setMessageType('text');
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Check if it's a configuration error
      if (error instanceof Error && error.message.includes('WhatsApp API key')) {
        toast({
          title: "Configuration Error",
          description: "WhatsApp API key is not configured. Please add your API key in Settings.",
          variant: "destructive"
        });
      } else if (error instanceof Error && error.message.includes('WhatsApp number')) {
        toast({
          title: "Configuration Error", 
          description: "WhatsApp number is not configured. Please add your WhatsApp number in Settings.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to send message. Please check your WhatsApp API settings and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Send Message</h2>
        <p className="text-muted-foreground">
          Send WhatsApp messages to your contacts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message Composition */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Compose Message
            </CardTitle>
            <CardDescription>
              Create and send your WhatsApp message
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="message-type">Message Type</Label>
                <Select value={messageType} onValueChange={setMessageType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="template-select">Use Template</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a template" />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map(template => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message Content</Label>
              <Textarea
                id="message"
                placeholder="Type your message here or select a template..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={6}
                className="resize-none"
              />
              <div className="text-xs text-muted-foreground text-right">
                {message.length}/4096 characters
              </div>
            </div>

            <Button 
              onClick={handleSendMessage} 
              disabled={isLoading || recipients.length === 0 || !message.trim()}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send to {recipients.length} recipient(s)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients & Contacts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Recipients
            </CardTitle>
            <CardDescription>
              Add recipients manually or from contacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter phone number (+1234567890)"
                value={currentRecipient}
                onChange={(e) => setCurrentRecipient(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addRecipient()}
              />
              <Button onClick={addRecipient} variant="outline">
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <Label>From Contacts</Label>
              <div className="max-h-[120px] overflow-y-auto border rounded-md p-2">
                {contacts.length > 0 ? (
                  <div className="space-y-1">
                    {contacts.slice(0, 10).map(contact => (
                      <div key={contact.id} className="flex items-center justify-between p-2 text-sm hover:bg-muted rounded">
                        <span>{contact.name} ({contact.phone})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addFromContacts(contact.phone)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-2">
                    No contacts found
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Selected Recipients ({recipients.length})</Label>
              <div className="border rounded-md p-3 min-h-[120px] max-h-[200px] overflow-y-auto">
                {recipients.length > 0 ? (
                  <div className="space-y-2">
                    {recipients.map((phone, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                        <span className="text-sm">{phone}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeRecipient(phone)}
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground">
                    No recipients added yet
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Message Preview */}
      {message && (
        <Card>
          <CardHeader>
            <CardTitle>Message Preview</CardTitle>
            <CardDescription>
              How your message will appear to recipients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-sm">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs font-medium text-green-700">
                  {client?.business_name || 'Your Business'}
                </span>
              </div>
              <div className="text-sm">
                {message}
              </div>
              <div className="text-xs text-muted-foreground mt-2">
                {messageType === 'text' && 'Text message'}
                {messageType === 'image' && 'Image message'}
                {messageType === 'document' && 'Document message'}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SendMessage;