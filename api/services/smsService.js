const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[SMS] Variables TWILIO no configuradas');
    return;
  }

  if (!telefono) {
    console.warn('[SMS] No hay teléfono del cliente');
    return;
  }

  const client = getClient();

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Normalizar teléfono español → añadir +34 si no tiene prefijo
  let telefonoNorm = telefono.replace(/\s/g, '');
  if (!telefonoNorm.startsWith('+')) {
    telefonoNorm = '+34' + telefonoNorm;
  }

  const mensajeCliente = `✂ THIS IS ART\n¡Hola ${nombre}! Tu cita está confirmada:\n📅 ${fechaFormateada}\n🕐 ${hora}\n💈 ${servicio}\n📍 Carrer de Volta, 82 · Terrassa\n📞 93 189 40 78`;

  const mensajeBarberia = `✂ Nueva cita:\nCliente: ${nombre}\nServicio: ${servicio}\nFecha: ${fechaFormateada}\nHora: ${hora}\nTel: ${telefono}`;

  const promises = [];

  // SMS al cliente
  promises.push(
    client.messages.create({
      body: mensajeCliente,
      from: process.env.TWILIO_PHONE_NUMBER,
      to:   telefonoNorm,
    })
  );

  // SMS a la barbería
  if (process.env.BUSINESS_PHONE_SMS) {
    let telBarberia = process.env.BUSINESS_PHONE_SMS.replace(/\s/g, '');
    if (!telBarberia.startsWith('+')) telBarberia = '+34' + telBarberia;
    promises.push(
      client.messages.create({
        body: mensajeBarberia,
        from: process.env.TWILIO_PHONE_NUMBER,
        to:   telBarberia,
      })
    );
  }

  const results = await Promise.allSettled(promises);
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`[SMS] Enviado OK (${i === 0 ? 'cliente' : 'barbería'}): SID ${r.value.sid}`);
    } else {
      console.error(`[SMS] Error (${i === 0 ? 'cliente' : 'barbería'}):`, r.reason?.message);
    }
  });
}

module.exports = { sendSmsConfirmation };
