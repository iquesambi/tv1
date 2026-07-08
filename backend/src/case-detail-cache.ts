/**
 * Cacheia em memória o detalhe de um case (o mesmo populate profundo de
 * blocos que a página do case precisa) por slug — evita repetir essa
 * query pesada pra cada visitante do mesmo case.
 *
 * Invalidação automática (limpa o cache inteiro, é barato remontar) via
 * lifecycle hook em case/case-quarenta-anos — ver index.ts.
 */

const PORT = process.env.PORT || 1337;
const BASE = `http://127.0.0.1:${PORT}`;

type CaseDetail = { data: any; is40Anos: boolean } | null;

let cache = new Map<string, CaseDetail>();
let building = new Map<string, Promise<CaseDetail>>();

export function invalidarCaseDetailCache() {
  cache = new Map();
  building = new Map();
}

async function getJSON(path: string): Promise<any> {
  const res = await fetch(`${BASE}/api/${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json: any = await res.json();
  return json.data;
}

async function montar(clienteSlug: string | null, caseSlug: string): Promise<CaseDetail> {
  const populate =
    `&populate[cliente]=true` +
    `&populate[imagem_capa]=true` +
    `&populate[blocos][populate]=*`;
  const filtro =
    `?filters[slug][$eq]=${encodeURIComponent(caseSlug)}` +
    (clienteSlug ? `&filters[cliente][slug][$eq]=${encodeURIComponent(clienteSlug)}` : '');

  const encontrado = await getJSON(`cases${filtro}${populate}`);
  if (encontrado?.[0]) return { data: encontrado[0], is40Anos: false };

  const encontrado40 = await getJSON(`cases-quarenta-anos${filtro}${populate}`);
  if (encontrado40?.[0]) return { data: encontrado40[0], is40Anos: true };

  return null;
}

export async function getCaseDetailCache(clienteSlug: string | null, caseSlug: string): Promise<CaseDetail> {
  const key = `${clienteSlug ?? ''}/${caseSlug}`;
  if (cache.has(key)) return cache.get(key)!;
  if (building.has(key)) return building.get(key)!;
  const promise = montar(clienteSlug, caseSlug)
    .then((result) => {
      cache.set(key, result);
      building.delete(key);
      return result;
    })
    .catch((err) => {
      building.delete(key);
      throw err;
    });
  building.set(key, promise);
  return promise;
}

export async function caseDetailRoute(ctx: any) {
  try {
    const caseSlug = ctx.query.slug;
    const clienteSlug = ctx.query.cliente || null;
    if (!caseSlug) return ctx.badRequest('slug obrigatório.');
    const result = await getCaseDetailCache(clienteSlug, caseSlug);
    ctx.body = { data: result };
  } catch (e: any) {
    strapi.log.error(`[case-detail] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
