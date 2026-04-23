// Shared PDF design tokens — paleta NUE, fontes e tamanhos consistentes.
// Usado pelos 4 PDFs (OS, Romaneio, Ocorrência completa, Registro produção).

export const PDF_FONT = "Montserrat";

// Tamanhos (pt) — usar SEMPRE estes
export const PDF_SIZES = {
  body: 9,
  label: 10,
  title: 12,
  heading: 14,
  small: 8,
} as const;

// Paleta NUE em RGB (jsPDF usa RGB)
export const PDF_COLORS = {
  // Texto
  text: [13, 13, 13] as [number, number, number],          // #0D0D0D
  chumbo: [61, 61, 56] as [number, number, number],        // #3D3D38
  muted: [120, 120, 120] as [number, number, number],
  border: [204, 200, 194] as [number, number, number],     // #CCC8C2

  // Paleta expandida
  azul: [41, 128, 185] as [number, number, number],        // #2980B9
  verde: [39, 174, 96] as [number, number, number],        // #27AE60
  roxo: [142, 68, 173] as [number, number, number],        // #8E44AD
  laranja: [230, 126, 34] as [number, number, number],     // #E67E22
  vermelho: [192, 57, 43] as [number, number, number],     // #C0392B
  amarelo: [212, 160, 23] as [number, number, number],     // #D4A017

  // Acessórios
  amareloLight: [254, 243, 199] as [number, number, number], // #FEF3C7
  roxoLight: [243, 232, 255] as [number, number, number],
  verdeLight: [220, 252, 231] as [number, number, number],
  cinzaLight: [240, 237, 232] as [number, number, number],   // #F0EDE8
  white: [255, 255, 255] as [number, number, number],
};

// Cor por urgência
export function urgenciaColor(urgencia: string): [number, number, number] {
  switch (urgencia) {
    case "critica":
    case "alta":
      return PDF_COLORS.vermelho;
    case "media":
      return PDF_COLORS.amarelo;
    case "baixa":
      return PDF_COLORS.verde;
    default:
      return PDF_COLORS.muted;
  }
}

// Cor por origem do registro
export function origemColor(origem: string): [number, number, number] {
  switch (origem) {
    case "obra":
      return PDF_COLORS.roxo;
    case "fabrica":
      return PDF_COLORS.chumbo;
    case "solicitacao":
      return PDF_COLORS.azul;
    default:
      return PDF_COLORS.muted;
  }
}

// Cor por status do registro
export function registroStatusColor(status: string): [number, number, number] {
  switch (status) {
    case "aberto":
      return PDF_COLORS.amarelo;
    case "em_producao":
      return PDF_COLORS.laranja;
    case "aguardando_os":
      return PDF_COLORS.roxo;
    case "enviado_base1":
    case "enviado_base2":
    case "enviado_obra":
      return PDF_COLORS.azul;
    case "resolvido":
      return PDF_COLORS.verde;
    default:
      return PDF_COLORS.muted;
  }
}

// Cor por rota de romaneio
export function rotaColor(tipoRota: string): [number, number, number] {
  switch (tipoRota) {
    case "base1_base2":
    case "base2_base1":
      return PDF_COLORS.azul;
    case "base1_cliente":
    case "base2_cliente":
      return PDF_COLORS.verde;
    case "recolha":
      return PDF_COLORS.amarelo;
    default:
      return PDF_COLORS.chumbo;
  }
}

// Cor por destino da OS (Base 2 / Base 1 / Cliente / Terceiro)
export function destinoColor(localizacao?: string | null): [number, number, number] {
  const loc = (localizacao || "").toLowerCase();
  if (loc.includes("base 2") || loc.includes("base2")) return PDF_COLORS.laranja;
  if (loc.includes("base 1") || loc.includes("base1")) return PDF_COLORS.azul;
  if (loc.includes("cliente")) return PDF_COLORS.verde;
  if (loc.includes("terceir")) return PDF_COLORS.chumbo;
  return PDF_COLORS.muted;
}
