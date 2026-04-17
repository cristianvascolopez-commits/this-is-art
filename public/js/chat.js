/* =====================
   THIS IS ART — chat.js
   Widget chatbot con IA
   ===================== */

const Chat = (() => {
  const STATE = {
    open: false,
    history: [],
    sessionId: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36),
    busy: false,
  };

  const $ = id => document.getElementById(id);

  function init() {
    const toggle   = $('chatToggle');
    const closeBtn = $('chatCloseBtn');
    const sendBtn  = $('chatSend');
    const input    = $('chatInput');

    if (!toggle) return;

    toggle.addEventListener('click', () => togglePanel());
    closeBtn?.addEventListener('click', () => closePanel());

    sendBtn?.addEventListener('click', () => submitMessage());
    input?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        submitMessage();
      }
    });

    // Botones rápidos
    document.querySelectorAll('.chat-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const msg = btn.dataset.msg;
        if (msg) submitMessage(msg);
      });
    });
  }

  function togglePanel() {
    STATE.open ? closePanel() : openPanel();
  }

  function openPanel() {
    STATE.open = true;
    const panel  = $('chatPanel');
    const toggle = $('chatToggle');
    panel.style.display = 'flex';
    toggle.classList.add('open');
    toggle.querySelector('.chat-toggle-icon').style.display = 'none';
    toggle.querySelector('.chat-toggle-close').style.display = 'block';
    setTimeout(() => $('chatInput')?.focus(), 100);
  }

  function closePanel() {
    STATE.open = false;
    const panel  = $('chatPanel');
    const toggle = $('chatToggle');
    panel.style.display = 'none';
    toggle.classList.remove('open');
    toggle.querySelector('.chat-toggle-icon').style.display = 'block';
    toggle.querySelector('.chat-toggle-close').style.display = 'none';
  }

  async function submitMessage(text) {
    const input = $('chatInput');
    const msg = (text || input?.value || '').trim();
    if (!msg || STATE.busy) return;

    if (input && !text) input.value = '';

    // Ocultar botones rápidos tras primera interacción
    const quickBtns = $('chatQuickBtns');
    if (quickBtns) quickBtns.style.display = 'none';

    appendMsg(msg, 'user');
    STATE.history.push({ role: 'user', content: msg });

    STATE.busy = true;
    toggleSendBtn(false);

    const typingEl = showTyping();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: msg,
          sessionId: STATE.sessionId,
          history: STATE.history.slice(-20), // últimas 20 interacciones
        }),
      });

      removeTyping(typingEl);

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        appendMsg(err.error || 'Lo siento, ha ocurrido un error. Por favor, inténtalo de nuevo.', 'bot');
        return;
      }

      const data = await res.json();
      const reply = data.reply || 'No tengo respuesta en este momento.';

      appendMsg(reply, 'bot');
      STATE.history.push({ role: 'assistant', content: reply });

    } catch (e) {
      removeTyping(typingEl);
      appendMsg('No puedo conectar con el servidor ahora mismo. Llámanos al ☎ 93 189 40 78 o reserva en Booksy.', 'bot');
    } finally {
      STATE.busy = false;
      toggleSendBtn(true);
    }
  }

  function appendMsg(text, role) {
    const container = $('chatMessages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-msg ${role}`;
    div.innerHTML = formatText(text);
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
  }

  function showTyping() {
    const container = $('chatMessages');
    if (!container) return null;
    const div = document.createElement('div');
    div.className = 'chat-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return div;
  }

  function removeTyping(el) {
    el?.remove();
  }

  function toggleSendBtn(enabled) {
    const btn = $('chatSend');
    if (btn) btn.disabled = !enabled;
  }

  /* Convierte saltos de línea y URLs en HTML seguro */
  function formatText(text) {
    const escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    return escaped
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Chat.init());
