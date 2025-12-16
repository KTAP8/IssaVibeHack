import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { improveAiManually } from '@/services/api';
import { Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const ManualUpdate = () => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResponse(null);

    try {
      const data = await improveAiManually({ instructions });
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
        <h2 className="text-3xl font-bold tracking-tight">Manual Prompt Update</h2>
        <p className="text-muted-foreground">Directly instruct the AI system prompt to change.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
            <CardDescription>Tell the system how to update its behavior.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="instructions">Update Instructions</Label>
                <Textarea
                  id="instructions"
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g., 'Be more polite' or 'Always ask for clarification before answering'..."
                  className="min-h-[200px]"
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || !instructions.trim()}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Prompt
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Result</CardTitle>
              <CardDescription>The new system prompt.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading && <div className="flex items-center justify-center p-8 text-muted-foreground">Updating...</div>}
              
              {error && <div className="text-destructive p-4 bg-destructive/10 rounded-md">{error}</div>}

              {response && (
                <div className="space-y-4">
                   <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">New System Prompt</Label>
                    <ScrollArea className="h-[400px] w-full rounded-md border p-4 bg-muted/50 font-mono text-xs">
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
        </div>
      </div>
    </div>
  );
};

export default ManualUpdate;
