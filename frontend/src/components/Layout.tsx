import React from 'react';
import Sidebar from './Sidebar';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

export default Layout;
