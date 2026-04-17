const twilio = require('twilio');

function getClient() {
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[Llamada] Variables TWILIO no configuradas');
    return;
  }

  if (!telefono) {
    console.warn('[Llamada] No hay teléfono del cliente');
    return;
  }

  const client = getClient();

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // Normalizar teléfono español
  let telefonoNorm = telefono.replace(/\s/g, '');
  if (!telefonoNorm.startsWith('+')) {
    telefonoNorm = '+34' + telefonoNorm;
  }

  // Mensaje de voz en español
  const mensaje = `
    <Response>
      <Say language="es-ES" voice="Polly.Conchita">
        Hola ${nombre}, te llamamos de THIS IS ART, barbería en Terrassa.
        Tu cita ha quedado confirmada.
        Servicio: ${servicio}.
        Fecha: ${fechaFormateada}.
        Hora: ${hora.replace(':', ' y ')}.
        Nos encontramos en Carrer de Volta, ochenta y dos, Terrassa.
        Para cambiar o cancelar tu cita llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho.
        ¡Hasta pronto!
      </Say>
    </Response>
  `.trim();

  try {
    const call = await client.calls.create({
      twiml: mensaje,
      from:  process.env.TWILIO_PHONE_NUMBER,
      to:    telefonoNorm,
    });
    console.log('[Llamada] Iniciada OK — SID:', call.sid, '→', telefonoNorm);
  } catch (err) {
    console.error('[Llamada] Error:', err.message);
  }
}

module.exports = { sendSmsConfirmation };
