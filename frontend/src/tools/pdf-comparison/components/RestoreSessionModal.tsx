import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { History, X, Check } from "lucide-react";

interface RestoreSessionModalProps {
  isOpen: boolean;
  onRestore: () => void;
  onDiscard: () => void;
}

export const RestoreSessionModal: React.FC<RestoreSessionModalProps> = ({
  isOpen,
  onRestore,
  onDiscard,
}) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 pointer-events-auto"
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-[var(--color-neo-bg)] border-4 border-black p-6 brutal-shadow max-w-sm w-full pointer-events-auto flex flex-col gap-6"
            >
              <div className="flex items-center gap-3">
                <div className="bg-[var(--color-neo-lime)] p-2 border-2 border-black brutal-shadow">
                  <History className="w-6 h-6 text-black" />
                </div>
                <h2 className="text-xl font-black uppercase text-[var(--color-neo-white)] tracking-tighter">
                  Restore Session?
                </h2>
              </div>

              <p className="text-[var(--color-neo-white)] font-bold text-sm leading-relaxed">
                A previous comparison session was found. Would you like to restore the documents and continue where you left off?
              </p>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={onDiscard}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white text-black font-black uppercase text-sm border-2 border-black hover:bg-gray-200 brutal-shadow-hover transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  Discard
                </button>
                <button
                  onClick={onRestore}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-[var(--color-neo-lime)] text-black font-black uppercase text-sm border-2 border-black hover:bg-[#b0f52c] brutal-shadow transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Restore
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
