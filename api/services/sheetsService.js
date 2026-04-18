const { google } = require('googleapis');

const SHEET_ID = () => process.env.GOOGLE_SHEET_ID;

function getAuthClient() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'http://localhost:8080'
  );
  oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
  return oauth2Client;
}

// Genera el siguiente ticket: A-1 … A-50, B-1 … B-50, etc.
// El prefijo cambia cada día O cuando se llega a 50 en el mismo día.
async function generarTicket(sheets) {
  const hoy = new Date().toLocaleDateString('es-ES', { timeZone: 'Europe/Madrid' }); // dd/mm/yyyy

  let rows = [];
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID(),
      range: 'Citas!A:B', // columna A = Ticket, columna B = Fecha cita
    });
    rows = (res.data.values || []).slice(1); // saltar cabecera
  } catch (_) {}

  if (rows.length === 0) return 'A-1';

  const ultimo = rows[rows.length - 1];
  const ultimoTicket = ultimo[0] || '';
  const match = ultimoTicket.match(/^([A-Z]+)-(\d+)$/);
  if (!match) return 'A-1';

  const letra  = match[1];
  const numero = parseInt(match[2], 10);

  // Buscar si ya hay algún ticket de hoy para saber si es día nuevo
  const hayTicketHoy = rows.some(r => {
    // columna B es la fecha de la cita (formato YYYY-MM-DD o dd/mm/yyyy)
    // usamos el campo Registrado (columna I, índice 8) si existe
    return (r[8] || '').includes(hoy.split('/').reverse().join('-')) ||
           (r[8] || '').startsWith(hoy);
  });

  const esDiaNuevo = !hayTicketHoy;

  if (esDiaNuevo || numero >= 50) {
    // Incrementar letra: A→B, B→C, Z→AA, etc.
    return siguienteLetra(letra) + '-1';
  }

  return letra + '-' + (numero + 1);
}

function siguienteLetra(letra) {
  const chars = letra.split('');
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] < 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); return chars.join(''); }
    chars[i] = 'A';
    i--;
  }
  return 'A' + chars.join('');
}

async function appendLead(email) {
  if (!SHEET_ID()) return;
  try {
    const sheets = google.sheets({ version: 'v4', auth: getAuthClient() });
    const fecha  = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
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
  if (!SHEET_ID()) return;
  try {
    const sheets  = google.sheets({ version: 'v4', auth: getAuthClient() });
    const ahora   = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const ticket  = await generarTicket(sheets);

    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID(),
      range:         'Citas!A:I',
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [[
          ticket,
          nombre        || '',
          telefono      || '',
          servicio      || '',
          fecha         || '',
          hora          || '',
          barbero       || '',
          emailCliente  || '',
          ahora,
        ]],
      },
    });
    console.log('[Sheets] Cita guardada con ticket:', ticket, nombre, fecha, hora);
    return ticket;
  } catch (err) {
    console.warn('[Sheets] Error guardando cita:', err.message);
  }
}

module.exports = { appendLead, appendCita };
