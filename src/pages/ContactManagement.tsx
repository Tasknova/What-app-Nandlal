import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, Edit, Trash2, Search, Mail, Phone, UserPlus, Import, Download, FolderPlus, List, Upload, X, ChevronUp, ChevronDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useClientData } from '@/hooks/useClientData';
import { useClientAuth } from '@/hooks/useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email?: string;
  tags: string[];
  notes?: string;
  created_at: string;
  updated_at: string;
  groups?: any[];
}

interface ContactGroup {
  id: string;
  name: string;
  description?: string;
  created_at: string;
  updated_at: string;
  contact_count?: number;
}

const ContactManagement = () => {
  const { client } = useClientAuth();
  const navigate = useNavigate();
  const { 
    contacts, 
    loading, 
    error, 
    addContact, 
    updateContact, 
    deleteContact, 
    refreshData 
  } = useClientData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateGroupDialogOpen, setIsCreateGroupDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [importing, setImporting] = useState(false);
  const [showCreateListOption, setShowCreateListOption] = useState(false);
  const [newListForImport, setNewListForImport] = useState({ name: '', description: '' });
  const [creatingListForImport, setCreatingListForImport] = useState(false);
  const [deletingGroup, setDeletingGroup] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('contacts');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    notes: '',
    groupId: ''
  });
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: ''
  });
  const [groupNameError, setGroupNameError] = useState<string>('');

  const { toast } = useToast();

  // Duplicate check function
  const checkGroupNameDuplicate = async (name: string) => {
    if (!name.trim() || !client) {
      setGroupNameError('');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id')
        .eq('name', name.trim())
        .eq('client_id', client.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
        console.error('Error checking group name:', error);
        return;
      }

      if (data) {
        setGroupNameError('A contact list with this name already exists');
      } else {
        setGroupNameError('');
      }
    } catch (error) {
      console.error('Error checking group name:', error);
    }
  };

  // Load groups on component mount
  useEffect(() => {
    loadGroups();
  }, [client]);

  // Show error if exists
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  const loadGroups = async () => {
    if (!client) return;

    try {
      // First get all groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('groups')
        .select('*')
        .eq('client_id', client.id)
        .order('name');

      if (groupsError) throw groupsError;

      // Then get contact counts for each group
      const groupsWithCount = await Promise.all(
        (groupsData || []).map(async (group) => {
          const { count, error: countError } = await supabase
            .from('contacts')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          if (countError) {
            console.error(`Error counting contacts for group ${group.id}:`, countError);
            return { ...group, contact_count: 0 };
          }

          return { ...group, contact_count: count || 0 };
        })
      );

      setGroups(groupsWithCount);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load groups: " + error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateGroup = async () => {
    if (!client || !newGroup.name.trim()) return;

    try {
      // Check if group name already exists
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newGroup.name.trim())
        .eq('client_id', client.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existingGroup) {
        toast({
          title: "Error",
          description: "A contact list with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        return;
      }

      const { error } = await supabase
        .from('groups')
        .insert([{
          name: newGroup.name.trim(),
          description: newGroup.description.trim() || null,
          user_id: client.id,
          client_id: client.id
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group created successfully",
      });

      setNewGroup({ name: '', description: '' });
      setIsCreateGroupDialogOpen(false);
      loadGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateGroup = async () => {
    if (!editingGroup || !editingGroup.name.trim()) return;

    try {
      const { error } = await supabase
        .from('groups')
        .update({
          name: editingGroup.name.trim(),
          description: editingGroup.description?.trim() || null
        })
        .eq('id', editingGroup.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group updated successfully",
      });

      setEditingGroup(null);
      loadGroups();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setDeletingGroup(groupId);
      
      // First, check if there are contacts in this group
      const { data: contactsInGroup, error: contactsError } = await supabase
        .from('contacts')
        .select('id')
        .eq('group_id', groupId);

      if (contactsError) throw contactsError;

      // Show confirmation dialog with information about contacts
      let confirmMessage = "Are you sure you want to delete this contact list?";
      if (contactsInGroup && contactsInGroup.length > 0) {
        confirmMessage += `\n\n⚠️ WARNING: This list contains ${contactsInGroup.length} contact(s). ALL contacts in this list will be PERMANENTLY DELETED along with the list.`;
      }
      confirmMessage += "\n\nThis action cannot be undone.";

      if (!window.confirm(confirmMessage)) {
        setDeletingGroup(null);
        return;
      }

      if (contactsInGroup && contactsInGroup.length > 0) {
        // Delete all contacts in this group first
        const { error: deleteContactsError } = await supabase
          .from('contacts')
          .delete()
          .eq('group_id', groupId);

        if (deleteContactsError) throw deleteContactsError;

        toast({
          title: "Notice",
          description: `Deleted ${contactsInGroup.length} contacts from the list before deletion.`,
        });
      }

      // Now delete the group
      const { error } = await supabase
        .from('groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact list and all its contacts deleted successfully",
      });

      loadGroups();
      refreshData(); // Refresh contacts to show updated data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingGroup(null);
    }
  };



  const handleCreateContact = async () => {
    if (!client) return;

    // Basic validation
    if (!newContact.name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a contact name",
        variant: "destructive",
      });
      return;
    }

    if (!newContact.phone.trim()) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      });
      return;
    }

    if (!newContact.groupId) {
      toast({
        title: "Error",
        description: "Please select a list for the contact",
        variant: "destructive",
      });
      return;
    }

    try {
      const contactData = {
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim() || null,
        tags: newContact.tags ? newContact.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: newContact.notes.trim() || null,
        user_id: client.id,
        client_id: client.id,
        group_id: newContact.groupId
      };

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (contactError) throw contactError;

      toast({
        title: "Success",
        description: "Contact created successfully",
      });

      setNewContact({ name: '', phone: '', email: '', tags: '', notes: '', groupId: '' });
      setIsCreateDialogOpen(false);
      setShowOptionalFields(false);
      refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleUpdateContact = async () => {
    if (!editingContact || !client) return;

    try {
      const updates = {
        name: editingContact.name,
        phone: editingContact.phone,
        email: editingContact.email || null,
        tags: editingContact.tags,
        notes: editingContact.notes || null
      };

      const { error } = await supabase
        .from('contacts')
        .update(updates)
        .eq('id', editingContact.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact updated successfully",
      });

      setEditingContact(null);
      refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteContact = async (id: string) => {
    try {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });

      refreshData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a valid CSV file",
        variant: "destructive",
      });
      return;
    }

    setCsvFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCsvContent(content);
    };
    reader.readAsText(file);
  };

  const handleCreateListForImport = async () => {
    if (!client || !newListForImport.name.trim()) return;

    setCreatingListForImport(true);
    try {
      // Check if group name already exists
      const { data: existingGroup, error: checkError } = await supabase
        .from('groups')
        .select('id')
        .eq('name', newListForImport.name.trim())
        .eq('client_id', client.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "not found" error
        throw checkError;
      }

      if (existingGroup) {
        toast({
          title: "Error",
          description: "A contact list with this name already exists. Please choose a different name.",
          variant: "destructive",
        });
        setCreatingListForImport(false);
        return;
      }

      const { data, error } = await supabase
        .from('groups')
        .insert([{
          name: newListForImport.name.trim(),
          description: newListForImport.description.trim() || null,
          user_id: client.id,
          client_id: client.id,
          created_by: client.id // Track who created this contact list
        }])
        .select()
        .single();

      if (error) throw error;

      // Set the newly created group as selected
      setNewContact({ ...newContact, groupId: data.id });
      setShowCreateListOption(false);
      setNewListForImport({ name: '', description: '' });
      
      // Refresh groups list
      await loadGroups();

      toast({
        title: "Success",
        description: "List created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create list: " + error.message,
        variant: "destructive",
      });
    } finally {
      setCreatingListForImport(false);
    }
  };

  const handleImportCSV = async () => {
    if (!client || !csvContent.trim()) return;

    if (!newContact.groupId) {
      toast({
        title: "Error",
        description: "Please select a list for the contacts",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    try {
      const { data: result, error } = await supabase.rpc('import_contacts_from_csv_flexible', {
        csv_data: csvContent,
        group_id: newContact.groupId,
        p_client_id: client.id
      });

      if (error) throw error;

      if (result && result.success) {
        const message = result.inserted_count > 0 
          ? `Successfully imported ${result.inserted_count} contacts${result.error_count > 0 ? ` (${result.error_count} errors)` : ''}`
          : 'No contacts were imported';
        
        toast({
          title: "Import Complete",
          description: message,
          duration: 5000,
        });
      } else {
        throw new Error(result?.error || 'Import failed');
      }

      setCsvContent('');
      setCsvFile(null);
      setNewContact({ ...newContact, groupId: '' });
      setShowCreateListOption(false);
      setNewListForImport({ name: '', description: '' });
      setIsImportDialogOpen(false);
      refreshData();
    } catch (error: any) {
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };


  const filteredContacts = contacts.filter(contact => {
    const matchesSearch = 
      contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.phone.includes(searchTerm) ||
      contact.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contact.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (selectedGroup === 'all') return matchesSearch;
    
    // Filter by group if selected
    return matchesSearch && contact.group_id === selectedGroup;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Users className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Contact Management</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Manage your customer contacts, organize them into lists, and import from CSV
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Contacts
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Contact Lists
          </TabsTrigger>
        </TabsList>

        <TabsContent value="contacts" className="space-y-6">
          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
                                                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                   <SelectTrigger className="w-48">
                     <SelectValue placeholder="All Lists" />
                   </SelectTrigger>
                                    <SelectContent>
                     <SelectItem value="all">All Lists</SelectItem>
                     {groups.map(group => (
                       <SelectItem key={group.id} value={group.id}>
                         {group.name} ({group.contact_count})
                       </SelectItem>
                     ))}
                   </SelectContent>
                  </Select>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setIsImportDialogOpen(true)}
                disabled={groups.length === 0}
              >
                <Import className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70"
                    disabled={groups.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Contact
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add New Contact</DialogTitle>
                    <DialogDescription>
                      Create a new contact in your database
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={newContact.name}
                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                        placeholder="Enter full name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number *</Label>
                      <Input
                        id="phone"
                        value={newContact.phone}
                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newContact.email}
                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                        placeholder="email@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="group">List *</Label>
                      <Select value={newContact.groupId} onValueChange={(value) => setNewContact({ ...newContact, groupId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a list (required)" />
                        </SelectTrigger>
                        <SelectContent>
                          {groups.map(group => (
                            <SelectItem key={group.id} value={group.id}>
                              {group.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground mt-1">
                        Every contact must belong to a list
                      </p>
                    </div>
                    {showOptionalFields && (
                      <>
                        <div>
                          <Label htmlFor="tags">Tags (comma-separated)</Label>
                          <Input
                            id="tags"
                            value={newContact.tags}
                            onChange={(e) => setNewContact({ ...newContact, tags: e.target.value })}
                            placeholder="customer, vip, lead"
                          />
                        </div>
                        <div>
                          <Label htmlFor="notes">Notes</Label>
                          <Textarea
                            id="notes"
                            value={newContact.notes}
                            onChange={(e) => setNewContact({ ...newContact, notes: e.target.value })}
                            placeholder="Add any notes about this contact..."
                            rows={3}
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex justify-center">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOptionalFields(!showOptionalFields)}
                        className="flex items-center gap-2"
                      >
                        {showOptionalFields ? (
                          <>
                            <ChevronUp className="h-4 w-4" />
                            Hide Optional Fields
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-4 w-4" />
                            Show Optional Fields
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => {
                        setIsCreateDialogOpen(false);
                        setShowOptionalFields(false);
                      }}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateContact}>
                        Create Contact
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="card-enhanced">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Total Contacts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{contacts.length}</div>
              </CardContent>
            </Card>
            
            <Card className="card-enhanced">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mail className="h-5 w-5 text-success" />
                  With Email
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-success">
                  {contacts.filter(c => c.email).length}
                </div>
              </CardContent>
            </Card>
            
            <Card className="card-enhanced">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <List className="h-5 w-5 text-info" />
                  Lists
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-info">{groups.length}</div>
              </CardContent>
            </Card>

            <Card className="card-enhanced">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Phone className="h-5 w-5 text-warning" />
                  Active Today
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-warning">
                  {contacts.filter(c => 
                    new Date(c.updated_at).toDateString() === new Date().toDateString()
                  ).length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contacts Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContacts.map((contact) => (
              <Card key={contact.id} className="card-enhanced hover-lift">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{contact.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{contact.phone}</p>
                      {contact.email && (
                        <p className="text-sm text-muted-foreground">{contact.email}</p>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingContact(contact)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteContact(contact.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {contact.groups && contact.groups.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.groups.map((group: any) => (
                          <Badge key={group.id} variant="outline" className="text-xs">
                            {group.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.tags.length > 0 && (
                    <div className="mb-3">
                      <div className="flex flex-wrap gap-1">
                        {contact.tags.map(tag => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  {contact.notes && (
                    <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                      {contact.notes}
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    Added {new Date(contact.created_at).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

                     {filteredContacts.length === 0 && (
             <div className="text-center py-12">
               <Users className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
               <h3 className="text-lg font-medium mb-2">No contacts found</h3>
               <p className="text-muted-foreground mb-4">
                 {searchTerm 
                   ? 'Try adjusting your search criteria' 
                   : groups.length === 0 
                     ? 'You must create a list first before adding contacts'
                     : 'Add your first contact to get started'}
               </p>
               {groups.length === 0 ? (
                 <Button onClick={() => setIsCreateGroupDialogOpen(true)}>
                   <FolderPlus className="h-4 w-4 mr-2" />
                   Create First List
                 </Button>
               ) : (
                 <Button onClick={() => setIsCreateDialogOpen(true)}>
                   <Plus className="h-4 w-4 mr-2" />
                   Add First Contact
                 </Button>
               )}
             </div>
           )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          {/* Groups Header */}
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-bold">Contact Lists</h3>
              <p className="text-muted-foreground">Organize your contacts into lists for better management</p>
            </div>
            <Dialog open={isCreateGroupDialogOpen} onOpenChange={setIsCreateGroupDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70">
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create List
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New List</DialogTitle>
                  <DialogDescription>
                    Create a new list to organize your contacts
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="group-name">List Name *</Label>
                    <Input
                      id="group-name"
                      value={newGroup.name}
                      onChange={(e) => {
                        setNewGroup({ ...newGroup, name: e.target.value });
                        // Debounce the duplicate check
                        setTimeout(() => checkGroupNameDuplicate(e.target.value), 500);
                      }}
                      placeholder="e.g., VIP Customers, Leads, etc."
                      className={groupNameError ? 'border-red-500' : ''}
                    />
                    {groupNameError && (
                      <p className="text-sm text-red-500">{groupNameError}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="group-description">Description</Label>
                    <Textarea
                      id="group-description"
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                      placeholder="Describe what this list is for..."
                      rows={3}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setIsCreateGroupDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateGroup} disabled={!!groupNameError}>
                      Create List
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>

                     {/* Groups Grid */}
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 [&>*]:text-render-optimize">
             {groups.map((group) => (
                               <Card 
                  key={group.id} 
                  className="card-enhanced hover-lift cursor-pointer"
                  onClick={() => navigate(`/contacts/list/${group.id}`)}
                >
                 <CardHeader className="pb-3">
                   <div className="flex items-center justify-between">
                     <div className="min-w-0 flex-1 pr-2">
                       <CardTitle className="text-lg truncate leading-tight antialiased">{group.name}</CardTitle>
                       <p className="text-sm text-muted-foreground truncate leading-tight antialiased">
                         {group.contact_count || 0} contacts
                       </p>
                     </div>
                                                                                   <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingGroup(group);
                          }}
                          title="Edit list"
                          className="shrink-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGroup(group.id);
                          }}
                          disabled={deletingGroup === group.id}
                          className={`shrink-0 ${deletingGroup === group.id ? "opacity-50" : ""}`}
                          title="Delete list"
                        >
                          {deletingGroup === group.id ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {group.description && (
                    <p className="text-sm text-muted-foreground mb-3">
                      {group.description}
                    </p>
                  )}
                                     <div className="text-xs text-muted-foreground">
                     Created {new Date(group.created_at).toLocaleDateString()}
                   </div>
                   <div className="text-xs text-primary mt-2 font-medium">
                     Click to view contacts →
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {groups.length === 0 && (
            <div className="text-center py-12">
              <List className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No lists created yet</h3>
              <p className="text-muted-foreground mb-4">
                You must create at least one list before adding contacts. Every contact must belong to a list.
              </p>
              <Button onClick={() => setIsCreateGroupDialogOpen(true)}>
                <FolderPlus className="h-4 w-4 mr-2" />
                Create First List
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Import CSV Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={(open) => {
        setIsImportDialogOpen(open);
        if (!open) {
          // Reset all import-related state when dialog is closed
          setCsvFile(null);
          setCsvContent('');
          setNewContact({ ...newContact, groupId: '' });
          setShowCreateListOption(false);
          setNewListForImport({ name: '', description: '' });
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Contacts from CSV</DialogTitle>
            <DialogDescription>
              Upload a CSV file to import contacts. Required column: Contact (phone number). Optional columns: Name, Email, Tags, Notes.
              <br />
              <strong>Expected format:</strong> Contact, Name, Email, Tags, Notes
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csv-file">CSV File</Label>
              <div className="mt-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Choose CSV File
                </Button>
              </div>
              {csvFile && (
                <div className="mt-2 flex items-center gap-2 p-2 bg-muted rounded">
                  <span className="text-sm">{csvFile.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setCsvFile(null);
                      setCsvContent('');
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            
            {csvContent && (
              <div>
                <Label>Preview (first 5 rows)</Label>
                <div className="mt-2 p-3 bg-muted rounded text-sm font-mono max-h-32 overflow-y-auto">
                  <pre className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{csvContent.split('\n').slice(0, 6).join('\n')}</pre>
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="import-group">List *</Label>
              <div className="space-y-3">
                <Select value={newContact.groupId} onValueChange={(value) => setNewContact({ ...newContact, groupId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a list (required)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map(group => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-border" />
                  <span className="text-xs text-muted-foreground px-2">OR</span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateListOption(!showCreateListOption)}
                  className="w-full"
                >
                  <FolderPlus className="h-4 w-4 mr-2" />
                  Create New List
                </Button>
                
                {showCreateListOption && (
                  <div className="space-y-3 p-4 border rounded-lg bg-muted/50">
                    <div>
                      <Label htmlFor="new-list-name">List Name *</Label>
                      <Input
                        id="new-list-name"
                        value={newListForImport.name}
                        onChange={(e) => {
                          setNewListForImport({ ...newListForImport, name: e.target.value });
                          // Debounce the duplicate check
                          setTimeout(() => checkGroupNameDuplicate(e.target.value), 500);
                        }}
                        className={`mt-1 ${groupNameError ? 'border-red-500' : ''}`}
                        placeholder="Enter list name"
                      />
                      {groupNameError && (
                        <p className="text-sm text-red-500 mt-1">{groupNameError}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="new-list-description">Description (Optional)</Label>
                      <Textarea
                        id="new-list-description"
                        value={newListForImport.description}
                        onChange={(e) => setNewListForImport({ ...newListForImport, description: e.target.value })}
                        placeholder="Enter list description"
                        className="mt-1"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        onClick={handleCreateListForImport}
                        disabled={!newListForImport.name.trim() || creatingListForImport || !!groupNameError}
                        className="flex-1"
                      >
                        {creatingListForImport ? 'Creating...' : 'Create List'}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowCreateListOption(false);
                          setNewListForImport({ name: '', description: '' });
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Every contact must belong to a list
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImportCSV} 
                disabled={!csvContent.trim() || !newContact.groupId || importing}
              >
                {importing ? 'Importing...' : 'Import Contacts'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={!!editingContact} onOpenChange={() => setEditingContact(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information
            </DialogDescription>
          </DialogHeader>
          {editingContact && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-name">Full Name *</Label>
                <Input
                  id="edit-name"
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="edit-phone">Phone Number *</Label>
                <Input
                  id="edit-phone"
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div>
                <Label htmlFor="edit-email">Email Address</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="edit-tags">Tags</Label>
                <Input
                  id="edit-tags"
                  value={editingContact.tags.join(', ')}
                  onChange={(e) => setEditingContact({ 
                    ...editingContact, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="customer, vip, lead"
                />
              </div>
              <div>
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingContact.notes || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  placeholder="Add any notes about this contact..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingContact(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateContact}>
                  Update Contact
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={!!editingGroup} onOpenChange={() => setEditingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
            <DialogDescription>
              Update list information
            </DialogDescription>
          </DialogHeader>
          {editingGroup && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-group-name">List Name *</Label>
                <Input
                  id="edit-group-name"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({ ...editingGroup, name: e.target.value })}
                  placeholder="e.g., VIP Customers, Leads, etc."
                />
              </div>
              <div>
                <Label htmlFor="edit-group-description">Description</Label>
                <Textarea
                  id="edit-group-description"
                  value={editingGroup.description || ''}
                  onChange={(e) => setEditingGroup({ ...editingGroup, description: e.target.value })}
                  placeholder="Describe what this list is for..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditingGroup(null)}>
                  Cancel
                </Button>
                <Button onClick={handleUpdateGroup}>
                  Update List
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ContactManagement;