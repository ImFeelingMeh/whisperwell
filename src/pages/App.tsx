import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Droplet, MessageCircleHeart, Send } from 'lucide-react';
import MoodCheckin from '@/components/MoodCheckin';
import DropWhisper from '@/components/DropWhisper';
import RespondToWhispers from '@/components/RespondToWhispers';

type View = 'home' | 'drop' | 'respond';

const AppPage = () => {
  const { user, signOut } = useAuth();
  const [view, setView] = useState<View>('home');

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Subtle background gradients */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full bg-primary/3 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] rounded-full bg-accent/3 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => setView('home')} className="flex items-center gap-2">
            <Droplet className="w-5 h-5 text-primary" />
            <h1 className="text-lg font-display font-bold text-primary">
              WhisperWell
            </h1>
          </button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-lg mx-auto px-4 py-6 relative z-10">
        {view === 'home' && (
          <div className="space-y-5 animate-fade-in-up">
            <MoodCheckin userId={user.id} />

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setView('drop')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-primary/30 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Send className="w-5 h-5 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-display font-semibold text-sm text-foreground">Drop a whisper</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Share what's on your mind</p>
                </div>
              </button>

              <button
                onClick={() => setView('respond')}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border-2 border-border bg-card hover:border-accent/30 hover:shadow-md transition-all duration-300 group"
              >
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                  <MessageCircleHeart className="w-5 h-5 text-accent" />
                </div>
                <div className="text-center">
                  <p className="font-display font-semibold text-sm text-foreground">Respond to whispers</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Help someone feel less alone</p>
                </div>
              </button>
            </div>

            {/* Gentle message */}
            <div className="text-center py-6">
              <div className="well-visual mb-4 animate-float mx-auto" style={{ width: 100, height: 100 }}>
                <div className="well-opening" style={{ opacity: 0.3 }} />
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Throw a whisper into the well and hear kind voices echo back.
              </p>
            </div>
          </div>
        )}

        {view === 'drop' && (
          <DropWhisper userId={user.id} onBack={() => setView('home')} />
        )}

        {view === 'respond' && (
          <RespondToWhispers userId={user.id} onBack={() => setView('home')} />
        )}
      </main>
    </div>
  );
};

export default AppPage;
