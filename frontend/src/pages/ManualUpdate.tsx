import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { improveAiManually, rollbackSystemPrompt } from '@/services/api';
import { Loader2, RotateCcw, History, ChevronLeft, ChevronRight, PanelLeftOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/PageContainer';

const ManualUpdate = () => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  
  // Rollback state
  const [rollbackSteps, setRollbackSteps] = useState(1);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [rollbackMsg, setRollbackMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);
    setRollbackMsg('');

    try {
      const data = await improveAiManually({ instructions });
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async (e: React.FormEvent) => {
    e.preventDefault();
    setRollbackLoading(true);
    setRollbackMsg('');
    setError('');
    
    try {
       const res = await rollbackSystemPrompt(rollbackSteps);
       setRollbackMsg(res.message);
       // Show the active prompt in the response area, reusing the result card
       setResponse({ updatedPrompt: res.activePrompt, changeLog: `Rolled back ${rollbackSteps} version(s)` });
    } catch (err: any) {
        setError(err.message || 'Rollback failed');
    } finally {
        setRollbackLoading(false);
    }
  };

  return (
    <PageContainer>
    <div className="flex flex-col h-[calc(100vh-100px)] gap-6">
      <div className="flex-none">
        <h2 className="text-3xl font-bold tracking-tight">Manual Prompt Update</h2>
        <p className="text-muted-foreground">Directly instruct the AI system prompt to change.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 flex-1 min-h-0 transition-all duration-300 ease-in-out">
         {/* Input Panel */}
        <div 
          className={cn(
            "transition-all duration-300 ease-in-out relative flex flex-col",
            isInputCollapsed ? "w-[60px]" : "w-full md:w-1/2"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-4 z-10 h-8 w-8 rounded-full border bg-background shadow-md"
            onClick={() => setIsInputCollapsed(!isInputCollapsed)}
            title={isInputCollapsed ? "Expand Instructions" : "Collapse Instructions"}
          >
            {isInputCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

         <div className={cn(
            "transition-all duration-300 overflow-hidden h-full",
             isInputCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible w-full"
          )}>
            <Card className="h-full flex flex-col min-w-[300px]">
          <CardHeader className="flex-none">
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Tell the system how to update its behavior.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
              <div className="space-y-6 flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  <Label htmlFor="instructions">Update Instructions</Label>
                  <Textarea
                    id="instructions"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g., 'Be more polite' or 'Always ask for clarification before answering'..."
                    className="min-h-[200px] resize-none"
                  />
                </div>
              </div>

              <div className="p-6 pt-0 mt-auto">
                <Button type="submit" className="w-full flex-none" disabled={loading || !instructions.trim()}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Prompt
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>

        {/* Collapsed Placeholder Icon */}
        {isInputCollapsed && (
            <div className="flex flex-col items-center pt-8 gap-4 opacity-50">
               <PanelLeftOpen className="h-6 w-6 text-muted-foreground cursor-pointer" onClick={() => setIsInputCollapsed(false)} />
               <span className="text-xs text-muted-foreground font-mono rotate-90 whitespace-nowrap mt-8">INSTRUCTIONS</span>
            </div>
        )}

        </div>

        {/* Result & Version Control Side */}
        <div className={cn(
            "transition-all duration-300 h-full flex flex-col gap-6",
            isInputCollapsed ? "w-full flex-1" : "w-full md:w-1/2"
        )}>
          <Card className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <CardHeader className="flex-none">
              <CardTitle>Result</CardTitle>
              <CardDescription>The new system prompt.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {loading && <div className="flex items-center justify-center p-8 text-muted-foreground">Updating...</div>}
              
              {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

              {response && (
                <div className="space-y-4">
                  {response.changeLog && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason For Update</Label>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-md text-sm font-medium">
                            {response.changeLog}
                        </div>
                    </div>
                  )}

                   <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                    <Label className="text-xs text-muted-foreground flex-none">New System Prompt</Label>
                    <ScrollArea className="flex-1 w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
                        {response.updatedPrompt}
                    </ScrollArea>
                  </div>
                </div>
              )}
              {!loading && !response && !error && (
                <div className="text-sm text-muted-foreground italic text-center p-8">
                  Enter instructions to modify the prompt.
                </div>
              )}
            </CardContent>
          </Card>
        
        {/* Version Control Card (Moved inside the right column block) */}
        <Card className="flex-none h-fit border-orange-500/20 bg-orange-500/5">
              <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5 text-orange-500" />
                      System Version Control
                  </CardTitle>
                  <CardDescription>Emergency rollback to previous prompt versions.</CardDescription>
              </CardHeader>
              <CardContent>
                  <form onSubmit={handleRollback} className="space-y-4">
                      <div className="flex items-end gap-4">
                          <div className="space-y-2 flex-1">
                              <Label htmlFor="steps">Versions to Rollback</Label>
                              <Input 
                                  id="steps" 
                                  type="number" 
                                  min={1} 
                                  max={10} 
                                  value={rollbackSteps}
                                  onChange={(e) => setRollbackSteps(parseInt(e.target.value))}
                              />
                          </div>
                          <Button 
                              type="submit" 
                              variant="destructive"
                              disabled={rollbackLoading}
                          >
                              {rollbackLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                              Rollback
                          </Button>
                      </div>
                      {rollbackMsg && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-md text-sm">
                            {rollbackMsg}
                        </div>
                      )}
                  </form>
              </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PageContainer>
  );
};

export default ManualUpdate;
