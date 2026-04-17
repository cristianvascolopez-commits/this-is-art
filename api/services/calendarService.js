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

async function searchAppointments(query) {
  if (!process.env.GOOGLE_REFRESH_TOKEN) return [];

  const auth     = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'cristianvascolopez@gmail.com';

  const now     = new Date();
  const timeMin = now.toISOString();
  const timeMax = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000).toISOString();

  const res = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    q: query,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 10,
  });

  return (res.data.items || [])
    .filter(e => e.summary && e.summary.includes('THIS IS ART'))
    .map(e => ({
      id:       e.id,
      summary:  e.summary,
      start:    e.start.dateTime || e.start.date,
      end:      e.end.dateTime || e.end.date,
      description: e.description || '',
    }));
}

async function cancelAppointment(eventId) {
  const auth     = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'cristianvascolopez@gmail.com';
  await calendar.events.delete({ calendarId, eventId });
  return true;
}

async function updateAppointment(eventId, { fecha, hora }) {
  const auth     = getAuthClient();
  const calendar = google.calendar({ version: 'v3', auth });
  const calendarId = process.env.GOOGLE_CALENDAR_ID || 'cristianvascolopez@gmail.com';

  const existing = await calendar.events.get({ calendarId, eventId });
  const ev = existing.data;

  const slotMinutes = parseInt(process.env.SLOT_DURATION_MINUTES) || 30;
  const [h, min]    = hora.split(':').map(Number);
  const endMin      = h * 60 + min + slotMinutes;
  const endHour     = Math.floor(endMin / 60).toString().padStart(2, '0');
  const endMinStr   = (endMin % 60).toString().padStart(2, '0');

  ev.start = { dateTime: `${fecha}T${hora.padStart(5,'0')}:00`, timeZone: 'Europe/Madrid' };
  ev.end   = { dateTime: `${fecha}T${endHour}:${endMinStr}:00`, timeZone: 'Europe/Madrid' };

  const res = await calendar.events.update({ calendarId, eventId, resource: ev });
  return res.data;
}

module.exports = { createAppointment, getAvailableSlots, searchAppointments, cancelAppointment, updateAppointment };
