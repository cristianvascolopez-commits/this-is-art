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

  // Llamada de voz — Polly.Lucia (neural española, natural con SSML)
  const [h, m]  = hora.split(':');
  const horaVoz = m === '00' ? `las ${h} en punto` : `las ${h} y ${m}`;

  const n = sinAcentos(nombre);
  const s = sinAcentos(servicio);
  const f = sinAcentos(fechaFormateada);

  const twiml = `<Response>
  <Say voice="Polly.Lucia">
    Hola ${n}, <break time="400ms"/>
    te llamamos desde This Is Art, tu barberia de confianza en Terrassa. <break time="700ms"/>
    Queremos confirmarte que tu cita esta reservada para el ${f}, <break time="300ms"/> a ${horaVoz}. <break time="600ms"/>
    El servicio que has elegido es ${s}. <break time="700ms"/>
    Nos encontramos en el Carrer de Volta, numero ochenta y dos, en Terrassa. <break time="500ms"/>
    Si necesitas modificar o cancelar tu cita, <break time="200ms"/> puedes llamarnos al noventa y tres, <break time="200ms"/> ciento ochenta y nueve, <break time="200ms"/> cuarenta, <break time="200ms"/> setenta y ocho. <break time="700ms"/>
    Muchas gracias ${n}, <break time="300ms"/> esperamos verte pronto. <break time="400ms"/> Hasta luego.
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
