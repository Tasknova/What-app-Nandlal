import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Loader2, Copy, Check } from 'lucide-react';

interface AddUserFormProps {
  clientId: string;
  onUserAdded: () => void;
}

export default function AddUserForm({ clientId, onUserAdded }: AddUserFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientData, setClientData] = useState<any>(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [createdUser, setCreatedUser] = useState<any>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const { toast } = useToast();
  const { admin } = useAdminAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone_number: '+91',
    is_primary_user: false
  });

  // Fetch client data when component mounts or clientId changes
  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId) return;
      
      try {
        const { data, error } = await supabase
          .from('clients')
          .select('*')
          .eq('id', clientId)
          .single();

        if (error) throw error;
        setClientData(data);
      } catch (error) {
        console.error('Error fetching client data:', error);
      }
    };

    fetchClientData();
  }, [clientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!admin) {
      toast({
        title: "Error",
        description: "Admin authentication required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    // Validate password confirmation
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    // Validate phone number (should be +91 followed by exactly 10 digits)
    const phoneRegex = /^\+91\d{10}$/;
    if (!phoneRegex.test(formData.phone_number)) {
      toast({
        title: "Error",
        description: "Phone number must be +91 followed by exactly 10 digits",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    if (!clientData) {
      toast({
        title: "Error",
        description: "Client data not loaded. Please try again.",
        variant: "destructive"
      });
      setLoading(false);
      return;
    }

    try {
      // Generate a unique user_id for the new user
      const userId = `${formData.name.toLowerCase().replace(/\s+/g, '')}_${Date.now()}`;
      
      // Insert new user into client_users table, inheriting business data from client
      const { data, error } = await supabase
        .from('client_users')
        .insert({
          user_id: userId,
          name: formData.name,
          email: formData.email,
          password: formData.password, // Store in password field (required)
          mem_password: formData.password, // Also store in mem_password field (for compatibility)
          phone_number: formData.phone_number, // Use form input
          business_name: clientData.business_name, // Inherit from client
          whatsapp_api_key: clientData.api_key, // Inherit from client
          whatsapp_number: clientData.wt_business_no, // Inherit from client
          client_id: clientId,
          created_by: admin.id,
          is_primary_user: formData.is_primary_user,
          is_active: true,
          subscription_plan: 'basic'
        })
        .select()
        .single();

      if (error) throw error;

      // Store created user data to show credentials
      setCreatedUser({
        ...data,
        password: formData.password // Include plain password for display
      });

      toast({
        title: "Success",
        description: "User created successfully"
      });

      // Show credentials instead of closing immediately
      setShowCredentials(true);

    } catch (error: any) {
      console.error('Error adding user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add user. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'phone_number') {
      // Ensure phone number always starts with +91
      let phoneValue = value;
      if (!phoneValue.startsWith('+91')) {
        phoneValue = '+91' + phoneValue.replace(/^\+?91?/, '');
      }
      // Only allow digits after +91
      phoneValue = '+91' + phoneValue.slice(3).replace(/\D/g, '');
      // Limit to 13 characters total (+91 + 10 digits)
      phoneValue = phoneValue.slice(0, 13);
      
      setFormData(prev => ({
        ...prev,
        [name]: phoneValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      toast({
        title: "Copied!",
        description: `${field} copied to clipboard`
      });
      setTimeout(() => setCopiedField(null), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone_number: '+91',
      is_primary_user: false
    });
    setShowCredentials(false);
    setCreatedUser(null);
    setOpen(false);
    onUserAdded();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {showCredentials ? "User Created Successfully" : "Add New User"}
          </DialogTitle>
          <DialogDescription>
            {showCredentials 
              ? "User has been created. Here are the login credentials:"
              : `Add a new user to ${clientData?.business_name || 'this client'}. Business details will be inherited automatically.`
            }
          </DialogDescription>
        </DialogHeader>
        
        {showCredentials ? (
          // Credentials Display
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Email</Label>
                  <p className="text-sm text-muted-foreground">{createdUser?.email}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdUser?.email || '', 'Email')}
                >
                  {copiedField === 'Email' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Password</Label>
                  <p className="text-sm text-muted-foreground font-mono">{createdUser?.password}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdUser?.password || '', 'Password')}
                >
                  {copiedField === 'Password' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">User ID</Label>
                  <p className="text-sm text-muted-foreground font-mono">{createdUser?.user_id}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => copyToClipboard(createdUser?.user_id || '', 'User ID')}
                >
                  {copiedField === 'User ID' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>• The user can log in using either their <strong>email</strong> or <strong>user ID</strong></p>
              <p>• Business details have been inherited from {clientData?.business_name}</p>
              <p>• Please share these credentials securely with the user</p>
            </div>

            <div className="flex justify-end space-x-2">
              <Button onClick={resetForm}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          // User Creation Form
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter full name"
                required
                disabled={loading}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter email address"
                required
                disabled={loading}
              />
            </div>

             <div className="space-y-2">
               <Label htmlFor="phone_number">Phone Number *</Label>
               <Input
                 id="phone_number"
                 name="phone_number"
                 type="tel"
                 value={formData.phone_number}
                 onChange={handleInputChange}
                 placeholder="+919876543210"
                 required
                 disabled={loading}
                 maxLength={13}
               />
               <p className="text-xs text-muted-foreground">Format: +91 followed by 10 digits</p>
             </div>

             <div className="grid grid-cols-2 gap-4">
               <div className="space-y-2">
                 <Label htmlFor="password">Password *</Label>
                 <Input
                   id="password"
                   name="password"
                   type="password"
                   value={formData.password}
                   onChange={handleInputChange}
                   placeholder="Enter password"
                   required
                   disabled={loading}
                 />
               </div>
               
               <div className="space-y-2">
                 <Label htmlFor="confirmPassword">Confirm Password *</Label>
                 <Input
                   id="confirmPassword"
                   name="confirmPassword"
                   type="password"
                   value={formData.confirmPassword}
                   onChange={handleInputChange}
                   placeholder="Confirm password"
                   required
                   disabled={loading}
                 />
               </div>
             </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="is_primary_user"
                name="is_primary_user"
                checked={formData.is_primary_user}
                onChange={handleInputChange}
                className="rounded border-gray-300"
                disabled={loading}
              />
              <Label htmlFor="is_primary_user">Primary User</Label>
            </div>

            {clientData && (
              <div className="bg-muted p-3 rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Business Details (inherited):</strong><br />
                  • Business: {clientData.business_name}<br />
                  • WhatsApp Number: {clientData.wt_business_no || 'Not set'}<br />
                  • API Key: {clientData.api_key ? '***' + clientData.api_key.slice(-4) : 'Not set'}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create User
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
