const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

function sinAcentos(str) {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizarTelefono(telefono) {
  let t = telefono.replace(/\s/g, '');
  if (!t.startsWith('+')) t = '+34' + t;
  return t;
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[Twilio] Variables no configuradas');
    return;
  }

  if (!telefono) {
    console.warn('[Twilio] No hay teléfono del cliente');
    return;
  }

  const client       = getClient();
  const telefonoNorm = normalizarTelefono(telefono);

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // SMS de confirmación
  const mensajeSms =
`✂️ THIS IS ART — Reserva confirmada

Hola ${nombre}, ¡muchas gracias por elegirnos! 🙏

Tu cita:
📅 ${fechaFormateada}
🕐 ${hora}h
💈 ${servicio}
📍 C/ Volta 82, Terrassa

Para cambios llama al 93 189 40 78.
¡Hasta pronto! — El equipo de THIS IS ART`;

  try {
    const msg = await client.messages.create({
      body: mensajeSms,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   telefonoNorm,
    });
    console.log('[SMS] Enviado OK — SID:', msg.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[SMS] Error:', err.message);
  }

  // Llamada de voz en español — TwiML inline (confirmado funcionando)
  const [h, m]  = hora.split(':');
  const horaVoz = m === '00' ? `las ${h}` : `las ${h} y ${m}`;

  const twiml = `<Response><Say voice="alice" language="es-ES">Hola ${sinAcentos(nombre)}. Te llamamos desde THIS IS ART, tu barberia de confianza en Terrassa. Tu cita esta confirmada para el ${sinAcentos(fechaFormateada)}, a ${horaVoz}. El servicio elegido es ${sinAcentos(servicio)}. Estamos en el Carrer de Volta, ochenta y dos. Si necesitas cambiar la cita llamanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho. Muchas gracias ${sinAcentos(nombre)}. Hasta pronto.</Say></Response>`;

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
