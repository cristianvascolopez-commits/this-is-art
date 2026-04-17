const Anthropic = require('@anthropic-ai/sdk');
const { loadKnowledge } = require('./cerebroService');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT_TEMPLATE = (knowledge) => `
Eres el asistente virtual de la barbería THIS IS ART, ubicada en Terrassa (Barcelona).
Tu nombre es "Asistente THIS IS ART". Eres amable, profesional y cercano.
Siempre respondes en español.

CONOCIMIENTO BASE:
${knowledge}

INSTRUCCIONES IMPORTANTES:
1. Cuando el usuario quiera reservar cita, recoge estos datos paso a paso:
   - Nombre completo
   - Servicio deseado (muestra lista si no especifica)
   - Fecha preferida (recuerda que domingo está cerrado)
   - Hora preferida (horario 10:00–19:30)
   - Teléfono de contacto
   Cuando tengas todos los datos, dile al usuario que su cita está siendo agendada
   y devuelve exactamente este JSON al final de tu respuesta para que el sistema la procese:
   [CITA:{"nombre":"...","servicio":"...","fecha":"...","hora":"...","telefono":"..."}]

2. Si el usuario dice algo seguido de la palabra "memorizar", confirma que lo has guardado.

3. Responde de forma concisa (máximo 3-4 párrafos).

4. Para precios no listados o servicios especiales, recomienda llamar al 93 189 40 78
   o reservar en Booksy.

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
