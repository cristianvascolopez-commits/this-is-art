const https = require('https');

function normalizarTelefono(telefono) {
  let t = telefono.replace(/\s/g, '');
  if (!t.startsWith('+')) t = '+34' + t;
  return t;
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.BREVO_API_KEY) {
    console.warn('[SMS] BREVO_API_KEY no configurada');
    return;
  }

  if (!telefono) {
    console.warn('[SMS] No hay teléfono del cliente');
    return;
  }

  const telefonoNorm = normalizarTelefono(telefono);

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const mensaje =
`THIS IS ART - Reserva confirmada

Hola ${nombre}, muchas gracias por elegirnos!

Tu cita:
- ${fechaFormateada}
- ${hora}h
- ${servicio}
- C/ Volta 82, Terrassa

Para cambios llama al 93 189 40 78.
Hasta pronto! - El equipo de THIS IS ART`;

  const payload = JSON.stringify({
    sender:    'THISISART',
    recipient: telefonoNorm,
    content:   mensaje,
    type:      'transactional',
  });

  const options = {
    hostname: 'api.brevo.com',
    path:     '/v3/transactionalSMS/sms',
    method:   'POST',
    headers: {
      'api-key':      process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(payload),
    },
  };

  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('[SMS Brevo] Enviado OK →', telefonoNorm);
        } else {
          console.error('[SMS Brevo] Error', res.statusCode, data);
        }
        resolve();
      });
    });
    req.on('error', err => {
      console.error('[SMS Brevo] Error de red:', err.message);
      resolve();
    });
    req.write(payload);
    req.end();
  });
}

module.exports = { sendSmsConfirmation };
