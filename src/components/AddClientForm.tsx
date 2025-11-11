import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddClientFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddClientForm({ onSuccess, onCancel }: AddClientFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    business_name: '',
    email: '',
    phone_no: '',
    wt_business_no: '',
    api_key: '',
    user_id: '',
    password: '',
    subscription_plan: 'basic',
    max_users: 5,
    max_contacts: 1000,
    max_campaigns: 10
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate a unique org_id
      const org_id = crypto.randomUUID();

      const { error } = await supabase
        .from('clients')
        .insert({
          org_id,
          business_name: formData.business_name,
          email: formData.email,
          phone_no: formData.phone_no,
          wt_business_no: formData.wt_business_no,
          api_key: formData.api_key,
          user_id: formData.user_id,
          password: formData.password,
          subscription_plan: formData.subscription_plan,
          max_users: formData.max_users,
          max_contacts: formData.max_contacts,
          max_campaigns: formData.max_campaigns,
          is_active: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Client created successfully"
      });

      onSuccess();
    } catch (error) {
      console.error('Error creating client:', error);
      toast({
        title: "Error",
        description: "Failed to create client",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="business_name">Business Name *</Label>
          <Input
            id="business_name"
            value={formData.business_name}
            onChange={(e) => handleInputChange('business_name', e.target.value)}
            placeholder="Enter business name"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter email address"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone_no">Phone Number</Label>
          <Input
            id="phone_no"
            value={formData.phone_no}
            onChange={(e) => handleInputChange('phone_no', e.target.value)}
            placeholder="Enter phone number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="wt_business_no">WhatsApp Business Number *</Label>
          <Input
            id="wt_business_no"
            value={formData.wt_business_no}
            onChange={(e) => handleInputChange('wt_business_no', e.target.value)}
            placeholder="Enter WhatsApp business number"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="api_key">API Key *</Label>
          <Input
            id="api_key"
            value={formData.api_key}
            onChange={(e) => handleInputChange('api_key', e.target.value)}
            placeholder="Enter API key"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user_id">User ID *</Label>
          <Input
            id="user_id"
            value={formData.user_id}
            onChange={(e) => handleInputChange('user_id', e.target.value)}
            placeholder="Enter user ID"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="Enter password"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="subscription_plan">Subscription Plan</Label>
          <Select value={formData.subscription_plan} onValueChange={(value) => handleInputChange('subscription_plan', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_users">Max Users</Label>
          <Input
            id="max_users"
            type="number"
            value={formData.max_users}
            onChange={(e) => handleInputChange('max_users', parseInt(e.target.value))}
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_contacts">Max Contacts</Label>
          <Input
            id="max_contacts"
            type="number"
            value={formData.max_contacts}
            onChange={(e) => handleInputChange('max_contacts', parseInt(e.target.value))}
            min="1"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="max_campaigns">Max Campaigns</Label>
          <Input
            id="max_campaigns"
            type="number"
            value={formData.max_campaigns}
            onChange={(e) => handleInputChange('max_campaigns', parseInt(e.target.value))}
            min="1"
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Client'}
        </Button>
      </div>
    </form>
  );
}
