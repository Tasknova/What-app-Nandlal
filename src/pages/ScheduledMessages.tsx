import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DateTimePicker } from '@/components/ui/date-time-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Clock, Plus, Edit, Trash2, Search, Calendar as CalendarIcon, Play, Pause, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { cn } from '@/lib/utils';

interface ScheduledMessage {
  id: string;
  recipient_phone: string;
  recipient_name?: string;
  message_content: string;
  message_type: string;
  scheduled_for: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ScheduledMessageForm {
  recipient_phone: string;
  recipient_name: string;
  message_content: string;
  message_type: string;
  scheduled_for: Date;
}

const ScheduledMessages = () => {
  const [scheduledMessages, setScheduledMessages] = useState<ScheduledMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingMessage, setEditingMessage] = useState<ScheduledMessage | null>(null);
  const [newMessage, setNewMessage] = useState<ScheduledMessageForm>({
    recipient_phone: '',
    recipient_name: '',
    message_content: '',
    message_type: 'text',
    scheduled_for: new Date(),
  });
  const { client } = useClientAuth();
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  
  // Determine current user
  const user = client || admin;
  const isAdmin = !!admin;

  useEffect(() => {
    fetchScheduledMessages();
  }, []);

  const fetchScheduledMessages = async () => {
    try {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('scheduled_messages')
        .select('*')
        .eq('client_id', user.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setScheduledMessages(data || []);
    } catch (error) {
      console.error('Error fetching scheduled messages:', error);
      toast({
        title: "Error",
        description: "Failed to load scheduled messages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMessage = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .insert([{
          ...newMessage,
          user_id: user.id,
          client_id: isAdmin ? null : user.id,
          recipient_name: newMessage.recipient_name || null,
          scheduled_for: newMessage.scheduled_for.toISOString(),
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message scheduled successfully",
      });

      setNewMessage({
        recipient_phone: '',
        recipient_name: '',
        message_content: '',
        message_type: 'text',
        scheduled_for: new Date(),
      } as ScheduledMessageForm);
      setIsCreateDialogOpen(false);
      fetchScheduledMessages();
    } catch (error) {
      console.error('Error creating scheduled message:', error);
      toast({
        title: "Error",
        description: "Failed to schedule message",
        variant: "destructive",
      });
    }
  };

  const handleUpdateMessage = async () => {
    if (!editingMessage || !user) return;

    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .update({
          recipient_phone: editingMessage.recipient_phone,
          recipient_name: editingMessage.recipient_name || null,
          message_content: editingMessage.message_content,
          message_type: editingMessage.message_type,
          scheduled_for: editingMessage.scheduled_for,
        })
        .eq('id', editingMessage.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scheduled message updated successfully",
      });

      setEditingMessage(null);
      fetchScheduledMessages();
    } catch (error) {
      console.error('Error updating scheduled message:', error);
      toast({
        title: "Error",
        description: "Failed to update scheduled message",
        variant: "destructive",
      });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('scheduled_messages')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Scheduled message deleted successfully",
      });

      fetchScheduledMessages();
    } catch (error) {
      console.error('Error deleting scheduled message:', error);
      toast({
        title: "Error",
        description: "Failed to delete scheduled message",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-success text-success-foreground">Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive">Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredMessages = scheduledMessages.filter(message => {
    const matchesSearch = message.recipient_phone.includes(searchTerm) ||
                         message.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         message.message_content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || message.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const upcomingMessages = filteredMessages.filter(msg => 
    new Date(msg.scheduled_for) > new Date() && msg.status === 'pending'
  );

  const pastMessages = filteredMessages.filter(msg => 
    new Date(msg.scheduled_for) <= new Date() || msg.status !== 'pending'
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">Please log in to access scheduled messages.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Clock className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Scheduled Messages</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Schedule WhatsApp messages to be sent at specific times
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex gap-4 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search messages..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-info to-info/80 hover:from-info/90 hover:to-info/70">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Message
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Schedule New Message</DialogTitle>
              <DialogDescription>
                Schedule a WhatsApp message to be sent at a specific time
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="recipient_phone">Recipient Phone *</Label>
                <Input
                  id="recipient_phone"
                  value={newMessage.recipient_phone}
                  onChange={(e) => setNewMessage({ ...newMessage, recipient_phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="recipient_name">Recipient Name</Label>
                <Input
                  id="recipient_name"
                  value={newMessage.recipient_name}
                  onChange={(e) => setNewMessage({ ...newMessage, recipient_name: e.target.value })}
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="message_type">Message Type</Label>
                <Select value={newMessage.message_type} onValueChange={(value) => setNewMessage({ ...newMessage, message_type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text Message</SelectItem>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="document">Document</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="message_content">Message Content *</Label>
                <Textarea
                  id="message_content"
                  value={newMessage.message_content}
                  onChange={(e) => setNewMessage({ ...newMessage, message_content: e.target.value })}
                  placeholder="Enter your message..."
                  rows={4}
                />
              </div>
              <div>
                <Label>Schedule Date & Time *</Label>
                <DateTimePicker
                  value={newMessage.scheduled_for}
                  onChange={(date) => setNewMessage({ ...newMessage, scheduled_for: date })}
                  placeholder="Pick a date and time"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Time shown in your local timezone ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </p>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMessage}>
                  Schedule Message
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="card-enhanced">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              Upcoming
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-warning">{upcomingMessages.length}</div>
          </CardContent>
        </Card>
        
        <Card className="card-enhanced">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-success" />
              Sent
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-success">
              {scheduledMessages.filter(m => m.status === 'sent').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-enhanced">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Pause className="h-5 w-5 text-info" />
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-info">
              {scheduledMessages.filter(m => m.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        
        <Card className="card-enhanced">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Play className="h-5 w-5 text-error" />
              Failed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-error">
              {scheduledMessages.filter(m => m.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Messages */}
      {upcomingMessages.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Upcoming Messages</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {upcomingMessages.map((message) => (
              <Card key={message.id} className="card-enhanced hover-lift border-warning/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {message.recipient_name || message.recipient_phone}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(message.scheduled_for), "PPP 'at' p")}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {getStatusBadge(message.status)}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingMessage(message)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteMessage(message.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {message.message_content}
                  </p>
                  <div className="flex justify-between items-center mt-3">
                    <Badge variant="outline" className="text-xs">
                      {message.message_type}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(message.scheduled_for), "MMM d, HH:mm")}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Messages */}
      {pastMessages.length > 0 && (
        <div>
          <h3 className="text-xl font-semibold mb-4">Message History</h3>
          <div className="space-y-3">
            {pastMessages.map((message) => (
              <Card key={message.id} className="card-enhanced">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">
                            {message.recipient_name || message.recipient_phone}
                          </p>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {message.message_content}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="text-xs">
                        {message.message_type}
                      </Badge>
                      {getStatusBadge(message.status)}
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(message.scheduled_for), "MMM d, HH:mm")}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {filteredMessages.length === 0 && (
        <div className="text-center py-12">
          <Clock className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No scheduled messages</h3>
          <p className="text-muted-foreground mb-4">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria' 
              : 'Schedule your first message to get started'}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule First Message
          </Button>
        </div>
      )}
    </div>
  );
};

export default ScheduledMessages;