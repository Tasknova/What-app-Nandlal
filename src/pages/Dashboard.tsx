import { MessageSquare, Users, BarChart3, Send, Settings, Clock, FileText, HelpCircle, TrendingUp, CheckCircle, Wallet, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';
import { useClientAuth } from '@/hooks/useClientAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useClientData } from '@/hooks/useClientData';
import { useWalletBalance } from '@/hooks/useWalletBalance';
import { useRecentActivity } from '@/hooks/useRecentActivity';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();
  const { client } = useClientAuth();
  const { admin } = useAdminAuth();
  const { getStats, loading: dataLoading } = useClientData();
  const { balance, loading: walletLoading, error: walletError, fetchWalletBalance, formatBalance, formatExpiryDate } = useWalletBalance();
  const { activities, loading: activitiesLoading, formatTimeAgo, fetchRecentActivities } = useRecentActivity();

  const currentUser = admin || client;
  const userName = admin ? admin.full_name : client?.business_name;
  const stats = getStats();

  // Helper function to get icon component
  const getActivityIcon = (iconName: string) => {
    switch (iconName) {
      case 'Send':
        return <Send className="h-4 w-4" />;
      case 'FileText':
        return <FileText className="h-4 w-4" />;
      case 'Users':
        return <Users className="h-4 w-4" />;
      case 'MessageSquare':
        return <MessageSquare className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  // Helper function to get color class
  const getActivityColor = (color: string) => {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'blue':
        return 'bg-blue-500';
      case 'purple':
        return 'bg-purple-500';
      case 'gray':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const quickActions = [
    {
      title: 'Create Campaign',
      description: 'Create and send campaigns to your contacts',
      icon: Send,
      action: () => navigate('/campaigns'),
      color: 'bg-blue-500',
      textColor: 'text-white'
    },
    {
      title: 'Reports',
      description: 'View detailed reports and analytics',
      icon: BarChart3,
      action: () => navigate('/reports'),
      color: 'bg-green-500',
      textColor: 'text-white'
    },
    {
      title: 'Manage Contacts',
      description: 'Organize your customer contacts',
      icon: Users,
      action: () => navigate('/contacts'),
      color: 'bg-purple-500',
      textColor: 'text-white'
    }
  ];

  const adminActions = [
    {
      title: 'Client Management',
      description: 'Manage all client accounts',
      icon: Users,
      action: () => navigate('/admin/clients'),
      color: 'bg-red-500',
      textColor: 'text-white'
    },
    {
      title: 'User Management',
      description: 'Create and manage users',
      icon: Settings,
      action: () => navigate('/users'),
      color: 'bg-indigo-500',
      textColor: 'text-white'
    },
    {
      title: 'Wallet Balances',
      description: 'View client wallet balances',
      icon: Wallet,
      action: () => navigate('/admin/wallets'),
      color: 'bg-green-500',
      textColor: 'text-white'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-100 rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className="p-2 bg-blue-500 rounded-full">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {isAdmin ? 'Admin Portal' : 'WhatsApp Business Hub'}
                </h1>
                <p className="text-gray-600">
                  Welcome back, {userName}!
                </p>
              </div>
            </div>
            <p className="text-gray-700">
              {isAdmin 
                ? 'Manage your clients and system settings' 
                : 'Manage your business communications efficiently'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Wallet Balance - Prominent for clients at the top */}
      {!isAdmin && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-500 rounded-full">
                <Wallet className="h-6 w-6 text-white" />
              </div>
                             <div>
                 <h2 className="text-lg font-semibold text-gray-900">Wallet Balance</h2>
                 <p className="text-sm text-gray-600">Your current account balance</p>
               </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                {walletLoading ? (
                  <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin text-gray-400" />
                    <span className="text-sm text-gray-500">Loading...</span>
                  </div>
                                 ) : walletError ? (
                   <div className="text-right">
                     <p className="text-sm text-red-600">Unable to load balance</p>
                     <p className="text-xs text-gray-500">Start proxy server: node proxy-server.js</p>
                   </div>
                ) : balance ? (
                  <div className="text-right">
                    <p className="text-3xl font-bold text-green-700">
                      ₹{formatBalance(balance.smsBalance)}
                    </p>
                    <p className="text-sm text-gray-500">
                      Expires: {formatExpiryDate(balance.expDate)}
                    </p>
                  </div>
                ) : (
                  <div className="text-right">
                    <p className="text-sm text-gray-500">No balance data</p>
                    <p className="text-xs text-gray-400">Click refresh to load</p>
                  </div>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchWalletBalance}
                disabled={walletLoading}
                className="border-green-300 hover:bg-green-50"
              >
                <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold">
                  {dataLoading ? '...' : stats.totalMessages}
                </p>
              </div>
              <Send className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Contacts</p>
                <p className="text-2xl font-bold">
                  {dataLoading ? '...' : stats.totalContacts}
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Templates</p>
                <p className="text-2xl font-bold">
                  {dataLoading ? '...' : stats.totalTemplates}
                </p>
              </div>
              <FileText className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Delivered</p>
                <p className="text-2xl font-bold">
                  {dataLoading ? '...' : stats.messagesDelivered}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(isAdmin ? adminActions : quickActions).map((action, index) => (
            <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <div className={`p-2 rounded-full ${action.color}`}>
                    <action.icon className={`h-5 w-5 ${action.textColor}`} />
                  </div>
                  <h3 className="font-medium">{action.title}</h3>
                </div>
                <p className="text-sm text-gray-600 mb-3">{action.description}</p>
                <Button onClick={action.action} size="sm" className="w-full">
                  Open
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                <div>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Your latest messaging activities
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchRecentActivities}
                disabled={activitiesLoading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${activitiesLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {activitiesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                      <div className="h-4 bg-gray-300 rounded w-32"></div>
                    </div>
                    <div className="h-4 bg-gray-300 rounded w-16"></div>
                  </div>
                ))}
              </div>
            ) : activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 ${getActivityColor(activity.color)} rounded-full`}></div>
                      <div className="flex items-center gap-2">
                        {getActivityIcon(activity.icon)}
                        <div>
                          <div className="text-sm font-medium">{activity.title}</div>
                          <div className="text-xs text-gray-600">{activity.description}</div>
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">{formatTimeAgo(activity.timestamp)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm">No recent activity</p>
                <p className="text-xs">Start using the platform to see your activities here</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Getting Started
            </CardTitle>
            <CardDescription>
              Quick tips to get the most out of your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Create Your First Campaign</h4>
                <p className="text-xs text-gray-600">
                  Start by creating a campaign to send messages to your contacts.
                </p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-sm mb-1">Organize Your Contacts</h4>
                <p className="text-xs text-gray-600">
                  Import and organize your customer contacts for better management.
                </p>
              </div>
              <div className="p-3 border border-gray-200 rounded-lg">
                <h4 className="font-medium text-sm mb-1">View Reports</h4>
                <p className="text-xs text-gray-600">
                  Monitor your message performance and delivery statistics.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;