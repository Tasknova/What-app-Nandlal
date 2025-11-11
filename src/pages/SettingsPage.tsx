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

const SettingsPage = () => {
  const [userId, setUserId] = useState('nandlalwa');
  const [password, setPassword] = useState('Nandlal@12');
  const [apiKey, setApiKey] = useState('6c690e3ce94a97dd3bc5349d215f293bae88963c');
  const [phoneNumber, setPhoneNumber] = useState('919370853371');
  const [businessName, setBusinessName] = useState('Nandlal Jewellers');
  const [loading, setLoading] = useState(false);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();
  const { client } = useClientAuth();
  
  const user = client;

  // Load user profile and client data on mount
  useEffect(() => {
    const loadData = async () => {
      if (!client) return;

      try {
        // Load client data for integrations
        if (client.whatsapp_api_key) setApiKey(client.whatsapp_api_key);
        if (client.whatsapp_number) setPhoneNumber(client.whatsapp_number);
        if (client.user_id) setUserId(client.user_id);
        if (client.password) setPassword(client.password);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoadingProfile(false);
      }
    };

    loadData();
  }, [client]);

  const handleSaveSettings = async () => {
    if (!client) return;

    setLoading(true);
    try {
      // Update client_users table
      const { error } = await supabase
        .from('client_users')
        .update({
          business_name: businessName,
        })
        .eq('id', client.id);

      if (error) throw error;

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
                    value={client?.email || ''}
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
                  <Label htmlFor="userId" className="text-sm font-medium flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    User ID
                  </Label>
                  <Input
                    id="userId"
                    type="text"
                    placeholder="Enter User ID"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    className="h-12 border-2 border-gray-200 focus:border-primary transition-all duration-200"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your theultimate.io user ID
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    Password
                  </Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 border-2 border-gray-200 focus:border-primary transition-all duration-200"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your theultimate.io account password
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey" className="text-sm font-medium flex items-center gap-2">
                    <Key className="h-4 w-4 text-primary" />
                    API Key
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="apiKey"
                      type={showApiKey ? "text" : "password"}
                      placeholder="Your WhatsApp API key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="h-12 border-2 border-gray-200 focus:border-primary transition-all duration-200 flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="h-12 px-4"
                    >
                      {showApiKey ? 'Hide' : 'View'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your theultimate.io WhatsApp API key
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
                    placeholder="Enter WhatsApp number (with country code)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
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