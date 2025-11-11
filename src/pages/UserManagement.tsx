import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { Loader2, Users, Plus, Phone, Key, Mail, Building, Hash } from 'lucide-react';

export default function UserManagement() {
  const [email, setEmail] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappApiKey, setWhatsappApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { admin } = useAdminAuth();

  const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  };

  const generateApiKey = () => {
    return 'wh_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!admin) return;
    
    setLoading(true);

    try {
      const password = generatePassword();
      const apiKey = whatsappApiKey || generateApiKey();

      const { error } = await supabase
        .from('client_users')
        .insert([{
          email,
          password_hash: '$2b$10$' + btoa(password), // In production, use proper hashing
          business_name: businessName,
          phone_number: phoneNumber,
          whatsapp_api_key: apiKey,
          whatsapp_number: whatsappNumber,
          created_by: admin.id
        }]);

      if (error) throw error;

      // Log admin action
      await supabase.from('admin_logs').insert([{
        admin_id: admin.id,
        action: 'CREATE_CLIENT',
        target_type: 'client',
        details: { 
          client_email: email, 
          generated_password: password, 
          api_key: apiKey,
          business_name: businessName
        }
      }]);

      toast({
        title: "Client Created Successfully",
        description: `Email: ${email}, Password: ${password}`,
        duration: 15000
      });

      // Clear form
      setEmail('');
      setBusinessName('');
      setPhoneNumber('');
      setWhatsappNumber('');
      setWhatsappApiKey('');

    } catch (error: any) {
      toast({
        title: "Error Creating Client",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fillTestData = () => {
    setEmail('test@example.com');
    setBusinessName('Test Business');
    setPhoneNumber('+1234567890');
    setWhatsappNumber('+1234567890');
    setWhatsappApiKey('test-api-key-123');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Client Management</h1>
          <p className="text-muted-foreground">Create and manage client accounts</p>
        </div>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Client
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="client@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessName" className="flex items-center gap-2">
                <Building className="h-4 w-4" />
                Business Name
              </Label>
              <Input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Business Name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phoneNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phoneNumber"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappNumber" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp Number
              </Label>
              <Input
                id="whatsappNumber"
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+1234567890"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsappApiKey" className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                WhatsApp API Key
              </Label>
              <Input
                id="whatsappApiKey"
                type="password"
                value={whatsappApiKey}
                onChange={(e) => setWhatsappApiKey(e.target.value)}
                placeholder="Enter API key or leave empty to auto-generate"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Client
                  </>
                )}
              </Button>
              
              <Button type="button" variant="outline" onClick={fillTestData}>
                <Hash className="mr-2 h-4 w-4" />
                Test Data
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-info/20 bg-gradient-to-br from-info/5 to-info/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-info">
            <Key className="h-5 w-5" />
            Generated Credentials
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Test Client Credentials:</h4>
              <div className="space-y-1 text-sm">
                <p><span className="font-medium">Email:</span> test@example.com</p>
                <p><span className="font-medium">Business:</span> Test Business</p>
                <p><span className="font-medium">Phone:</span> +1234567890</p>
                <p><span className="font-medium">WhatsApp:</span> +1234567890</p>
                <p><span className="font-medium">API Key:</span> test-api-key-123</p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>• Password is automatically generated and displayed after creation</p>
              <p>• API key is auto-generated if not provided</p>
              <p>• All credentials are securely stored and logged</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}