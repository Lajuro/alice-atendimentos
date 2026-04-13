"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getResumoDiaAnterior } from "@/lib/storage";
import { Sparkles } from "lucide-react";

const FRASES_MOTIVACIONAIS = [
  "Cada atendimento faz a diferença.",
  "Você está construindo algo incrível, um dia de cada vez.",
  "A constância transforma esforço em resultado.",
  "Bora fazer desse dia um dia produtivo!",
  "Seu trabalho importa mais do que você imagina.",
  "Pequenos passos, grandes conquistas.",
  "Hoje é uma nova chance de dar o seu melhor.",
  "A dedicação de hoje é o resultado de amanhã.",
  "Continue assim — você está no caminho certo.",
  "Foco, consistência e um café. Bora!",
  "Quem registra, evolui.",
  "Mais um dia para fazer acontecer!",
];

function getSaudacao(hora: number): string {
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

const INTRO_DURATION = 5000;

export default function WelcomeIntro({ nome, onDone }: { nome: string; onDone: () => void }) {
  const [visible, setVisible] = useState(true);
  const [horaAtual, setHoraAtual] = useState(() => new Date());

  const saudacao = getSaudacao(horaAtual.getHours());
  const frase = useMemo(
    () => FRASES_MOTIVACIONAIS[Math.floor(Math.random() * FRASES_MOTIVACIONAIS.length)],
    [],
  );
  const resumoOntem = useMemo(() => getResumoDiaAnterior(), []);

  // Update clock every second
  useEffect(() => {
    const interval = setInterval(() => setHoraAtual(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const skip = useCallback(() => setVisible(false), []);

  // Lock body scroll while intro is visible
  useEffect(() => {
    if (visible) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [visible]);

  // Auto-dismiss after INTRO_DURATION
  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), INTRO_DURATION);
    return () => clearTimeout(timer);
  }, []);

  // Keyboard skip: Escape, Space, Enter
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === " " || e.key === "Enter") {
        e.preventDefault();
        skip();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [skip]);

  const dataTexto = format(horaAtual, "EEEE, d 'de' MMMM", { locale: ptBR });
  const horaTexto = format(horaAtual, "HH:mm");

  const firstName = nome.split(" ")[0];

  const containerVariants = {
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97, transition: { duration: 0.4, ease: "easeInOut" as const } },
  };

  const lineVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      y: 0,
      transition: { delay: 0.15 + i * 0.25, duration: 0.5, ease: "easeOut" as const },
    }),
  };

  return (
    <AnimatePresence onExitComplete={onDone}>
      {visible && (
        <motion.div
          key="welcome-intro"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background"
          variants={containerVariants}
          initial="visible"
          exit="exit"
          role="dialog"
          aria-label="Tela de boas-vindas"
        >
          <div className="flex flex-col items-center text-center px-6 max-w-lg">
            {/* Greeting */}
            <motion.h1
              custom={0}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-4xl font-bold text-alice-primary"
            >
              {saudacao}, {firstName}!
            </motion.h1>

            {/* Date */}
            <motion.p
              custom={1}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="mt-3 text-base sm:text-lg text-alice-gray-400 capitalize"
            >
              {dataTexto}
            </motion.p>

            {/* Clock */}
            <motion.p
              custom={2}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="mt-4 text-5xl sm:text-6xl font-extralight tracking-tight text-foreground/80 tabular-nums"
            >
              {horaTexto}
            </motion.p>

            {/* Yesterday summary */}
            <motion.p
              custom={3}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="mt-5 text-sm text-alice-gray-400"
            >
              {resumoOntem
                ? `Ontem você registrou ${resumoOntem.total} atendimento${resumoOntem.total !== 1 ? "s" : ""}`
                : "Sem registros ontem"}
            </motion.p>

            {/* Motivational quote */}
            <motion.p
              custom={4}
              variants={lineVariants}
              initial="hidden"
              animate="visible"
              className="mt-6 text-sm italic text-alice-gray-300 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              {frase}
            </motion.p>
          </div>

          {/* Skip button */}
          <motion.button
            custom={5}
            variants={lineVariants}
            initial="hidden"
            animate="visible"
            onClick={skip}
            className="absolute bottom-8 text-sm text-alice-gray-300 hover:text-alice-gray-500 transition-colors"
          >
            Pular
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
