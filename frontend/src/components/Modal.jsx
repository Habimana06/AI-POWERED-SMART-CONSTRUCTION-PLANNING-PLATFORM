import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', footer }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-6xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={overlayRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-steel-900/40 backdrop-blur-sm p-4"
          onClick={(e) => e.target === overlayRef.current && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={`w-full ${sizes[size]} rounded-2xl bg-white shadow-modal border border-steel-100 overflow-hidden`}
          >
            <div className="flex items-center justify-between border-b border-steel-100 px-6 py-5">
              <h2 className="text-lg font-semibold text-steel-800">{title}</h2>
              <button onClick={onClose} className="btn-ghost !p-2 rounded-xl hover:bg-steel-50">
                <X className="h-5 w-5 text-steel-500" />
              </button>
            </div>
            <div className="px-6 py-6">{children}</div>
            {footer && (
              <div className="flex items-center justify-end gap-3 border-t border-steel-100 px-6 py-4 bg-steel-50/50">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
