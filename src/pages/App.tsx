import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Droplets, LogOut } from 'lucide-react';
import AskTab from '@/components/AskTab';
import AnswerTab from '@/components/AnswerTab';

const AppPage = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('ask');

  const handleSignOut = async () => {
    await signOut();
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">WhisperWell</h1>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-2xl mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="ask" className="text-base">Ask</TabsTrigger>
            <TabsTrigger value="answer" className="text-base">Answer</TabsTrigger>
          </TabsList>

          <TabsContent value="ask" className="mt-0">
            <AskTab userId={user.id} />
          </TabsContent>

          <TabsContent value="answer" className="mt-0">
            <AnswerTab userId={user.id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AppPage;
