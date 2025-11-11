import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Label } from '@/components/ui/label';
import { 
  Calendar, 
  Download, 
  RefreshCw, 
  Filter,
  ChevronLeft,
  ChevronRight,
  FileText,
  Smartphone,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useReports, type ReportRecord } from '@/hooks/useReports';
import { useToast } from '@/hooks/use-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Reports: React.FC = () => {
  const { toast } = useToast();
  const {
    reports,
    isLoading,
    error,
    fetchReports,
    getStatusColor,
    getMessageTypeColor,
    formatTimestamp,
    formatMobileNumber,
    getBillingModelColor,
    getDisplayStatus,
  } = useReports();

  // Helper function to format date in YYYY-MM-DD HH:MM:SS format
  const formatDateForAPI = (date: Date, time: string) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day} ${time}`;
  };

  const [reportType, setReportType] = useState<'daily' | 'monthly'>('daily');
  const [filters, setFilters] = useState({
    startCursor: '1'
  });

  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    // Set default dates based on report type
    const now = new Date();
    let fromDate = '';
    let toDate = '';

    if (reportType === 'daily') {
      // Today's date
      fromDate = formatDateForAPI(now, '00:00:00');
      toDate = formatDateForAPI(now, '23:59:59');
    } else {
      // First and last day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      fromDate = formatDateForAPI(firstDay, '00:00:00');
      toDate = formatDateForAPI(lastDay, '23:59:59');
    }

    fetchReports({
      fromDate,
      toDate,
      pageLimit: 100,
      ...filters
    });
  }, [reportType, fetchReports]);


  const handleSearch = () => {
    // Set default dates based on report type
    const now = new Date();
    let fromDate = '';
    let toDate = '';

    if (reportType === 'daily') {
      // Today's date
      fromDate = formatDateForAPI(now, '00:00:00');
      toDate = formatDateForAPI(now, '23:59:59');
    } else {
      // First and last day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      fromDate = formatDateForAPI(firstDay, '00:00:00');
      toDate = formatDateForAPI(lastDay, '23:59:59');
    }

    fetchReports({
      fromDate,
      toDate,
      pageLimit: 100,
      ...filters
    });
  };

  const handleReset = () => {
    const defaultFilters = {
      startCursor: '1'
    };
    setFilters(defaultFilters);
    
    // Set default dates based on report type
    const now = new Date();
    let fromDate = '';
    let toDate = '';

    if (reportType === 'daily') {
      // Today's date
      fromDate = formatDateForAPI(now, '00:00:00');
      toDate = formatDateForAPI(now, '23:59:59');
    } else {
      // First and last day of current month
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      
      fromDate = formatDateForAPI(firstDay, '00:00:00');
      toDate = formatDateForAPI(lastDay, '23:59:59');
    }

    fetchReports({
      fromDate,
      toDate,
      pageLimit: 100,
      ...defaultFilters
    });
  };

  const handleNextPage = () => {
    if (reports?.cursors?.next) {
      const newFilters = { ...filters, startCursor: reports.cursors.next };
      setFilters(newFilters);
      
      // Set default dates based on report type
      const now = new Date();
      let fromDate = '';
      let toDate = '';

      if (reportType === 'daily') {
        fromDate = formatDateForAPI(now, '00:00:00');
        toDate = formatDateForAPI(now, '23:59:59');
      } else {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        fromDate = formatDateForAPI(firstDay, '00:00:00');
        toDate = formatDateForAPI(lastDay, '23:59:59');
      }

      fetchReports({
        fromDate,
        toDate,
        pageLimit: 100,
        ...newFilters
      });
    }
  };

  const handlePrevPage = () => {
    if (reports?.cursors?.start && reports.pages.current > 1) {
      const newFilters = { ...filters, startCursor: reports.cursors.start };
      setFilters(newFilters);
      
      // Set default dates based on report type
      const now = new Date();
      let fromDate = '';
      let toDate = '';

      if (reportType === 'daily') {
        fromDate = formatDateForAPI(now, '00:00:00');
        toDate = formatDateForAPI(now, '23:59:59');
      } else {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        fromDate = formatDateForAPI(firstDay, '00:00:00');
        toDate = formatDateForAPI(lastDay, '23:59:59');
      }

      fetchReports({
        fromDate,
        toDate,
        pageLimit: 100,
        ...newFilters
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toUpperCase()) {
      case 'DELIVERED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMessageTypeIcon = (msgType: string) => {
    switch (msgType.toLowerCase()) {
      case 'text':
        return <MessageSquare className="h-4 w-4" />;
      case 'media':
        return <FileText className="h-4 w-4" />;
      case 'reply':
        return <Smartphone className="h-4 w-4" />;
      default:
        return <MessageSquare className="h-4 w-4" />;
    }
  };

     // Helper functions to prepare chart data
   const getStatusChartData = () => {
     if (!reports?.records) return null;
     
     const statusCounts = reports.records.reduce((acc, record) => {
       const displayStatus = getDisplayStatus(record);
       acc[displayStatus] = (acc[displayStatus] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);

     const colors = {
       'DELIVERED': '#10b981',
       'READ': '#059669',
       'FAILED': '#ef4444',
       'PENDING': '#f59e0b',
       'SENT': '#3b82f6'
     };

     return {
       labels: Object.keys(statusCounts),
       datasets: [{
         data: Object.values(statusCounts),
         backgroundColor: Object.keys(statusCounts).map(status => colors[status as keyof typeof colors] || '#6b7280'),
         borderWidth: 2,
         borderColor: '#ffffff'
       }]
     };
   };

   const getMessageTypeChartData = () => {
     if (!reports?.records) return null;
     
     const typeCounts = reports.records.reduce((acc, record) => {
       acc[record.msgType] = (acc[record.msgType] || 0) + 1;
       return acc;
     }, {} as Record<string, number>);

     const colors = {
       'text': '#3b82f6',
       'media': '#10b981',
       'reply': '#f59e0b',
       'template': '#8b5cf6'
     };

     return {
       labels: Object.keys(typeCounts),
       datasets: [{
         data: Object.values(typeCounts),
         backgroundColor: Object.keys(typeCounts).map(type => colors[type as keyof typeof colors] || '#6b7280'),
         borderWidth: 2,
         borderColor: '#ffffff'
       }]
     };
   };

   const getHourlyDistributionData = () => {
     if (!reports?.records) return null;
     
     const hourlyCounts = new Array(24).fill(0);
     
     reports.records.forEach(record => {
       const timestamp = parseInt(record.submitTime);
       if (timestamp) {
         const date = new Date(timestamp);
         const hour = date.getHours();
         hourlyCounts[hour]++;
       }
     });

     return {
       labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
       datasets: [{
         label: 'Messages Sent',
         data: hourlyCounts,
         backgroundColor: 'rgba(59, 130, 246, 0.8)',
         borderColor: 'rgba(59, 130, 246, 1)',
         borderWidth: 1
       }]
     };
   };

       const getStatsData = () => {
      if (!reports?.records) return null;
      
      const totalMessages = reports.records.length;
      if (totalMessages === 0) return null;

      const deliveredCount = reports.records.filter(r => r.status === 'DELIVERED').length;
      const readCount = reports.records.filter(r => r.readTime && r.readTime > 0).length;
      const failedCount = reports.records.filter(r => r.status === 'FAILED').length;

      const deliveredRate = ((deliveredCount / totalMessages) * 100).toFixed(1);
      const readRate = ((readCount / totalMessages) * 100).toFixed(1);
      const failedRate = ((failedCount / totalMessages) * 100).toFixed(1);

      return {
        labels: ['Delivered Rate', 'Read Rate', 'Failed Rate'],
        datasets: [{
          label: 'Percentage (%)',
          data: [parseFloat(deliveredRate), parseFloat(readRate), parseFloat(failedRate)],
          backgroundColor: [
            'rgba(16, 185, 129, 0.8)',  // Green for delivered
            'rgba(5, 150, 105, 0.8)',   // Emerald for read
            'rgba(239, 68, 68, 0.8)'    // Red for failed
          ],
          borderColor: [
            'rgba(16, 185, 129, 1)',
            'rgba(5, 150, 105, 1)',
            'rgba(239, 68, 68, 1)'
          ],
          borderWidth: 2,
          borderRadius: 8,
          borderSkipped: false,
        }]
      };
    };

   const exportToCSV = () => {
     if (!reports?.records) return;

         const headers = [
       'Message ID',
       'Message Type',
       'Status',
       'Mobile Number',
       'Submit Time',
       'Delivery Time',
       'Read Time',
       'Billing Model',
       'Channel',
       'Cause',
       'Error Code'
     ];

    const csvContent = [
      headers.join(','),
             ...reports.records.map(record => [
         record.msgId,
         record.msgType,
         record.status,
         record.mobileNo,
         formatTimestamp(parseInt(record.submitTime)),
         formatTimestamp(record.deliveryTime),
         formatTimestamp(record.readTime),
         record.billingModel,
         record.channel,
         record.cause,
         record.globalErrorCode
       ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `whatsapp-reports-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export Successful",
      description: "Reports exported to CSV file",
    });
  };

  // Add error boundary for the component
  if (error) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">WhatsApp Reports</h1>
            <p className="text-muted-foreground">
              View and analyze your WhatsApp message delivery reports
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Error Loading Reports</h3>
              <p className="text-muted-foreground mb-4">{error}</p>
              <Button onClick={() => window.location.reload()}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">WhatsApp Reports</h1>
          <p className="text-muted-foreground">
            View and analyze your WhatsApp message delivery reports
          </p>
        </div>
                 <div className="flex gap-2">
           <Button
             variant="outline"
             onClick={handleReset}
             disabled={isLoading}
           >
             <RefreshCw className="h-4 w-4 mr-2" />
             Reset
           </Button>
           <Button
             onClick={exportToCSV}
             disabled={!reports?.records?.length}
           >
             <Download className="h-4 w-4 mr-2" />
             Export CSV
           </Button>
         </div>
      </div>

             {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filter Reports
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Report Type Selection */}
            <div className="flex items-center space-x-4 mb-4">
              <Label htmlFor="reportType" className="text-sm font-medium">Report Type:</Label>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="daily"
                  name="reportType"
                  value="daily"
                  checked={reportType === 'daily'}
                  onChange={(e) => {
                    const type = e.target.value as 'daily' | 'monthly';
                    setReportType(type);
                    
                    // Update dates based on new report type
                    const now = new Date();
                    let fromDate = '';
                    let toDate = '';

                    if (type === 'daily') {
                      fromDate = formatDateForAPI(now, '00:00:00');
                      toDate = formatDateForAPI(now, '23:59:59');
                    } else {
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      fromDate = formatDateForAPI(firstDay, '00:00:00');
                      toDate = formatDateForAPI(lastDay, '23:59:59');
                    }

                    setFilters(prev => ({
                      ...prev,
                      fromDate,
                      toDate
                    }));

                    fetchReports({
                      fromDate,
                      toDate,
                      pageLimit: 100
                    });
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="daily" className="text-sm font-medium">Daily</Label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="monthly"
                  name="reportType"
                  value="monthly"
                  checked={reportType === 'monthly'}
                  onChange={(e) => {
                    const type = e.target.value as 'daily' | 'monthly';
                    setReportType(type);
                    
                    // Update dates based on new report type
                    const now = new Date();
                    let fromDate = '';
                    let toDate = '';

                    if (type === 'daily') {
                      fromDate = formatDateForAPI(now, '00:00:00');
                      toDate = formatDateForAPI(now, '23:59:59');
                    } else {
                      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      fromDate = formatDateForAPI(firstDay, '00:00:00');
                      toDate = formatDateForAPI(lastDay, '23:59:59');
                    }

                    setFilters(prev => ({
                      ...prev,
                      fromDate,
                      toDate
                    }));

                    fetchReports({
                      fromDate,
                      toDate,
                      pageLimit: 100
                    });
                  }}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 focus:ring-blue-500"
                />
                <Label htmlFor="monthly" className="text-sm font-medium">Monthly</Label>
              </div>
            </div>

          </CardContent>
                 </Card>

      {/* Summary Cards */}
      {reports && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reports.counts.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Delivered</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {reports.records.filter(r => r.status === 'DELIVERED').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Read</CardTitle>
              <CheckCircle className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">
                {reports.records.filter(r => r.readTime && r.readTime > 0).length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Failed</CardTitle>
              <XCircle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {reports.records.filter(r => r.status === 'FAILED').length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Page</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {reports.pages.current} / {reports.pages.last}
              </div>
            </CardContent>
          </Card>
                 </div>
       )}

       {/* Charts Section */}
       {reports && reports.records.length > 0 && (
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
           {/* Status Distribution Pie Chart */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <CheckCircle className="h-4 w-4" />
                 Message Status Distribution
               </CardTitle>
               <CardDescription>
                 Distribution of messages by delivery status
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-64 flex items-center justify-center">
                 {getStatusChartData() ? (
                   <Pie 
                     data={getStatusChartData()!}
                     options={{
                       responsive: true,
                       maintainAspectRatio: false,
                       plugins: {
                         legend: {
                           position: 'bottom' as const,
                         },
                         tooltip: {
                           callbacks: {
                             label: function(context) {
                               const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                               const percentage = ((context.parsed / total) * 100).toFixed(1);
                               return `${context.label}: ${context.parsed} (${percentage}%)`;
                             }
                           }
                         }
                       }
                     }}
                   />
                 ) : (
                   <div className="text-center text-muted-foreground">
                     No data available for chart
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>

           {/* Message Type Distribution Pie Chart */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <MessageSquare className="h-4 w-4" />
                 Message Type Distribution
               </CardTitle>
               <CardDescription>
                 Distribution of messages by type
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-64 flex items-center justify-center">
                 {getMessageTypeChartData() ? (
                   <Pie 
                     data={getMessageTypeChartData()!}
                     options={{
                       responsive: true,
                       maintainAspectRatio: false,
                       plugins: {
                         legend: {
                           position: 'bottom' as const,
                         },
                         tooltip: {
                           callbacks: {
                             label: function(context) {
                               const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                               const percentage = ((context.parsed / total) * 100).toFixed(1);
                               return `${context.label}: ${context.parsed} (${percentage}%)`;
                             }
                           }
                         }
                       }
                     }}
                   />
                 ) : (
                   <div className="text-center text-muted-foreground">
                     No data available for chart
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>

           {/* Hourly Distribution Bar Chart */}
           <Card>
             <CardHeader>
               <CardTitle className="flex items-center gap-2">
                 <Clock className="h-4 w-4" />
                 Hourly Message Distribution
               </CardTitle>
               <CardDescription>
                 Number of messages sent by hour of day
               </CardDescription>
             </CardHeader>
             <CardContent>
               <div className="h-64">
                 {getHourlyDistributionData() ? (
                   <Bar 
                     data={getHourlyDistributionData()!}
                     options={{
                       responsive: true,
                       maintainAspectRatio: false,
                       plugins: {
                         legend: {
                           display: false,
                         },
                         tooltip: {
                           callbacks: {
                             label: function(context) {
                               return `Messages: ${context.parsed.y}`;
                             }
                           }
                         }
                       },
                       scales: {
                         y: {
                           beginAtZero: true,
                           ticks: {
                             stepSize: 1
                           }
                         }
                       }
                     }}
                   />
                 ) : (
                   <div className="text-center text-muted-foreground">
                     No data available for chart
                   </div>
                 )}
               </div>
             </CardContent>
           </Card>

                       {/* Message Statistics Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Message Performance Statistics
                </CardTitle>
                <CardDescription>
                  Delivery, read, and failure rates as percentages
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {getStatsData() ? (
                    <Bar 
                      data={getStatsData()!}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: {
                            display: false,
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return `${context.label}: ${context.parsed.y}%`;
                              }
                            }
                          }
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              stepSize: 20,
                              callback: function(value) {
                                return value + '%';
                              }
                            }
                          }
                        }
                      }}
                    />
                  ) : (
                    <div className="text-center text-muted-foreground">
                      No data available for chart
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
         </div>
       )}

       {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <CardTitle>Message Reports</CardTitle>
          <CardDescription>
            Detailed view of all WhatsApp message delivery reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : reports?.records?.length ? (
            <div className="space-y-4">
              <Table>
                                 <TableHeader>
                   <TableRow>
                     <TableHead>Message ID</TableHead>
                     <TableHead>Type</TableHead>
                     <TableHead>Status</TableHead>
                     <TableHead>Mobile</TableHead>
                     <TableHead>Submit Time</TableHead>
                     <TableHead>Delivery Time</TableHead>
                     <TableHead>Read Time</TableHead>
                     <TableHead>Billing</TableHead>
                     <TableHead>Channel</TableHead>
                   </TableRow>
                 </TableHeader>
                                <TableBody>
                  {reports.records
                    .sort((a, b) => parseInt(b.submitTime) - parseInt(a.submitTime)) // Sort by submitTime descending (latest first)
                    .map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-mono text-xs">
                        {record.msgId}
                      </TableCell>
                      <TableCell>
                        <Badge className={getMessageTypeColor(record.msgType)}>
                          <div className="flex items-center gap-1">
                            {getMessageTypeIcon(record.msgType)}
                            {record.msgType}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(getDisplayStatus(record))}>
                          <div className="flex items-center gap-1">
                            {getStatusIcon(getDisplayStatus(record))}
                            {getDisplayStatus(record)}
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">
                        {formatMobileNumber(record.mobileNo)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTimestamp(parseInt(record.submitTime))}
                      </TableCell>
                      <TableCell className="text-xs">
                        {formatTimestamp(record.deliveryTime)}
                      </TableCell>
                      <TableCell className="text-xs">
                        {record.readTime && record.readTime > 0 ? formatTimestamp(record.readTime) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getBillingModelColor(record.billingModel)}>
                          {record.billingModel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {record.channel}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {reports.counts.current} of {reports.counts.total} records
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handlePrevPage}
                    disabled={!reports.cursors.start || reports.pages.current <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm">
                    Page {reports.pages.current} of {reports.pages.last}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNextPage}
                    disabled={!reports.cursors.next}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No reports found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters or check back later for new reports.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Reports;
