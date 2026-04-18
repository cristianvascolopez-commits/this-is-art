const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const dns = require('dns');
const { appendLead } = require('../services/sheetsService');

dns.setDefaultResultOrder('ipv4first');

/* POST /api/leads/email — Capturar email lead magnet */
router.post('/email', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.warn('[Lead] Variables de email no configuradas');
    return res.json({ ok: true });
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_APP_PASSWORD },
    tls: { rejectUnauthorized: false, minVersion: 'TLSv1.2' },
    connectionTimeout: 15000,
    socketTimeout: 15000,
  });

  try {
    // Notificación a la barbería
    await transporter.sendMail({
      from: `"THIS IS ART" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `📧 Nuevo lead — ${email}`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:480px;background:#0a0a0a;color:#f0f0f0;border-radius:12px;overflow:hidden;">
          <div style="background:#111;padding:20px 28px;border-bottom:1px solid #222;text-align:center;">
            <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:1.6rem;letter-spacing:0.1em;color:#fff;margin:0;">THIS IS ART</h1>
            <p style="color:#666;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;margin:4px 0 0;">Nuevo lead captado</p>
          </div>
          <div style="padding:24px 28px;">
            <p style="color:#aaa;font-size:0.9rem;margin:0 0 16px;">Un visitante ha dejado su email a cambio del descuento del 10%:</p>
            <p style="font-size:1.1rem;font-weight:700;color:#fff;background:#141414;border:1px solid #222;border-radius:8px;padding:14px 18px;margin:0;">${email}</p>
            <p style="color:#666;font-size:0.78rem;margin:16px 0 0;">Recuerda enviarle su código de descuento cuando reserves con él.</p>
          </div>
        </div>`,
    });

    // Email de bienvenida al cliente
    await transporter.sendMail({
      from: `"THIS IS ART" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: '✂ Tu 10% de descuento — THIS IS ART Barbería',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;background:#0a0a0a;color:#f0f0f0;border-radius:16px;overflow:hidden;">
          <div style="background:#111;padding:36px 40px;text-align:center;border-bottom:1px solid #1e1e1e;">
            <div style="font-size:2rem;margin-bottom:8px;">✂</div>
            <h1 style="font-family:'Arial Narrow',Arial,sans-serif;font-size:2.2rem;letter-spacing:0.12em;color:#fff;margin:0 0 4px;">THIS IS ART</h1>
            <p style="color:#555;font-size:0.7rem;letter-spacing:0.25em;text-transform:uppercase;margin:0;">Barbería · Terrassa</p>
          </div>
          <div style="padding:36px 40px;">
            <h2 style="font-size:1.4rem;color:#fff;margin:0 0 12px;">¡Gracias por unirte!</h2>
            <p style="color:#aaa;font-size:0.95rem;line-height:1.7;margin:0 0 24px;">
              Como prometimos, aquí tienes tu descuento exclusivo para tu primera visita en THIS IS ART.
            </p>
            <div style="background:#141414;border:1px solid #333;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
              <p style="color:#666;font-size:0.7rem;letter-spacing:0.2em;text-transform:uppercase;margin:0 0 8px;">Tu código de descuento</p>
              <p style="font-size:2rem;font-weight:900;letter-spacing:0.15em;color:#fff;margin:0;">PRIMERA10</p>
              <p style="color:#888;font-size:0.8rem;margin:8px 0 0;">10% de descuento en tu primera visita</p>
            </div>
            <p style="color:#aaa;font-size:0.9rem;line-height:1.7;margin:0 0 16px;">
              Reserva tu cita en <a href="https://criped.es" style="color:#fff;">criped.es</a> o llámanos al <strong style="color:#fff;">93 189 40 78</strong> y menciona este código.
            </p>
            <p style="color:#666;font-size:0.8rem;margin:0;">📍 Carrer de Volta, 82 · Terrassa · Lun–Sáb 10:00–20:30</p>
          </div>
          <div style="padding:16px 40px;border-top:1px solid #1a1a1a;text-align:center;">
            <p style="margin:0;font-size:0.7rem;color:#333;letter-spacing:0.1em;">
              THIS IS ART · <a href="https://criped.es" style="color:#444;text-decoration:none;">criped.es</a>
            </p>
          </div>
        </div>`,
    });

    appendLead(email).catch(() => {});
    console.log('[Lead] Email capturado y enviado:', email);
    res.json({ ok: true });
  } catch (err) {
    console.error('[Lead] Error enviando email:', err.message);
    res.status(500).json({ error: 'Error al procesar' });
  }
});

module.exports = router;
