const nodemailer = require('nodemailer');
const dns = require('dns');

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

async function sendAurabotConfirmation({ nombre, empresa, servicio, fecha, hora, telefono, emailCliente }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Aurabot Email] Variables EMAIL_USER o EMAIL_APP_PASSWORD no configuradas');
    return;
  }

  const transporter = getTransporter();
  const fechaFormateada = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const htmlEquipo = `
  <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#080808;color:#f0f0f0;border-radius:12px;overflow:hidden;">
    <div style="background:#111;padding:24px 32px;text-align:center;border-bottom:1px solid #2a2a2a;">
      <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:1.8rem;letter-spacing:0.1em;color:#fff;margin:0;">AURABOT</h1>
      <p style="color:#888;font-size:0.72rem;letter-spacing:0.2em;text-transform:uppercase;margin:4px 0 0;">Nueva llamada agendada desde el chat</p>
    </div>
    <div style="padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:9px 0;color:#888;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1a1a1a;">Cliente</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1a1a1a;">${nombre}</td></tr>
        <tr><td style="padding:9px 0;color:#888;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1a1a1a;">Empresa</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1a1a1a;">${empresa || '—'}</td></tr>
        <tr><td style="padding:9px 0;color:#888;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1a1a1a;">Fecha</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1a1a1a;">${fechaFormateada}</td></tr>
        <tr><td style="padding:9px 0;color:#888;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;border-bottom:1px solid #1a1a1a;">Hora</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;border-bottom:1px solid #1a1a1a;">${hora}</td></tr>
        <tr><td style="padding:9px 0;color:#888;font-size:0.78rem;text-transform:uppercase;letter-spacing:0.1em;">Teléfono</td><td style="padding:9px 0;color:#f0f0f0;font-weight:600;text-align:right;">${telefono || '—'}</td></tr>
      </table>
    </div>
  </div>`;

  const htmlCliente = `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;background:#080808;color:#f0f0f0;border-radius:16px;overflow:hidden;">
    <div style="background:#111;padding:36px 40px;text-align:center;border-bottom:1px solid #1a1a1a;">
      <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:2.4rem;letter-spacing:0.12em;color:#fff;margin:0 0 4px;">AURABOT</h1>
      <p style="color:#555;font-size:0.72rem;letter-spacing:0.25em;text-transform:uppercase;margin:0;">Automatización IA · Terrassa · Barcelona</p>
    </div>
    <div style="padding:36px 40px 24px;">
      <h2 style="font-size:1.4rem;font-weight:700;color:#fff;margin:0 0 12px;">¡Hola, ${nombre}!</h2>
      <p style="font-size:0.95rem;color:#aaa;line-height:1.7;margin:0;">
        Tu llamada de diagnóstico gratuito con Aurabot ha quedado confirmada. Aquí tienes los detalles:
      </p>
    </div>
    <div style="margin:0 40px 28px;background:#141414;border:1px solid #222;border-radius:12px;overflow:hidden;">
      <div style="padding:14px 20px;background:#1a1a1a;border-bottom:1px solid #222;">
        <p style="margin:0;font-size:0.7rem;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#888;">Resumen de tu llamada</p>
      </div>
      <table style="width:100%;border-collapse:collapse;">
        <tr><td style="padding:14px 20px;color:#888;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #1e1e1e;width:40%;">Servicio</td><td style="padding:14px 20px;color:#fff;font-weight:700;border-bottom:1px solid #1e1e1e;text-align:right;">${servicio}</td></tr>
        <tr><td style="padding:14px 20px;color:#888;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;border-bottom:1px solid #1e1e1e;">Fecha</td><td style="padding:14px 20px;color:#fff;font-weight:700;border-bottom:1px solid #1e1e1e;text-align:right;">${fechaFormateada}</td></tr>
        <tr><td style="padding:14px 20px;color:#888;font-size:0.8rem;text-transform:uppercase;letter-spacing:0.08em;">Hora</td><td style="padding:14px 20px;color:#fff;font-weight:700;text-align:right;">${hora}</td></tr>
      </table>
    </div>
    <div style="margin:0 40px 28px;padding:16px 20px;background:#161616;border-left:3px solid #d4af37;border-radius:4px;">
      <p style="margin:0;font-size:0.85rem;color:#aaa;line-height:1.6;">
        ¿Necesitas cambiar la hora? Escríbenos a <strong style="color:#fff;">soporte@aurabotbcn.es</strong> o llama al <strong style="color:#fff;">+34 941 682 234</strong>.
      </p>
    </div>
    <div style="padding:0 40px 36px;text-align:center;">
      <p style="font-size:1rem;color:#aaa;line-height:1.7;margin:0 0 20px;">Hablamos pronto, <strong style="color:#fff;">${nombre}</strong>.</p>
      <p style="font-size:0.85rem;color:#555;margin:0;">Con cariño,<br><strong style="color:#888;">El equipo de Aurabot</strong></p>
    </div>
    <div style="padding:16px 40px;border-top:1px solid #1a1a1a;text-align:center;">
      <p style="margin:0;font-size:0.7rem;color:#333;letter-spacing:0.1em;">AURABOT · Terrassa, Barcelona · <a href="https://aurabotbcn.es" style="color:#444;text-decoration:none;">aurabotbcn.es</a></p>
    </div>
  </div>`;

  const promises = [
    transporter.sendMail({
      from: `"Aurabot" <${process.env.EMAIL_USER}>`,
      to: 'soporte@aurabotbcn.es',
      subject: `🤖 Nueva llamada agendada — ${nombre} · ${fechaFormateada} ${hora}`,
      html: htmlEquipo,
    }),
  ];

  if (emailCliente) {
    promises.push(transporter.sendMail({
      from: `"Aurabot" <${process.env.EMAIL_USER}>`,
      to: emailCliente,
      subject: `✅ Tu llamada con Aurabot está confirmada, ${nombre}`,
      html: htmlCliente,
    }));
  }

  const results = await Promise.allSettled(promises);
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') console.log(`[Aurabot Email] Enviado OK (${i === 0 ? 'equipo' : 'cliente'}):`, r.value.messageId);
    else console.error(`[Aurabot Email] Error (${i === 0 ? 'equipo' : 'cliente'}):`, r.reason?.message);
  });
}

module.exports = { sendAurabotConfirmation };
