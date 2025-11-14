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
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-well/5">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[400px] h-[400px] rounded-full bg-well/5 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-well-light/5 blur-3xl" />
      </div>
      
      <header className="border-b bg-card/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-well/20 to-well-light/20 flex items-center justify-center">
              <Droplets className="w-5 h-5 text-well" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-to-br from-well to-well-light bg-clip-text text-transparent">
              WhisperWell
            </h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleSignOut}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 py-8 relative z-10">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-card/80 backdrop-blur-sm border shadow-sm">
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
