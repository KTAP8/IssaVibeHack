import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ChatHistoryInput from '@/components/ChatHistoryInput';
import { improveAi, rollbackSystemPrompt } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Loader2, RotateCcw } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import PageContainer from '@/components/PageContainer';

const AutoImprove = () => {
  const [clientSequence, setClientSequence] = useState('');
  const [consultantReply, setConsultantReply] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [rollbackLoading, setRollbackLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');
  const [rollbackMsg, setRollbackMsg] = useState('');

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
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Auto-Improve AI</h2>
        <p className="text-muted-foreground">Teach the AI by providing a correct consultant reply.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Training Info</CardTitle>
            <CardDescription>Input the scenario and the ideal answer.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientSequence">Client Message (Latest)</Label>
                <Textarea
                  id="clientSequence"
                  value={clientSequence}
                  onChange={(e) => setClientSequence(e.target.value)}
                  placeholder="The message the AI should have responded to..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="consultantReply">Ideal Consultant Reply</Label>
                <Textarea
                  id="consultantReply"
                  value={consultantReply}
                  onChange={(e) => setConsultantReply(e.target.value)}
                  placeholder="What the consultant actually said (or should say)..."
                  className="min-h-[120px] border-primary/20 bg-primary/5"
                />
              </div>

              <ChatHistoryInput value={chatHistory} onChange={setChatHistory} />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Improve AI
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>The updated prompt and prediction.</CardDescription>
            </CardHeader>
            <CardContent>
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

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Updated System Prompt</Label>
                    <ScrollArea className="h-[600px] w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
                        {response.updatedPrompt}
                    </ScrollArea>
                  </div>
                  
                  {rollbackMsg && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-600 rounded-md text-sm">
                          {rollbackMsg}
                      </div>
                  )}

                  <Button 
                    variant="outline" 
                    className="w-full border-destructive/50 text-destructive hover:bg-destructive/10"
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
