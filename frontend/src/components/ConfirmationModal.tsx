import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  loading = false,
}) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-sm"
          >
            <Card className="border shadow-lg overflow-hidden">
               <div className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive mb-2">
                     <AlertTriangle className="h-6 w-6" />
                  </div>
                  
                  <div className="space-y-2">
                     <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
                     <p className="text-sm text-muted-foreground">{description}</p>
                  </div>

                  <div className="flex gap-3 w-full mt-4">
                     <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                     </Button>
                     <Button variant="destructive" className="flex-1" onClick={onConfirm} disabled={loading}>
                        {loading ? "Deleting..." : confirmLabel}
                     </Button>
                  </div>
               </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfirmationModal;
