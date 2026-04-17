const nodemailer = require('nodemailer');
const dns = require('dns');

// Railway resuelve smtp.gmail.com a IPv6 por defecto → forzar IPv4
dns.setDefaultResultOrder('ipv4first');

function getTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_APP_PASSWORD,
    },
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    connectionTimeout: 15000,
    socketTimeout: 15000,
  });
}

async function sendConfirmation({ nombre, servicio, fecha, hora, telefono, emailCliente }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Email] Variables EMAIL_USER o EMAIL_APP_PASSWORD no configuradas');
    return;
  }

  const transporter = getTransporter();

  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  // ── Email para la barbería (resumen compacto) ──────────────────────────
  const htmlBarberia = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:12px;overflow:hidden;">
    <div style="background:#111;padding:24px 32px;text-align:center;border-bottom:1px solid #222;">
      <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:1.8rem;letter-spacing:0.1em;color:#fff;margin:0;">THIS IS ART</h1>
      <p style="color:#666;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;margin:4px 0 0;">Nueva reserva recibida</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:9px 0;color:#666;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Cliente</td>  <td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1e1e1e;">${nombre}</td></tr>
        <tr><td style="padding:9px 0;color:#666;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Servicio</td> <td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1e1e1e;">${servicio}</td></tr>
        <tr><td style="padding:9px 0;color:#666;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Fecha</td>    <td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1e1e1e;">${fechaFormateada}</td></tr>
        <tr><td style="padding:9px 0;color:#666;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1e1e1e;">Hora</td>     <td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1e1e1e;">${hora}</td></tr>
        <tr><td style="padding:9px 0;color:#666;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;">Teléfono</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;">${telefono || '—'}</td></tr>
      </table>
    </div>
  </div>`;

  // ── Email para el cliente (agradecimiento + detalles completos) ────────
  const htmlCliente = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:16px;overflow:hidden;">

    <!-- Cabecera -->
    <div style="background:#111;padding:36px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
      <div style="font-size:2rem;margin-bottom:8px;">✂</div>
      <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:2.4rem;letter-spacing:0.12em;color:#fff;margin:0 0 4px;">THIS IS ART</h1>
      <p style="color:#555;font-size:0.72rem;letter-spacing:0.25em;text-transform:uppercase;margin:0;">Barbería · Terrassa · Est. 2020</p>
    </div>

    <!-- Mensaje de bienvenida -->
    <div style="padding:36px 40px 24px;">
      <h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin:0 0 12px;">¡Hola, ${nombre}! 👋</h2>
      <p style="font-size:0.95rem;color:#aaa;line-height:1.7;margin:0 0 8px;">
        Gracias por confiar en <strong style="color:#fff;">THIS IS ART</strong>. Nos alegra tenerte de vuelta y estamos deseando verte pronto.
      </p>
      <p style="font-size:0.95rem;color:#aaa;line-height:1.7;margin:0;">
        Tu cita ha quedado confirmada. Aquí tienes todos los detalles:
      </p>
    </div>

    <!-- Detalles de la cita -->
    <div style="margin:0 40px 28px;background:#141414;border:1px solid #222;border-radius:12px;overflow:hidden;">
      <div style="padding:14px 20px;background:#1a1a1a;border-bottom:1px solid #222;">
        <p style="margin:0;font-size:0.7rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#666;">Resumen de tu cita</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr>
          <td style="padding:14px 20px;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #1e1e1e;width:40%;">Servicio</td>
          <td style="padding:14px 20px;color:#fff;font-weight:700;border-bottom:1px solid #1e1e1e;text-align:right;">${servicio}</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #1e1e1e;">Fecha</td>
          <td style="padding:14px 20px;color:#fff;font-weight:700;border-bottom:1px solid #1e1e1e;text-align:right;">${fechaFormateada}</td>
        </tr>
        <tr>
          <td style="padding:14px 20px;color:#666;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;">Hora</td>
          <td style="padding:14px 20px;color:#fff;font-weight:700;text-align:right;">${hora}</td>
        </tr>
      </table>
    </div>

    <!-- Cómo llegar -->
    <div style="margin:0 40px 28px;background:#141414;border:1px solid #222;border-radius:12px;padding:20px;">
      <p style="margin:0 0 14px;font-size:0.7rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#666;">Cómo llegar</p>
      <p style="margin:0 0 8px;font-size:0.9rem;color:#ddd;">📍 <strong>Carrer de Volta, 82</strong><br>
        <span style="color:#888;padding-left:22px;">08224 Terrassa, Barcelona</span>
      </p>
      <p style="margin:0 0 8px;font-size:0.9rem;color:#ddd;">🅿️ <strong>Parking La Rasa</strong> a pocos metros<br>
        <span style="color:#888;padding-left:22px;">30 minutos gratis</span>
      </p>
      <p style="margin:0;font-size:0.9rem;color:#ddd;">📞 <strong>93 189 40 78</strong><br>
        <span style="color:#888;padding-left:22px;">Lunes a sábado · 10:00 – 21:00</span>
      </p>
    </div>

    <!-- Nota cambio de cita -->
    <div style="margin:0 40px 28px;padding:16px 20px;background:#161616;border-left:3px solid #333;border-radius:4px;">
      <p style="margin:0;font-size:0.85rem;color:#888;line-height:1.6;">
        ¿Necesitas cambiar o cancelar tu cita? Llámanos con antelación al <strong style="color:#aaa;">93 189 40 78</strong> y lo gestionamos encantados.
      </p>
    </div>

    <!-- Mensaje final -->
    <div style="padding:0 40px 36px;text-align:center;">
      <p style="font-size:1rem;color:#aaa;line-height:1.7;margin:0 0 20px;">
        Nos vemos pronto, <strong style="color:#fff;">${nombre}</strong>. ¡Prepárate para salir con un look increíble! ✂️
      </p>
      <p style="font-size:0.85rem;color:#555;margin:0;">Con cariño,<br><strong style="color:#888;">El equipo de THIS IS ART</strong></p>
    </div>

    <!-- Footer -->
    <div style="padding:16px 40px;border-top:1px solid #1a1a1a;text-align:center;">
      <p style="margin:0;font-size:0.7rem;color:#333;letter-spacing:0.1em;">
        THIS IS ART · Carrer de Volta, 82 · Terrassa · <a href="https://criped.es" style="color:#444;text-decoration:none;">criped.es</a>
      </p>
    </div>

  </div>`;

  const promises = [];

  // Notificación a la barbería
  promises.push(transporter.sendMail({
    from:    `"THIS IS ART" <${process.env.EMAIL_USER}>`,
    to:      process.env.EMAIL_USER,
    subject: `✂ Nueva cita — ${nombre} · ${fechaFormateada} ${hora}`,
    html:    htmlBarberia,
  }));

  // Confirmación al cliente
  if (emailCliente) {
    promises.push(transporter.sendMail({
      from:    `"THIS IS ART" <${process.env.EMAIL_USER}>`,
      to:      emailCliente,
      subject: `✅ ¡Tu cita está confirmada, ${nombre}! — THIS IS ART`,
      html:    htmlCliente,
    }));
  }

  const results = await Promise.allSettled(promises);
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      console.log(`[Email] Enviado OK (${i === 0 ? 'barbería' : 'cliente'}):`, r.value.messageId);
    } else {
      console.error(`[Email] Error (${i === 0 ? 'barbería' : 'cliente'}):`, r.reason?.message);
    }
  });
}

module.exports = { sendConfirmation };
