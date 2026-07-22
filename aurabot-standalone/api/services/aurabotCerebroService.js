const fs = require('fs');
const path = require('path');

const CEREBRO_DIR = path.join(__dirname, '../../cerebro');
const BASE_FILE = path.join(CEREBRO_DIR, 'aurabot-base.md');
const MEMORIA_FILE = path.join(CEREBRO_DIR, 'aurabot-memoria.md');

function loadKnowledge() {
  let content = '';
  try {
    content += fs.readFileSync(BASE_FILE, 'utf-8');
    const memoria = fs.readFileSync(MEMORIA_FILE, 'utf-8');
    if (memoria.includes('- **[')) {
      content += '\n\n---\n\n## Memorias adicionales guardadas\n' + memoria;
    }
  } catch (e) {
    console.error('[Aurabot Cerebro] Error leyendo conocimiento:', e.message);
  }
  return content;
}

function saveMemory(text, sessionId) {
  try {
    const timestamp = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
    const entry = `\n- **[${timestamp}]** (sesión: ${sessionId.slice(0, 8)}): ${text.trim()}\n`;
    fs.appendFileSync(MEMORIA_FILE, entry, 'utf-8');
    return true;
  } catch (e) {
    console.error('[Aurabot Cerebro] Error guardando memoria:', e.message);
    return false;
  }
}

function extractMemorizable(message) {
  const regex = /(.+?)\s+memorizar\b/i;
  const match = message.match(regex);
  if (match) return match[1].trim();

  const regex2 = /memorizar\s*[:\-]?\s*(.+)/i;
  const match2 = message.match(regex2);
  if (match2) return match2[1].trim();

  return null;
}

module.exports = { loadKnowledge, saveMemory, extractMemorizable };
