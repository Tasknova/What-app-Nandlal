import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useClientAuth } from '@/hooks/useClientAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  ArrowLeft,
  Users,
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Phone,
  Mail,
  Calendar,
  ChevronUp,
  ChevronDown
} from 'lucide-react';

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  tags: string[];
  custom_fields: any;
  notes: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
  group_id: string;
}

interface ContactList {
  id: string;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
}

export default function ListContacts() {
  const { listId } = useParams<{ listId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { client } = useClientAuth();
  
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactList, setContactList] = useState<ContactList | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvContent, setCsvContent] = useState('');
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [columnValidation, setColumnValidation] = useState<{
    isValid: boolean;
    missingColumns: string[];
    message: string;
  }>({
    isValid: false,
    missingColumns: [],
    message: ''
  });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [deletingContact, setDeletingContact] = useState<string | null>(null);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [showOptionalFields, setShowOptionalFields] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    phone: '',
    email: '',
    tags: '',
    notes: ''
  });

  // Get clientId from URL params if available
  const clientId = searchParams.get('clientId');

  // Function to validate column format
  const validateColumns = (columns: string[]) => {
    const requiredColumns = ['name', 'phone'];
    const optionalColumns = ['email', 'tags', 'notes'];
    const columnMap = new Map<string, string>();
    
    // Create a map of lowercase column names to original names
    columns.forEach(col => {
      columnMap.set(col.toLowerCase().trim(), col);
    });
    
    const missingRequiredColumns: string[] = [];
    const foundOptionalColumns: string[] = [];
    
    // Check if required columns exist (case-insensitive)
    requiredColumns.forEach(requiredCol => {
      if (!columnMap.has(requiredCol)) {
        missingRequiredColumns.push(requiredCol);
      }
    });
    
    // Check which optional columns are present
    optionalColumns.forEach(optionalCol => {
      if (columnMap.has(optionalCol)) {
        foundOptionalColumns.push(optionalCol);
      }
    });
    
    if (missingRequiredColumns.length > 0) {
      return {
        isValid: false,
        missingColumns: missingRequiredColumns,
        message: `Missing required columns: ${missingRequiredColumns.join(', ')}. Required columns are: Name, Phone`
      };
    }
    
    const optionalMessage = foundOptionalColumns.length > 0 
      ? ` Optional columns found: ${foundOptionalColumns.join(', ')}.`
      : '';
    
    return {
      isValid: true,
      missingColumns: [],
      message: `Required columns found.${optionalMessage}`
    };
  };

  useEffect(() => {
    if (listId) {
      fetchListData();
    }
  }, [listId]);

  const fetchListData = async () => {
    try {
      setLoading(true);
      
      if (!client) {
        throw new Error("Client not authenticated");
      }
      
      // Fetch contact list details - ensure it belongs to the current client
      const { data: listData, error: listError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', listId)
        .eq('client_id', client.id)
        .single();

      if (listError) throw listError;
      setContactList(listData);

      // Fetch contacts in this list
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .eq('group_id', listId)
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (contactsError) throw contactsError;
      setContacts(contactsData || []);

    } catch (error) {
      console.error('Error fetching list data:', error);
      toast({
        title: "Error",
        description: "Failed to load contact list data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExtension === 'csv') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setCsvContent(content);
        
        // Extract column names from first line
        const columns = content.split('\n')[0].split(',').map(col => col.trim());
        setCsvColumns(columns);
        
        // Validate columns
        const validation = validateColumns(columns);
        setColumnValidation(validation);
      };
      reader.readAsText(file);
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      setCsvFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          
          // Convert to CSV format
          const csvContent = XLSX.utils.sheet_to_csv(worksheet);
          setCsvContent(csvContent);
          
          // Extract column names from first line
          const columns = csvContent.split('\n')[0].split(',').map(col => col.trim());
          setCsvColumns(columns);
          
          // Validate columns
          const validation = validateColumns(columns);
          setColumnValidation(validation);
        } catch (error) {
          console.error('Error reading XLSX file:', error);
          toast({
            title: "Error",
            description: "Failed to read XLSX file. Please try again.",
            variant: "destructive"
          });
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast({
        title: "Error",
        description: "Please select a valid CSV or XLSX file",
        variant: "destructive"
      });
    }
  };

  const handleImportCSV = async () => {
    if (!csvContent || !listId) return;

    // Validate column format
    if (!columnValidation.isValid) {
      toast({
        title: "Error",
        description: columnValidation.message,
        variant: "destructive"
      });
      return;
    }

    // Validate that Name and Phone data is not empty
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headerLine = lines[0];
    const dataLines = lines.slice(1);
    
    const headerColumns = headerLine.split(',').map(col => col.trim().toLowerCase());
    const nameIndex = headerColumns.indexOf('name');
    const phoneIndex = headerColumns.indexOf('phone');
    
    const invalidRows: number[] = [];
    
    dataLines.forEach((line, index) => {
      const values = line.split(',').map(val => val.trim());
      const name = values[nameIndex] || '';
      const phone = values[phoneIndex] || '';
      
      if (!name || !phone) {
        invalidRows.push(index + 2); // +2 because we skip header and arrays are 0-indexed
      }
    });
    
    if (invalidRows.length > 0) {
      toast({
        title: "Error",
        description: `Name and Phone columns cannot be empty. Invalid rows: ${invalidRows.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    try {
      // Get the client_id from the contact list
      const { data: listData } = await supabase
        .from('groups')
        .select('client_id')
        .eq('id', listId)
        .single();

      if (!listData?.client_id) {
        throw new Error('Could not find client for this list');
      }

      const { data: result, error } = await supabase.rpc('import_contacts_from_csv_flexible', {
        csv_data: csvContent,
        group_id: listId,
        p_client_id: listData.client_id
      });

      if (error) throw error;

      if (result && result.success) {
        const message = result.inserted_count > 0 
          ? `Successfully imported ${result.inserted_count} contacts${result.error_count > 0 ? ` (${result.error_count} errors)` : ''}`
          : 'No contacts were imported';
        
        toast({
          title: "Import Complete",
          description: message
        });
      } else {
        throw new Error(result?.error || 'Import failed');
      }

      setShowImportDialog(false);
      setCsvFile(null);
      setCsvContent('');
      setCsvColumns([]);
      setColumnValidation({
        isValid: false,
        missingColumns: [],
        message: ''
      });
      fetchListData(); // Refresh the contacts
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        title: "Error",
        description: "Failed to import contacts",
        variant: "destructive"
      });
    }
  };

  const handleExportCSV = async () => {
    try {
      const { data, error } = await supabase.rpc('export_contacts_to_csv', {
        group_id: listId,
        client_id: contactList?.client_id
      });

      if (error) throw error;

      // Create and download CSV file
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${contactList?.name || 'contacts'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Contacts exported successfully"
      });
    } catch (error) {
      console.error('Error exporting contacts:', error);
      toast({
        title: "Error",
        description: "Failed to export contacts",
        variant: "destructive"
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
      fetchListData(); // Refresh the data
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
      setDeletingContact(id);
      
      if (!window.confirm("Are you sure you want to delete this contact? This action cannot be undone.")) {
        setDeletingContact(null);
        return;
      }

      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contact deleted successfully",
      });

      fetchListData(); // Refresh the data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDeletingContact(null);
    }
  };

  const handleAddContact = async () => {
    if (!client || !listId) return;

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

    try {
      const contactData = {
        name: newContact.name.trim(),
        phone: newContact.phone.trim(),
        email: newContact.email.trim() || null,
        tags: newContact.tags ? newContact.tags.split(',').map(tag => tag.trim()).filter(Boolean) : [],
        notes: newContact.notes.trim() || null,
        user_id: client.id,
        client_id: client.id,
        group_id: listId
      };

      const { data: contact, error: contactError } = await supabase
        .from('contacts')
        .insert([contactData])
        .select()
        .single();

      if (contactError) throw contactError;

      toast({
        title: "Success",
        description: "Contact added successfully",
      });

      setNewContact({ name: '', phone: '', email: '', tags: '', notes: '' });
      setShowAddContactDialog(false);
      setShowOptionalFields(false);
      fetchListData(); // Refresh the data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.phone.includes(searchTerm) ||
    contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!client) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-4">Please log in to access this page.</p>
          <Button onClick={() => navigate('/auth')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!contactList) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Contact list not found</h2>
          <p className="text-muted-foreground mb-4">This list may have been deleted or you don't have access to it.</p>
          <Button onClick={() => navigate('/contacts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Contacts
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-3xl font-bold text-gray-900">
              {contactList.name}
            </h2>
            <p className="text-gray-600 text-lg mt-2">
              {contactList.description}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2 mt-6">
          <Dialog open={showImportDialog} onOpenChange={(open) => {
            setShowImportDialog(open);
            if (!open) {
              setCsvFile(null);
              setCsvContent('');
              setCsvColumns([]);
              setColumnValidation({
                isValid: false,
                missingColumns: [],
                message: ''
              });
            }
          }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import File
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Contacts from File</DialogTitle>
                <DialogDescription>
                  Upload a CSV or XLSX file with contact information.
                  <br />
                  <strong>Required columns:</strong> Name, Phone (data cannot be empty)
                  <br />
                  <strong>Optional columns:</strong> Email, Tags, Notes (can be included or omitted)
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                />
                {csvColumns.length > 0 && (
                  <div className="space-y-4">
                    <div className="p-3 rounded border">
                      <p className="text-sm font-medium mb-2">File Validation Status:</p>
                      <div className={`p-2 rounded text-sm ${
                        columnValidation.isValid 
                          ? 'bg-green-50 text-green-800 border border-green-200' 
                          : 'bg-red-50 text-red-800 border border-red-200'
                      }`}>
                        {columnValidation.message}
                      </div>
                    </div>
                    
                    <div className="p-3 bg-muted rounded">
                      <p className="text-sm font-medium mb-2">Detected Columns:</p>
                      <div className="flex flex-wrap gap-2">
                        {csvColumns.map((col, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {col}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button onClick={handleImportCSV} disabled={!csvContent || !columnValidation.isValid}>
                    Import
                  </Button>
                  <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {contacts.length > 0 && (
            <Button variant="outline" onClick={handleExportCSV}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          )}
          
          <Dialog open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Contact
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Contact</DialogTitle>
                <DialogDescription>
                  Add a new contact to this list
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
                
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowAddContactDialog(false);
                      setShowOptionalFields(false);
                      setNewContact({ name: '', phone: '', email: '', tags: '', notes: '' });
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddContact}>
                    Add Contact
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contact List Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{contacts.length}</div>
              <div className="text-sm text-muted-foreground">Total Contacts</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {contacts.filter(c => c.email).length}
              </div>
              <div className="text-sm text-muted-foreground">With Email</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {contacts.filter(c => c.tags && c.tags.length > 0).length}
              </div>
              <div className="text-sm text-muted-foreground">Tagged</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {new Date(contactList.created_at).toLocaleDateString()}
              </div>
              <div className="text-sm text-muted-foreground">Created</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search contacts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Contacts List */}
      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Contacts ({filteredContacts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredContacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <div>
                      <h3 className="font-semibold">{contact.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {contact.phone}
                        </span>
                        {contact.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {contact.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(contact.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {contact.tags && contact.tags.length > 0 && (
                      <div className="flex gap-1">
                        {contact.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {contact.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.tags.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingContact(contact)}
                    title="View contact details"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingContact(contact)}
                    title="Edit contact"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => handleDeleteContact(contact.id)}
                    disabled={deletingContact === contact.id}
                    title="Delete contact"
                  >
                    {deletingContact === contact.id ? (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ))}
            
            {filteredContacts.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {searchTerm ? 'No contacts found' : 'No contacts in this list'}
                </h3>
                <p className="text-muted-foreground">
                  {searchTerm ? 'Try adjusting your search terms' : 'Add some contacts to get started'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

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
                <label className="text-sm font-medium">Full Name *</label>
                <Input
                  value={editingContact.name}
                  onChange={(e) => setEditingContact({ ...editingContact, name: e.target.value })}
                  placeholder="Enter full name"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Phone Number *</label>
                <Input
                  value={editingContact.phone}
                  onChange={(e) => setEditingContact({ ...editingContact, phone: e.target.value })}
                  placeholder="+1234567890"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Email Address</label>
                <Input
                  type="email"
                  value={editingContact.email || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, email: e.target.value })}
                  placeholder="email@example.com"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tags (comma-separated)</label>
                <Input
                  value={editingContact.tags ? editingContact.tags.join(', ') : ''}
                  onChange={(e) => setEditingContact({ 
                    ...editingContact, 
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  })}
                  placeholder="customer, vip, lead"
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes</label>
                <textarea
                  value={editingContact.notes || ''}
                  onChange={(e) => setEditingContact({ ...editingContact, notes: e.target.value })}
                  placeholder="Add any notes about this contact..."
                  rows={3}
                  className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
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
    </div>
  );
} 