import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import ChatHistoryInput from '@/components/ChatHistoryInput';
import { generateReply } from '@/services/api';
import type { ChatMessage } from '@/services/api';
import { Loader2 } from 'lucide-react';

const GenerateReply = () => {
  const [clientSequence, setClientSequence] = useState('');
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
      const data = await generateReply({
        clientSequence,
        chatHistory
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
        <h2 className="text-3xl font-bold tracking-tight">Generate AI Reply</h2>
        <p className="text-muted-foreground">Simulate a conversation and see how the AI responds.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Input</CardTitle>
            <CardDescription>Provide context and the latest message.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="clientSequence">Client Message (Latest)</Label>
                <Textarea
                  id="clientSequence"
                  value={clientSequence}
                  onChange={(e) => setClientSequence(e.target.value)}
                  placeholder="Type the client's latest message here..."
                  className="min-h-[100px]"
                />
              </div>

              <ChatHistoryInput value={chatHistory} onChange={setChatHistory} />

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate Reply
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Response</CardTitle>
              <CardDescription>The AI's generated reply.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="flex items-center justify-center p-8 text-muted-foreground">Generating...</div>}
              
              {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

              {response && (
                <div className="space-y-4">
                  <div className="p-4 bg-secondary rounded-md">
                    <Label className="text-xs text-muted-foreground mb-1">AI Reply</Label>
                    <p className="whitespace-pre-wrap font-medium">{response.aiReply}</p>
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
                  Submit the form to see the result.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default GenerateReply;
