const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function normalizarTelefono(telefono) {
  let t = telefono.replace(/\s/g, '');
  if (!t.startsWith('+')) t = '+34' + t;
  return t;
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.warn('[SMS] Variables Twilio no configuradas');
    return;
  }

  if (!telefono) {
    console.warn('[SMS] No hay teléfono del cliente');
    return;
  }

  const client = getClient();
  const telefonoNorm = normalizarTelefono(telefono);

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const mensaje =
`✂️ THIS IS ART — Reserva confirmada

Hola ${nombre}, ¡muchas gracias por elegirnos! 🙏

Tu cita ha quedado registrada:
📅 ${fechaFormateada}
🕐 ${hora}h
💈 ${servicio}
📍 C/ Volta 82, Terrassa

Te esperamos con ganas. Si necesitas cambiar o cancelar, llámanos al 93 189 40 78.

¡Hasta pronto! 👋
— El equipo de THIS IS ART`;

  try {
    const smsOpts = process.env.TWILIO_MESSAGING_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SID }
      : { from: process.env.TWILIO_PHONE_NUMBER };

    const msg = await client.messages.create({
      body: mensaje,
      to:   telefonoNorm,
      ...smsOpts,
    });
    console.log('[SMS] Enviado OK — SID:', msg.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[SMS] Error:', err.message);
  }
}

module.exports = { sendSmsConfirmation };
