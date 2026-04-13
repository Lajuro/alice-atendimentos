export interface TipoAtendimento {
  id: string;
  nome: string;
  cor: string;
}

export interface RegistroAtendimento {
  id: string;
  tipoId: string;
  timestamp: string; // ISO string
  nota?: string;
}

export interface DadosDia {
  data: string; // YYYY-MM-DD
  registros: RegistroAtendimento[];
}

export interface HorarioAlmoco {
  inicio: string; // "HH:mm"
  fim: string;    // "HH:mm"
}

export interface PerfilUsuario {
  nome: string;
  profissao?: string;
  imagemBase64?: string; // data URI da foto
  horaEntrada: string;   // "HH:mm"
  horaSaida: string;     // "HH:mm"
  almocoPadrao: HorarioAlmoco;
  onboardingCompleto: boolean;
}

export interface RegistroAlmoco {
  id: string;
  data: string;   // YYYY-MM-DD
  inicio: string; // ISO string
  fim?: string;   // ISO string (undefined = em andamento)
}

export interface Configuracao {
  horaInicio: number;
  horaFim: number;
}

export const CONFIG_PADRAO: Configuracao = { horaInicio: 12, horaFim: 21 };

export interface MetaConfig {
  metaDiaria: number;
}

export const META_PADRAO: MetaConfig = { metaDiaria: 30 };

export const DIAS_SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sab"] as const;
export type DiaSemana = (typeof DIAS_SEMANA)[number];

export type AvaliacaoEmoji = "bom" | "normal" | "dificil";

export interface NotaDia {
  data: string;          // YYYY-MM-DD
  nota: string;
  avaliacao?: AvaliacaoEmoji;
  atualizadoEm: string;  // ISO string
}

export const AVALIACOES: AvaliacaoEmoji[] = ["bom", "normal", "dificil"];
export const AVALIACAO_LABEL: Record<AvaliacaoEmoji, string> = {
  bom: "Bom",
  normal: "Normal",
  dificil: "Difícil",
};

export const TIPOS_PADRAO: TipoAtendimento[] = [
  { id: "chat-branco", nome: "Chat em branco", cor: "#9CA3AF" },
  { id: "emergencia", nome: "Emergência", cor: "#EF4444" },
  { id: "renovacao-receita", nome: "Renovação de receita", cor: "#3B82F6" },
  { id: "pedido-exame", nome: "Pedido de Exame", cor: "#F59E0B" },
  { id: "sintomas", nome: "Sintomas", cor: "#10B981" },
  { id: "administrativo", nome: "Administrativo", cor: "#8B5CF6" },
];
