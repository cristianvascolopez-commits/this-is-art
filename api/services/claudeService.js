const Anthropic = require('@anthropic-ai/sdk');
const { loadKnowledge } = require('./cerebroService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function getCurrentDateInfo() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
  const fmt  = (d) => d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Madrid' });
  const iso  = (d) => d.toISOString().split('T')[0];

  const hoy     = new Date(now); hoy.setHours(12,0,0,0);
  const manana  = new Date(hoy); manana.setDate(hoy.getDate() + 1);
  const pasado  = new Date(hoy); pasado.setDate(hoy.getDate() + 2);

  return `FECHA ACTUAL (zona horaria Europa/Madrid):
- Hoy:           ${fmt(hoy)}  [ISO: ${iso(hoy)}]
- Mañana:        ${fmt(manana)}  [ISO: ${iso(manana)}]
- Pasado mañana: ${fmt(pasado)}  [ISO: ${iso(pasado)}]
Cuando el usuario diga "hoy", "mañana" o "pasado mañana" usa estas fechas exactas.
Recuerda que los DOMINGOS estamos cerrados.`;
}

const SYSTEM_PROMPT_TEMPLATE = (knowledge) => `
Eres el asistente virtual de la barbería THIS IS ART, ubicada en Terrassa (Barcelona).
Tu nombre es "Asistente THIS IS ART". Eres amable, profesional y cercano.
Siempre respondes en español.

${getCurrentDateInfo()}

CONOCIMIENTO BASE:
${knowledge}

INSTRUCCIONES IMPORTANTES:
1. Cuando el usuario quiera reservar cita, recoge estos datos paso a paso:
   - Nombre completo
   - Servicio deseado (muestra lista si no especifica)
   - Profesional preferido: pregunta "¿Con qué profesional quieres tu cita?" y muestra siempre esta lista:
     • Bryan Referovic
     • Marc Balsera
     • David Fernández
     • Nico Cortez
     Si el cliente no tiene preferencia, usa "Sin preferencia".
   - Fecha preferida (recuerda que domingo está cerrado)
   - Hora preferida (horario 10:00–20:30)
   - Teléfono de contacto
   - Email (pregunta: "¿Quieres recibir la confirmación por email? Si es así, dime tu dirección de correo." — es opcional, si no quiere, usa "")
   Cuando tengas todos los datos, dile al usuario que su cita está siendo agendada
   y devuelve exactamente este JSON al final de tu respuesta para que el sistema la procese:
   [CITA:{"nombre":"...","servicio":"...","profesional":"...","fecha":"YYYY-MM-DD","hora":"HH:MM","telefono":"...","email":"..."}]

2. Si el usuario dice algo seguido de la palabra "memorizar", confirma que lo has guardado.

3. Responde de forma concisa (máximo 3-4 párrafos).

4. Para precios no listados o servicios especiales, recomienda llamar al 93 189 40 78.

5. Nunca inventes precios que no estén en el conocimiento base.

6. Si preguntan por la ubicación, da la dirección exacta y menciona el parking La Rasa.
`.trim();

async function askClaude(message, conversationHistory = []) {
  const knowledge = loadKnowledge();
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE(knowledge);

  const messages = [
    ...conversationHistory.slice(-18).map(m => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: message },
  ];

  const response = await client.messages.create({
    model: process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: systemPrompt,
    messages,
  });

  const text = response.content?.[0]?.text || '';
  return text;
}

module.exports = { askClaude };
