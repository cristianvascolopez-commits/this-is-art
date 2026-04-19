const twilio      = require('twilio');
const { randomUUID } = require('crypto');
const ftp         = require('basic-ftp');
const { Readable } = require('stream');

const audioStore = new Map(); // fallback en memoria

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

// Genera MP3 con Google TTS WaveNet y lo sube a Hostinger
async function generarAudioYSubir(texto) {
  // 1 — Google TTS WaveNet es-ES-Wavenet-C (femenina, cálida)
  const apiKey = process.env.GOOGLE_TTS_API_KEY;
  if (!apiKey) throw new Error('Sin GOOGLE_TTS_API_KEY');

  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input:       { text: texto },
        voice:       { languageCode: 'es-ES', name: 'es-ES-Wavenet-C' },
        audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92, pitch: 1.5 },
      }),
    }
  );
  if (!res.ok) throw new Error(`Google TTS ${res.status}: ${await res.text()}`);

  const { audioContent } = await res.json();
  const buffer = Buffer.from(audioContent, 'base64');
  console.log('[TTS] Audio generado:', buffer.length, 'bytes');

  // 2 — Subir a Hostinger → URL pública para Twilio
  const filename = `cita-${randomUUID()}.mp3`;
  const ftpClient = new ftp.Client();
  ftpClient.ftp.verbose = false;
  await ftpClient.access({
    host: '141.136.39.88', user: 'u352984932',
    password: 'Aa8812047616..', secure: false,
  });
  await ftpClient.uploadFrom(Readable.from(buffer),
    `/domains/criped.es/public_html/audio/${filename}`);
  ftpClient.close();

  // Limpiar archivo tras 10 min
  setTimeout(async () => {
    try {
      const c = new ftp.Client();
      await c.access({ host:'141.136.39.88', user:'u352984932', password:'Aa8812047616..', secure:false });
      await c.remove(`/domains/criped.es/public_html/audio/${filename}`);
      c.close();
    } catch (_) {}
  }, 10 * 60 * 1000);

  return `https://criped.es/audio/${filename}`;
}

async function sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono }) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.warn('[Twilio] Variables no configuradas'); return;
  }
  if (!telefono) { console.warn('[Twilio] Sin teléfono'); return; }

  const client       = getClient();
  const telefonoNorm = normalizarTelefono(telefono);

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // SMS
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
      body: mensajeSms, from: process.env.TWILIO_PHONE_NUMBER, to: telefonoNorm,
    });
    console.log('[SMS] OK — SID:', msg.sid);
  } catch (err) {
    console.error('[SMS] Error:', err.message);
  }

  // Llamada de voz
  const [h, m] = hora.split(':');
  const horaVoz = m === '00' ? `las ${h} en punto` : `las ${h} y ${m}`;

  const textoVoz =
`Hola, ${nombre}. Te llamamos desde This Is Art, tu barbería de confianza en Terrassa.

Queremos confirmarte que tienes una cita reservada para el ${fechaFormateada}, a ${horaVoz}. El servicio que has elegido es ${servicio}.

Nos encontramos en el Carrer de Volta, número ochenta y dos, en Terrassa. Si necesitas hacer algún cambio, llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho.

Muchas gracias, ${nombre}. ¡Te esperamos pronto!`;

  let twiml;
  try {
    const audioUrl = await generarAudioYSubir(textoVoz);
    twiml = `<Response><Play>${audioUrl}</Play></Response>`;
    console.log('[TTS] Listo →', audioUrl);
  } catch (err) {
    console.warn('[TTS] Fallo, usando Polly.Lucia:', err.message);
    const n = sinAcentos(nombre), s = sinAcentos(servicio), f = sinAcentos(fechaFormateada);
    twiml = `<Response><Say voice="Polly.Lucia">Hola ${n}, te llamamos desde This Is Art. Tu cita esta confirmada para el ${f} a ${horaVoz}. Servicio: ${s}. Muchas gracias ${n}, hasta pronto.</Say></Response>`;
  }

  try {
    const call = await client.calls.create({
      twiml, from: process.env.TWILIO_PHONE_NUMBER, to: telefonoNorm,
    });
    console.log('[Llamada] OK — SID:', call.sid);
  } catch (err) {
    console.error('[Llamada] Error:', err.message);
  }
}

module.exports = { sendSmsConfirmation, audioStore };
