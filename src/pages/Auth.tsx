import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Droplets } from 'lucide-react';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signInWithMagicLink } = useAuth();

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await signInWithMagicLink(email);

    if (error) {
      console.error('Error sending magic link:', error);
    } else {
      setSent(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-background to-secondary/20">
      <Card className="w-full max-w-md shadow-xl border-2">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Droplets className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-3xl font-bold">WhisperWell</CardTitle>
          <CardDescription className="text-base">
            Drop a question. Receive three whispers. <br />
            A small, kind secret.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="text-base"
                />
              </div>
              <Button
                type="submit"
                className="w-full text-base"
                disabled={loading}
              >
                {loading ? 'Sending...' : 'Send Magic Link'}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-2 py-4">
              <p className="text-foreground">Check your email</p>
              <p className="text-sm text-muted-foreground">
                We sent a magic link to <strong>{email}</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
