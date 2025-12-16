import React from 'react';
import { Card } from '@/components/ui/card';

interface Template {
  icon: string;
  label: string;
  text: string;
}

const templates: Template[] = [
  { 
    icon: "🇹🇭", 
    label: "Check Eligibility", 
    text: "I work remotely for a foreign company and want to live in Thailand. Can you check if I am eligible for the DTV visa?" 
  },
  { 
    icon: "💰", 
    label: "Cost Breakdown", 
    text: "I am interested in the DTV visa. Can you provide a full breakdown of the costs, including government fees and service fees?" 
  },
  { 
    icon: "🥊", 
    label: "Muay Thai / Cooking", 
    text: "I don't have a remote job, but I am interested in the Soft Power option (Muay Thai or Cooking). What are the requirements for that?" 
  },
  { 
    icon: "⚠️", 
    label: "Rejection Help", 
    text: "I have applied for a Thai visa before and got rejected. Is it still possible for me to apply through your agency?" 
  }
];

interface StarterTemplatesProps {
  onSelect: (text: string) => void;
}

const StarterTemplates: React.FC<StarterTemplatesProps> = ({ onSelect }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl mx-auto mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {templates.map((template, index) => (
        <Card 
          key={index}
          className="p-4 cursor-pointer hover:bg-muted/50 hover:-translate-y-1 transition-all duration-200 border-muted-foreground/10 bg-card/50"
          onClick={() => onSelect(template.text)}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{template.icon}</span>
            <span className="font-semibold text-sm">{template.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {template.text}
          </p>
        </Card>
      ))}
    </div>
  );
};

export default StarterTemplates;
