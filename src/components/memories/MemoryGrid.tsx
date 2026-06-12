"use client";

import { Memory } from "@/types/memory";
import { MemoryCard } from "./MemoryCard";
import { motion } from "framer-motion";

interface MemoryGridProps {
  memories: Memory[];
  onMemorySelect: (memory: Memory) => void;
}

export function MemoryGrid({ memories, onMemorySelect }: MemoryGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
      {memories.map((memory, index) => (
        <motion.div
          key={memory.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.04 }}
        >
          <MemoryCard
            memory={memory}
            onClick={() => onMemorySelect(memory)}
          />
        </motion.div>
      ))}
    </div>
  );
}
