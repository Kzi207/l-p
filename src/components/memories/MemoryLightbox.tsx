"use client";

import { useEffect } from "react";
import { Memory } from "@/types/memory";
import { X, Trash2, Calendar, User } from "lucide-react";
import { formatDate } from "@/lib/date";
import { motion, AnimatePresence } from "framer-motion";

interface MemoryLightboxProps {
  memory: Memory | null;
  onClose: () => void;
  onDelete?: (id: string) => void;
}

export function MemoryLightbox({ memory, onClose, onDelete }: MemoryLightboxProps) {
  // Prevent body scroll when open
  useEffect(() => {
    if (memory) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [memory]);

  return (
    <AnimatePresence>
      {memory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4 select-none"
        >
          {/* Close trigger area */}
          <div className="absolute inset-0 cursor-default" onClick={onClose} />

          {/* Lightbox Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[85vh] md:max-h-[80vh] flex flex-col md:flex-row overflow-hidden shadow-2xl relative z-10"
          >
            {/* Action buttons top-right */}
            <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
              {onDelete && (
                <button
                  onClick={() => onDelete(memory.id)}
                  className="bg-black/50 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 p-2.5 rounded-xl border border-zinc-800 backdrop-blur-sm transition-colors cursor-pointer"
                  title="Xóa khoảnh khắc"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="bg-black/50 hover:bg-zinc-800 text-zinc-400 hover:text-white p-2.5 rounded-xl border border-zinc-800 backdrop-blur-sm transition-colors cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* Image viewer */}
            <div className="flex-1 bg-black flex items-center justify-center overflow-hidden min-h-[300px] md:min-h-0 relative">
              <img
                src={memory.imageUrl}
                alt={memory.caption}
                className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain"
              />
            </div>

            {/* Sidebar info */}
            <div className="w-full md:w-[320px] p-6 flex flex-col justify-between border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950 text-zinc-100">
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <img
                    src={memory.author.avatar ?? undefined}
                    alt={memory.author.name}
                    className="size-10 rounded-full object-cover border border-zinc-800"
                  />
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-bold">@{memory.author.name}</span>
                    <span className="text-[10px] text-zinc-500">Đăng bởi</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Mô tả kỉ niệm</span>
                  <p className="text-xs leading-relaxed text-zinc-300 font-medium whitespace-pre-wrap max-h-36 overflow-y-auto">
                    {memory.caption}
                  </p>
                </div>
              </div>

              <div className="border-t border-zinc-900 pt-4 mt-6 flex flex-col gap-2.5 text-[10px] text-zinc-500 font-semibold">
                <div className="flex items-center gap-2">
                  <Calendar className="size-3.5 text-zinc-600" />
                  <span>{formatDate(memory.createdAt)}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
