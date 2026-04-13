"use client";

import { useState, useRef } from "react";
import type { PerfilUsuario, HorarioAlmoco } from "@/lib/types";
import { TimeInput } from "@/components/ui/TimeInput";
import ImageCropper from "@/components/ui/ImageCropper";

const STEPS = ["Perfil", "Horários", "Almoço"] as const;

const AvatarPlaceholder = () => (
  <svg className="w-8 h-8 text-alice-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
  </svg>
);

export default function Onboarding({
  onComplete,
  onCancel,
  initial,
}: {
  onComplete: (perfil: PerfilUsuario) => void;
  onCancel?: () => void;
  initial?: PerfilUsuario | null;
}) {
  const isEditing = initial?.onboardingCompleto === true;
  const [step, setStep] = useState(0);

  // Profile fields
  const [nome, setNome] = useState(initial?.nome ?? "");
  const [profissao, setProfissao] = useState(initial?.profissao ?? "");
  const [imagemBase64, setImagemBase64] = useState<string | undefined>(initial?.imagemBase64);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Schedule fields
  const [horaEntrada, setHoraEntrada] = useState(initial?.horaEntrada ?? "12:00");
  const [horaSaida, setHoraSaida] = useState(initial?.horaSaida ?? "21:00");

  // Lunch fields
  const [almocoPadrao, setAlmocoPadrao] = useState<HorarioAlmoco>(
    initial?.almocoPadrao ?? { inicio: "17:30", fim: "18:30" }
  );

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_000_000) {
      alert("Imagem muito grande. Máximo 2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setCropSrc(reader.result as string);
    reader.readAsDataURL(file);
    // reset so the same file can be re-selected
    e.target.value = "";
  };

  const canAdvance = () => {
    if (step === 0) return nome.trim().length >= 2;
    return true;
  };

  const buildPerfil = (): PerfilUsuario => ({
    nome: nome.trim(),
    profissao: profissao.trim() || undefined,
    imagemBase64,
    horaEntrada,
    horaSaida,
    almocoPadrao,
    onboardingCompleto: true,
  });

  // ── IMAGE CROPPER OVERLAY ──────────────────────────────────────────────────
  const cropperOverlay = cropSrc && (
    <ImageCropper
      imageSrc={cropSrc}
      onCropDone={(cropped) => {
        setImagemBase64(cropped);
        setCropSrc(null);
      }}
      onCancel={() => setCropSrc(null)}
    />
  );

  // ── EDIT MODE: flat single-page form ──────────────────────────────────────
  if (isEditing) {
    return (
      <>
      {cropperOverlay}
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-alice-black/60 backdrop-blur-sm p-4">
        <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="bg-alice-gray-50 px-6 py-4 flex items-center justify-between border-b border-alice-gray-100">
            <h2 className="text-base font-bold text-foreground">Configurações do perfil</h2>
            {onCancel && (
              <button
                onClick={onCancel}
                className="p-1 rounded-lg text-alice-gray-400 hover:text-foreground hover:bg-alice-gray-100 transition-colors"
                aria-label="Fechar"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
            {/* Avatar + Nome + Profissão */}
            <div className="flex items-start gap-4">
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-16 h-16 rounded-full bg-alice-gray-100 border-2 border-dashed border-alice-gray-300 flex items-center justify-center overflow-hidden hover:border-alice-primary transition-colors shrink-0"
              >
                {imagemBase64 ? (
                  <img src={imagemBase64} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <AvatarPlaceholder />
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
              <div className="flex-1 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Nome</label>
                  <input
                    type="text"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Ex: Maria Silva"
                    className="w-full px-4 py-2.5 rounded-lg border border-alice-gray-200 focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary text-sm"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Profissão <span className="text-alice-gray-400 font-normal">(opcional)</span>
                  </label>
                  <input
                    type="text"
                    value={profissao}
                    onChange={(e) => setProfissao(e.target.value)}
                    placeholder="Ex: Enfermagem, Fisioterapia…"
                    className="w-full px-4 py-2.5 rounded-lg border border-alice-gray-200 focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary text-sm"
                  />
                </div>
              </div>
            </div>

            <hr className="border-alice-gray-100" />

            {/* Horários */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Horário de trabalho</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Entrada</label>
                  <TimeInput value={horaEntrada} onChange={setHoraEntrada} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Saída</label>
                  <TimeInput value={horaSaida} onChange={setHoraSaida} />
                </div>
              </div>
            </div>

            <hr className="border-alice-gray-100" />

            {/* Almoço */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Pausa para refeição (padrão)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Início</label>
                  <TimeInput
                    value={almocoPadrao.inicio}
                    onChange={(v) => setAlmocoPadrao((p) => ({ ...p, inicio: v }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fim</label>
                  <TimeInput
                    value={almocoPadrao.fim}
                    onChange={(v) => setAlmocoPadrao((p) => ({ ...p, fim: v }))}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-6 flex items-center justify-end gap-3">
            {onCancel && (
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded-lg text-sm font-medium text-alice-gray-500 hover:bg-alice-gray-50 transition-colors"
              >
                Cancelar
              </button>
            )}
            <button
              onClick={() => onComplete(buildPerfil())}
              disabled={nome.trim().length < 2}
              className="px-6 py-2.5 rounded-lg bg-alice-primary text-white text-sm font-medium hover:bg-alice-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Salvar alterações
            </button>
          </div>
        </div>
      </div>
      </>
    );
  }

  // ── FIRST-TIME SETUP WIZARD ───────────────────────────────────────────────
  return (
    <>
    {cropperOverlay}
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-alice-black/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Progress steps */}
        <div className="bg-alice-gray-50 px-6 py-4 flex items-center justify-center gap-4">
          {STEPS.map((label, i) => {
            const stepClass =
              i < step
                ? "bg-alice-primary text-white"
                : i === step
                ? "bg-alice-primary text-white ring-2 ring-alice-primary/30 ring-offset-2 ring-offset-alice-gray-50"
                : "bg-alice-gray-200 text-alice-gray-400";
            return (
            <div key={label} className="flex items-center gap-2.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${stepClass}`}
              >
                {i < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`text-xs font-medium hidden sm:inline ${
                  i <= step ? "text-foreground" : "text-alice-gray-400"
                }`}
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-0.5 rounded-full ${i < step ? "bg-alice-primary" : "bg-alice-gray-200"}`} />
              )}
            </div>
            );
          })}
        </div>

        <div className="p-6 space-y-5 min-h-[320px]">
          {/* STEP 0 — Perfil */}
          {step === 0 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-foreground">Bem-vindo(a)!</h2>
                <p className="text-sm text-alice-gray-400 mt-1">
                  Vamos configurar seu perfil no Painel de Atendimentos.
                </p>
              </div>

              {/* Avatar */}
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-20 h-20 rounded-full bg-alice-gray-100 border-2 border-dashed border-alice-gray-300 flex items-center justify-center overflow-hidden hover:border-alice-primary transition-colors shrink-0"
                >
                  {imagemBase64 ? (
                    <img src={imagemBase64} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <AvatarPlaceholder />
                  )}
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
                <div className="text-xs text-alice-gray-400">
                  <p className="font-medium text-foreground text-sm">Foto (opcional)</p>
                  <p>Clique no círculo para escolher</p>
                  <p>Máx. 2 MB</p>
                </div>
              </div>

              {/* Nome */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Seu nome</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Maria Silva"
                  className="w-full px-4 py-2.5 rounded-lg border border-alice-gray-200 focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary text-sm"
                  autoFocus
                />
              </div>

              {/* Profissão */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Profissão <span className="text-alice-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={profissao}
                  onChange={(e) => setProfissao(e.target.value)}
                  placeholder="Ex: Enfermagem, Fisioterapia…"
                  className="w-full px-4 py-2.5 rounded-lg border border-alice-gray-200 focus:outline-none focus:border-alice-primary focus:ring-1 focus:ring-alice-primary text-sm"
                />
              </div>
            </>
          )}

          {/* STEP 1 — Horários */}
          {step === 1 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-foreground">Horário de trabalho</h2>
                <p className="text-sm text-alice-gray-400 mt-1">
                  Informe seu horário de entrada e saída.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Entrada</label>
                  <TimeInput value={horaEntrada} onChange={setHoraEntrada} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Saída</label>
                  <TimeInput value={horaSaida} onChange={setHoraSaida} />
                </div>
              </div>

              <div className="bg-alice-gray-50 rounded-lg p-3 text-xs text-alice-gray-400">
                Este horário será usado para definir o intervalo visível no painel de horas.
              </div>
            </>
          )}

          {/* STEP 2 — Almoço */}
          {step === 2 && (
            <>
              <div>
                <h2 className="text-lg font-bold text-foreground">Horário de almoço/janta</h2>
                <p className="text-sm text-alice-gray-400 mt-1">
                  Informe o horário padrão da sua pausa para refeição.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Início</label>
                  <TimeInput
                    value={almocoPadrao.inicio}
                    onChange={(v) => setAlmocoPadrao((p) => ({ ...p, inicio: v }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">Fim</label>
                  <TimeInput
                    value={almocoPadrao.fim}
                    onChange={(v) => setAlmocoPadrao((p) => ({ ...p, fim: v }))}
                  />
                </div>
              </div>

              <div className="bg-alice-gray-50 rounded-lg p-3 text-xs text-alice-gray-400">
                Esse horário será destacado no painel. Se num dia específico a pausa for diferente, você poderá ajustar direto no painel naquele dia.
              </div>
            </>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-6 pb-6 flex items-center justify-between">
          <button
            onClick={() => setStep((s) => s - 1)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              step === 0
                ? "invisible"
                : "text-alice-gray-500 hover:bg-alice-gray-50"
            }`}
          >
            Voltar
          </button>
          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canAdvance()}
              className="px-6 py-2.5 rounded-lg bg-alice-primary text-white text-sm font-medium hover:bg-alice-primary-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continuar
            </button>
          ) : (
            <button
              onClick={() => onComplete(buildPerfil())}
              className="px-6 py-2.5 rounded-lg bg-alice-primary text-white text-sm font-medium hover:bg-alice-primary-dark transition-colors"
            >
              Começar a usar
            </button>
          )}
        </div>
      </div>
    </div>
    </>
  );
}
