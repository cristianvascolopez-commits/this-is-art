const express = require('express');
const router = express.Router();
const { askClaude } = require('../services/aurabotClaudeService');
const { createAppointment, searchAppointments, cancelAppointment, updateAppointment } = require('../services/aurabotCalendarService');
const { sendAurabotConfirmation } = require('../services/aurabotEmailService');
const { saveMemory, extractMemorizable } = require('../services/aurabotCerebroService');
const { appendClientRecord, getClientHistory } = require('../services/aurabotSheetsService');

router.post('/', async (req, res) => {
  const { message, sessionId, history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'El campo "message" es obligatorio.' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ error: 'El chatbot no está configurado.' });
  }

  try {
    const toMemorize = extractMemorizable(message);
    if (toMemorize && sessionId) {
      saveMemory(toMemorize, sessionId);
    }

    let rawReply = await askClaude(message, history);

    // ── CITA ─────────────────────────────────────────────────────────────
    const citaMatch = rawReply.match(/\[CITA:(\{.*?\})\]/s);
    let calendarResult = null;

    if (citaMatch) {
      try {
        const citaData = JSON.parse(citaMatch[1]);
        calendarResult = await createAppointment(citaData);
        console.log('[Aurabot Calendar] Cita creada:', calendarResult?.id, '| telefono:', citaData.telefono || '(vacío)');

        sendAurabotConfirmation({
          nombre: citaData.nombre,
          empresa: citaData.empresa || '',
          servicio: citaData.servicio,
          fecha: citaData.fecha,
          hora: citaData.hora,
          telefono: citaData.telefono || '',
          emailCliente: citaData.email || '',
        }).catch(err => console.warn('[Aurabot Email] Error al enviar:', err.message));

        appendClientRecord({
          nombre: citaData.nombre,
          telefono: citaData.telefono || '',
          empresa: citaData.empresa || '',
          necesidad: citaData.servicio || '',
          plan: citaData.plan || '',
          fechaCita: `${citaData.fecha || ''} ${citaData.hora || ''}`.trim(),
        }).catch(err => console.warn('[Aurabot Sheets] Error al guardar cliente:', err.message));

      } catch (calErr) {
        console.error('[Aurabot Calendar] Error al crear cita:', calErr.message);
      }
    }

    // ── CONSULTAR_HISTORIAL ──────────────────────────────────────────────
    const historialMatch = rawReply.match(/\[CONSULTAR_HISTORIAL:(\{.*?\})\]/s);
    if (historialMatch) {
      try {
        const { telefono } = JSON.parse(historialMatch[1]);
        const historial = await getClientHistory(telefono);

        const contexto = historial
          ? `Historial previo encontrado para este cliente:\n${historial}\nSalúdale como cliente conocido y usa este contexto para no repetir preguntas ya respondidas.`
          : `No hay historial previo para el teléfono ${telefono}. Trátalo como cliente nuevo con normalidad, sin mencionar que has comprobado nada.`;

        const primeraRespuesta = rawReply.replace(/\[CONSULTAR_HISTORIAL:\{.*?\}\]/s, '').trim();
        const historialExtendido = [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: primeraRespuesta || 'Un momento, reviso si ya nos conocemos...' },
          { role: 'user', content: `[Resultado consulta historial sistema]: ${contexto}` },
        ];
        rawReply = await askClaude('[Resultado consulta historial recibido]', historialExtendido);
      } catch (e) {
        console.error('[Aurabot Chat] Error consultando historial:', e.message);
        rawReply = rawReply.replace(/\[CONSULTAR_HISTORIAL:\{.*?\}\]/s, '').trim();
      }
    }

    // ── BUSCAR_CITA ──────────────────────────────────────────────────────
    const buscarMatch = rawReply.match(/\[BUSCAR_CITA:(\{.*?\})\]/s);
    if (buscarMatch) {
      try {
        const { nombre, telefono } = JSON.parse(buscarMatch[1]);
        let events = await searchAppointments(nombre);
        if (events.length === 0 && telefono) events = await searchAppointments(telefono);

        let contexto;
        if (events.length === 0) {
          contexto = `No encontré ninguna cita próxima para "${nombre}" (tel: ${telefono || 'no indicado'}). Informa al cliente de forma amable y sugiere verificar los datos o llamar al +34 941 682 234.`;
        } else {
          const lista = events.map((e, i) => {
            const dt = new Date(e.start);
            const dia = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
            const hr = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
            const svc = e.summary.replace('🤖 AURABOT — ', '');
            return `${i + 1}. ${svc} — ${dia} a las ${hr} [ID:${e.id}]`;
          }).join('\n');
          contexto = `Citas encontradas para ${nombre}:\n${lista}\nMuéstraselas al cliente de forma clara y pregunta qué quiere hacer (cancelar o cambiar). Conserva los [ID:...] en tu respuesta para poder actuar sobre ellos.`;
        }

        const primeraRespuesta = rawReply.replace(/\[BUSCAR_CITA:\{.*?\}\]/s, '').trim();
        const historialExtendido = [
          ...history,
          { role: 'user', content: message },
          { role: 'assistant', content: primeraRespuesta || 'Buscando tu cita...' },
          { role: 'user', content: `[Resultado búsqueda sistema]: ${contexto}` },
        ];
        rawReply = await askClaude('[Resultado búsqueda sistema recibido]', historialExtendido);
      } catch (e) {
        console.error('[Aurabot Chat] Error búsqueda cita:', e.message);
        rawReply = rawReply.replace(/\[BUSCAR_CITA:\{.*?\}\]/s, '').trim();
      }
    }

    // ── CANCELAR_CITA ────────────────────────────────────────────────────
    const cancelarMatch = rawReply.match(/\[CANCELAR_CITA:(\{.*?\})\]/s);
    if (cancelarMatch) {
      try {
        const { eventId } = JSON.parse(cancelarMatch[1]);
        await cancelAppointment(eventId);
        rawReply = rawReply.replace(/\[CANCELAR_CITA:\{.*?\}\]/s, '').trim();
      } catch (e) {
        console.error('[Aurabot Chat] Error cancelar cita:', e.message);
      }
    }

    // ── MODIFICAR_CITA ───────────────────────────────────────────────────
    const modificarMatch = rawReply.match(/\[MODIFICAR_CITA:(\{.*?\})\]/s);
    if (modificarMatch) {
      try {
        const { eventId, fecha, hora } = JSON.parse(modificarMatch[1]);
        await updateAppointment(eventId, { fecha, hora });
        rawReply = rawReply.replace(/\[MODIFICAR_CITA:\{.*?\}\]/s, '').trim();
      } catch (e) {
        console.error('[Aurabot Chat] Error modificar cita:', e.message);
      }
    }

    const reply = rawReply.replace(/\[CITA:\{.*?\}\]/s, '').trim();

    return res.json({
      reply,
      appointmentCreated: calendarResult ? true : false,
    });

  } catch (err) {
    console.error('[Aurabot Chat] Error:', err.message, err.cause);
    return res.status(500).json({
      error: 'Error procesando tu mensaje. Por favor inténtalo de nuevo.',
      debug: err.message,
      debugCause: err.cause ? String(err.cause) + ' | ' + (err.cause.code || '') : null,
    });
  }
});

module.exports = router;
