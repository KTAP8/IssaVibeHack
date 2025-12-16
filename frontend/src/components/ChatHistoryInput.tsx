import React from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { ChatMessage } from '@/services/api';

interface ChatHistoryInputProps {
  value: ChatMessage[];
  onChange: (history: ChatMessage[]) => void;
}

const ChatHistoryInput: React.FC<ChatHistoryInputProps> = ({ value, onChange }) => {
  const addMessage = () => {
    onChange([...value, { role: 'user', message: '' }]);
  };

  const removeMessage = (index: number) => {
    const newHistory = [...value];
    newHistory.splice(index, 1);
    onChange(newHistory);
  };

  const updateMessage = (index: number, field: 'role' | 'message', text: string) => {
    const newHistory = [...value];
    newHistory[index] = { ...newHistory[index], [field]: text };
    onChange(newHistory);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Chat History (Context)</Label>
        <Button type="button" variant="outline" size="sm" onClick={addMessage}>
          <Plus className="h-4 w-4 mr-2" />
          Add Message
        </Button>
      </div>

      {value.length === 0 && (
        <div className="text-sm text-muted-foreground italic">No chat history added.</div>
      )}

      <div className="space-y-3">
        {value.map((msg, index) => (
          <Card key={index} className="relative">
            <CardContent className="p-3 space-y-2">
              <div className="flex gap-2">
                <div className="w-24 shrink-0">
                  <Label className="text-xs text-muted-foreground mb-1 block">Role</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    value={msg.role}
                    onChange={(e) => updateMessage(index, 'role', e.target.value)}
                  >
                    <option value="user">User</option>
                    <option value="assistant">Assistant</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Message</Label>
                  <Textarea 
                    value={msg.message}
                    onChange={(e) => updateMessage(index, 'message', e.target.value)}
                    className="min-h-[60px]"
                    placeholder="Message content..."
                  />
                </div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon" 
                  className="mt-6 text-destructive hover:bg-destructive/10"
                  onClick={() => removeMessage(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChatHistoryInput;
