"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DefinicaoConquista } from "@/lib/types";
import { getNomeNivel } from "@/lib/conquistas";

interface ConquistaToastProps {
  conquistas: DefinicaoConquista[];
  onDone: () => void;
}

export default function ConquistaToast({ conquistas, onDone }: ConquistaToastProps) {
  const [index, setIndex] = useState(0);
  const current = conquistas[index];

  useEffect(() => {
    if (!current) {
      onDone();
      return;
    }
    const timer = setTimeout(() => {
      if (index < conquistas.length - 1) {
        setIndex((i) => i + 1);
      } else {
        onDone();
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [index, conquistas.length, current, onDone]);

  if (!current) return null;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={current.id}
        initial={{ opacity: 0, y: -40, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -20, scale: 0.95 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[60] max-w-sm w-[calc(100%-2rem)]"
      >
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl shadow-2xl p-4 text-white">
          <div className="flex items-center gap-3">
            <div className="text-3xl shrink-0 animate-bounce">{current.icone}</div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wider opacity-80 font-semibold">
                Conquista Desbloqueada!
              </p>
              <p className="font-bold text-sm truncate">{current.titulo}</p>
              <p className="text-xs opacity-90 truncate">{current.descricao}</p>
              <p className="text-[10px] mt-1 opacity-70">+{current.xp} XP</p>
            </div>
          </div>
          {conquistas.length > 1 && (
            <div className="flex gap-1 mt-2 justify-center">
              {conquistas.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${i === index ? "bg-white" : "bg-white/30"}`}
                />
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
