import React, { useState } from 'react';
import PageContainer from '@/components/PageContainer';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Wand2, History } from 'lucide-react';
import { ModeSelector } from '@/components/ui/mode-selector';
import type { InputMode } from '@/components/ui/mode-selector';
import { cloneVibe, rollbackSystemPrompt } from '@/services/api';

const VibeCloner: React.FC = () => {
  const [chatLogs, setChatLogs] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [isLoading, setIsLoading] = useState(false);
  const [updatedPrompt, setUpdatedPrompt] = useState<string | null>(null);
  const [changeLog, setChangeLog] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rollbackMessage, setRollbackMessage] = useState<string | null>(null);

  const placeholder = inputMode === 'text' 
    ? `[10:05] Agent: Hey there! 👋 How can I help you today?
[10:06] Client: I need a visa for Thailand.
[10:07] Agent: No worries! Let's get you sorted. 🇹🇭`
    : `[
  {
    "role": "assistant",
    "message": "Hey there! 👋 How can I help you today?"
  },
  {
    "role": "user",
    "message": "I need a visa for Thailand."
  }
]`;

  const handleClone = async () => {
    if (!chatLogs.trim()) {
      setError('Please paste some text or JSON chat logs.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUpdatedPrompt(null);
    setChangeLog(null);
    setRollbackMessage(null);

    try {
      let payload = chatLogs;
      
      // If mode is JSON, try to parse it first to ensure validity
      if (inputMode === 'json') {
          try {
              const jsonParsed = JSON.parse(chatLogs);
              payload = jsonParsed; 
          } catch (e) {
              throw new Error('Invalid JSON format. Please check your syntax.');
          }
      } else {
          // If mode is Text, but user pasted JSON, maybe we can auto-detect?
          // For now, let's treat it as string as requested.
      }

      const data = await cloneVibe({ chatLogs: payload });

      setUpdatedPrompt(data.updatedPrompt);
      setChangeLog(data.changeLog || 'No specific changes noted, but prompt updated.');
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    setIsLoading(true);
    setRollbackMessage(null);
    setError(null);

    try {
        const data = await rollbackSystemPrompt(1);

        setUpdatedPrompt(data.activePrompt);
        setChangeLog(null);
        setRollbackMessage('Successfully rolled back to previous version.');
        
    } catch (err: any) {
        setError(err.message || 'Failed to rollback.');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <PageContainer>
      <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
        <div className="flex-none">
          <h2 className="text-3xl font-bold tracking-tight">Vibe Cloner 🧬</h2>
          <p className="text-muted-foreground">
            Paste raw chat logs from your top-performing human agent. The AI will analyze their <strong>tone, emoji usage, and sentence structure</strong> to rewrite the "Tone & Style" section of the System Prompt.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0">
          
          {/* Left Column: Input */}
          <div className="w-full md:w-1/2 flex flex-col gap-4">
             <ModeSelector currentMode={inputMode} onModeChange={setInputMode} />
             
             <div className="flex-1 flex flex-col gap-2 min-h-0">
                <label className="block text-sm font-medium text-foreground ml-1">
                    Paste {inputMode === 'text' ? 'Raw Chat Text' : 'JSON Data'}
                </label>
                <Textarea
                    className="flex-1 w-full resize-none text-sm leading-relaxed p-4 bg-muted/30"
                    placeholder={placeholder}
                    value={chatLogs}
                    onChange={(e) => setChatLogs(e.target.value)}
                />
             </div>

             <div className="flex items-center justify-end">
                 <Button
                  onClick={handleClone}
                  disabled={isLoading || !chatLogs.trim()}
                  className="w-full sm:w-auto"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing Vibe...
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" /> Clone Persona
                    </>
                  )}
                </Button>
             </div>
             
             {error && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive text-sm animate-in fade-in slide-in-from-top-2">
                ⚠️ {error}
              </div>
            )}
          </div>

          {/* Right Column: Results */}
          <div className="w-full md:w-1/2 flex flex-col h-full bg-muted/10 rounded-xl border border-border/50 overflow-hidden">
             {(updatedPrompt || rollbackMessage) ? (
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-between p-4 border-b bg-muted/20">
                        <h2 className="text-base font-semibold tracking-tight">
                            {rollbackMessage ? 'Rolled Back Prompt' : 'Analyzed System Prompt'}
                        </h2>
                        {!rollbackMessage && (
                            <Button 
                                variant="outline"
                                size="sm"
                                onClick={handleRollback}
                                disabled={isLoading}
                                className="h-8"
                            >
                                <History className="mr-2 h-3 w-3" /> Undo Changes
                            </Button>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {rollbackMessage && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
                                {rollbackMessage}
                            </div>
                        )}

                        {changeLog && (
                            <div className="p-4 bg-accent/50 border border-accent rounded-lg">
                                <h3 className="text-xs font-bold text-accent-foreground mb-2 uppercase tracking-wider">Change Log</h3>
                                <p className="text-sm text-foreground">{changeLog}</p>
                            </div>
                        )}
                        
                        <div className="bg-muted border rounded-lg p-4 relative group">
                            <div className="absolute top-4 right-4 text-xs text-muted-foreground font-mono">SYSTEM_PROMPT.md</div>
                            <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-mono">
                                {updatedPrompt}
                            </pre>
                        </div>
                    </div>
                </div>
             ) : (
                 <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 text-center opacity-60">
                    <Wand2 className="h-12 w-12 mb-4 opacity-20" />
                    <p>Paste your chat logs and click "Clone Persona" to see the magic happen.</p>
                 </div>
             )}
          </div>

        </div>
      </div>
    </PageContainer>
  );
};

export default VibeCloner;
