const { google } = require('googleapis');

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:8080'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

async function appendLead(email) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuthClient() });
    const fecha  = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range:         'Leads!A:B',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [[email, fecha]] },
    });
    console.log('[Sheets] Lead guardado:', email);
  } catch (err) {
    console.warn('[Sheets] Error guardando lead:', err.message);
  }
}

async function appendCita({ nombre, telefono, servicio, fecha, hora, barbero, emailCliente }) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  try {
    const sheets   = google.sheets({ version: 'v4', auth: getAuthClient() });
    const ahora    = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range:         'Citas!A:H',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          nombre       || '',
          telefono     || '',
          servicio     || '',
          fecha        || '',
          hora         || '',
          barbero      || '',
          emailCliente || '',
          ahora,
        ]],
      },
    });
    console.log('[Sheets] Cita guardada:', nombre, fecha, hora);
  } catch (err) {
    console.warn('[Sheets] Error guardando cita:', err.message);
  }
}

module.exports = { appendLead, appendCita };
