import { RegistroAtendimento, TIPOS_PADRAO } from "./types";

function horaAleatoria(): number {
  // Distribuição com picos: início tarde (13-15) e fim tarde (17-19)
  const r = Math.random();
  if (r < 0.08) return 12;
  if (r < 0.22) return 13;
  if (r < 0.38) return 14;
  if (r < 0.5) return 15;
  if (r < 0.58) return 16;
  if (r < 0.72) return 17;
  if (r < 0.85) return 18;
  if (r < 0.93) return 19;
  if (r < 0.98) return 20;
  return 21;
}

/**
 * Gera dados de exemplo para visualização local.
 * Cria registros realistas espalhados pelo mês atual e o anterior,
 * com variação de horários e tipos.
 */
export function gerarDadosExemplo(): RegistroAtendimento[] {
  const registros: RegistroAtendimento[] = [];
  const tipos = TIPOS_PADRAO;
  const hoje = new Date();
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth(); // 0-indexed

  // Pesos por tipo (simula distribuição real)
  const pesos = [
    { tipoId: tipos[0].id, peso: 0.08 }, // Chat em branco (raro)
    { tipoId: tipos[1].id, peso: 0.1 },  // Emergência
    { tipoId: tipos[2].id, peso: 0.22 }, // Renovação de receita
    { tipoId: tipos[3].id, peso: 0.18 }, // Pedido de Exame
    { tipoId: tipos[4].id, peso: 0.3 },  // Sintomas (mais comum)
    { tipoId: tipos[5].id, peso: 0.12 }, // Administrativo
  ];

  function tipoAleatorio(): string {
    const r = Math.random();
    let acumulado = 0;
    for (const p of pesos) {
      acumulado += p.peso;
      if (r <= acumulado) return p.tipoId;
    }
    return pesos.at(-1)!.tipoId;
  }

  function gerarDia(ano: number, mes: number, dia: number, qtdMin: number, qtdMax: number) {
    const dt = new Date(ano, mes, dia);
    // Pula fins de semana (sáb=6, dom=0)
    if (dt.getDay() === 0 || dt.getDay() === 6) return;

    const qtd = qtdMin + Math.floor(Math.random() * (qtdMax - qtdMin + 1));
    for (let i = 0; i < qtd; i++) {
      const hora = horaAleatoria();
      const minuto = Math.floor(Math.random() * 60);
      const segundo = Math.floor(Math.random() * 60);

      const ts = new Date(ano, mes, dia, hora, minuto, segundo);
      registros.push({
        id: crypto.randomUUID(),
        tipoId: tipoAleatorio(),
        timestamp: ts.toISOString(),
      });
    }
  }

  // Mês anterior completo (~15-25 atendimentos/dia útil)
  const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1;
  const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual;
  const diasMesAnterior = new Date(anoMesAnterior, mesAnterior + 1, 0).getDate();
  for (let d = 1; d <= diasMesAnterior; d++) {
    gerarDia(anoMesAnterior, mesAnterior, d, 12, 28);
  }

  // Mês atual até hoje (~15-25 atendimentos/dia útil)
  const diaHoje = hoje.getDate();
  for (let d = 1; d <= diaHoje; d++) {
    // Hoje tem menos (só até a hora atual)
    if (d === diaHoje) {
      gerarDia(anoAtual, mesAtual, d, 5, 12);
    } else {
      gerarDia(anoAtual, mesAtual, d, 12, 28);
    }
  }

  // Ordena por timestamp
  registros.sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return registros;
}
