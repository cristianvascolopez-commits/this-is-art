const express = require('express');
const router  = express.Router();
const { askClaude }          = require('../services/claudeService');
const { createAppointment, searchAppointments, cancelAppointment, updateAppointment } = require('../services/calendarService');
const { sendConfirmation }   = require('../services/emailService');
const { saveMemory, saveConversation, extractMemorizable } = require('../services/cerebroService');

router.post('/', async (req, res) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'El campo "message" es obligatorio.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({
      error: 'El chatbot no está configurado. Configura ANTHROPIC_API_KEY en el archivo .env',
    });
  }

  try {
    // Detectar si hay algo que memorizar
    const toMemorize = extractMemorizable(message);
    if (toMemorize && sessionId) {
      saveMemory(toMemorize, sessionId || 'web');
    }

    // Llamar a Claude
    let rawReply = await askClaude(message, history);

    // Detectar si Claude generó datos de cita
    const citaMatch = rawReply.match(/\[CITA:(\{.*?\})\]/s);
    let calendarResult = null;

    if (citaMatch) {
      try {
        const citaData = JSON.parse(citaMatch[1]);
        calendarResult = await createAppointment(citaData);
        console.log('[Calendar] Cita creada:', calendarResult?.id);

        // Enviar email de confirmación si se proporcionó
        sendConfirmation({
          nombre:        citaData.nombre,
          servicio:      citaData.servicio,
          fecha:         citaData.fecha,
          hora:          citaData.hora,
          telefono:      citaData.telefono || '',
          emailCliente:  citaData.email || '',
        }).catch(err => console.warn('[Email] Error al enviar:', err.message));

      } catch (calErr) {
        console.error('[Calendar] Error al crear cita:', calErr.message);
      }
    }

    // ── BUSCAR_CITA ──────────────────────────────────────────────────────────
    const buscarMatch = rawReply.match(/\[BUSCAR_CITA:(\{.*?\})\]/s);
    if (buscarMatch) {
      try {
        const { nombre, telefono } = JSON.parse(buscarMatch[1]);

        // Buscar primero por nombre; si no hay resultados, por teléfono
        let events = await searchAppointments(nombre);
        if (events.length === 0 && telefono) {
          events = await searchAppointments(telefono);
        }

        // Construir contexto legible para una segunda llamada a Claude
        let contexto;
        if (events.length === 0) {
          contexto = `No encontré ninguna cita próxima para "${nombre}" (tel: ${telefono || 'no indicado'}). Informa al cliente de forma amable y sugiere verificar los datos o llamar al 93 189 40 78.`;
        } else {
          const lista = events.map((e, i) => {
            const dt  = new Date(e.start);
            const dia = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
            const hr  = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
            const svc = e.summary.replace('✂ THIS IS ART — ', '');
            return `${i + 1}. ${svc} — ${dia} a las ${hr} [ID:${e.id}]`;
          }).join('\n');
          contexto = `Citas encontradas para ${nombre}:\n${lista}\nMuéstraselas al cliente de forma clara y pregunta qué quiere hacer (cancelar o cambiar). Conserva los [ID:...] en tu respuesta para poder actuar sobre ellos.`;
        }

        // Segunda llamada a Claude con el contexto de búsqueda
        const primeraRespuesta = rawReply.replace(/\[BUSCAR_CITA:\{.*?\}\]/s, '').trim();
        const historialExtendido = [
          ...history,
          { role: 'user',      content: message },
          { role: 'assistant', content: primeraRespuesta || 'Buscando tu cita...' },
          { role: 'user',      content: `[Resultado búsqueda sistema]: ${contexto}` },
        ];
        rawReply = await askClaude('[Resultado búsqueda sistema recibido]', historialExtendido);

      } catch (e) {
        console.error('[Chat] Error búsqueda cita:', e.message);
        rawReply = rawReply.replace(/\[BUSCAR_CITA:\{.*?\}\]/s, '').trim();
      }
    }

    // ── CANCELAR_CITA ─────────────────────────────────────────────────────────
    const cancelarMatch = rawReply.match(/\[CANCELAR_CITA:(\{.*?\})\]/s);
    if (cancelarMatch) {
      try {
        const { eventId, nombre } = JSON.parse(cancelarMatch[1]);
        await cancelAppointment(eventId);
        console.log('[Calendar] Cita cancelada:', eventId);
        rawReply = rawReply.replace(/\[CANCELAR_CITA:\{.*?\}\]/s, '').trim();
      } catch (e) {
        console.error('[Chat] Error cancelar cita:', e.message);
      }
    }

    // ── MODIFICAR_CITA ────────────────────────────────────────────────────────
    const modificarMatch = rawReply.match(/\[MODIFICAR_CITA:(\{.*?\})\]/s);
    if (modificarMatch) {
      try {
        const { eventId, fecha, hora } = JSON.parse(modificarMatch[1]);
        await updateAppointment(eventId, { fecha, hora });
        console.log('[Calendar] Cita modificada:', eventId);
        rawReply = rawReply.replace(/\[MODIFICAR_CITA:\{.*?\}\]/s, '').trim();
      } catch (e) {
        console.error('[Chat] Error modificar cita:', e.message);
      }
    }

    // Limpiar el token [CITA:...] de la respuesta visible
    const reply = rawReply.replace(/\[CITA:\{.*?\}\]/s, '').trim();

    // Guardar historial de la conversación
    if (sessionId) {
      const updatedHistory = [
        ...history,
        { role: 'user', content: message },
        { role: 'assistant', content: reply },
      ];
      saveConversation(sessionId, updatedHistory);
    }

    return res.json({
      reply,
      memorized: toMemorize ? true : false,
      appointmentCreated: calendarResult ? true : false,
    });

  } catch (err) {
    console.error('[Chat] Error:', err.message);
    return res.status(500).json({
      error: 'Error procesando tu mensaje. Por favor inténtalo de nuevo.',
    });
  }
});

module.exports = router;
