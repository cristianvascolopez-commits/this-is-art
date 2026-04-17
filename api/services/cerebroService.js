const fs   = require('fs');
const path = require('path');

const CEREBRO_DIR = path.join(__dirname, '../../cerebro');
const BASE_FILE   = path.join(CEREBRO_DIR, 'base.md');
const MEMORIA_FILE = path.join(CEREBRO_DIR, 'memoria.md');
const HISTORIAL_DIR = path.join(CEREBRO_DIR, 'historial');

function loadKnowledge() {
  let content = '';
  try {
    content += fs.readFileSync(BASE_FILE, 'utf-8');
    const memoria = fs.readFileSync(MEMORIA_FILE, 'utf-8');
    if (memoria.includes('##')) {
      content += '\n\n---\n\n## Memorias adicionales guardadas\n' + memoria;
    }
  } catch (e) {
    console.error('[Cerebro] Error leyendo conocimiento:', e.message);
  }
  return content;
}

function saveMemory(text, sessionId) {
  try {
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const entry = `\n- **[${timestamp}]** (sesión: ${sessionId.slice(0,8)}): ${text.trim()}\n`;
    fs.appendFileSync(MEMORIA_FILE, entry, 'utf-8');
    return true;
  } catch (e) {
    console.error('[Cerebro] Error guardando memoria:', e.message);
    return false;
  }
}

function saveConversation(sessionId, history) {
  try {
    if (!fs.existsSync(HISTORIAL_DIR)) {
      fs.mkdirSync(HISTORIAL_DIR, { recursive: true });
    }
    const filename = path.join(HISTORIAL_DIR, `${sessionId}.json`);
    const data = {
      sessionId,
      updatedAt: new Date().toISOString(),
      messages: history,
    };
    fs.writeFileSync(filename, JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Cerebro] Error guardando historial:', e.message);
  }
}

/* Detecta si el mensaje contiene la palabra "memorizar" y extrae el texto a guardar */
function extractMemorizable(message) {
  const regex = /(.+?)\s+memorizar\b/i;
  const match = message.match(regex);
  if (match) return match[1].trim();

  const regex2 = /memorizar\s*[:\-]?\s*(.+)/i;
  const match2 = message.match(regex2);
  if (match2) return match2[1].trim();

  return null;
}

module.exports = { loadKnowledge, saveMemory, saveConversation, extractMemorizable };
