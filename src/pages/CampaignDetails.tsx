import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ArrowLeft,
  Target,
  MessageSquare,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  Copy,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useClientAuth } from "@/hooks/useClientAuth";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface CampaignReportRecord {
  msgType: string;
  deliveryTime: number;
  billingModel: string;
  channel: string;
  msgId: string;
  cause: string;
  readTime: number;
  mobileNo: number;
  uuId: number;
  wabaNumber: number;
  globalErrorCode: string;
  submitTime: string;
  waConversationId: string;
  id: number;
  campaignName: string;
  status: string;
}

interface Campaign {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent';
  sent_count: number;
  delivered_count: number;
  failed_count: number;
  created_at: string;
  updated_at: string;
  user_id: string;
  client_id?: string;
  group_id?: string;
  template_id?: string;
  reports_data?: CampaignReportRecord[];
  group_name?: string;
  template_name?: string;
  contact_count?: number;
}

export default function CampaignDetails() {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { client } = useClientAuth();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [campaignDisplayTime, setCampaignDisplayTime] = useState<Date | null>(null);

  useEffect(() => {
    if (campaignId && client?.id) {
      loadCampaignDetails();
    }
  }, [campaignId, client?.id]);

  // Track when campaign is first displayed
  useEffect(() => {
    if (campaign && !campaignDisplayTime) {
      const displayTime = new Date();
      setCampaignDisplayTime(displayTime);
    }
  }, [campaign, campaignDisplayTime]);

  const loadCampaignDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch campaign details
      let { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          groups:group_id(name)
        `)
        .eq('id', campaignId)
        .eq('client_id', client?.id)
        .single();

      if (campaignError) {
        // Try with user_id as fallback
        const { data: campaignData2, error: campaignError2 } = await supabase
          .from('campaigns')
          .select(`
            *,
            groups:group_id(name)
          `)
          .eq('id', campaignId)
          .eq('user_id', client?.id)
          .single();

        if (campaignError2) {
          throw campaignError2;
        }
        campaignData = campaignData2;
      }

      // Get contact count using direct relationship
      const { count: contactCount, error: countError } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', campaignData.group_id);

      if (countError) {
        console.error('Error counting contacts:', countError);
      }

             // Get template name if template_id exists
       let templateName = 'No Template';
       if (campaignData.template_id) {
         const { data: templateData, error: templateError } = await supabase
           .from('templates')
           .select('template_name')
           .eq('id', campaignData.template_id)
           .single();
         
         if (!templateError && templateData) {
           templateName = templateData.template_name;
         } else {
           templateName = 'Template ID: ' + campaignData.template_id;
         }
       }

       const campaignWithDetails = {
         ...campaignData,
         group_name: campaignData.groups?.name || 'Unknown Group',
         template_name: templateName,
         contact_count: contactCount || 0
       };

      setCampaign(campaignWithDetails);
    } catch (error: any) {
      console.error('Error loading campaign details:', error);
      setError(error.message);
      toast({
        title: "Error",
        description: "Failed to load campaign details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: "secondary",
      scheduled: "default",
      sending: "secondary",
      sent: "success"
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status === 'sending' ? 'Sending...' : status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getMessageStatusBadge = (message: CampaignReportRecord) => {
    // Determine display status based on readTime
    let displayStatus = message.status;
    if (message.readTime && message.readTime > 0) {
      displayStatus = 'READ';
    }
    
    const variants = {
      'DELIVERED': 'success',
      'READ': 'default', // Use default variant for READ status
      'FAILED': 'destructive',
      'PENDING': 'secondary',
      'SENT': 'default'
    } as const;

    return (
      <Badge variant={variants[displayStatus as keyof typeof variants] || "secondary"}>
        {displayStatus}
      </Badge>
    );
  };

  const calculateCampaignMetrics = (campaign: Campaign) => {
    if (!campaign.reports_data || campaign.reports_data.length === 0) {
      return {
        totalMessages: 0,
        delivered: 0,
        failed: 0,
        read: 0,
        pending: 0,
        deliveryRate: 0,
        readRate: 0
      };
    }

    const totalMessages = campaign.reports_data.length;
    const delivered = campaign.reports_data.filter(msg => msg.status === 'DELIVERED').length;
    const failed = campaign.reports_data.filter(msg => msg.status === 'FAILED').length;
    const read = campaign.reports_data.filter(msg => msg.readTime && parseInt(msg.readTime.toString()) > 0).length;
    const pending = totalMessages - delivered - failed;

    const deliveryRate = totalMessages > 0 ? (delivered / totalMessages) * 100 : 0;
    const readRate = delivered > 0 ? (read / delivered) * 100 : 0;

    return {
      totalMessages,
      delivered,
      failed,
      read,
      pending,
      deliveryRate,
      readRate
    };
  };

  const exportCampaignData = (campaign: Campaign) => {
    const dataStr = JSON.stringify(campaign, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${campaign.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_campaign_data.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Exported!",
      description: "Campaign data exported as JSON",
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Data copied to clipboard",
    });
  };

  const refreshCampaignReports = async () => {
    if (!campaign || !client?.user_id) {
      toast({
        title: "Error",
        description: "Cannot refresh reports - missing campaign or client data",
        variant: "destructive",
      });
      return;
    }

    try {
      setRefreshing(true);
      
      // Get messages from the entire current day (00:01:00 to 23:59:00)
      const now = new Date();
      
      // Use UTC components to avoid timezone issues
      // Set fromDate to 00:01:00 of current day
      const fromDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} 00:01:00`;
      // Set toDate to 23:59:00 of current day
      const toDate = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')} 23:59:00`;

      const requestBody = {
        userId: client.user_id,
        fromDate: fromDate,
        toDate: toDate,
        mobileNo: '',
        pageLimit: 200, // Get more records to ensure we capture all messages
        startCursor: '1'
      };

      console.log('Refreshing campaign reports with request:', requestBody);

      const response = await fetch('/api/fetch-reports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log('Refresh reports response:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON Parse Error in refresh:', parseError);
        toast({
          title: "Error",
          description: "Failed to parse response from reports API",
          variant: "destructive",
        });
        return;
      }

             if (response.ok && data.success && data.data.records) {
         // Get the exact number of contacts that were in this campaign
         const expectedMessageCount = campaign.sent_count || campaign.contact_count || 0;
         
         if (expectedMessageCount === 0) {
           toast({
             title: "No Contacts",
             description: "This campaign has no contacts to fetch reports for",
             variant: "destructive",
           });
           return;
         }
         
         // Get campaign creation time to find messages closest to when it was sent
         const campaignCreatedTime = new Date(campaign.created_at).getTime();
         
         // Sort messages by how close they are to the campaign sent time
         const messagesWithTimeDiff = data.data.records.map((msg: any) => {
           const msgTime = parseInt(msg.submitTime);
           const timeDiff = Math.abs(msgTime - campaignCreatedTime);
           return { ...msg, timeDiff };
         });
         
         // Sort by time difference (closest to campaign time first)
         messagesWithTimeDiff.sort((a: any, b: any) => a.timeDiff - b.timeDiff);
         
         // Take only the exact number of messages that were sent in this campaign
         const recentMessages = messagesWithTimeDiff.slice(0, expectedMessageCount);

                 console.log(`Campaign "${campaign.name}" was created at: ${new Date(campaignCreatedTime).toISOString()}`);
         console.log(`Expected message count: ${expectedMessageCount} (based on sent_count: ${campaign.sent_count}, contact_count: ${campaign.contact_count})`);
         console.log(`Got ${recentMessages.length} messages closest to campaign time from ${data.data.records.length} total messages available`);
         console.log('Selected messages (closest to campaign time):', recentMessages.map((msg: any) => {
           const msgTime = parseInt(msg.submitTime);
           const timeDiffMinutes = Math.round(msg.timeDiff / (1000 * 60));
           return `${new Date(msgTime).toISOString()} (${timeDiffMinutes} minutes from campaign time)`;
         }));

        const existingReports = campaign.reports_data || [];
        
        // Create a map of existing reports by msgId for quick lookup
        const existingReportsMap = new Map(
          existingReports.map(report => [report.msgId, report])
        );
        
        // Create a map of fresh reports by msgId
        const freshReportsMap = new Map(
          recentMessages.map(report => [report.msgId, report])
        );
        
        let newMessagesCount = 0;
        let updatedMessagesCount = 0;
        const updatedReports: CampaignReportRecord[] = [];
        
        // Process existing reports - update status if changed
        existingReports.forEach(existingReport => {
          const freshReport = freshReportsMap.get(existingReport.msgId);
          if (freshReport) {
            // Message exists in fresh data - check if status changed
            if (freshReport.status !== existingReport.status || 
                freshReport.readTime !== existingReport.readTime ||
                freshReport.deliveryTime !== existingReport.deliveryTime) {
              // Status or timing has changed, use fresh data
              updatedReports.push(freshReport);
              updatedMessagesCount++;
              console.log(`Updated status for message ${existingReport.msgId}: ${existingReport.status} -> ${freshReport.status}`);
            } else {
              // No change, keep existing data
              updatedReports.push(existingReport);
            }
          } else {
            // Message not found in fresh data, keep existing
            updatedReports.push(existingReport);
          }
        });
        
        // Add new messages that don't exist in current data
        recentMessages.forEach(freshReport => {
          if (!existingReportsMap.has(freshReport.msgId)) {
            updatedReports.push(freshReport);
            newMessagesCount++;
            console.log(`Added new message: ${freshReport.msgId} with status: ${freshReport.status}`);
          }
        });
        
        // Sort by submit time (latest first)
        updatedReports.sort((a, b) => parseInt(b.submitTime) - parseInt(a.submitTime));
        
        console.log(`Refresh summary: ${newMessagesCount} new messages, ${updatedMessagesCount} status updates, ${updatedReports.length} total messages`);
        
        if (newMessagesCount > 0 || updatedMessagesCount > 0) {
          // Update the campaign with updated reports data
          const { error: updateError } = await supabase
            .from('campaigns')
            .update({ 
              reports_data: updatedReports,
              updated_at: new Date().toISOString()
            })
            .eq('id', campaign.id);

          if (updateError) {
            console.error('Error updating campaign with reports data:', updateError);
            toast({
              title: "Error",
              description: "Failed to update campaign with reports data",
              variant: "destructive",
            });
          } else {
            // Update local state
            setCampaign(prev => prev ? {
              ...prev,
              reports_data: updatedReports,
              updated_at: new Date().toISOString()
            } : null);

            const updateMessage = [];
            if (newMessagesCount > 0) {
              updateMessage.push(`${newMessagesCount} new messages`);
            }
            if (updatedMessagesCount > 0) {
              updateMessage.push(`${updatedMessagesCount} status updates`);
            }
            
            toast({
              title: "Reports Refreshed!",
              description: `Updated: ${updateMessage.join(', ')}. Status changes will be reflected in the table below.`,
            });
          }
        } else {
          toast({
            title: "No Updates",
            description: "No new messages or status updates found",
          });
        }
      } else {
        console.error('Failed to fetch reports:', data.error || 'Unknown error');
        toast({
          title: "Error",
          description: data.error || "Failed to fetch latest reports",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error refreshing campaign reports:', error);
      toast({
        title: "Error",
        description: "Failed to refresh campaign reports",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/3"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error || !campaign) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium mb-2">Campaign Not Found</h3>
            <p className="text-muted-foreground text-center mb-4">
              {error || "The campaign you're looking for doesn't exist or you don't have access to it."}
            </p>
            <Button onClick={() => navigate('/campaigns')}>
              Go Back to Campaigns
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const metrics = calculateCampaignMetrics(campaign);



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/campaigns')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{campaign.name}</h1>
            <p className="text-muted-foreground">Campaign Details & Reports</p>
          </div>
        </div>
                 <div className="flex gap-2">
           {campaign.reports_data && campaign.reports_data.length > 0 && (
             <>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={refreshCampaignReports}
                 disabled={refreshing}
                 className="flex items-center gap-2"
               >
                 <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                 {refreshing ? 'Refreshing...' : 'Refresh Reports'}
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => copyToClipboard(JSON.stringify(campaign.reports_data, null, 2))}
                 className="flex items-center gap-2"
               >
                 <Copy className="h-4 w-4" />
                 Copy Reports
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => exportCampaignData(campaign)}
                 className="flex items-center gap-2"
               >
                 <Download className="h-4 w-4" />
                 Export Data
               </Button>
             </>
           )}
           {(!campaign.reports_data || campaign.reports_data.length === 0) && (
             <Button
               variant="outline"
               size="sm"
               onClick={refreshCampaignReports}
               disabled={refreshing}
               className="flex items-center gap-2"
             >
               <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
               {refreshing ? 'Refreshing...' : 'Fetch Reports'}
             </Button>
           )}
         </div>
      </div>

      {/* Campaign Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Campaign Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">Basic Information</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign Name:</span>
                  <span className="font-medium">{campaign.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Description:</span>
                  <span className="font-medium">{campaign.description || 'No description'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span>{getStatusBadge(campaign.status)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span className="font-medium">{new Date(campaign.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Updated:</span>
                  <span className="font-medium">{new Date(campaign.updated_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Campaign ID:</span>
                  <span className="font-mono text-xs">{campaign.id}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-3">Campaign Metrics</h4>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contact List:</span>
                  <span className="font-medium">{campaign.group_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Template:</span>
                  <span className="font-medium">{campaign.template_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Contacts:</span>
                  <span className="font-medium">{campaign.contact_count || 'N/A'}</span>
                </div>
                                 <div className="flex justify-between">
                   <span className="text-muted-foreground">Sent Count:</span>
                   <span className="font-medium">{campaign.sent_count}</span>
                 </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metrics.totalMessages}
              </div>
              <div className="text-sm text-muted-foreground">Messages Sent</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metrics.delivered}
              </div>
              <div className="text-sm text-muted-foreground">Delivered</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {metrics.failed}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {metrics.read}
              </div>
              <div className="text-sm text-muted-foreground">Read</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Delivery Rate</span>
                <span className={`text-sm font-bold ${metrics.deliveryRate >= 90 ? 'text-green-600' : metrics.deliveryRate >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {metrics.deliveryRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.deliveryRate}%` }}
                ></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Read Rate</span>
                <span className={`text-sm font-bold ${metrics.readRate >= 80 ? 'text-green-600' : metrics.readRate >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {metrics.readRate.toFixed(1)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${metrics.readRate}%` }}
                ></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Message Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Message Reports
            </CardTitle>
            {campaign.reports_data && campaign.reports_data.length > 0 && (
              <Badge variant="outline">
                {campaign.reports_data.length} messages tracked
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
                     {!campaign.reports_data || campaign.reports_data.length === 0 ? (
             <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-gray-200 rounded-lg min-h-[300px]">
               <MessageSquare className="h-16 w-16 text-muted-foreground mb-6" />
               <h3 className="text-xl font-semibold mb-3 text-center">No Reports Available</h3>
               <p className="text-muted-foreground mb-6 text-center max-w-md">
                 Click the button below to fetch the latest reports for this campaign.
               </p>
               <Button
                 onClick={refreshCampaignReports}
                 disabled={refreshing}
                 className="flex items-center gap-3 px-8 py-3"
                 size="lg"
               >
                 <RefreshCw className={`h-6 w-6 ${refreshing ? 'animate-spin' : ''}`} />
                 {refreshing ? 'Fetching Reports...' : 'Fetch Reports'}
               </Button>
             </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Phone Number</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Message Type</TableHead>
                    <TableHead>Submit Time</TableHead>
                    <TableHead>Delivery Time</TableHead>
                    <TableHead>Read Time</TableHead>
                    <TableHead>Message ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaign.reports_data.map((message, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono text-sm">
                        {message.mobileNo}
                      </TableCell>
                      <TableCell>
                        {getMessageStatusBadge(message)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {message.msgType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(parseInt(message.submitTime)).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {message.deliveryTime && parseInt(message.deliveryTime.toString()) > 0 
                          ? new Date(parseInt(message.deliveryTime.toString())).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="text-sm">
                        {message.readTime && parseInt(message.readTime.toString()) > 0 
                          ? new Date(parseInt(message.readTime.toString())).toLocaleString()
                          : '-'
                        }
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {message.msgId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
