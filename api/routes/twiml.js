const express = require('express');
const router  = express.Router();
const { audioStore } = require('../services/smsService');

// Servir audio generado por ElevenLabs (uso único, se elimina tras servir)
router.get('/audio/:id', (req, res) => {
  const buffer = audioStore.get(req.params.id);
  if (!buffer) return res.status(404).send('Audio no encontrado o expirado');
  audioStore.delete(req.params.id);
  res.set('Content-Type', 'audio/mpeg');
  res.set('Content-Length', buffer.length);
  res.send(buffer);
});

// Ruta legacy TwiML (ya no se usa activamente)
router.get('/confirmacion', (req, res) => {
  const { nombre = 'cliente', servicio = '', fecha = '', hora = '' } = req.query;
  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';
  const [h = '', m = '00'] = hora.split(':');
  const horaVoz = m === '00' ? `las ${h} en punto` : `las ${h} y ${m}`;
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Lucia">
    Hola ${nombre}. Te llamamos desde This Is Art, tu barberia de confianza en Terrassa.
    Tu cita esta confirmada para el ${fechaFormateada}, a ${horaVoz}.
    El servicio elegido es ${servicio}.
    Muchas gracias, ${nombre}. Hasta pronto.
  </Say>
</Response>`;
  res.set('Content-Type', 'text/xml; charset=utf-8');
  res.send(xml);
});

module.exports = router;
