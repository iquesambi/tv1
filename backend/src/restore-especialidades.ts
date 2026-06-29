/**
 * Restaura os vínculos case → especialidade / sub_especialidade depois de
 * converter essas relações de manyToOne para manyToMany. A conversão pode
 * apagar a tabela de relação antiga; este endpoint relê o snapshot tirado
 * antes da migração e regrava os vínculos (como arrays, no formato novo).
 *
 * Uso: GET /api/restaurar-especialidades?token=SEGREDO
 *   - token comparado com a env CLOUDINARY_IMPORT_TOKEN (reaproveitada).
 *
 * Idempotente: só grava quando o case ainda não tem a tag esperada.
 */

const snapshot: Array<{ documentId: string; id: number; titulo?: string; esp: number | null; sub: number | null }> =
  require('./migration-data/case-especialidades-snapshot.json');

export async function restaurarEspecialidades(ctx: any) {
  const tokenEsperado = process.env.CLOUDINARY_IMPORT_TOKEN;
  if (!tokenEsperado) return ctx.badRequest('CLOUDINARY_IMPORT_TOKEN não configurado no servidor.');
  if (ctx.query.token !== tokenEsperado) return ctx.unauthorized('Token inválido.');

  try {
    let atualizados = 0;
    let semVinculo = 0;
    let naoEncontrados = 0;
    const erros: string[] = [];

    for (const s of snapshot) {
      const esp = s.esp ? [s.esp] : [];
      const sub = s.sub ? [s.sub] : [];
      if (!esp.length && !sub.length) { semVinculo++; continue; }

      try {
        // Confere se ainda existe e se já tem os vínculos (idempotência)
        const atual: any = await strapi.db.query('api::case.case').findOne({
          where: { id: s.id },
          populate: { especialidade: true, sub_especialidade: true },
        });
        if (!atual) { naoEncontrados++; continue; }

        const espAtuais = (atual.especialidade ?? []).map((e: any) => e.id);
        const subAtuais = (atual.sub_especialidade ?? []).map((e: any) => e.id);
        const faltaEsp = esp.some((id) => !espAtuais.includes(id));
        const faltaSub = sub.some((id) => !subAtuais.includes(id));
        if (!faltaEsp && !faltaSub) continue;

        await strapi.db.query('api::case.case').update({
          where: { id: s.id },
          data: {
            // une com o que já houver, sem duplicar
            especialidade: Array.from(new Set([...espAtuais, ...esp])),
            sub_especialidade: Array.from(new Set([...subAtuais, ...sub])),
          },
        });
        atualizados++;
      } catch (e: any) {
        erros.push(`${s.titulo ?? s.id}: ${e.message}`);
      }
    }

    ctx.body = { total: snapshot.length, atualizados, sem_vinculo: semVinculo, nao_encontrados: naoEncontrados, erros };
  } catch (e: any) {
    strapi.log.error(`[restaurar-especialidades] ${e.stack || e.message}`);
    ctx.status = 500;
    ctx.body = { ok: false, erro: e.message };
  }
}
