/* =====================
   THIS IS ART — booking.js
   Modal multi-paso de reserva
   ===================== */

const Booking = (() => {
  const state = {
    step: 1,
    servicio: '',
    precio: '',
    empleado: '',
    fecha: '',
    hora: '',
    nombre: '',
    telefono: '',
  };

  // ── Abrir / cerrar ──────────────────────────────
  function open(servicioPreseleccionado) {
    resetState();
    renderStep(1);

    if (servicioPreseleccionado) {
      const cards = document.querySelectorAll('.booking-service-card');
      cards.forEach(c => {
        if (c.dataset.value.toLowerCase().includes(servicioPreseleccionado.toLowerCase())) {
          selectService(c);
        }
      });
    }

    const today = new Date().toISOString().split('T')[0];
    const fechaInput = document.getElementById('bFecha');
    if (fechaInput) {
      fechaInput.min = today;
      fechaInput.value = today;
    }

    document.getElementById('bookingOverlay').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    document.getElementById('bookingOverlay').classList.remove('active');
    document.body.style.overflow = '';
  }

  function resetState() {
    Object.assign(state, { step:1, servicio:'', precio:'', empleado:'', fecha:'', hora:'', nombre:'', telefono:'' });
    document.querySelectorAll('.booking-service-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.booking-emp-card').forEach(c => c.classList.remove('selected'));
    document.querySelectorAll('.booking-slot').forEach(c => c.classList.remove('selected'));
    const msg = document.getElementById('bookingMsg');
    if (msg) { msg.textContent = ''; msg.className = 'booking-msg'; }
    const success = document.getElementById('bookingSuccess');
    if (success) { success.classList.remove('active'); success.style.display = ''; }
  }

  // ── Navegación de pasos ─────────────────────────
  function renderStep(n) {
    state.step = n;

    [1,2,3,4].forEach(i => {
      const p = document.getElementById(`stepPanel${i}`);
      if (p) p.classList.toggle('active', i === n);
    });

    document.querySelectorAll('.booking-step-label').forEach(el => {
      const s = parseInt(el.dataset.step);
      el.classList.remove('active', 'done');
      if (s === n) el.classList.add('active');
      if (s < n)  el.classList.add('done');
    });

    const progress = document.getElementById('bookingProgress');
    const body = document.querySelector('.booking-body');
    const success = document.getElementById('bookingSuccess');

    if (n === 0) {
      progress.style.display = 'none';
      body.style.display = 'none';
      success.classList.add('active');
    } else {
      progress.style.display = '';
      body.style.display = '';
      success.classList.remove('active');
    }
  }

  function goNext(from) {
    if (from === 1) {
      if (!state.servicio) return alert('Por favor selecciona un servicio.');
      if (!state.empleado) return alert('Por favor elige un profesional.');
      renderStep(2);
    } else if (from === 2) {
      const fechaInput = document.getElementById('bFecha');
      state.fecha = fechaInput?.value || '';
      if (!state.fecha) return alert('Por favor selecciona una fecha.');
      if (!state.hora)  return alert('Por favor selecciona una hora.');
      const day = new Date(state.fecha).getDay();
      if (day === 0) return alert('Los domingos estamos cerrados. Por favor elige otro día.');
      renderStep(3);
    } else if (from === 3) {
      state.nombre   = document.getElementById('bNombre')?.value.trim() || '';
      state.telefono = document.getElementById('bTelefono')?.value.trim() || '';
      if (!state.nombre)   return alert('Por favor introduce tu nombre.');
      if (!state.telefono) return alert('Por favor introduce tu teléfono.');
      fillSummary();
      renderStep(4);
    }
  }

  function goBack(from) {
    renderStep(from - 1);
  }

  // ── Selectores ─────────────────────────────────
  function selectService(card) {
    document.querySelectorAll('.booking-service-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.servicio = card.dataset.value;
    state.precio   = card.dataset.price;
  }

  function selectEmp(card) {
    document.querySelectorAll('.booking-emp-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');
    state.empleado = card.dataset.emp;
  }

  function selectSlot(slot) {
    document.querySelectorAll('.booking-slot').forEach(s => s.classList.remove('selected'));
    slot.classList.add('selected');
    state.hora = slot.dataset.hora;
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
  }

  // ── Envío ──────────────────────────────────────
  async function submit() {
    const btn = document.getElementById('bookingSubmit');
    const msg = document.getElementById('bookingMsg');

    btn.disabled = true;
    btn.textContent = 'Agendando...';
    msg.className = 'booking-msg';
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
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        document.getElementById('bookingSuccessText').textContent =
          `${state.nombre}, te esperamos el ${formatDate(state.fecha)} a las ${state.hora} para ${state.servicio} con ${state.empleado}. ¡Hasta pronto!`;
        renderStep(0);
      } else {
        msg.textContent = data.error || 'Error al agendar. Llámanos al 93 189 40 78.';
        msg.className = 'booking-msg error';
        btn.disabled = false;
        btn.textContent = '📅 Confirmar cita';
      }
    } catch {
      msg.textContent = 'Sin conexión. Llámanos al ☎ 93 189 40 78 o reserva en Booksy.';
      msg.className = 'booking-msg error';
      btn.disabled = false;
      btn.textContent = '📅 Confirmar cita';
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr + 'T12:00:00');
    return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
  }

  // ── Init ───────────────────────────────────────
  function init() {
    document.getElementById('bookingClose')?.addEventListener('click', close);
    document.getElementById('bookingOverlay')?.addEventListener('click', e => {
      if (e.target === e.currentTarget) close();
    });

    document.querySelectorAll('.booking-service-card').forEach(c => {
      c.addEventListener('click', () => selectService(c));
    });

    document.querySelectorAll('.booking-emp-card').forEach(c => {
      c.addEventListener('click', () => selectEmp(c));
    });

    document.querySelectorAll('.booking-slot').forEach(s => {
      s.addEventListener('click', () => selectSlot(s));
    });

    document.getElementById('step1Next')?.addEventListener('click', () => goNext(1));
    document.getElementById('step2Back')?.addEventListener('click', () => goBack(2));
    document.getElementById('step2Next')?.addEventListener('click', () => goNext(2));
    document.getElementById('step3Back')?.addEventListener('click', () => goBack(3));
    document.getElementById('step3Next')?.addEventListener('click', () => goNext(3));
    document.getElementById('step4Back')?.addEventListener('click', () => goBack(4));
    document.getElementById('bookingSubmit')?.addEventListener('click', submit);
  }

  return { init, open, close };
})();

function openBooking(servicioPreseleccionado) {
  Booking.open(servicioPreseleccionado);
}
function closeBooking() {
  Booking.close();
}

document.addEventListener('DOMContentLoaded', () => Booking.init());
