import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { improveAiManually, rollbackSystemPrompt } from '@/services/api';
import { Loader2, RotateCcw, History } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import PageContainer from '@/components/PageContainer';

const ManualUpdate = () => {
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);
  const [error, setError] = useState('');
  
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
                  {response.changeLog && (
                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">Reason For Update</Label>
                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-500 rounded-md text-sm font-medium">
                            {response.changeLog}
                        </div>
                    </div>
                  )}

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

          {/* Version Control Card */}
          <Card className="h-fit border-orange-500/20 bg-orange-500/5">
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
