const express = require('express');
const router  = express.Router();

// GET /api/twiml/confirmacion?nombre=...&fecha=...&hora=...&servicio=...
router.get('/confirmacion', (req, res) => {
  const { nombre = 'cliente', servicio = '', fecha = '', hora = '' } = req.query;

  const fechaFormateada = fecha
    ? new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
      })
    : '';

  const [h = '', m = '00'] = hora.split(':');
  const horaVoz = m === '00' ? `las ${h}` : `las ${h} y ${m}`;

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice" language="es-ES">
    Hola ${nombre}, qué tal.
    Te llamamos desde THIS IS ART, tu barbería de confianza en Terrassa.
    Te confirmamos que tu cita está reservada y te esperamos con muchas ganas.
    Tienes el ${fechaFormateada}, a ${horaVoz} en punto.
    El servicio que has elegido es ${servicio}.
    Estamos en el Carrer de Volta, número ochenta y dos, aquí en Terrassa.
    Si necesitas cambiar o cancelar tu cita, llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho.
    Muchas gracias por confiar en THIS IS ART, ${nombre}. Te esperamos pronto.
  </Say>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(xml);
});

module.exports = router;
