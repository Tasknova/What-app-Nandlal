import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Users, ArrowRight } from 'lucide-react';
import { useClientAuth } from '@/hooks/useClientAuth';

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
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Hero Image */}
        <div className="hidden lg:block">
          <div className="relative bg-gradient-to-br from-amber-100 to-yellow-100 rounded-2xl shadow-2xl p-12 flex items-center justify-center min-h-[500px]">
            <div className="text-center">
              <img 
                src="/logo.png" 
                alt="Nandlal Jewellers" 
                className="w-64 h-auto mx-auto mb-6 object-contain"
              />
              <h2 className="text-3xl font-bold mb-2 text-gray-900">Nandlal Jewellers</h2>
              <p className="text-lg text-gray-700">WhatsApp Business Management System</p>
            </div>
          </div>
        </div>

        {/* Right side - Login Options */}
        <div className="space-y-6">
          {/* Header */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Welcome to Nandlal Jewellers</h1>
            <p className="text-lg text-gray-600">Sign in to manage your WhatsApp campaigns</p>
          </div>

          {/* Login Form */}
          <Card className="w-full">
            <CardHeader className="text-center">
              <div className="flex items-center justify-center mb-4 text-amber-600">
                <div className="p-3 rounded-full bg-amber-100">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold">Staff Login</CardTitle>
              <CardDescription>
                Sign in with your credentials to access the system
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
                <p>Need help? Contact your IT administrator for assistance.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;