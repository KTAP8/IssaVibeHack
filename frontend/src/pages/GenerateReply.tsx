import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { generateReply } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Send, Bot, User as UserIcon, Loader2 } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';

const GenerateReply = () => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [clientSequence, setClientSequence] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatHistory, loading]);

  // Load chat session if sessionId exists
  useEffect(() => {
    if (sessionId && user) {
      loadSession(sessionId);
    } else {
      setChatHistory([]);
    }
  }, [sessionId, user]);

  const loadSession = async (id: string) => {
    const { data: messages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', id)
      .order('created_at', { ascending: true });
    
    if (messages) {
      const history: ChatMessage[] = messages.map(m => ({
        role: m.role,
        message: m.content
      }));
      setChatHistory(history);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
     if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
     }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientSequence.trim() || loading) return;

    const userMsg = clientSequence.trim();
    setClientSequence('');
    setLoading(true);

    // Optimistic Update
    const optimisticUserMsg: ChatMessage = { role: 'user', message: userMsg };
    setChatHistory(prev => [...prev, optimisticUserMsg]);

    try {
      // 1. Ensure Session Exists
      let currentSessionId = sessionId;
      if (!currentSessionId) {
        const { data: sessionData, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: user!.id,
            title: userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : '')
          })
          .select()
          .single();
        
        if (sessionError) throw sessionError;
        currentSessionId = sessionData.id;
        // Don't navigate yet to avoid remount flickering, just set local ref if we could, 
        // but here we might need to navigate to ensure URL is correct.
        // Actually, let's just use the ID for requests. Navigation might cause a reload depending on Router setup.
        // For smoother UX, we can replace history without full reload, but let's stick to navigate replace.
        navigate(`/generate-reply/${currentSessionId}`, { replace: true });
      }

      // 2. Persist User Message
      if (currentSessionId) {
          await supabase.from('chat_messages').insert({
              session_id: currentSessionId,
              role: 'user',
              content: userMsg
          });
      }

      // 3. Call API
      const apiData = await generateReply({
        clientSequence: userMsg,
        chatHistory: chatHistory // Context
      });

      // 4. Persist Assistant Reply
      if (currentSessionId && apiData.aiReply) {
          await supabase.from('chat_messages').insert({
              session_id: currentSessionId,
              role: 'assistant',
              content: apiData.aiReply
          });
      }
      
      // 5. Update History with AI Response
      const newResponseItem: ChatMessage = { role: 'assistant', message: apiData.aiReply };
      setChatHistory(prev => [...prev, newResponseItem]);

    } catch (err: any) {
      console.error(err);
      // Ideally show a toast error here
      const errorMsg: ChatMessage = { role: 'assistant', message: "Sorry, I encountered an error processing your request." };
      setChatHistory(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      
      {/* 1. Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {chatHistory.length === 0 ? (
           <div className="h-full flex flex-col items-center justify-center text-center opacity-20 p-8">
              <Bot className="h-24 w-24 mb-4" />
              <h2 className="text-2xl font-bold">How can I help you today?</h2>
           </div>
        ) : (
           chatHistory.map((msg, index) => (
            <div 
                key={index} 
                className={cn(
                    "flex w-full items-start gap-3",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                )}
            >
                {/* Avatar for Assistant */}
                {msg.role !== 'user' && (
                    <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                        <Bot className="h-4 w-4" />
                    </div>
                )}

                <div className={cn(
                    "rounded-lg px-4 py-2 max-w-[85%] md:max-w-[75%] shadow-sm text-sm whitespace-pre-wrap leading-relaxed",
                    msg.role === 'user' 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted text-muted-foreground border"
                )}>
                    {msg.message}
                </div>

                {/* Avatar for User (Optional, visually simpler to just have bubble right aligned) */}
                {msg.role === 'user' && (
                     <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-muted shadow">
                        <UserIcon className="h-4 w-4" />
                     </div>
                )}
            </div>
           ))
        )}

        {/* Loading Bubble */}
        {loading && (
             <div className="flex w-full items-start gap-4 justify-start animate-in fade-in slide-in-from-bottom-2">
                <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                    <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted border rounded-lg px-4 py-3 shadow-sm flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce"></span>
                </div>
             </div>
        )}
        <div ref={scrollRef} />
      </div>

      {/* 2. Sticky Input Area */}
      <div className="p-4 bg-background border-t">
        <div className="max-w-4xl mx-auto relative flex items-end gap-2 p-2 border rounded-xl shadow-sm bg-card focus-within:ring-1 focus-within:ring-ring">
           <Textarea 
             value={clientSequence}
             onChange={(e) => setClientSequence(e.target.value)}
             onKeyDown={handleKeyDown}
             placeholder="Message AI..."
             className="min-h-[20px] max-h-[200px] w-full resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent py-3"
             style={{ height: 'auto', overflow: 'hidden' }}
             rows={1}
             onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = `${target.scrollHeight}px`;
             }}
           />
           <Button 
                onClick={handleSubmit} 
                disabled={loading || !clientSequence.trim()} 
                size="icon"
                className="mb-1 shrink-0 rounded-lg"
            >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
           </Button>
        </div>
        <div className="text-center text-xs text-muted-foreground mt-2">
            AI can make mistakes. Check important info.
        </div>
      </div>
    </div>
  );
};

export default GenerateReply;
