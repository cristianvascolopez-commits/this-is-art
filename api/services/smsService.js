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

  const [h, m]  = hora.split(':');
  const horaVoz = m === '00' ? `las ${h}` : `las ${h} y ${m}`;

  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">
Hola ${nombre}, ¿qué tal?
Te llamamos desde THIS IS ART, tu barbería de confianza en Terrassa.
Te confirmamos que tu cita está reservada y te esperamos con muchas ganas.
Tienes el ${fechaFormateada}, a ${horaVoz} en punto.
El servicio que has elegido es ${servicio}.
Estamos en el Carrer de Volta, número ochenta y dos, aquí en Terrassa.
Si necesitas cambiar o cancelar tu cita, llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho.
Muchas gracias por confiar en THIS IS ART, ${nombre}. ¡Te esperamos pronto!
  </Say>
</Response>`;

  try {
    const call = await client.calls.create({
      twiml,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   telefonoNorm,
    });
    console.log('[Llamada] Iniciada OK — SID:', call.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[Llamada] Error:', err.message);
  }
}

module.exports = { sendSmsConfirmation };
