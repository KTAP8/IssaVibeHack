import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ChatHistoryInput from '@/components/ChatHistoryInput';
import { improveAi } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const AutoImprove = () => {
  const [clientSequence, setClientSequence] = useState('');
  const [consultantReply, setConsultantReply] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

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

  return (
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

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">Updated System Prompt</Label>
                    <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
                        {response.updatedPrompt}
                    </ScrollArea>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground mb-1">Full JSON Response</Label>
                    <pre className="p-4 bg-muted rounded-md overflow-auto text-xs font-mono">
                      {JSON.stringify(response, null, 2)}
                    </pre>
                  </div>
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
  );
};
export default AutoImprove;
