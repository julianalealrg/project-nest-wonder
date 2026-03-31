// Mock data for Produção module

export interface MockPeca {
  id: string;
  item: string;
  descricao: string;
  quantidade: number;
  comprimento: number;
  largura: number;
  precisa_45: boolean;
  precisa_poliborda: boolean;
  precisa_usinagem: boolean;
  status_corte: string;
  cortador: string | null;
  status_45: string;
  operador_45: string | null;
  status_poliborda: string;
  operador_poliborda: string | null;
  status_usinagem: string;
  operador_usinagem: string | null;
  status_acabamento: string;
  acabador: string | null;
  cabine: string | null;
  status_cq: string;
  cq_aprovado: boolean | null;
  cq_responsavel: string | null;
  cq_observacao: string | null;
}

export interface MockOS {
  id: string;
  codigo: string;
  cliente: string;
  cliente_id: string;
  ambiente: string;
  material: string;
  projetista: string;
  supervisor: string;
  area_m2: number;
  data_emissao: string;
  data_entrega: string | null;
  status: string;
  localizacao: string;
  origem: "os" | "rep" | "oc" | "of";
  terceiro: string | null;
  pdf_url: string | null;
  updated_at: string;
  pecas: MockPeca[];
  romaneios: { codigo: string; tipo_rota: string; status: string; data_saida: string | null }[];
  registros: { codigo: string; tipo: string; status: string; urgencia: string }[];
}

const today = new Date();
const daysAgo = (d: number) => {
  const date = new Date(today);
  date.setDate(date.getDate() - d);
  return date.toISOString();
};

export const STATUS_STEPS = [
  "Ag. Chapa",
  "Fila Corte",
  "Cortando",
  "Env. B2",
  "Acabamento",
  "CQ",
  "Expedição",
  "Entregue",
] as const;

export const STATUS_MAP: Record<string, number> = {
  aguardando_chapa: 0,
  fila_corte: 1,
  cortando: 2,
  enviado_base2: 3,
  acabamento: 4,
  cq: 5,
  expedicao: 6,
  entregue: 7,
};

export const STATUS_LABELS: Record<string, string> = {
  aguardando_chapa: "Ag. Chapa",
  fila_corte: "Fila Corte",
  cortando: "Cortando",
  enviado_base2: "Env. B2",
  acabamento: "Acabamento",
  cq: "CQ",
  expedicao: "Expedição",
  entregue: "Entregue",
  terceiros: "Terceiros",
};

function makePecas(count: number, statusCorte: string, statusAcab: string, cortador: string | null, acabador: string | null, doneCount: number): MockPeca[] {
  const pecas: MockPeca[] = [];
  const tipos = ["Bancada", "Testeira", "Rodapé", "Soleira", "Filetes", "Nicho", "Prateleira", "Revestimento"];
  for (let i = 0; i < count; i++) {
    const done = i < doneCount;
    pecas.push({
      id: `peca-${Math.random().toString(36).slice(2, 8)}`,
      item: `${i + 1}`,
      descricao: tipos[i % tipos.length],
      quantidade: Math.ceil(Math.random() * 3),
      comprimento: 1200 + Math.floor(Math.random() * 800),
      largura: 400 + Math.floor(Math.random() * 300),
      precisa_45: i % 3 === 0,
      precisa_poliborda: i % 2 === 0,
      precisa_usinagem: i % 4 === 0,
      status_corte: done ? "concluido" : statusCorte,
      cortador: done || statusCorte === "concluido" ? (cortador || "Kelson") : null,
      status_45: done ? "concluido" : (i % 3 === 0 ? "pendente" : "nao_aplicavel"),
      operador_45: done && i % 3 === 0 ? "Kelson" : null,
      status_poliborda: done ? "concluido" : (i % 2 === 0 ? "pendente" : "nao_aplicavel"),
      operador_poliborda: done && i % 2 === 0 ? "Luiz" : null,
      status_usinagem: done ? "concluido" : (i % 4 === 0 ? "pendente" : "nao_aplicavel"),
      operador_usinagem: done && i % 4 === 0 ? "Kelson" : null,
      status_acabamento: done ? "concluido" : statusAcab,
      acabador: done ? (acabador || "Marcelo") : null,
      cabine: done ? "Cabine 1" : null,
      status_cq: done ? "aprovado" : "pendente",
      cq_aprovado: done ? true : null,
      cq_responsavel: done ? "Jeniffer" : null,
      cq_observacao: null,
    });
  }
  return pecas;
}

export const mockOSList: MockOS[] = [
  {
    id: "os-001", codigo: "OS-2025-0401", cliente: "Construtora Moura Dubeux", cliente_id: "c1",
    ambiente: "Cozinha", material: "Quartzito Taj Mahal", projetista: "Arq. Carla Mendes",
    supervisor: "Roberto Lima", area_m2: 12.5, data_emissao: daysAgo(15), data_entrega: daysAgo(-8),
    status: "cortando", localizacao: "Base 1", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(1),
    pecas: makePecas(6, "concluido", "pendente", "Kelson", null, 3),
    romaneios: [], registros: [],
  },
  {
    id: "os-002", codigo: "OS-2025-0398", cliente: "Edifício Paço do Frevo", cliente_id: "c2",
    ambiente: "BWC Suíte", material: "Mármore Branco Paraná", projetista: "Arq. Felipe Torres",
    supervisor: "Ana Souza", area_m2: 8.2, data_emissao: daysAgo(22), data_entrega: daysAgo(-5),
    status: "acabamento", localizacao: "Base 2", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(0),
    pecas: makePecas(4, "concluido", "em_andamento", "Kelson", "Marcelo", 2),
    romaneios: [{ codigo: "ROM-0045", tipo_rota: "base1_base2", status: "entregue", data_saida: daysAgo(5) }],
    registros: [],
  },
  {
    id: "os-003", codigo: "OS-2025-0395", cliente: "Res. Beira Mar", cliente_id: "c3",
    ambiente: "Lavabo", material: "Granito Preto São Gabriel", projetista: "Arq. Renata Dias",
    supervisor: "Roberto Lima", area_m2: 3.1, data_emissao: daysAgo(30), data_entrega: daysAgo(2),
    status: "entregue", localizacao: "Cliente", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(2),
    pecas: makePecas(3, "concluido", "concluido", "Luiz", "Marcelo", 3),
    romaneios: [
      { codigo: "ROM-0042", tipo_rota: "base1_base2", status: "entregue", data_saida: daysAgo(10) },
      { codigo: "ROM-0048", tipo_rota: "base2_cliente", status: "entregue", data_saida: daysAgo(3) },
    ],
    registros: [],
  },
  {
    id: "os-004", codigo: "OS-2025-0402", cliente: "Construtora Moura Dubeux", cliente_id: "c1",
    ambiente: "Varanda Gourmet", material: "Quartzito Taj Mahal", projetista: "Arq. Carla Mendes",
    supervisor: "Roberto Lima", area_m2: 18.0, data_emissao: daysAgo(8), data_entrega: daysAgo(-20),
    status: "aguardando_chapa", localizacao: "Base 1", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(6),
    pecas: makePecas(8, "pendente", "pendente", null, null, 0),
    romaneios: [], registros: [],
  },
  {
    id: "os-005", codigo: "OS-2025-0399", cliente: "Shopping RioMar", cliente_id: "c4",
    ambiente: "Fachada", material: "Granito Cinza Andorinha", projetista: "Arq. Lucas Barros",
    supervisor: "Ana Souza", area_m2: 45.0, data_emissao: daysAgo(18), data_entrega: daysAgo(-2),
    status: "cq", localizacao: "Base 2", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(4),
    pecas: makePecas(12, "concluido", "concluido", "Kelson", "Marcelo", 10),
    romaneios: [{ codigo: "ROM-0044", tipo_rota: "base1_base2", status: "entregue", data_saida: daysAgo(8) }],
    registros: [{ codigo: "REG-0012", tipo: "medida_errada", status: "resolvido", urgencia: "alta" }],
  },
  {
    id: "os-006", codigo: "REP-2025-0015", cliente: "Edifício Paço do Frevo", cliente_id: "c2",
    ambiente: "BWC Social", material: "Mármore Branco Paraná", projetista: "Arq. Felipe Torres",
    supervisor: "Ana Souza", area_m2: 1.2, data_emissao: daysAgo(5), data_entrega: daysAgo(-1),
    status: "fila_corte", localizacao: "Base 1", origem: "rep", terceiro: null, pdf_url: null,
    updated_at: daysAgo(3),
    pecas: makePecas(2, "pendente", "pendente", null, null, 0),
    romaneios: [],
    registros: [{ codigo: "REG-0014", tipo: "reposicao", status: "em_producao", urgencia: "alta" }],
  },
  {
    id: "os-007", codigo: "OS-2025-0396", cliente: "Casa Forte Empreendimentos", cliente_id: "c5",
    ambiente: "Sala Jantar", material: "Nanoglass", projetista: "Arq. Juliana Maia",
    supervisor: "Roberto Lima", area_m2: 6.8, data_emissao: daysAgo(25), data_entrega: daysAgo(-3),
    status: "expedicao", localizacao: "Base 2", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(1),
    pecas: makePecas(5, "concluido", "concluido", "Luiz", "Marcelo", 5),
    romaneios: [], registros: [],
  },
  {
    id: "os-008", codigo: "OC-2025-0003", cliente: "Res. Beira Mar", cliente_id: "c3",
    ambiente: "Piscina", material: "Granito Preto São Gabriel", projetista: "Arq. Renata Dias",
    supervisor: "Roberto Lima", area_m2: 22.0, data_emissao: daysAgo(12), data_entrega: daysAgo(-15),
    status: "cortando", localizacao: "Base 1", origem: "oc", terceiro: null, pdf_url: null,
    updated_at: daysAgo(0),
    pecas: makePecas(7, "em_andamento", "pendente", "Kelson", null, 4),
    romaneios: [], registros: [],
  },
  {
    id: "os-009", codigo: "OF-2025-0002", cliente: "Shopping RioMar", cliente_id: "c4",
    ambiente: "Hall", material: "Mármore Travertino", projetista: "Arq. Lucas Barros",
    supervisor: "Ana Souza", area_m2: 15.0, data_emissao: daysAgo(20), data_entrega: null,
    status: "terceiros", localizacao: "Trânsito", origem: "of", terceiro: "Marmoraria Aliança", pdf_url: null,
    updated_at: daysAgo(7),
    pecas: makePecas(5, "pendente", "pendente", null, null, 0),
    romaneios: [], registros: [],
  },
  {
    id: "os-010", codigo: "OS-2025-0400", cliente: "Cond. Reserva do Paiva", cliente_id: "c6",
    ambiente: "Closet", material: "Quartzo Stellar Branco", projetista: "Arq. Mariana Lins",
    supervisor: "Roberto Lima", area_m2: 4.5, data_emissao: daysAgo(10), data_entrega: null,
    status: "enviado_base2", localizacao: "Trânsito", origem: "os", terceiro: null, pdf_url: null,
    updated_at: daysAgo(5),
    pecas: makePecas(4, "concluido", "pendente", "Luiz", null, 4),
    romaneios: [{ codigo: "ROM-0049", tipo_rota: "base1_base2", status: "em_transito", data_saida: daysAgo(1) }],
    registros: [],
  },
];
