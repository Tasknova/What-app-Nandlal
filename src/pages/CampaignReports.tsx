import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  BarChart3, 
  Users, 
  MessageSquare, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Download, 
  RefreshCw,
  Target,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  Eye,
  Copy,
  ExternalLink
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCampaignReports, type Campaign, type CampaignReportRecord } from "@/hooks/useCampaignReports";
import { format } from "date-fns";

export default function CampaignReports() {
  const [selectedCampaign, setSelectedCampaign] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | '90d'>('30d');
  const [viewingCampaign, setViewingCampaign] = useState<Campaign | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [fetchingReports, setFetchingReports] = useState<string | null>(null);

  const { toast } = useToast();
  const { campaigns, loading, error, loadCampaigns, fetchCampaignReports, monitorCampaignStatus } = useCampaignReports();

  // Function to view campaign details
  const handleViewCampaign = (campaign: Campaign) => {
    setViewingCampaign(campaign);
    setIsViewModalOpen(true);
  };

  // Function to copy data to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Data copied to clipboard",
    });
  };

  // Function to export campaign data as JSON
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

     // Function to handle fetching reports for a specific campaign
   const handleFetchReports = async (campaign: Campaign) => {
     try {
       setFetchingReports(campaign.id);
       await fetchCampaignReports(campaign);
       
       toast({
         title: "Success",
         description: `Reports fetched for campaign "${campaign.name}"`,
       });
     } catch (error) {
       toast({
         title: "Error",
         description: `Failed to fetch reports for campaign "${campaign.name}"`,
         variant: "destructive",
       });
     } finally {
       setFetchingReports(null);
     }
   };

  // Filter campaigns based on selected campaign
  const filteredCampaigns = selectedCampaign === 'all' 
    ? campaigns 
    : campaigns.filter(campaign => campaign.id === selectedCampaign);

  // Filter campaigns based on timeframe
  const getFilteredCampaignsByTimeframe = () => {
    const now = new Date();
    const timeframeDays = selectedTimeframe === '7d' ? 7 : selectedTimeframe === '30d' ? 30 : 90;
    const cutoffDate = new Date(now.getTime() - (timeframeDays * 24 * 60 * 60 * 1000));

    return filteredCampaigns.filter(campaign => 
      new Date(campaign.created_at) >= cutoffDate
    );
  };

  const timeframeFilteredCampaigns = getFilteredCampaignsByTimeframe();

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

  const getDeliveryRateColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getReadRateColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMessageStatusBadge = (status: string) => {
    const variants = {
      'DELIVERED': 'success',
      'FAILED': 'destructive',
      'PENDING': 'secondary',
      'SENT': 'default'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {status}
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

  const exportCampaignReports = () => {
    const csvData = timeframeFilteredCampaigns.map(campaign => {
      const metrics = calculateCampaignMetrics(campaign);
      return {
        'Campaign Name': campaign.name,
        'Contact List': campaign.group_name || 'Unknown',
        'Template': campaign.template_name || 'No Template',
        'Total Contacts': campaign.contact_count || 0,
        'Messages Sent': metrics.totalMessages,
        'Delivered': metrics.delivered,
        'Failed': metrics.failed,
        'Read': metrics.read,
        'Pending': metrics.pending,
        'Delivery Rate (%)': metrics.deliveryRate.toFixed(2),
        'Read Rate (%)': metrics.readRate.toFixed(2),
        'Created Date': new Date(campaign.created_at).toLocaleDateString(),
        'Status': campaign.status
      };
    });

    if (csvData.length === 0) {
      toast({
        title: "No Data",
        description: "No campaign reports available to export",
        variant: "destructive",
      });
      return;
    }

    const headers = Object.keys(csvData[0]);
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `campaign-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Campaign reports exported to CSV",
    });
  };

  const handleRefreshReports = async () => {
    try {
      // Refresh all campaigns that have reports_data
      const campaignsWithReports = campaigns.filter(c => c.reports_data && c.reports_data.length > 0);
      
      for (const campaign of campaignsWithReports) {
        await fetchCampaignReports(campaign);
        // Add a small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      toast({
        title: "Success",
        description: "Campaign reports refreshed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to refresh campaign reports",
        variant: "destructive",
      });
    }
  };

  const handleManualMonitor = async () => {
    try {
      toast({
        title: "Monitoring",
        description: "Manually triggering campaign monitoring...",
      });
      
      await monitorCampaignStatus();
      
      toast({
        title: "Success",
        description: "Campaign monitoring completed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run campaign monitoring",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Campaign Reports</h1>
            <p className="text-muted-foreground">Performance metrics for your campaigns</p>
          </div>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="border-b pb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-gray-100 rounded-full">
            <BarChart3 className="h-6 w-6 text-gray-600" />
          </div>
          <h2 className="text-3xl font-bold text-gray-900">Campaign Reports</h2>
        </div>
        <p className="text-gray-600 text-lg">
          Performance metrics for your campaigns
        </p>
        <div className="flex gap-2 mt-6">
          <Button
            onClick={handleManualMonitor}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Manual Monitor
          </Button>
          <Button
            onClick={handleRefreshReports}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh Reports
          </Button>
          <Button
            onClick={exportCampaignReports}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

             {/* Info Alert */}
       <Card className="border-blue-200 bg-blue-50">
         <CardContent className="pt-4">
           <div className="flex items-start gap-2">
             <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                            <div className="text-sm text-blue-800">
                 <p className="font-medium mb-1">Campaign Reports</p>
                 <p>
                   Reports are automatically fetched when campaigns are marked as "sent" or "sending" with sent_count > 0. 
                   Each campaign stores its specific message reports for accurate tracking.
                   <br />
                   <strong>Auto-monitoring:</strong> The system automatically checks for campaigns needing reports every 20 seconds and runs immediately when the page loads.
                 </p>
               </div>
           </div>
         </CardContent>
       </Card>

              {/* Fetch All Reports Button */}
       <Card className="border-green-200 bg-green-50">
         <CardContent className="pt-4">
           <div className="flex items-center justify-between">
             <div className="flex items-start gap-2">
               <RefreshCw className="h-5 w-5 text-green-600 mt-0.5" />
               <div className="text-sm text-green-800">
                 <p className="font-medium mb-1">Quick Fetch All Reports</p>
                 <p>Click the button to fetch reports for all campaigns that need them. This will check for campaigns with "sent" or "sending" status that don't have reports yet.</p>
               </div>
             </div>
             <Button
               onClick={handleManualMonitor}
               className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
               size="lg"
             >
               <RefreshCw className="h-5 w-5" />
               Fetch All Reports
             </Button>
           </div>
         </CardContent>
       </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Campaign</label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue placeholder="Select campaign" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns.map((campaign) => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={selectedTimeframe} onValueChange={(value: '7d' | '30d' | '90d') => setSelectedTimeframe(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Campaign Reports */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {timeframeFilteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No campaign reports available</h3>
                <p className="text-muted-foreground text-center mb-4">
                  {campaigns.length === 0 
                    ? "No campaigns found. Create campaigns to see reports."
                    : "No campaigns with reports found for the selected filters."
                  }
                </p>
                {campaigns.length === 0 && (
                  <Button onClick={() => window.location.href = '/campaigns'}>
                    Create Campaign
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {timeframeFilteredCampaigns.map((campaign) => {
                const metrics = calculateCampaignMetrics(campaign);
                return (
                  <Card key={campaign.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5" />
                            {campaign.name}
                          </CardTitle>
                          <CardDescription>
                            {campaign.group_name} • {campaign.template_name}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(campaign.status)}
                          <Badge variant="outline">
                            {campaign.contact_count} contacts
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                            <span className={`text-sm font-bold ${getDeliveryRateColor(metrics.deliveryRate)}`}>
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
                            <span className={`text-sm font-bold ${getReadRateColor(metrics.readRate)}`}>
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

                                            <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                          <span>Last updated: {new Date(campaign.updated_at).toLocaleDateString()}</span>
                        </div>
                        
                        {/* Campaign Reports Status */}
                        {!campaign.reports_data || campaign.reports_data.length === 0 ? (
                          <div className="text-center py-6 border-2 border-dashed border-gray-200 rounded-lg mt-4">
                            <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                            <h3 className="text-lg font-medium mb-2">No Reports Available</h3>
                            <p className="text-muted-foreground mb-4">
                              Click the button below to fetch the latest reports for this campaign.
                            </p>
                            <Button
                              onClick={() => handleFetchReports(campaign)}
                              disabled={fetchingReports === campaign.id}
                              className="flex items-center gap-2"
                              size="lg"
                            >
                              <RefreshCw className={`h-5 w-5 ${fetchingReports === campaign.id ? 'animate-spin' : ''}`} />
                              {fetchingReports === campaign.id ? 'Fetching Reports...' : 'Fetch Reports'}
                            </Button>
                          </div>
                        ) : (
                          <div className="text-center py-4 bg-green-50 border border-green-200 rounded-lg mt-4">
                            <CheckCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
                            <p className="text-green-800 font-medium">
                              ✅ {campaign.reports_data.length} messages tracked for this campaign
                            </p>
                            <p className="text-sm text-green-600 mt-1">
                              Last updated: {new Date(campaign.updated_at).toLocaleString()}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* View Button */}
                      <div className="mt-4 pt-4 border-t">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Campaign ID: {campaign.id.slice(0, 8)}...</span>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewCampaign(campaign)}
                              className="flex items-center gap-2"
                            >
                              <Eye className="h-4 w-4" />
                              View Details
                            </Button>
                            {campaign.reports_data && campaign.reports_data.length > 0 ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => exportCampaignData(campaign)}
                                className="flex items-center gap-2"
                              >
                                <Download className="h-4 w-4" />
                                Export
                              </Button>
                                                                                      ) : (
                               <Button
                                 variant="outline"
                                 size="sm"
                                 onClick={() => handleFetchReports(campaign)}
                                 disabled={fetchingReports === campaign.id}
                                 className="flex items-center gap-2"
                               >
                                 <RefreshCw className={`h-4 w-4 ${fetchingReports === campaign.id ? 'animate-spin' : ''}`} />
                                 {fetchingReports === campaign.id ? 'Fetching...' : 'Fetch Reports'}
                               </Button>
                             )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="detailed" className="space-y-4">
          {timeframeFilteredCampaigns.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No detailed reports available</h3>
                <p className="text-muted-foreground text-center">
                  Select a campaign to view detailed message reports.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {timeframeFilteredCampaigns.map((campaign) => (
                <Card key={campaign.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          {campaign.name} - Message Details
                        </CardTitle>
                        <CardDescription>
                          {campaign.reports_data && campaign.reports_data.length > 0 
                            ? `${campaign.reports_data.length} messages from this campaign`
                            : 'No messages tracked for this campaign'
                          }
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewCampaign(campaign)}
                          className="flex items-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          View Complete Data
                        </Button>
                        {campaign.reports_data && campaign.reports_data.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportCampaignData(campaign)}
                            className="flex items-center gap-2"
                          >
                            <Download className="h-4 w-4" />
                            Export
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {!campaign.reports_data || campaign.reports_data.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                        <p>No messages found for this campaign</p>
                        <p className="text-sm">Reports are automatically fetched when campaign status becomes "sent"</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Phone Number</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Message Type</TableHead>
                            <TableHead>Submit Time</TableHead>
                            <TableHead>Delivery Time</TableHead>
                            <TableHead>Read Time</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {campaign.reports_data.map((message, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {message.mobileNo}
                              </TableCell>
                              <TableCell>
                                {getMessageStatusBadge(message.status)}
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
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Campaign Details Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              {viewingCampaign?.name} - Complete Campaign Data
            </DialogTitle>
            <DialogDescription>
              View complete campaign information and message reports
            </DialogDescription>
          </DialogHeader>

          {viewingCampaign && (
            <div className="space-y-6">
              {/* Campaign Overview */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campaign Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Basic Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign Name:</span>
                          <span className="font-medium">{viewingCampaign.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Description:</span>
                          <span className="font-medium">{viewingCampaign.description || 'No description'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span>{getStatusBadge(viewingCampaign.status)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Created:</span>
                          <span className="font-medium">{new Date(viewingCampaign.created_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Updated:</span>
                          <span className="font-medium">{new Date(viewingCampaign.updated_at).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Campaign ID:</span>
                          <span className="font-mono text-xs">{viewingCampaign.id}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Campaign Metrics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Sent Count:</span>
                          <span className="font-medium">{viewingCampaign.sent_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Failed Count:</span>
                          <span className="font-medium">{viewingCampaign.failed_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Delivered Count:</span>
                          <span className="font-medium">{viewingCampaign.delivered_count}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Contact Count:</span>
                          <span className="font-medium">{viewingCampaign.contact_count || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Group Name:</span>
                          <span className="font-medium">{viewingCampaign.group_name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Template Name:</span>
                          <span className="font-medium">{viewingCampaign.template_name || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Message Reports */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Message Reports</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(JSON.stringify(viewingCampaign.reports_data, null, 2))}
                        className="flex items-center gap-2"
                      >
                        <Copy className="h-4 w-4" />
                        Copy Reports
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => exportCampaignData(viewingCampaign)}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Export All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {!viewingCampaign.reports_data || viewingCampaign.reports_data.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                      <p>No message reports available for this campaign</p>
                      <p className="text-sm">Reports are automatically fetched when campaign status becomes "sent"</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {viewingCampaign.reports_data.length} messages tracked
                        </span>
                        <Badge variant="outline">
                          Latest {viewingCampaign.reports_data.length} messages
                        </Badge>
                      </div>
                      
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
                          {viewingCampaign.reports_data.map((message, index) => (
                            <TableRow key={index}>
                              <TableCell className="font-mono text-sm">
                                {message.mobileNo}
                              </TableCell>
                              <TableCell>
                                {getMessageStatusBadge(message.status)}
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

              {/* Raw Data */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Raw Campaign Data</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <pre className="text-xs overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(viewingCampaign, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
