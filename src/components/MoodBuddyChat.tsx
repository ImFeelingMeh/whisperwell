import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface MoodBuddyChatProps {
  userId: string;
  onBack: () => void;
  initialMood?: string | null;
}

type ChatMessage = {
  id: string;
  room_id: string;
  user_id: string;
  message: string;
  created_at: string;
};

const MoodBuddyChat = ({ userId, onBack, initialMood }: MoodBuddyChatProps) => {
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [sending, setSending] = useState(false);
  const [todayMood, setTodayMood] = useState<string | null>(null);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const { toast } = useToast();

  const todayKey = useMemo(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  }, []);

  const moodLabel = useMemo(() => {
    if (!todayMood) return null;
    return {
      good: 'good',
      okay: 'okay',
      struggling: 'struggling',
    }[todayMood] || todayMood;
  }, [todayMood]);

  const quickPrompts = [
    'You do not have to explain everything.',
    'What is one thing that made today a little easier?',
    'A small win counts too.',
  ] as const;

  const fetchMessages = async (targetRoomId: string) => {
    const { data, error } = await (supabase as any)
      .from('mood_chat_messages' as any)
      .select('id, room_id, user_id, message, created_at')
      .eq('room_id', targetRoomId)
      .order('created_at', { ascending: true })
      .limit(150);

    if (!error) {
      setMessages((data || []) as ChatMessage[]);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages.length]);

  const joinRoomForMood = async (mood: string) => {
    setJoining(true);

    const { data, error } = await supabase.rpc('join_or_create_daily_mood_room' as any, {
      p_mood: mood,
    } as any);

    if (error) {
      setJoining(false);
      toast({
        title: 'Could not open mood chat',
        description: 'Please run the latest Supabase migration for mood chat rooms.',
        variant: 'destructive',
      });
      return;
    }

    const normalizedRoomId =
      typeof data === 'string'
        ? data
        : Array.isArray(data)
          ? (data[0]?.join_or_create_daily_mood_room || data[0]?.room_id || null)
          : (data as any)?.join_or_create_daily_mood_room || null;

    if (!normalizedRoomId) {
      setJoining(false);
      return;
    }

    setRoomId(normalizedRoomId);
    await fetchMessages(normalizedRoomId);
    setJoining(false);
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);

      const fallbackMoodResponse = await (supabase as any)
        .from('mood_checkins' as any)
        .select('mood, checkin_date, created_at')
        .eq('user_id', userId)
        .eq('checkin_date', todayKey)
        .maybeSingle();

      const mood = initialMood || (fallbackMoodResponse.data as any)?.mood || null;
      setTodayMood(mood);

      if (mood) {
        await joinRoomForMood(mood);
      }

      setLoading(false);
    };

    init();
  }, [todayKey, userId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`mood-chat-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mood_chat_messages',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchMessages(roomId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const sendMessage = async () => {
    if (!roomId || !draft.trim()) return;

    setSending(true);
    const { error } = await (supabase as any)
      .from('mood_chat_messages' as any)
      .insert({
        room_id: roomId,
        user_id: userId,
        message: draft.trim(),
      } as any);

    if (error) {
      toast({
        title: 'Message not sent',
        description: 'Mood chat requires the new SQL migration to be applied.',
        variant: 'destructive',
      });
      setSending(false);
      return;
    }

    setDraft('');
    setSending(false);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
          Back
        </button>
        <Card className="panel-surface overflow-hidden">
          <CardContent className="py-14 text-center text-sm text-muted-foreground space-y-3">
            <div className="mx-auto h-12 w-12 rounded-full border border-primary/15 bg-primary/5 animate-pulse" />
            <p>Preparing your mood room...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground">
        Back
      </button>

      <Card className="panel-surface overflow-hidden">
        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-0">
          <div className="border-b lg:border-b-0 lg:border-r border-border/70">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle className="text-2xl font-display text-primary">Same-feeling chat</CardTitle>
                  <CardDescription className="mt-1 max-w-xl leading-relaxed">
                    {todayMood
                      ? `Today’s room is for people feeling ${moodLabel} — no pressure, just a quieter place to compare notes.`
                      : 'Set today\'s mood check-in first to open a same-feeling room.'}
                  </CardDescription>
                </div>
                {todayMood && (
                  <div className="rounded-full border bg-primary/8 px-3 py-1 text-xs font-semibold text-primary">
                    Live room
                  </div>
                )}
              </div>

              {todayMood && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <span key={prompt} className="rounded-full border bg-muted/35 px-3 py-1 text-xs text-muted-foreground">
                      {prompt}
                    </span>
                  ))}
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4">
              {!todayMood && (
                <div className="rounded-2xl border bg-muted/30 px-4 py-4 text-sm text-muted-foreground">
                  Go back to Home and use the Check-in card. Once mood is saved, this room unlocks automatically.
                </div>
              )}

              {todayMood && (
                <div className="rounded-2xl border bg-background/90 p-3 h-[52vh] min-h-[320px] overflow-y-auto space-y-3 scroll-smooth">
                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-6 text-sm text-muted-foreground text-center">
                      No messages yet. You can start gently.
                    </div>
                  )}

                  {messages.map((message) => {
                    const mine = message.user_id === userId;

                    return (
                      <div
                        key={message.id}
                        className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[84%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                            mine
                              ? 'bg-primary/10 border border-primary/20'
                              : 'bg-muted/40 border border-border/70'
                          }`}
                        >
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                            {mine ? 'You' : 'Someone feeling similar'}
                          </p>
                          <p className="leading-relaxed">{message.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </CardContent>
          </div>

          <div className="bg-gradient-to-b from-primary/4 via-background to-accent/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-display text-foreground">Room details</CardTitle>
              <CardDescription>Built for today’s emotional weather.</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="rounded-2xl border bg-background/85 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mood</p>
                <p className="text-lg font-display text-foreground capitalize">{moodLabel || 'Unassigned'}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This room keeps your conversation aligned with how you said you feel today.
                </p>
              </div>

              <div className="rounded-2xl border bg-background/85 px-4 py-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How to use it</p>
                <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-4">
                  <li>Write like you would to someone sitting beside you.</li>
                  <li>Keep replies short, kind, and concrete.</li>
                  <li>If you need a pause, leave and come back later.</li>
                </ul>
              </div>

              <div className="rounded-2xl border bg-muted/20 px-4 py-4 text-xs text-muted-foreground leading-relaxed">
                Mood chat is separate from whisper responses. It opens only after your daily check-in and keeps the room centered on people who named the same mood.
              </div>

              {todayMood && (
                <div className="space-y-2">
                  <Textarea
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Send a supportive message"
                    maxLength={300}
                    rows={4}
                    className="resize-none rounded-2xl min-h-[120px]"
                    disabled={joining || !roomId}
                  />
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs text-muted-foreground">{draft.length}/300</p>
                    <Button
                      type="button"
                      onClick={sendMessage}
                      disabled={!draft.trim() || sending || joining || !roomId}
                      className="font-display rounded-full px-5"
                    >
                      {sending ? 'Sending...' : 'Send message'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MoodBuddyChat;
