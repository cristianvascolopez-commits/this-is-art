const twilio      = require('twilio');
const { randomUUID } = require('crypto');

// Cache temporal de audios generados (uuid → Buffer)
const audioStore = new Map();

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

async function generarAudioElevenLabs(texto) {
  const apiKey  = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'; // Sarah — multilingual natural

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key':   apiKey,
      'Content-Type': 'application/json',
      'Accept':       'audio/mpeg',
    },
    body: JSON.stringify({
      text:     texto,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.35, use_speaker_boost: true },
    }),
  });

  if (!res.ok) throw new Error(`ElevenLabs ${res.status}: ${await res.text()}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const id = randomUUID();
  audioStore.set(id, buffer);
  setTimeout(() => audioStore.delete(id), 5 * 60 * 1000); // limpieza a los 5 min
  return id;
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

  // Llamada de voz con ElevenLabs (IA natural) → fallback a Polly.Lucia
  const [h, m] = hora.split(':');
  const horaVoz = m === '00' ? `las ${h} en punto` : `las ${h} y ${m}`;

  const textoVoz =
`¡Hola, ${nombre}! Te llamamos desde This Is Art, tu barbería de confianza aquí en Terrassa.

Queremos confirmarte que tienes una cita reservada para el ${fechaFormateada}, a ${horaVoz}. El servicio que has elegido es ${servicio}.

Nos encontramos en el Carrer de Volta, número ochenta y dos. Si necesitas hacer algún cambio o cancelar tu cita, llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho. Estaremos encantados de ayudarte.

Muchas gracias, ${nombre}. ¡Te esperamos con los brazos abiertos!`;

  let twiml;

  try {
    if (!process.env.ELEVENLABS_API_KEY) throw new Error('Sin API key');
    const audioId  = await generarAudioElevenLabs(textoVoz);
    const baseUrl  = process.env.RAILWAY_PUBLIC_DOMAIN
      ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`
      : 'https://this-is-art-app-production.up.railway.app';
    const audioUrl = `${baseUrl}/api/twiml/audio/${audioId}`;
    twiml = `<Response><Play>${audioUrl}</Play></Response>`;
    console.log('[ElevenLabs] Audio generado → URL:', audioUrl);
  } catch (err) {
    console.warn('[ElevenLabs] Fallo, usando Polly.Lucia:', err.message);
    const n = sinAcentos(nombre);
    const s = sinAcentos(servicio);
    const f = sinAcentos(fechaFormateada);
    twiml = `<Response>
  <Say voice="Polly.Lucia">
    Hola ${n}, <break time="400ms"/>
    te llamamos desde This Is Art, tu barberia de confianza en Terrassa. <break time="700ms"/>
    Tu cita esta confirmada para el ${f}, a ${horaVoz}. <break time="600ms"/>
    El servicio es ${s}. <break time="700ms"/>
    Muchas gracias ${n}, hasta pronto.
  </Say>
</Response>`;
  }

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

module.exports = { sendSmsConfirmation, audioStore };
