export function normalizeNome(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev = new Array(n + 1).fill(0);
  let curr = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) prev[j] = j;

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

export interface ClienteSimilaridade {
  match: boolean;
  exato: boolean;
  motivo?: "igual" | "substring" | "levenshtein";
  distancia?: number;
}

export function compararNomes(a: string, b: string): ClienteSimilaridade {
  const na = normalizeNome(a);
  const nb = normalizeNome(b);
  if (!na || !nb) return { match: false, exato: false };
  if (na === nb) return { match: true, exato: true, motivo: "igual" };

  if (na.length >= 5 && nb.length >= 5) {
    if (na.includes(nb) || nb.includes(na)) {
      return { match: true, exato: false, motivo: "substring" };
    }
  }

  const dist = levenshtein(na, nb);
  const maior = Math.max(na.length, nb.length);
  const limite = maior <= 6 ? 1 : maior <= 12 ? 2 : 3;
  if (dist <= limite) {
    return { match: true, exato: false, motivo: "levenshtein", distancia: dist };
  }
  return { match: false, exato: false, distancia: dist };
}

export interface ClienteParaComparar {
  id: string;
  nome: string;
}

export interface ParCandidato<T extends ClienteParaComparar> {
  a: T;
  b: T;
  motivo: "igual" | "substring" | "levenshtein";
  distancia?: number;
}

export function detectarDuplicados<T extends ClienteParaComparar>(
  clientes: T[],
): ParCandidato<T>[] {
  const pares: ParCandidato<T>[] = [];
  const ordenados = [...clientes].sort((x, y) =>
    normalizeNome(x.nome).localeCompare(normalizeNome(y.nome)),
  );
  for (let i = 0; i < ordenados.length; i++) {
    for (let j = i + 1; j < ordenados.length; j++) {
      const sim = compararNomes(ordenados[i].nome, ordenados[j].nome);
      if (sim.match && sim.motivo) {
        pares.push({
          a: ordenados[i],
          b: ordenados[j],
          motivo: sim.motivo,
          distancia: sim.distancia,
        });
      }
    }
  }
  return pares;
}
