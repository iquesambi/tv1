// Campo-isca contra robôs de spam: fica fora da tela e fora da navegação
// por teclado, então pessoas nunca preenchem. Robôs costumam preencher todos
// os campos, e o backend descarta qualquer envio com "website" preenchido.
export default function Honeypot() {
  return (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
    />
  )
}
