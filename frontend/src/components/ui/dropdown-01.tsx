import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  id: string | number;
  label: string;
  description?: string;
}

interface Dropdown01Props {
  options: Option[];
  selectedLabel: string;
  onSelect: (option: Option) => void;
  className?: string;
}

const Dropdown01 = ({ options, selectedLabel, onSelect, className }: Dropdown01Props) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Close dropdown when clicking outside (simple version, ideally use a hook)
  useEffect(() => {
    const handleClickOutside = () => setIsOpen(false);
    if (isOpen) {
        window.addEventListener('click', handleClickOutside);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isOpen]);

  const handleToggle = (e: React.MouseEvent) => {
      e.stopPropagation();
      setIsOpen(!isOpen);
  }

  return (
    <div className={`relative ${className}`}>
      {/* Dropdown Button */}
      <motion.button
        type="button"
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={handleToggle}
        className={`w-full px-4 py-3 rounded-xl border transition-all duration-300 flex items-center justify-between group bg-background border-input text-foreground hover:bg-accent hover:text-accent-foreground`}
      >
        <span className="font-medium">{selectedLabel}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </motion.div>
      </motion.button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-2 rounded-xl border bg-popover text-popover-foreground shadow-md overflow-hidden"
          >
            {options.map((option, index) => (
              <motion.button
                key={option.id}
                type="button"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                onClick={(e) => {
                    e.stopPropagation();
                    onSelect(option);
                    setIsOpen(false);
                }}
                className={`w-full px-4 py-3 text-left transition-colors duration-200 flex items-center justify-between group hover:bg-accent hover:text-accent-foreground ${
                  index !== options.length - 1 ? 'border-b border-border' : ''
                }`}
              >
                <div>
                  <div className="font-medium">{option.label}</div>
                  {option.description && (
                      <div className="text-sm text-muted-foreground group-hover:text-accent-foreground/80">
                        {option.description}
                      </div>
                  )}
                </div>
                {selectedLabel === option.label && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  >
                    <Check className="w-4 h-4 text-primary" />
                  </motion.div>
                )}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Dropdown01;
