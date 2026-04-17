/* =====================
   THIS IS ART — booking.js
   Reserva paso a paso (8 pasos)
   ===================== */

const Booking = (() => {
  const state = {
    step: 1,
    servicio: '', precio: '',
    empleado: '',
    fecha: '', hora: '',
    nombre: '', telefono: '', email: '',
  };

  const TOTAL_STEPS = 8;

  // ── Abrir / cerrar ──────────────────────────────
  function open(servicioPreseleccionado) {
    reset();
    showPanel(1);

    const today = new Date().toISOString().split('T')[0];
    const fi = document.getElementById('bFecha');
    if (fi) { fi.min = today; fi.value = today; }

    // Auto-relleno datos guardados
    const saved = JSON.parse(localStorage.getItem('tia_cliente') || '{}');
    if (saved.nombre)   { const el = document.getElementById('bNombre');   if (el) el.value = saved.nombre; }
    if (saved.telefono) { const el = document.getElementById('bTelefono'); if (el) el.value = saved.telefono; }
    if (saved.email)    { const el = document.getElementById('bEmail');    if (el) el.value = saved.email; }

    if (servicioPreseleccionado) {
      document.querySelectorAll('.bk-svc').forEach(c => {
        if (c.dataset.value.toLowerCase().includes(servicioPreseleccionado.toLowerCase())) selectSvc(c);
      });
    }

    document.getElementById('bookingOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('bookingOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  function reset() {
    Object.assign(state, { step:1, servicio:'', precio:'', empleado:'', fecha:'', hora:'', nombre:'', telefono:'', email:'' });
    document.querySelectorAll('.bk-svc, .bk-emp, .bk-slot').forEach(el => el.classList.remove('selected'));
    const msg = document.getElementById('bookingMsg');
    if (msg) { msg.textContent = ''; msg.className = 'bk-msg'; }
    document.getElementById('bookingSuccess').classList.remove('active');
  }

  // ── Mostrar panel ───────────────────────────────
  function showPanel(n) {
    state.step = n;
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const p = document.getElementById(`bkPanel${i}`);
      if (p) p.style.display = (i === n) ? 'block' : 'none';
    }
    document.getElementById('bookingSuccess').classList.remove('active');

    document.querySelectorAll('.bk-dot').forEach(d => {
      const s = parseInt(d.dataset.step);
      d.classList.remove('active', 'done');
      if (s === n) d.classList.add('active');
      if (s < n)  d.classList.add('done');
    });

    document.getElementById('bookingProgress').style.display = '';
    document.querySelector('.booking-modal').scrollTop = 0;
  }

  function showSuccess() {
    for (let i = 1; i <= TOTAL_STEPS; i++) {
      const p = document.getElementById(`bkPanel${i}`);
      if (p) p.style.display = 'none';
    }
    document.getElementById('bookingProgress').style.display = 'none';
    document.getElementById('bookingSuccess').classList.add('active');
  }

  // ── Selectores ─────────────────────────────────
  function selectSvc(card) {
    document.querySelectorAll('.bk-svc').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.servicio = card.dataset.value;
    state.precio   = card.dataset.price;
  }

  function selectEmp(card) {
    document.querySelectorAll('.bk-emp').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.empleado = card.dataset.emp;
  }

  function selectSlot(slot) {
    document.querySelectorAll('.bk-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    state.hora = slot.dataset.hora;
  }

  // ── Validación y avance ─────────────────────────
  function next(from) {
    if (from === 1) {
      if (!state.servicio) return alert('Por favor selecciona un servicio.');
      showPanel(2);
    } else if (from === 2) {
      if (!state.empleado) return alert('Por favor elige un profesional.');
      showPanel(3);
    } else if (from === 3) {
      const fi = document.getElementById('bFecha');
      state.fecha = fi?.value || '';
      if (!state.fecha) return alert('Por favor selecciona una fecha.');
      if (new Date(state.fecha).getDay() === 0) return alert('Los domingos estamos cerrados. Elige otro día.');
      showPanel(4);
    } else if (from === 4) {
      if (!state.hora) return alert('Por favor selecciona una hora.');
      showPanel(5);
    } else if (from === 5) {
      state.nombre = document.getElementById('bNombre')?.value.trim() || '';
      if (!state.nombre) return alert('Por favor introduce tu nombre.');
      showPanel(6);
    } else if (from === 6) {
      state.telefono = document.getElementById('bTelefono')?.value.trim() || '';
      if (!state.telefono) return alert('Por favor introduce tu teléfono.');
      showPanel(7);
    } else if (from === 7) {
      state.email = document.getElementById('bEmail')?.value.trim() || '';
      fillSummary();
      showPanel(8);
    }
  }

  // ── Resumen ────────────────────────────────────
  function fillSummary() {
    const precio = state.precio ? ` (${state.precio})` : '';
    document.getElementById('sumServicio').textContent  = state.servicio + precio;
    document.getElementById('sumEmpleado').textContent  = state.empleado;
    document.getElementById('sumFecha').textContent     = formatDate(state.fecha);
    document.getElementById('sumHora').textContent      = state.hora;
    document.getElementById('sumNombre').textContent    = state.nombre;
    document.getElementById('sumTelefono').textContent  = state.telefono;
    const sumEmail = document.getElementById('sumEmail');
    if (sumEmail) sumEmail.textContent = state.email || '—';
  }

  // ── Envío ──────────────────────────────────────
  async function submit() {
    const btn = document.getElementById('bookingSubmit');
    const msg = document.getElementById('bookingMsg');

    btn.disabled = true;
    btn.textContent = 'Agendando...';
    msg.className = 'bk-msg';
    msg.textContent = '';

    const servicioCompleto = state.precio
      ? `${state.servicio} (${state.precio}) — ${state.empleado}`
      : `${state.servicio} — ${state.empleado}`;

    try {
      const res = await fetch('https://this-is-art-app-production.up.railway.app/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre:   state.nombre,
          servicio: servicioCompleto,
          fecha:    state.fecha,
          hora:     state.hora,
          telefono: state.telefono,
          email:    state.email,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem('tia_cliente', JSON.stringify({ nombre: state.nombre, telefono: state.telefono, email: state.email }));
        document.getElementById('bookingSuccessText').textContent =
          `${state.nombre}, te esperamos el ${formatDate(state.fecha)} a las ${state.hora} para ${state.servicio} con ${state.empleado}.${state.email ? ' Te hemos enviado la confirmación por email.' : ''} ¡Hasta pronto!`;
        showSuccess();
      } else {
        msg.textContent = data.error || 'Error al agendar. Llámanos al 93 189 40 78.';
        msg.className = 'bk-msg error';
        btn.disabled = false;
        btn.textContent = '📅 Confirmar cita';
      }
    } catch {
      msg.textContent = 'Sin conexión. Llámanos al ☎ 93 189 40 78 o reserva en Booksy.';
      msg.className = 'bk-msg error';
      btn.disabled = false;
      btn.textContent = '📅 Confirmar cita';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    return new Date(dateStr + 'T12:00:00')
      .toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Init ───────────────────────────────────────
  function init() {
    document.getElementById('bookingClose')?.addEventListener('click', close);
    document.getElementById('bookingOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });

    document.querySelectorAll('.bk-svc').forEach(c  => c.addEventListener('click', () => selectSvc(c)));
    document.querySelectorAll('.bk-emp').forEach(c  => c.addEventListener('click', () => selectEmp(c)));
    document.querySelectorAll('.bk-slot').forEach(s => s.addEventListener('click', () => selectSlot(s)));

    document.getElementById('bkNext1')?.addEventListener('click', () => next(1));
    document.getElementById('bkBack2')?.addEventListener('click', () => showPanel(1));
    document.getElementById('bkNext2')?.addEventListener('click', () => next(2));
    document.getElementById('bkBack3')?.addEventListener('click', () => showPanel(2));
    document.getElementById('bkNext3')?.addEventListener('click', () => next(3));
    document.getElementById('bkBack4')?.addEventListener('click', () => showPanel(3));
    document.getElementById('bkNext4')?.addEventListener('click', () => next(4));
    document.getElementById('bkBack5')?.addEventListener('click', () => showPanel(4));
    document.getElementById('bkNext5')?.addEventListener('click', () => next(5));
    document.getElementById('bkBack6')?.addEventListener('click', () => showPanel(5));
    document.getElementById('bkNext6')?.addEventListener('click', () => next(6));
    document.getElementById('bkBack7')?.addEventListener('click', () => showPanel(6));
    document.getElementById('bkNext7')?.addEventListener('click', () => next(7));
    document.getElementById('bkBack8')?.addEventListener('click', () => showPanel(7));
    document.getElementById('bookingSubmit')?.addEventListener('click', submit);

    // Enter avanza en inputs de texto
    [['bNombre',5],['bTelefono',6],['bEmail',7]].forEach(([id, step]) => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); next(step); }
      });
    });
  }

  return { init, open, close };
})();

function openBooking(servicioPreseleccionado) { Booking.open(servicioPreseleccionado); }
function closeBooking() { Booking.close(); }

document.addEventListener('DOMContentLoaded', () => Booking.init());
