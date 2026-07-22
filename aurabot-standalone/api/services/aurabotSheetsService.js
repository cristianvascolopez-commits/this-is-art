const { google } = require('googleapis');

const TAB_NAME = 'AurabotClientes';
const HEADERS = ['Fecha', 'Nombre', 'Teléfono', 'Empresa', 'Necesidad', 'Plan de interés', 'Última cita'];

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:8080'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

function sheetId() {
  return process.env.GOOGLE_SHEET_ID;
}

let tabEnsured = false;

async function ensureTab(sheets) {
  if (tabEnsured) return;
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId() });
    const exists = (meta.data.sheets || []).some(s => s.properties.title === TAB_NAME);
    if (!exists) {
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: sheetId(),
        requestBody: { requests: [{ addSheet: { properties: { title: TAB_NAME } } }] },
      });
      await sheets.spreadsheets.values.append({
        spreadsheetId: sheetId(),
        range: `${TAB_NAME}!A:G`,
        valueInputOption: 'RAW',
        insertDataOption: 'INSERT_ROWS',
        requestBody: { values: [HEADERS] },
      });
      console.log('[Aurabot Sheets] Pestaña creada:', TAB_NAME);
    }
    tabEnsured = true;
  } catch (err) {
    console.warn('[Aurabot Sheets] Error asegurando pestaña:', err.message);
  }
}

async function appendClientRecord({ nombre, telefono, empresa, necesidad, plan, fechaCita }) {
  if (!sheetId()) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuthClient() });
    await ensureTab(sheets);
    const ahora = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    await sheets.spreadsheets.values.append({
      spreadsheetId: sheetId(),
      range: `${TAB_NAME}!A:G`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          ahora,
          nombre || '',
          telefono || '',
          empresa || '',
          necesidad || '',
          plan || '',
          fechaCita || '',
        ]],
      },
    });
    console.log('[Aurabot Sheets] Cliente guardado:', nombre, telefono);
  } catch (err) {
    console.warn('[Aurabot Sheets] Error guardando cliente:', err.message);
  }
}

async function getClientHistory(telefono) {
  if (!sheetId() || !telefono) return null;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuthClient() });
    await ensureTab(sheets);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId(),
      range: `${TAB_NAME}!A:G`,
    });
    const rows = (res.data.values || []).slice(1);
    const matches = rows.filter(r => (r[2] || '').replace(/\s+/g, '') === telefono.replace(/\s+/g, ''));
    if (matches.length === 0) return null;

    return matches.map(r => {
      const [fecha, nombre, , empresa, necesidad, plan, fechaCita] = r;
      return `- ${fecha}: ${nombre}${empresa ? ' (' + empresa + ')' : ''} — necesidad: "${necesidad || 'no especificada'}"${plan ? ', interesado en plan ' + plan : ''}${fechaCita ? ', cita: ' + fechaCita : ''}`;
    }).join('\n');
  } catch (err) {
    console.warn('[Aurabot Sheets] Error consultando historial:', err.message);
    return null;
  }
}

module.exports = { appendClientRecord, getClientHistory };
