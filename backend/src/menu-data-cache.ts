/**
 * Monta e cacheia em memória os dados do Menu (navegação, logo, agências,
 * redes sociais, 40 anos) — o Menu aparece em toda página (home + rodapé
 * de tudo mais), então antes cada montagem disparava 5 chamadas de API
 * separadas. Agora é uma chamada só, com o resultado combinado já pronto.
 *
 * Invalidação automática via lifecycle hooks (ver index.ts) — zero ação
 * manual no CMS.
 */

const PORT = process.env.PORT || 1337;
const BASE = `http://127.0.0.1:${PORT}`;

type MenuData = {
  nav: any;
  logo: any;
  agencias: any[];
  redes: any;
  quarentaAnos: any;
};

let cache: MenuData | null = null;
let building: Promise<MenuData> | null = null;
// Incrementada a cada invalidação — se uma reconstrução em andamento
// (disparada ANTES da invalidação mais recente) terminar depois, ela não
// pode mais escrever no cache: sem isso, editar de novo enquanto uma
// reconstrução antiga ainda está em voo derrubava a invalidação e o cache
// ficava travado numa versão intermediária (viu isso acontecer com a
// ordem das agências: reordenar rápido deixava o cache preso no meio da
// edição, sem nunca pegar o estado final).
let generation = 0;

export function invalidarMenuDataCache() {
  cache = null;
  building = null;
  generation++;
}

async function getJSON(path: string): Promise<any> {
  const res = await fetch(`${BASE}/api/${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json: any = await res.json();
  return json.data;
}

async function montar(): Promise<MenuData> {
  const [nav, logo, agencias, redes, quarentaAnos] = await Promise.all([
    getJSON('navigation?populate[links][populate][sublinks][populate]=*'),
    getJSON('logo-site?populate=logo'),
    getJSON('agencias?populate=Logo&sort=posicao:asc'),
    getJSON('redes-sociais?populate[redes][populate]=icone'),
    getJSON('quarenta-anos?populate=imagem'),
  ]);
  return { nav, logo, agencias: agencias ?? [], redes, quarentaAnos };
}

export async function getMenuDataCache(): Promise<MenuData> {
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

export async function menuDataRoute(ctx: any) {
  try {
    const data = await getMenuDataCache();
    ctx.body = { data };
  } catch (e: any) {
    strapi.log.error(`[menu-data] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
