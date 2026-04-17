const express = require('express');
const router  = express.Router();
const { createAppointment, getAvailableSlots, searchAppointments, cancelAppointment, updateAppointment } = require('../services/calendarService');
const { sendConfirmation }    = require('../services/emailService');
const { sendSmsConfirmation } = require('../services/smsService');

/* POST /api/calendar/create — Crear una cita manualmente */
router.post('/create', async (req, res) => {
  const { nombre, servicio, fecha, hora, telefono, email } = req.body;

  if (!nombre || !servicio || !fecha || !hora) {
    return res.status(400).json({
      error: 'Faltan campos obligatorios: nombre, servicio, fecha, hora.',
    });
  }

  if (!process.env.GOOGLE_CALENDAR_ID) {
    return res.status(503).json({
      error: 'Google Calendar no configurado. Configura GOOGLE_CALENDAR_ID en el .env',
    });
  }

  try {
    const event = await createAppointment({ nombre, servicio, fecha, hora, telefono: telefono || '' });

    // Enviar email de confirmación (sin bloquear la respuesta)
    sendConfirmation({ nombre, servicio, fecha, hora, telefono, emailCliente: email || '' })
      .catch(err => console.warn('[Email] No se pudo enviar:', err.message));

    sendSmsConfirmation({ nombre, servicio, fecha, hora, telefono })
      .catch(err => console.warn('[SMS] No se pudo enviar:', err.message));

    return res.json({
      success: true,
      eventId: event.id,
      htmlLink: event.htmlLink,
      message: `Cita para ${nombre} el ${fecha} a las ${hora} agendada correctamente.`,
    });
  } catch (err) {
    console.error('[Calendar] Error creando cita:', err.message);
    return res.status(500).json({ error: `Error al agendar la cita: ${err.message}` });
  }
});

/* GET /api/calendar/slots?date=2024-12-20 — Consultar slots ocupados */
router.get('/slots', async (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'Parámetro "date" requerido (formato: YYYY-MM-DD).' });
  }

  try {
    const busy = await getAvailableSlots(date);
    return res.json({ date, busy: busy || [] });
  } catch (err) {
    console.error('[Calendar] Error slots:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* GET /api/calendar/search?q=nombre_o_telefono */
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: 'Parámetro "q" requerido.' });
  try {
    const events = await searchAppointments(q);
    return res.json({ events });
  } catch (err) {
    console.error('[Calendar] Error búsqueda:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* DELETE /api/calendar/cancel/:eventId */
router.delete('/cancel/:eventId', async (req, res) => {
  try {
    await cancelAppointment(req.params.eventId);
    return res.json({ success: true });
  } catch (err) {
    console.error('[Calendar] Error cancelar:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

/* PUT /api/calendar/update/:eventId */
router.put('/update/:eventId', async (req, res) => {
  const { fecha, hora } = req.body;
  if (!fecha || !hora) return res.status(400).json({ error: 'Faltan fecha y hora.' });
  try {
    const ev = await updateAppointment(req.params.eventId, { fecha, hora });
    return res.json({ success: true, event: ev });
  } catch (err) {
    console.error('[Calendar] Error actualizar:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
