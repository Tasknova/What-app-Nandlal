import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Eye, Users, MessageSquare, Calendar, Target, FileText } from 'lucide-react';

interface CampaignDetailViewProps {
  campaignId: string;
  onCampaignUpdated?: () => void;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  message_content: string;
  message_type: string;
  status: string;
  scheduled_for: string | null;
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id: string;
  group_id: string;
  template_id: string;
  variable_mappings?: { [key: string]: string };
  selected_media_id?: string | null;
  selected_media_type?: string | null;
}

interface Group {
  id: string;
  name: string;
  description: string;
}

interface Template {
  id: string;
  template_name: string;
  template_body: string;
  template_header: string;
  template_footer: string;
  category: string;
}

export default function CampaignDetailView({ campaignId, onCampaignUpdated }: CampaignDetailViewProps) {
  const [open, setOpen] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [template, setTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && campaignId) {
      fetchCampaignDetails();
    }
  }, [open, campaignId]);

  const fetchCampaignDetails = async () => {
    try {
      setLoading(true);

      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError) throw campaignError;
      setCampaign(campaignData);

      // Fetch related data
      const [groupResult, templateResult] = await Promise.all([
        supabase
          .from('groups')
          .select('*')
          .eq('id', campaignData.group_id)
          .single(),
        supabase
          .from('templates')
          .select('*')
          .eq('id', campaignData.template_id)
          .single()
      ]);

      if (!groupResult.error) setGroup(groupResult.data);
      if (!templateResult.error) setTemplate(templateResult.data);

    } catch (error) {
      console.error('Error fetching campaign details:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-blue-500/20 text-blue-700', label: 'Draft' },
      scheduled: { color: 'bg-orange-500/20 text-orange-700', label: 'Scheduled' },
      sending: { color: 'bg-yellow-500/20 text-yellow-700', label: 'Sending' },
      sent: { color: 'bg-green-500/20 text-green-700', label: 'Sent' },
      failed: { color: 'bg-red-500/20 text-red-700', label: 'Failed' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!campaign) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Details
          </DialogTitle>
          <DialogDescription>
            View detailed information about this campaign
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Campaign Header */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-xl">{campaign.name}</CardTitle>
                    <p className="text-muted-foreground mt-1">{campaign.description}</p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
              </CardHeader>
            </Card>

            {/* Campaign Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium">Sent</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mt-1">{campaign.sent_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium">Delivered</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600 mt-1">{campaign.delivered_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-medium">Failed</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600 mt-1">{campaign.failed_count}</div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="text-sm font-medium">Success Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mt-1">
                    {campaign.sent_count > 0 
                      ? Math.round((campaign.delivered_count / campaign.sent_count) * 100)
                      : 0}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact List */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5" />
                    Contact List
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {group ? (
                    <div>
                      <h4 className="font-semibold">{group.name}</h4>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Contact list not found</p>
                  )}
                </CardContent>
              </Card>

              {/* Template */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5" />
                    Message Template
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {template ? (
                    <div>
                      <h4 className="font-semibold">{template.template_name}</h4>
                      <Badge variant="outline" className="mt-1">{template.category}</Badge>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Template not found</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Message Content */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Message Content</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted/50 rounded-lg p-4">
                  <pre className="whitespace-pre-wrap text-sm">{campaign.message_content}</pre>
                </div>
              </CardContent>
            </Card>

            {/* Campaign Metadata */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Campaign Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span>
                    <span className="ml-2">{formatDate(campaign.created_at)}</span>
                  </div>
                  <div>
                    <span className="font-medium">Last Updated:</span>
                    <span className="ml-2">{formatDate(campaign.updated_at)}</span>
                  </div>
                  {campaign.scheduled_for && (
                    <div>
                      <span className="font-medium">Scheduled For:</span>
                      <span className="ml-2">{formatDate(campaign.scheduled_for)}</span>
                    </div>
                  )}
                  <div>
                    <span className="font-medium">Message Type:</span>
                    <span className="ml-2 capitalize">{campaign.message_type}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Variable Mappings */}
            {campaign.variable_mappings && Object.keys(campaign.variable_mappings).length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Variable Mappings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(campaign.variable_mappings).map(([variable, field]) => (
                      <div key={variable} className="flex items-center gap-2 text-sm">
                        <code className="bg-muted px-2 py-1 rounded text-xs">{`{{${variable}}}`}</code>
                        <span>→</span>
                        <span className="font-medium">{field}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
