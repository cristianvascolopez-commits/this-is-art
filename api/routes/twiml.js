const express = require('express');
const router  = express.Router();

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
  <Say voice="alice" language="es-ES">Hola ${nombre}. Te llamamos desde THIS IS ART, tu barbería de confianza en Terrassa. Tu cita está confirmada para el ${fechaFormateada}, a ${horaVoz}. El servicio elegido es ${servicio}. Estamos en el Carrer de Volta, ochenta y dos. Si necesitas cambiar la cita llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho. Muchas gracias, ${nombre}. Hasta pronto.</Say>
</Response>`;

  res.set('Content-Type', 'text/xml; charset=utf-8');
  res.send(xml);
});

module.exports = router;
