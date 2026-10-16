// Utilidades compartilhadas pelos formulários de contato.

// Lê o campo-isca do <Honeypot /> no submit.
export const valorHoneypot = (e) => e.target.elements.website?.value || ''

export const mensagemErroEnvio = (err) =>
  err.response?.status === 429
    ? 'Recebemos muitos envios seus em pouco tempo. Tente novamente mais tarde.'
    : 'Erro ao enviar. Tente novamente.'
