/* =====================
   THIS IS ART — booking.js
   ===================== */

function openBooking(servicioPreseleccionado) {
  const overlay = document.getElementById('bookingOverlay');
  const select  = document.getElementById('bServicio');

  if (servicioPreseleccionado && select) {
    for (const opt of select.options) {
      if (opt.text.toLowerCase().includes(servicioPreseleccionado.toLowerCase())) {
        opt.selected = true;
        break;
      }
    }
  }

  const fechaInput = document.getElementById('bFecha');
  if (fechaInput) {
    const today = new Date().toISOString().split('T')[0];
    fechaInput.min = today;
    if (!fechaInput.value) fechaInput.value = today;
  }

  // Auto-relleno con datos guardados
  const saved = JSON.parse(localStorage.getItem('tia_cliente') || '{}');
  if (saved.nombre)   { const el = document.getElementById('bNombre');   if (el) el.value = saved.nombre; }
  if (saved.telefono) { const el = document.getElementById('bTelefono'); if (el) el.value = saved.telefono; }
  if (saved.email)    { const el = document.getElementById('bEmail');    if (el) el.value = saved.email; }

  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  document.getElementById('bNombre')?.focus();
}

function closeBooking() {
  document.getElementById('bookingOverlay').classList.remove('active');
  document.body.style.overflow = '';
  document.getElementById('bookingMsg').textContent = '';
  document.getElementById('bookingMsg').className = 'booking-msg';
  document.getElementById('bookingForm').reset();
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('bookingClose')?.addEventListener('click', closeBooking);
  document.getElementById('bookingOverlay')?.addEventListener('click', e => {
    if (e.target === e.currentTarget) closeBooking();
  });

  document.getElementById('bEmailToggle')?.addEventListener('change', e => {
    const field = document.getElementById('bEmailField');
    if (field) field.style.display = e.target.checked ? 'flex' : 'none';
  });

  document.getElementById('bookingForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('bookingSubmit');
    const msg = document.getElementById('bookingMsg');

    const nombre   = document.getElementById('bNombre').value.trim();
    const servicio = document.getElementById('bServicio').value;
    const empleado = document.getElementById('bEmpleado').value;
    const fecha    = document.getElementById('bFecha').value;
    const hora     = document.getElementById('bHora').value;
    let telefono = document.getElementById('bTelefono').value.trim().replace(/\s/g, '');
    if (telefono && !telefono.startsWith('+')) telefono = '+34' + telefono;
    const email    = document.getElementById('bEmail')?.value.trim() || '';

    const day = new Date(fecha).getDay();
    if (day === 0) {
      showMsg('Los domingos estamos cerrados. Por favor elige otro día.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Agendando...';
    msg.className = 'booking-msg';
    msg.textContent = '';

    const servicioCompleto = empleado ? `${servicio} — ${empleado}` : servicio;

    try {
      const res = await fetch('https://this-is-art-app-production.up.railway.app/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, servicio: servicioCompleto, fecha, hora, telefono, email }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('tia_cliente', JSON.stringify({ nombre, telefono, email }));
        const ticketInfo = data.ticket ? ` · Ticket <strong>${data.ticket}</strong>` : '';
        showMsg(`✅ ¡Cita confirmada! ${nombre}, te esperamos el ${formatDate(fecha)} a las ${hora}${empleado ? ' con ' + empleado : ''}${ticketInfo}. ¡Hasta pronto!`, 'success');
        btn.textContent = '✅ ¡Cita confirmada!';
        setTimeout(closeBooking, 5000);
      } else {
        showMsg(data.error || 'Error al agendar. Llámanos al 93 189 40 78.', 'error');
        btn.disabled = false;
        btn.textContent = '📅 Confirmar cita en Google Calendar';
      }
    } catch {
      showMsg('Sin conexión con el servidor. Llámanos al ☎ 93 189 40 78 o reserva en Booksy.', 'error');
      btn.disabled = false;
      btn.textContent = '📅 Confirmar cita en Google Calendar';
    }
  });
});

function showMsg(text, type) {
  const msg = document.getElementById('bookingMsg');
  msg.textContent = text;
  msg.className = `booking-msg ${type}`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
}

// ── Pestañas ──────────────────────────────────────────────────────────────────
function switchBookingTab(tab) {
  const esNueva = tab === 'nueva';
  document.getElementById('panelNueva').style.display      = esNueva ? 'block' : 'none';
  document.getElementById('panelGestionar').style.display  = esNueva ? 'none'  : 'block';
  document.getElementById('gModificarPanel').style.display = 'none';
  document.getElementById('tabNueva').classList.toggle('active', esNueva);
  document.getElementById('tabGestionar').classList.toggle('active', !esNueva);
  document.getElementById('bookingTitle').textContent = esNueva ? 'Reservar cita' : 'Gestionar cita';
}

// ── Buscar citas ──────────────────────────────────────────────────────────────
const API = 'https://this-is-art-app-production.up.railway.app';

async function buscarCitas() {
  let q     = document.getElementById('gBuscar').value.trim().replace(/\s/g, '');
  if (q && /^\+?[\d]+$/.test(q) && !q.startsWith('+')) q = '+34' + q;
  const res = document.getElementById('gResultados');
  if (!q) { res.innerHTML = '<p style="color:#f87171;font-size:0.82rem;">Escribe un nombre o teléfono.</p>'; return; }

  res.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.82rem;">Buscando...</p>';
  document.getElementById('gModificarPanel').style.display = 'none';

  try {
    const r    = await fetch(`${API}/api/calendar/search?q=${encodeURIComponent(q)}`);
    const data = await r.json();

    if (!data.events || data.events.length === 0) {
      res.innerHTML = '<p style="color:var(--color-text-muted);font-size:0.85rem;margin-top:0.5rem;">No se encontraron citas próximas con esos datos.</p>';
      return;
    }

    res.innerHTML = data.events.map(e => {
      const dt  = new Date(e.start);
      const dia = dt.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
      const hr  = dt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
      const svc = e.summary.replace('✂ THIS IS ART — ', '');
      return `
        <div class="gcita-card">
          <div class="gcita-info">
            <strong>${svc}</strong>
            <span>${dia} · ${hr}</span>
          </div>
          <div class="gcita-actions">
            <button onclick="iniciarModificar('${e.id}')" class="gcita-btn gcita-btn-mod">✏️ Cambiar</button>
            <button onclick="cancelarCita('${e.id}', this)" class="gcita-btn gcita-btn-del">✕ Cancelar</button>
          </div>
        </div>`;
    }).join('');
  } catch {
    res.innerHTML = '<p style="color:#f87171;font-size:0.82rem;">Error al buscar. Inténtalo de nuevo.</p>';
  }
}

// ── Cancelar cita ─────────────────────────────────────────────────────────────
async function cancelarCita(eventId, btn) {
  if (!confirm('¿Confirmas que quieres cancelar esta cita?')) return;
  btn.disabled = true;
  btn.textContent = '...';
  try {
    const r = await fetch(`${API}/api/calendar/cancel/${eventId}`, { method: 'DELETE' });
    if (r.ok) {
      btn.closest('.gcita-card').innerHTML = '<p style="color:#4ade80;font-size:0.82rem;padding:0.6rem 0;">✅ Cita cancelada correctamente.</p>';
    } else {
      btn.textContent = 'Error';
    }
  } catch {
    btn.textContent = 'Error';
  }
}

// ── Modificar cita ────────────────────────────────────────────────────────────
function iniciarModificar(eventId) {
  document.getElementById('gModEventId').value = eventId;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('gModFecha').min   = today;
  document.getElementById('gModFecha').value = '';
  document.getElementById('gModHora').value  = '';
  document.getElementById('gModMsg').textContent = '';
  document.getElementById('gModificarPanel').style.display = 'block';
  document.getElementById('gModificarPanel').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function confirmarModificar() {
  const eventId = document.getElementById('gModEventId').value;
  const fecha   = document.getElementById('gModFecha').value;
  const hora    = document.getElementById('gModHora').value;
  const msgEl   = document.getElementById('gModMsg');

  if (!fecha || !hora) { msgEl.style.color = '#f87171'; msgEl.textContent = 'Selecciona fecha y hora.'; return; }
  if (new Date(fecha).getDay() === 0) { msgEl.style.color = '#f87171'; msgEl.textContent = 'Los domingos estamos cerrados.'; return; }

  msgEl.style.color = 'var(--color-text-muted)';
  msgEl.textContent = 'Actualizando...';

  try {
    const r = await fetch(`${API}/api/calendar/update/${eventId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha, hora }),
    });
    if (r.ok) {
      msgEl.style.color = '#4ade80';
      msgEl.textContent = `✅ Cita cambiada al ${formatDate(fecha)} a las ${hora}.`;
      document.getElementById('gResultados').innerHTML = '';
      document.getElementById('gBuscar').value = '';
    } else {
      msgEl.style.color = '#f87171';
      msgEl.textContent = 'Error al actualizar. Llámanos al 93 189 40 78.';
    }
  } catch {
    msgEl.style.color = '#f87171';
    msgEl.textContent = 'Sin conexión. Llámanos al 93 189 40 78.';
  }
}
