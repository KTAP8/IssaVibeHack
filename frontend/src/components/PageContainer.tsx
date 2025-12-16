import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PageContainerProps {
  children: React.ReactNode;
}

const PageContainer = ({ children }: PageContainerProps) => {
  return (
    <ScrollArea className="flex-1 h-full">
      <div className="p-6 max-w-4xl mx-auto">
        {children}
      </div>
    </ScrollArea>
  );
};

export default PageContainer;
