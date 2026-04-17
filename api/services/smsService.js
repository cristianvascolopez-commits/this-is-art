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
    console.warn('[Twilio] Variables no configuradas');
    return;
  }

  if (!telefono) {
    console.warn('[Twilio] No hay teléfono del cliente');
    return;
  }

  const client = getClient();
  const telefonoNorm = normalizarTelefono(telefono);

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // 1. Enviar SMS de texto
  const mensajeSms = `✂ THIS IS ART — Cita confirmada\n\nHola ${nombre}, tu cita está reservada:\n📅 ${fechaFormateada}\n🕐 ${hora}h\n💈 ${servicio}\n📍 C/ Volta 82, Terrassa\n\nSi necesitas cambiarla llámanos: 93 189 40 78`;

  try {
    const smsOpts = process.env.TWILIO_MESSAGING_SID
      ? { messagingServiceSid: process.env.TWILIO_MESSAGING_SID }
      : { from: process.env.TWILIO_PHONE_NUMBER };

    const msg = await client.messages.create({
      body: mensajeSms,
      to:   telefonoNorm,
      ...smsOpts,
    });
    console.log('[SMS] Enviado OK — SID:', msg.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[SMS] Error:', err.message);
  }

  // 2. Llamada de voz de confirmación
  if (!process.env.TWILIO_PHONE_NUMBER) return;

  const base = 'https://this-is-art-app-production.up.railway.app';
  const params = new URLSearchParams({ nombre, servicio, fecha, hora });
  const twimlUrl = `${base}/api/twiml/confirmacion?${params.toString()}`;

  try {
    const call = await client.calls.create({
      url:  twimlUrl,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   telefonoNorm,
    });
    console.log('[Llamada] Iniciada OK — SID:', call.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[Llamada] Error:', err.message);
  }
}

module.exports = { sendSmsConfirmation };
