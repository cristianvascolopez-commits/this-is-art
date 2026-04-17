const express = require('express');
const router  = express.Router();
const { createAppointment, getAvailableSlots } = require('../services/calendarService');

/* POST /api/calendar/create — Crear una cita manualmente */
router.post('/create', async (req, res) => {
  const { nombre, servicio, fecha, hora, telefono } = req.body;

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

module.exports = router;
