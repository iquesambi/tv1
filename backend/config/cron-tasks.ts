import { processarFila } from '../src/fila-emails';

export default {
  // Manda os envios de formulário que ficaram pendentes (cota do Resend
  // esgotada, Resend fora do ar...). De hora em hora basta: quando a cota
  // volta, os pendentes saem na rodada seguinte.
  filaEmails: {
    task: () => processarFila(),
    options: { rule: '0 * * * *' },
  },
};
