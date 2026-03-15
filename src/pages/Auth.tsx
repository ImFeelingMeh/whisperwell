import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [showEmailAuth, setShowEmailAuth] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { signInAnonymously, signIn, signUp } = useAuth();
  const { toast } = useToast();

  const handleAnonymousSignIn = async () => {
    setLoading(true);

    const { error } = await signInAnonymously();

    if (error) {
      toast({
        title: "Error",
        description: "Anonymous login is not enabled in Supabase. Enable it in Auth settings.",
        variant: "destructive",
      });
    }

    setLoading(false);
  };

  const handleEmailAuth = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) return;

    setLoading(true);

    const { error } = isSignUp
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/4 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[300px] h-[300px] rounded-full bg-accent/4 blur-3xl" />
      </div>

      <Card className="w-full max-w-sm shadow-lg border relative z-10 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-3 pb-2">
          <div className="mx-auto w-12 h-1.5 rounded-full bg-primary/30" />
          <CardTitle className="text-2xl font-display font-bold text-primary">
            WhisperWell
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground leading-relaxed">
            A quiet space to be heard.<br />
            Drop a whisper. Hear kind voices echo back.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              type="button"
              className="w-full h-11 font-display font-semibold"
              onClick={handleAnonymousSignIn}
              disabled={loading}
            >
              {loading ? 'Entering the well…' : 'Continue anonymously'}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full h-11 font-display"
              onClick={() => setShowEmailAuth((value) => !value)}
              disabled={loading}
            >
              {showEmailAuth ? 'Hide email option' : 'Use email to save progress'}
            </Button>

            {showEmailAuth && (
              <form className="space-y-3 pt-1" onSubmit={handleEmailAuth}>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  required
                />
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  minLength={6}
                  required
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Please wait…' : isSignUp ? 'Create anonymous account' : 'Sign in with email'}
                </Button>
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground mx-auto block"
                  onClick={() => setIsSignUp((value) => !value)}
                >
                  {isSignUp ? 'Already registered? Sign in' : 'New here? Create account'}
                </button>
              </form>
            )}

            <p className="text-xs text-center text-muted-foreground">
              No username, no public profile, no visible identity.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
