import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Users, ArrowRight, Crown } from 'lucide-react';
import { useClientAuth } from '@/hooks/useClientAuth';
import authHero from '@/assets/auth-hero.jpg';

const Auth = () => {
  const [userIdentifier, setUserIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { signIn: signInClient } = useClientAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // For client login, use user_id and password from clients table
      const result = await signInClient(userIdentifier, password);
      
      if (result.error) {
        setError(result.error);
        setIsLoading(false);
      } else {
        navigate('/');
      }
    } catch (error) {
      setError('An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      {/* Admin Login Button - Top Right Corner */}
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-4 right-4 text-gray-600 hover:text-gray-900"
        onClick={() => navigate('/admin-auth')}
      >
        <Crown className="h-4 w-4 mr-2" />
        Admin Login
      </Button>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Hero Image */}
        <div className="hidden lg:block">
          <div className="relative">
            <img 
              src={authHero} 
              alt="WhatsApp Business Hub" 
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            <div className="absolute bottom-6 left-6 text-white">
              <h2 className="text-3xl font-bold mb-2">WhatsApp Business Hub</h2>
              <p className="text-lg opacity-90">Manage your WhatsApp campaigns with ease</p>
            </div>
          </div>
        </div>

        {/* Right side - Login Options */}
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome Back</h1>
            <p className="text-lg text-gray-600">Sign in to your WhatsApp Business Hub</p>
          </div>

          {/* Login Form */}
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4 text-blue-600">
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Client Login</CardTitle>
              <CardDescription>
                Sign in with your email and password
              </CardDescription>
            </CardHeader>
            <CardContent>


              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="identifier">Email or User ID</Label>
                  <Input
                    id="identifier"
                    type="text"
                    value={userIdentifier}
                    onChange={(e) => setUserIdentifier(e.target.value)}
                    placeholder="Enter your email or user ID"
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="h-12 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <Button 
                  type="submit" 
                  className="w-full h-12 text-base font-medium" 
                  disabled={isLoading}
                >
                  {isLoading ? (
                    'Signing In...'
                  ) : (
                    <>
                      Sign In
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
              
              <div className="mt-6 text-center text-sm text-muted-foreground">
                <p>Don't have an account? Contact your administrator to get access.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;