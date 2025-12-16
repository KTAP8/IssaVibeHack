import { useEffect, useState } from 'react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Sparkles, Edit, Terminal, Plus, LogOut, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatSession {
  id: string;
  title: string | null;
  created_at: string;
}

const Sidebar = () => {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const { sessionId } = useParams();
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    if (user) {
      fetchSessions();
    }
  }, [user, sessionId]); 

  const fetchSessions = async () => {
    const { data } = await supabase
      .from('chat_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (data) setSessions(data);
  };

  const handleNewChat = () => {
    navigate('/generate-reply');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      navigate('/login');
    }
  };

  const handleDeleteSession = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm('Are you sure you want to delete this chat?')) return;

    const { error } = await supabase.from('chat_sessions').delete().eq('id', id);
    
    if (!error) {
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (sessionId === id) {
        navigate('/generate-reply');
      }
    } else {
      console.error('Error deleting session:', error);
      alert('Failed to delete chat.');
    }
  };

  return (
    <div className="w-64 h-screen bg-card border-r flex flex-col">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-4 px-2">
          <Terminal className="h-6 w-6 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Issa Vibe Chat</h1>
        </div>
        <Button onClick={handleNewChat} className="w-full justify-start" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          New Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          <div className="space-y-2">
              <h2 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tools
              </h2>
              <nav className="flex flex-col gap-1">


                <NavLink to="/improve-ai">
                  {({ isActive }) => (
                    <Button 
                      variant={isActive ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start", isActive && "bg-secondary")}
                    >
                      <Sparkles className="mr-2 h-4 w-4" />
                      Auto-Improve
                    </Button>
                  )}
                </NavLink>

                <NavLink to="/improve-ai-manually">
                  {({ isActive }) => (
                    <Button 
                      variant={isActive ? "secondary" : "ghost"} 
                      className={cn("w-full justify-start", isActive && "bg-secondary")}
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Manual Update
                    </Button>
                  )}
                </NavLink>
              </nav>
          </div>

          <div className="space-y-2">
            <h2 className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Recent Chats
            </h2>
            <div className="flex flex-col gap-1">
              {sessions.map((session) => (
                <div key={session.id} className="group flex items-center gap-2 w-full pr-1">
                    <NavLink to={`/generate-reply/${session.id}`} className="flex-1 min-w-0 overflow-hidden">
                    {({ isActive }) => (
                        <Button 
                        variant={isActive ? "secondary" : "ghost"} 
                        className={cn("w-full justify-start px-2", isActive && "bg-secondary")}
                        title={session.title || 'Untitled Chat'}
                        >
                        <span className="truncate block w-full max-w-[140px] text-left">{session.title || 'Untitled Chat'}</span>
                        </Button>
                    )}
                    </NavLink>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={(e) => handleDeleteSession(e, session.id)}
                        title="Delete Chat"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
              ))}
              {sessions.length === 0 && (
                <div className="px-2 text-sm text-muted-foreground italic">No chats yet</div>
              )}
            </div>
          </div>
        </div>
      </ScrollArea>

      <div className="p-4 border-t mt-auto">
         <div className="px-2 mb-2">
            <p className="text-xs font-medium truncate text-muted-foreground">{user?.email}</p>
         </div>
         <Button variant="ghost" className="w-full justify-start text-destructive hover:bg-destructive/10" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
         </Button>
      </div>
    </div>
  );
};

export default Sidebar;
