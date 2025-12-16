import { NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MessageSquare, Sparkles, Edit, Terminal } from 'lucide-react';
import { cn } from '@/lib/utils';

const Sidebar = () => {
  return (
    <div className="w-64 h-screen bg-card border-r flex flex-col p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <Terminal className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">AI Optimiser</h1>
      </div>
      
      <nav className="flex flex-col gap-2">
        <NavLink to="/generate-reply">
          {({ isActive }) => (
            <Button 
              variant={isActive ? "secondary" : "ghost"} 
              className={cn("w-full justify-start", isActive && "bg-secondary")}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              Generate AI Reply
            </Button>
          )}
        </NavLink>

        <NavLink to="/improve-ai">
          {({ isActive }) => (
            <Button 
              variant={isActive ? "secondary" : "ghost"} 
              className={cn("w-full justify-start", isActive && "bg-secondary")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Auto-Improve AI
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
      
      <div className="mt-auto text-xs text-muted-foreground px-2">
        v1.0.0
      </div>
    </div>
  );
};

export default Sidebar;
