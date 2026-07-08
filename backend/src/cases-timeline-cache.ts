/**
 * Monta e cacheia em memória as entradas da timeline unificada de /cases.
 *
 * Antes, cada visitante do site fazia essa query pesada (populate profundo
 * de blocos, em até 200 cases) e montava as entradas no navegador — agora
 * roda uma vez no servidor e fica em cache até o conteúdo mudar de verdade.
 *
 * Invalidação é automática via lifecycle hooks (ver index.ts): criar,
 * editar ou apagar um case/especialidade/sub-especialidade, ou editar a
 * navegação, dispara a invalidação sozinho — zero ação manual no CMS.
 *
 * Reaproveita as mesmas queries REST já usadas no frontend (chamando a si
 * mesmo internamente) em vez de reimplementar a lógica com a API de query
 * do Strapi — populate profundo de dynamic zones é frágil de acertar na
 * mão, e essas queries já são testadas e corretas.
 */

const PORT = process.env.PORT || 1337;
const BASE = `http://127.0.0.1:${PORT}`;

type Entrada = {
  id: string;
  ancora: string;
  subEspAncora: string | null;
  label: string;
  ordemSub: number;
  agenciaLogo: any;
  agenciaNome: string | null;
  data: string | null;
  nome: string;
  capa: any;
  href: string;
};

type CasesTimelineData = { entradas: Entrada[]; map: Record<string, string> };

let cache: CasesTimelineData | null = null;
let building: Promise<CasesTimelineData> | null = null;

export function invalidarCasesTimelineCache() {
  cache = null;
}

async function getJSON(path: string): Promise<any> {
  const res = await fetch(`${BASE}/api/${path}`);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  const json: any = await res.json();
  return json.data;
}

async function montar(): Promise<CasesTimelineData> {
  const nav = await getJSON('navigation?populate[links][populate][sublinks][populate]=*');
  const linkCases = (nav?.links ?? []).find(
    (l: any) => (l.label ?? '').toLowerCase() === 'cases' || l.url === '/cases'
  );
  const sublinks = linkCases?.sublinks ?? [];

  const especialidadeSlugs = new Set<string>();
  const secoes: { slug: string; label: string }[] = [];
  const ordemSublink: Record<string, number> = {};

  for (let subIdx = 0; subIdx < sublinks.length; subIdx++) {
    const sub = sublinks[subIdx];
    const subSlug = sub.especialidade?.slug || sub.slug || (sub.label ?? '').toLowerCase().replace(/\s+/g, '-');
    const esps = sub.especialidade ? [sub.especialidade] : [];
    ordemSublink[subSlug] = subIdx;
    for (const e of esps) {
      if (e.slug) {
        especialidadeSlugs.add(e.slug);
        secoes.push({ slug: e.slug, label: e.nome });
        ordemSublink[e.slug] = subIdx;
      }
    }
  }

  if (especialidadeSlugs.size === 0) return { entradas: [], map: {} };

  const slugFilters = Array.from(especialidadeSlugs)
    .map((s) => `filters[especialidade][slug][$in]=${encodeURIComponent(s)}`)
    .join('&');
  const cases =
    (await getJSON(
      `cases?${slugFilters}` +
      `&populate[especialidade]=true&populate[sub_especialidade][populate][especialidade]=true&populate[cliente]=true&populate[agencia]=true` +
      `&populate[imagem_capa]=true&populate[imagem_timeline]=true` +
      `&populate[blocos][populate]=*` +
      `&pagination[pageSize]=200&sort=Data:desc`
    )) ?? [];

  const entradas: Entrada[] = [];
  for (const c of cases) {
    const clienteSlug = c.cliente?.slug;
    const caseSlug = c.slug;
    const capaPrincipal = c.imagem_timeline || c.imagem_capa;
    const esps = (Array.isArray(c.especialidade) ? c.especialidade : c.especialidade ? [c.especialidade] : []).filter(
      (e: any) => e?.slug && especialidadeSlugs.has(e.slug)
    );
    const subs = Array.isArray(c.sub_especialidade) ? c.sub_especialidade : c.sub_especialidade ? [c.sub_especialidade] : [];
    const contextos = esps.map((e: any) => {
      const sec = secoes.find((s) => s.slug === e.slug);
      const sub = subs.find((s: any) => s?.especialidade?.slug === e.slug) || null;
      return {
        ancora: e.slug,
        subEspAncora: sub?.slug || null,
        ordemSub: sub?.ordem ?? 9999,
        label: sub?.nome || sec?.label || e.nome || '',
      };
    });

    for (const ctx of contextos) {
      const meta = {
        ancora: ctx.ancora,
        subEspAncora: ctx.subEspAncora,
        label: ctx.label,
        ordemSub: ctx.ordemSub,
        agenciaLogo: c.agencia?.logo ?? null,
        agenciaNome: c.agencia?.nome ?? null,
      };
      if (capaPrincipal) {
        entradas.push({
          id: `${c.id}-${ctx.ancora}-main`,
          ...meta,
          data: c.Data ?? null,
          nome: c.titulo_timeline || c.titulo,
          capa: capaPrincipal,
          href: clienteSlug && caseSlug ? `/${clienteSlug}/${caseSlug}` : `/${caseSlug}`,
        });
      }
      for (const bloco of c.blocos ?? []) {
        if (bloco.__component === 'blocks.subtitulo' && bloco.timeline && bloco.timeline_data && bloco.visivel !== false) {
          const subtituloCapa = bloco.timeline_capa || c.imagem_capa;
          if (!subtituloCapa) continue;
          entradas.push({
            id: `${c.id}-${ctx.ancora}-sub-${bloco.id}`,
            ...meta,
            data: bloco.timeline_data,
            nome: bloco.timeline_nome || bloco.texto,
            capa: subtituloCapa,
            href: clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id ?? ''}`
              : `/${caseSlug}#${bloco.ancora_id ?? ''}`,
          });
        }
        if (bloco.__component === 'blocks.subcase' && bloco.ancora_id && bloco.visivel !== false) {
          const blocoCapa = bloco.imagem_timeline || bloco.imagem_capa;
          if (!blocoCapa) continue;
          entradas.push({
            id: `${c.id}-${ctx.ancora}-sub-${bloco.id}`,
            ...meta,
            data: bloco.Data ?? c.Data ?? null,
            nome: bloco.titulo_timeline || bloco.titulo,
            capa: blocoCapa,
            href: clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id}`
              : `/${caseSlug}#${bloco.ancora_id}`,
          });
        }
        if (bloco.__component === 'blocks.video' && bloco.ir_para_timeline && bloco.ancora_id && bloco.visivel !== false) {
          const videoCapa = bloco.imagem_timeline || bloco.capa;
          if (!videoCapa) continue;
          entradas.push({
            id: `${c.id}-${ctx.ancora}-sub-${bloco.id}`,
            ...meta,
            data: c.Data ?? null,
            nome: bloco.titulo,
            capa: videoCapa,
            href: clienteSlug && caseSlug
              ? `/${clienteSlug}/${caseSlug}#${bloco.ancora_id}`
              : `/${caseSlug}#${bloco.ancora_id}`,
          });
        }
      }
    }
  }

  entradas.sort((a, b) => {
    const oa = ordemSublink[a.ancora] ?? 9999;
    const ob = ordemSublink[b.ancora] ?? 9999;
    if (oa !== ob) return oa - ob;
    if (a.ordemSub !== b.ordemSub) return a.ordemSub - b.ordemSub;
    return new Date(b.data ?? 0).getTime() - new Date(a.data ?? 0).getTime();
  });

  const map: Record<string, string> = {};
  for (const e of entradas) if (e.subEspAncora && !map[e.subEspAncora]) map[e.subEspAncora] = e.id;
  for (const e of entradas) {
    if (!e.ancora) continue;
    if (!map[e.ancora]) {
      map[e.ancora] = e.id;
    } else if (e.subEspAncora && !entradas.find((x) => x.id === map[e.ancora])?.subEspAncora) {
      map[e.ancora] = e.id;
    }
  }

  return { entradas, map };
}

export async function getCasesTimelineCache(): Promise<CasesTimelineData> {
  if (cache) return cache;
  if (building) return building;
  building = montar()
    .then((result) => {
      cache = result;
      building = null;
      return result;
    })
    .catch((err) => {
      building = null;
      throw err;
    });
  return building;
}

export async function casesTimelineRoute(ctx: any) {
  try {
    const data = await getCasesTimelineCache();
    ctx.body = { data };
  } catch (e: any) {
    strapi.log.error(`[cases-timeline] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { data: null, error: e.message };
  }
}
