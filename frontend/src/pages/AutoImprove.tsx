import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ChatHistoryInput from '@/components/ChatHistoryInput';
import { improveAi, rollbackSystemPrompt } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Loader2, RotateCcw, ChevronLeft, ChevronRight, PanelLeftOpen } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import PageContainer from '@/components/PageContainer';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const AutoImprove = () => {
  const [clientSequence, setClientSequence] = useState('');
  const [consultantReply, setConsultantReply] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');
  const [rollbackMsg, setRollbackMsg] = useState('');
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);
    setRollbackMsg('');

    try {
      const data = await improveAi({
        clientSequence,
        chatHistory,
        consultantReply
      });
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = async () => {
      setRollbackLoading(true);
      setRollbackMsg('');
      try {
          const res = await rollbackSystemPrompt(1);
          setRollbackMsg(res.message);
          // Optionally update the displayed prompt to the rolled back one
          setResponse({ ...response, updatedPrompt: res.activePrompt });
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
        <h2 className="text-3xl font-bold tracking-tight">Auto-Improve AI</h2>
        <p className="text-muted-foreground">Teach the AI by providing a correct consultant reply.</p>
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
            title={isInputCollapsed ? "Expand Input" : "Collapse Input"}
          >
            {isInputCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>

          <div className={cn(
            "transition-all duration-300 overflow-hidden h-full",
             isInputCollapsed ? "opacity-0 invisible w-0" : "opacity-100 visible w-full"
          )}>
            <Card className="h-full flex flex-col min-w-[300px]">
          <CardHeader className="flex-none">
            <CardTitle>Training Info</CardTitle>
            <CardDescription>Input the scenario and the ideal answer.</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden p-0">
            <form onSubmit={handleSubmit} className="space-y-6 flex flex-col h-full">
              <div className="space-y-6 flex-1 overflow-y-auto p-6">
                <div className="space-y-2">
                  <Label htmlFor="clientSequence">Client Message (Latest)</Label>
                  <Textarea
                    id="clientSequence"
                    value={clientSequence}
                    onChange={(e) => setClientSequence(e.target.value)}
                    placeholder="The message the AI should have responded to..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="consultantReply">Ideal Consultant Reply</Label>
                  <Textarea
                    id="consultantReply"
                    value={consultantReply}
                    onChange={(e) => setConsultantReply(e.target.value)}
                    placeholder="What the consultant actually said (or should say)..."
                    className="min-h-[120px] border-primary/20 bg-primary/5 resize-none"
                  />
                </div>

                <ChatHistoryInput value={chatHistory} onChange={setChatHistory} />
              </div>

              <div className="p-6 pt-0 mt-auto">
                <Button type="submit" className="w-full flex-none" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Improve AI
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
               <span className="text-xs text-muted-foreground font-mono rotate-90 whitespace-nowrap mt-8">TRAINING INFO</span>
            </div>
        )}

        </div>

        {/* Result Panel */}
        <div className={cn(
            "transition-all duration-300 h-full",
            isInputCollapsed ? "w-full flex-1" : "w-full md:w-1/2"
        )}>
          <Card className="h-full flex flex-col overflow-hidden">
            <CardHeader className="flex-none">
              <CardTitle>Result</CardTitle>
              <CardDescription>The updated prompt and prediction.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto min-h-0">
              {loading && <div className="flex items-center justify-center p-8 text-muted-foreground">Processing...</div>}
              
              {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

              {response && (
                <div className="space-y-6">
                  <div className="space-y-2">
                     <Label className="text-xs text-muted-foreground">Original Prediction (Before Training)</Label>
                     <div className="p-3 bg-muted rounded-md text-sm">
                        {response.predictedReply || "N/A"}
                     </div>
                  </div>

                  {response.changeLog && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason For Update</Label>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-md text-sm font-medium">
                            {response.changeLog}
                        </div>
                    </div>
                  )}

                  <div className="space-y-2 flex-1 min-h-0 flex flex-col">
                    <Label className="text-xs text-muted-foreground flex-none">Updated System Prompt</Label>
                    <ScrollArea className="flex-1 w-full rounded-md border p-4 bg-muted/50 text-xs">
                        <div className="prose prose-xs dark:prose-invert max-w-none font-mono">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {response.updatedPrompt}
                            </ReactMarkdown>
                        </div>
                    </ScrollArea>
                  </div>
                  
                  {rollbackMsg && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-md text-sm flex-none">
                          {rollbackMsg}
                      </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10 flex-none"
                    onClick={handleRollback}
                    disabled={rollbackLoading}
                  >
                      {rollbackLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
                      Undo (Rollback 1 Version)
                  </Button>

                </div>
              )}
              {!loading && !response && !error && (
                <div className="text-sm text-muted-foreground italic text-center p-8">
                  Submit the form to improve the model.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </PageContainer>
  );
};
export default AutoImprove;
