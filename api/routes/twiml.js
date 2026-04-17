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
  <Say voice="alice" language="es-ES">
    <prosody rate="90%" pitch="+1%">
      Hola ${nombre}, qué tal.
      <break time="600ms"/>
      Te llamamos desde THIS IS ART, tu barbería de confianza en Terrassa.
      <break time="500ms"/>
      Te confirmamos que tu cita está reservada, y te esperamos con muchas ganas.
      <break time="600ms"/>
      Tienes el <emphasis level="moderate">${fechaFormateada}</emphasis>, a <emphasis level="moderate">${horaVoz} en punto</emphasis>.
      <break time="400ms"/>
      El servicio que has elegido es ${servicio}.
      <break time="600ms"/>
      Nos encontramos en el Carrer de Volta, número ochenta y dos, aquí en Terrassa.
      <break time="400ms"/>
      Si necesitas cambiar o cancelar tu cita, llámanos al noventa y tres, ciento ochenta y nueve, cuarenta, setenta y ocho.
      <break time="600ms"/>
      Muchas gracias por confiar en THIS IS ART, ${nombre}.
      <break time="300ms"/>
      ¡Te esperamos pronto!
    </prosody>
  </Say>
</Response>`;

  res.set('Content-Type', 'text/xml');
  res.send(xml);
});

module.exports = router;
