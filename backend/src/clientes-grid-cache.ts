/**
 * Cacheia em memória a lista de clientes usada na grade de logos de
 * /clientes — mesmo padrão do cases-timeline e menu-data. Invalidação
 * automática via lifecycle hook (ver index.ts) quando um cliente muda.
 */

const PORT = process.env.PORT || 1337;
const BASE = `http://127.0.0.1:${PORT}`;

let cache: any[] | null = null;
let building: Promise<any[]> | null = null;
// Ver comentário equivalente em menu-data-cache.ts: sem isso, uma
// reconstrução já em voo quando chega uma nova invalidação sobrescrevia o
// cache com dados desatualizados ao terminar.
let generation = 0;

export function invalidarClientesGridCache() {
  cache = null;
  building = null;
  generation++;
}

async function montar(): Promise<any[]> {
  const res = await fetch(
    `${BASE}/api/clientes?filters[visivel][$ne]=false&sort=posicao:asc,nome:asc&populate[logo]=true&populate[cases][fields][0]=id&pagination[pageSize]=200`
  );
  if (!res.ok) throw new Error(`clientes -> HTTP ${res.status}`);
  const json: any = await res.json();
  return json.data ?? [];
}

export async function getClientesGridCache(): Promise<any[]> {
  if (cache) return cache;
  if (building) return building;
  const minhaGeneration = generation;
  building = montar()
    .then((result) => {
      if (minhaGeneration === generation) cache = result;
      building = null;
      return result;
    })
    .catch((err) => {
      building = null;
      throw err;
    });
  return building;
}

export async function clientesGridRoute(ctx: any) {
  try {
    const data = await getClientesGridCache();
    ctx.body = { data };
  } catch (e: any) {
    strapi.log.error(`[clientes-grid] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
