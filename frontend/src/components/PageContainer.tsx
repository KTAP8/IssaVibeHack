import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface PageContainerProps {
  children: React.ReactNode;
  title?: string;
}

const PageContainer = ({ children, title }: PageContainerProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex-1 h-full overflow-hidden"
    >
      <ScrollArea className="h-full">
        <div className="p-6 max-w-4xl mx-auto">
          {title && (
            <h1 className="text-2xl font-bold tracking-tight mb-6">{title}</h1>
          )}
          {children}
        </div>
      </ScrollArea>
    </motion.div>
  );
};

export default PageContainer;
