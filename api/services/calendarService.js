const { google } = require('googleapis');

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:8080'
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
  });

  return oauth2Client;
}

async function createAppointment({ nombre, servicio, fecha, hora, telefono }) {
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'cristianvascolopez@gmail.com';

  if (!process.env.GOOGLE_REFRESH_TOKEN) {
    throw new Error('Google Calendar no configurado. Ejecuta node auth-setup.js primero.');
  }

  const auth     = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  let dateStr = fecha;
  if (fecha.includes('/')) {
    const [d, m, y] = fecha.split('/');
    dateStr = `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
  }

  const slotMinutes = parseInt(process.env.SLOT_DURATION_MINUTES) || 30;
  const [h, min]    = hora.split(':').map(Number);
  const endMin      = h * 60 + min + slotMinutes;
  const endHour     = Math.floor(endMin / 60).toString().padStart(2, '0');
  const endMinStr   = (endMin % 60).toString().padStart(2, '0');

  const event = {
    summary:     `✂ THIS IS ART — ${nombre} · ${servicio}`,
    description: `Cliente: ${nombre}\nServicio: ${servicio}\nTeléfono: ${telefono || 'no indicado'}\nReservado via chatbot web`,
    start: { dateTime: `${dateStr}T${hora.padStart(5,'0')}:00`, timeZone: 'Europe/Madrid' },
    end:   { dateTime: `${dateStr}T${endHour}:${endMinStr}:00`, timeZone: 'Europe/Madrid' },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 },
        { method: 'popup', minutes: 15 },
      ],
    },
  };

  const res = await calendar.events.insert({ calendarId, resource: event });
  return res.data;
}

async function getAvailableSlots(dateStr) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return null;

  const auth     = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });

  const timeMin = new Date(`${dateStr}T10:00:00+02:00`).toISOString();
  const timeMax = new Date(`${dateStr}T20:00:00+02:00`).toISOString();

  const res = await calendar.events.list({
    calendarId: process.env.GOOGLE_CALENDAR_ID || 'cristianvascolopez@gmail.com',
    timeMin, timeMax,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return (res.data.items || []).map(e => ({
    start: e.start.dateTime,
    end:   e.end.dateTime,
  }));
}

module.exports = { createAppointment, getAvailableSlots };
