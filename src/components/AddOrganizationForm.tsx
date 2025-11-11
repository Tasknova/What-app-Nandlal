import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface AddOrganizationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export default function AddOrganizationForm({ onSuccess, onCancel }: AddOrganizationFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    business_type: '',
    industry: '',
    website: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: 'India',
    postal_code: '',
    tax_id: '',
    registration_number: '',
    subscription_plan: 'basic',
    max_users: 5,
    max_contacts: 1000,
    max_campaigns: 10
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name) {
      toast({
        title: "Validation Error",
        description: "Organization name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const { error } = await supabase
        .from('client_organizations')
        .insert([formData]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Organization created successfully"
      });
      
      onSuccess();
    } catch (error) {
      console.error('Error creating organization:', error);
      toast({
        title: "Error",
        description: "Failed to create organization",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Organization Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="Enter organization name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="business_type">Business Type</Label>
          <Input
            id="business_type"
            value={formData.business_type}
            onChange={(e) => handleChange('business_type', e.target.value)}
            placeholder="e.g., Private Limited, Partnership"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <Input
            id="industry"
            value={formData.industry}
            onChange={(e) => handleChange('industry', e.target.value)}
            placeholder="e.g., Technology, Healthcare"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="website">Website</Label>
          <Input
            id="website"
            value={formData.website}
            onChange={(e) => handleChange('website', e.target.value)}
            placeholder="https://example.com"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+91 1234567890"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="subscription_plan">Subscription Plan</Label>
          <Select value={formData.subscription_plan} onValueChange={(value) => handleChange('subscription_plan', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleChange('address', e.target.value)}
          placeholder="Enter full address"
          rows={3}
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleChange('city', e.target.value)}
            placeholder="City"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state">State</Label>
          <Input
            id="state"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            placeholder="State"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code</Label>
          <Input
            id="postal_code"
            value={formData.postal_code}
            onChange={(e) => handleChange('postal_code', e.target.value)}
            placeholder="123456"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tax_id">Tax ID</Label>
          <Input
            id="tax_id"
            value={formData.tax_id}
            onChange={(e) => handleChange('tax_id', e.target.value)}
            placeholder="GST Number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="registration_number">Registration Number</Label>
          <Input
            id="registration_number"
            value={formData.registration_number}
            onChange={(e) => handleChange('registration_number', e.target.value)}
            placeholder="Company Registration Number"
          />
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="max_users">Max Users</Label>
          <Input
            id="max_users"
            type="number"
            value={formData.max_users}
            onChange={(e) => handleChange('max_users', parseInt(e.target.value))}
            min="1"
            max="100"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max_contacts">Max Contacts</Label>
          <Input
            id="max_contacts"
            type="number"
            value={formData.max_contacts}
            onChange={(e) => handleChange('max_contacts', parseInt(e.target.value))}
            min="100"
            max="100000"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="max_campaigns">Max Campaigns</Label>
          <Input
            id="max_campaigns"
            type="number"
            value={formData.max_campaigns}
            onChange={(e) => handleChange('max_campaigns', parseInt(e.target.value))}
            min="1"
            max="1000"
          />
        </div>
      </div>
      
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Creating...' : 'Create Organization'}
        </Button>
      </div>
    </form>
  );
}
