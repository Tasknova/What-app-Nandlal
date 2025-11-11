import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Phone, Key, Save, Check, User, Building2, MessageSquare, Shield } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';

const SettingsPage = () => {
  const [apiKey, setApiKey] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();
  const { client } = useClientAuth();
  const { admin } = useAdminAuth();
  
  // Determine current user and role
  const user = client || admin;
  const isAdmin = !!admin;

  // Load user profile and client data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!user) return;

      try {
        // Load profile data
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('*')
          .eq(client ? 'client_id' : 'user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error loading profile:', error);
        } else if (profile) {
          setBusinessName(profile.business_name || '');
        } else {
          // No profile found, set default values
          setBusinessName(client?.business_name || admin?.full_name || '');
        }

        // Load client data for integrations
        if (client) {
          setApiKey(client.whatsapp_api_key || '');
          setPhoneNumber(client.whatsapp_number || '');
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadData();
  }, [user, client]);

  const handleSaveSettings = async () => {
    if (!user) return;

    setLoading(true);
    try {
      if (!user) {
        throw new Error('User not found');
      }

      // Try to update existing profile first
      let { error } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
        })
        .eq(client ? 'client_id' : 'user_id', user.id);

      // If no profile exists, create one
      if (error && error.code === 'PGRST116') {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            user_id: user.id,
            client_id: client ? user.id : null,
            email: client?.email || admin?.email || '',
            business_name: businessName,
            whatsapp_api_key: '',
            whatsapp_number: ''
          });
        
        if (insertError) throw insertError;
      } else if (error) {
        throw error;
      }

      toast({
        title: "Settings saved successfully!",
        description: "Your business information has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error saving settings",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (apiKey) {
      try {
        await navigator.clipboard.writeText(apiKey);
        toast({
          title: "API Key copied!",
          description: "API key has been copied to clipboard.",
        });
      } catch (error) {
        toast({
          title: "Copy failed",
          description: "Failed to copy API key to clipboard.",
          variant: "destructive",
        });
      }
    }
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <Settings className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Business Settings</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Configure your WhatsApp API and business preferences
        </p>
      </div>

             <div className="mt-6">
         <Tabs defaultValue="profile" className="w-full">
           <TabsList className="grid w-full grid-cols-2 mb-6">
             <TabsTrigger value="profile" className="flex items-center gap-2">
               <User className="h-4 w-4" />
               Profile
             </TabsTrigger>
             <TabsTrigger value="integrations" className="flex items-center gap-2">
               <MessageSquare className="h-4 w-4" />
               Integrations
             </TabsTrigger>
           </TabsList>

                     <TabsContent value="profile" className="space-y-6">
             {/* Profile Information */}
             <Card className="card-enhanced">
               <CardHeader className="bg-gradient-to-r from-primary to-primary/90 text-white rounded-t-lg">
                 <CardTitle className="flex items-center gap-2">
                   <User className="h-5 w-5" />
                   Profile Information
                 </CardTitle>
                 <CardDescription className="text-white/90">
                   Your business profile and account details
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-6 p-6">
                 <div className="space-y-2">
                   <Label htmlFor="businessName" className="text-sm font-medium flex items-center gap-2">
                     <Building2 className="h-4 w-4 text-primary" />
                     Business Name
                   </Label>
                   <Input
                     id="businessName"
                     type="text"
                     placeholder="Enter your business name"
                     value={businessName}
                     onChange={(e) => setBusinessName(e.target.value)}
                     className="h-12 border-2 border-gray-200 focus:border-primary transition-all duration-200"
                   />
                   <p className="text-xs text-muted-foreground">
                     This name will appear in your WhatsApp messages
                   </p>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                     <User className="h-4 w-4 text-primary" />
                     Email Address
                   </Label>
                   <Input
                     id="email"
                     type="email"
                     value={client?.email || admin?.email || ''}
                     disabled
                     className="h-12 border-2 border-gray-200 bg-gray-50"
                   />
                   <p className="text-xs text-muted-foreground">
                     Contact support to change your email address
                   </p>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                     <Phone className="h-4 w-4 text-primary" />
                     Phone Number
                   </Label>
                   <Input
                     id="phone"
                     type="tel"
                     value={client?.phone_number || ''}
                     disabled
                     className="h-12 border-2 border-gray-200 bg-gray-50"
                   />
                   <p className="text-xs text-muted-foreground">
                     Contact support to change your phone number
                   </p>
                 </div>

                 <div className="space-y-2">
                   <Label htmlFor="user_id" className="text-sm font-medium flex items-center gap-2">
                     <Shield className="h-4 w-4 text-primary" />
                     User ID
                   </Label>
                   <Input
                     id="user_id"
                     type="text"
                     value={client?.user_id || ''}
                     disabled
                     className="h-12 border-2 border-gray-200 bg-gray-50"
                   />
                   <p className="text-xs text-muted-foreground">
                     Your unique user identifier
                   </p>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>

           <TabsContent value="integrations" className="space-y-6">
             {/* WhatsApp API Configuration */}
             <Card className="card-enhanced">
               <CardHeader className="bg-gradient-to-r from-success to-success/90 text-white rounded-t-lg">
                 <CardTitle className="flex items-center gap-2">
                   <Key className="h-5 w-5" />
                   WhatsApp API Configuration
                 </CardTitle>
                 <CardDescription className="text-white/90">
                   Your WhatsApp API credentials and integration settings
                 </CardDescription>
               </CardHeader>
               <CardContent className="space-y-6 p-6">
                 <div className="space-y-2">
                   <Label htmlFor="apiKey" className="text-sm font-medium flex items-center gap-2">
                     <Shield className="h-4 w-4 text-primary" />
                     API Key
                   </Label>
                   <div className="flex gap-2">
                     <Input
                       id="apiKey"
                       type={showApiKey ? "text" : "password"}
                       placeholder="Your WhatsApp API key"
                       value={showApiKey ? apiKey : '•'.repeat(apiKey.length)}
                       disabled
                       className="h-12 border-2 border-gray-200 bg-gray-50 flex-1"
                     />
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={() => setShowApiKey(!showApiKey)}
                       className="h-12 px-4"
                     >
                       {showApiKey ? 'Hide' : 'View'}
                     </Button>
                     <Button
                       variant="outline"
                       size="sm"
                       onClick={handleCopyApiKey}
                       className="h-12 px-4"
                     >
                       Copy
                     </Button>
                   </div>
                   <p className="text-xs text-muted-foreground">
                     API key is managed by your administrator
                   </p>
                 </div>
                 
                 <div className="space-y-2">
                   <Label htmlFor="phoneNumber" className="text-sm font-medium flex items-center gap-2">
                     <Phone className="h-4 w-4 text-primary" />
                     WhatsApp Business Number
                   </Label>
                   <Input
                     id="phoneNumber"
                     type="tel"
                     placeholder="Your WhatsApp number"
                     value={phoneNumber}
                     disabled
                     className="h-12 border-2 border-gray-200 bg-gray-50"
                   />
                   <p className="text-xs text-muted-foreground">
                     WhatsApp number is managed by your administrator
                   </p>
                 </div>

                 <div className="bg-muted/50 rounded-lg p-4">
                   <div className="flex items-center space-x-2">
                     <Settings className="h-4 w-4 text-muted-foreground" />
                     <p className="text-sm font-medium">API Status</p>
                   </div>
                   <p className="text-sm text-muted-foreground mt-1">
                     {apiKey && phoneNumber ? (
                       <span className="text-success flex items-center">
                         <Check className="h-4 w-4 mr-1" />
                         Configuration complete
                       </span>
                     ) : (
                       "Please contact administrator to configure API"
                     )}
                   </p>
                 </div>
               </CardContent>
             </Card>
           </TabsContent>
        </Tabs>
        
        {/* Save Button - Only show for business name changes */}
        <div className="flex justify-end pt-6">
          <Button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="bg-gradient-to-r from-success to-success/80 hover:from-success/90 hover:to-success/70 shadow-lg px-8 py-3 text-base font-medium"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 mr-2" />
                Save Business Info
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;