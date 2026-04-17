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

  const [h, m]   = hora.split(':');
  const horaVoz  = m === '00' ? `las ${h}` : `las ${h} y ${m}`;

  // Mensaje de voz en español
  const mensaje = `
    <Response>
      <Say language="es-ES" voice="Polly.Conchita">
        <prosody rate="95%">
          Hola ${nombre}, ¿qué tal?
          <break time="400ms"/>
          Te llamamos desde THIS IS ART, tu barbería de confianza en Terrassa.
          <break time="500ms"/>
          Te confirmamos que tu cita está reservada y te esperamos con muchas ganas.
          <break time="400ms"/>
          Tienes el ${fechaFormateada}, a ${horaVoz} en punto.
          El servicio que has elegido es ${servicio}.
          <break time="500ms"/>
          Nos encontramos en el Carrer de Volta, número ochenta y dos, aquí en Terrassa.
          Si necesitas aparcamiento, el parking La Rasa está a pocos metros y tienes treinta minutos gratis.
          <break time="500ms"/>
          Si por cualquier motivo necesitas cambiar o cancelar tu cita, llámanos al
          noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho,
          y lo gestionamos encantados.
          <break time="400ms"/>
          Muchas gracias por confiar en THIS IS ART, ${nombre}.
          ¡Te esperamos pronto!
        </prosody>
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
