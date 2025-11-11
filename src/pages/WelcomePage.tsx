import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, BarChart3, Settings, Shield, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUserRole } from '@/hooks/useUserRole';

const WelcomePage = () => {
  const navigate = useNavigate();
  const { isAdmin } = useUserRole();

  const features = [
    {
      icon: MessageSquare,
      title: "WhatsApp Messaging",
      description: "Send messages directly to your customers through WhatsApp Business API",
      action: () => navigate('/send')
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track message delivery rates, engagement metrics, and performance insights",
      action: () => navigate('/')
    },
    {
      icon: Users,
      title: "Contact Management",
      description: "Organize and manage all your customer contacts in one place",
      action: () => navigate('/messages')
    },
    {
      icon: Settings,
      title: "Configuration",
      description: "Manage your WhatsApp API settings and business preferences",
      action: () => navigate('/settings')
    }
  ];

  const adminFeatures = [
    {
      icon: Shield,
      title: "Admin Dashboard",
      description: "Full system overview with comprehensive analytics and management tools",
      action: () => navigate('/admin')
    },
    {
      icon: Users,
      title: "Client Management",
      description: "Create and manage client accounts with WhatsApp API configuration",
      action: () => navigate('/users')
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary via-primary/90 to-primary/80 text-white py-20">
        <div className="container mx-auto px-6 text-center">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-white/20 rounded-full backdrop-blur-sm animate-float">
              <MessageSquare className="h-16 w-16 text-white" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-6">
            WhatsApp Business Hub
          </h1>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Transform your business communication with our powerful WhatsApp messaging platform. 
            Connect, engage, and grow your customer relationships like never before.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={() => navigate('/send')}
              className="bg-white text-primary hover:bg-white/90 px-8 py-3 text-lg"
            >
              <Zap className="h-5 w-5 mr-2" />
              Start Messaging
            </Button>
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="border-white text-white hover:bg-white hover:text-primary px-8 py-3 text-lg"
            >
              View Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 gradient-text">
              {isAdmin ? 'Admin Features' : 'Platform Features'}
            </h2>
            <p className="text-muted-foreground text-lg">
              {isAdmin 
                ? 'Comprehensive tools for managing your WhatsApp business platform'
                : 'Everything you need to succeed with WhatsApp Business messaging'
              }
            </p>
          </div>

          {/* Main Features Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="card-enhanced hover-lift cursor-pointer group"
                onClick={feature.action}
              >
                <CardHeader className="text-center pb-4">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Admin Features */}
          {isAdmin && (
            <div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold mb-2 text-primary">
                  Administrative Tools
                </h3>
                <p className="text-muted-foreground">
                  Advanced features for system administration and client management
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {adminFeatures.map((feature, index) => (
                  <Card 
                    key={index} 
                    className="card-enhanced hover-lift cursor-pointer group bg-gradient-to-br from-primary/5 to-primary/10"
                    onClick={feature.action}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                          <feature.icon className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-lg">{feature.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>
                        {feature.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div className="mt-20 text-center">
            <div className="bg-gradient-to-r from-primary/5 to-primary/10 rounded-2xl p-8">
              <h3 className="text-2xl font-bold mb-6 gradient-text">
                Ready to Transform Your Business?
              </h3>
              <div className="grid md:grid-cols-3 gap-8 mb-8">
                <div>
                  <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
                  <div className="text-muted-foreground">Uptime Guarantee</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-success mb-2">24/7</div>
                  <div className="text-muted-foreground">Support Available</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-info mb-2">Instant</div>
                  <div className="text-muted-foreground">Message Delivery</div>
                </div>
              </div>
              <Button 
                onClick={() => navigate('/send')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 px-8 py-3 text-lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Send Your First Message
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomePage;