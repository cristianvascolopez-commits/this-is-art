const nodemailer = require('nodemailer');

function getTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
  });
}

async function sendConfirmation({ nombre, servicio, fecha, hora, telefono, emailCliente }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) return;

  const transporter = getTransporter();

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:12px;overflow:hidden;">
    <div style="background:#111;padding:28px 32px;text-align:center;border-bottom:1px solid #222;">
      <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:2rem;letter-spacing:0.1em;color:#fff;margin:0;">
        THIS IS <span style="color:#fff;">ART</span>
      </h1>
      <p style="color:#666;font-size:0.75rem;letter-spacing:0.2em;text-transform:uppercase;margin:6px 0 0;">Barbería · Terrassa</p>
    </div>
    <div style="padding:32px;">
      <h2 style="font-size:1.1rem;color:#fff;margin:0 0 24px;">✅ Cita confirmada</h2>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:10px 0;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Cliente</td>     <td style="padding:10px 0;color:#f0f0f0;font-weight:600;border-bottom:1px solid #1e1e1e;text-align:right;">${nombre}</td></tr>
        <tr><td style="padding:10px 0;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Servicio</td>    <td style="padding:10px 0;color:#f0f0f0;font-weight:600;border-bottom:1px solid #1e1e1e;text-align:right;">${servicio}</td></tr>
        <tr><td style="padding:10px 0;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Fecha</td>       <td style="padding:10px 0;color:#f0f0f0;font-weight:600;border-bottom:1px solid #1e1e1e;text-align:right;">${fechaFormateada}</td></tr>
        <tr><td style="padding:10px 0;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Hora</td>        <td style="padding:10px 0;color:#f0f0f0;font-weight:600;border-bottom:1px solid #1e1e1e;text-align:right;">${hora}</td></tr>
        <tr><td style="padding:10px 0;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.1em;">Teléfono</td>   <td style="padding:10px 0;color:#f0f0f0;font-weight:600;text-align:right;">${telefono || '—'}</td></tr>
      </table>
      <div style="margin-top:28px;padding:16px;background:#161616;border-radius:8px;border:1px solid #1e1e1e;">
        <p style="margin:0;font-size:0.85rem;color:#888;">📍 Carrer de Volta, 82 · 08224 Terrassa</p>
        <p style="margin:6px 0 0;font-size:0.85rem;color:#888;">📞 93 189 40 78</p>
      </div>
    </div>
    <div style="padding:16px 32px;text-align:center;border-top:1px solid #1e1e1e;">
      <p style="margin:0;font-size:0.72rem;color:#444;">Si necesitas cambiar tu cita llámanos al 93 189 40 78</p>
    </div>
  </div>`;

  const promises = [];

  // Notificación a la barbería
  promises.push(transporter.sendMail({
    from: `"THIS IS ART" <${process.env.EMAIL_USER}>`,
    to:   process.env.EMAIL_USER,
    subject: `✂ Nueva cita — ${nombre} · ${fechaFormateada} ${hora}`,
    html,
  }));

  // Confirmación al cliente si dejó su email
  if (emailCliente) {
    promises.push(transporter.sendMail({
      from:    `"THIS IS ART" <${process.env.EMAIL_USER}>`,
      to:      emailCliente,
      subject: `✅ Cita confirmada en THIS IS ART — ${fechaFormateada} a las ${hora}`,
      html,
    }));
  }

  await Promise.allSettled(promises);
}

module.exports = { sendConfirmation };
