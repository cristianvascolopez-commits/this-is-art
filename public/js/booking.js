/* =====================
   THIS IS ART — booking.js
   Modal de reserva con Google Calendar
   ===================== */

function openBooking(servicioPreseleccionado) {
  const overlay = document.getElementById('bookingOverlay');
  const select  = document.getElementById('bServicio');

  // Preseleccionar servicio si viene de una tarjeta
  if (servicioPreseleccionado && select) {
    for (const opt of select.options) {
      if (opt.text.toLowerCase().includes(servicioPreseleccionado.toLowerCase())) {
        opt.selected = true;
        break;
      }
    }
  }

  // Fecha mínima = hoy
  const fechaInput = document.getElementById('bFecha');
  if (fechaInput) {
    const today = new Date().toISOString().split('T')[0];
    fechaInput.min = today;
    if (!fechaInput.value) fechaInput.value = today;
  }

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

  document.getElementById('bookingForm')?.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = document.getElementById('bookingSubmit');
    const msg = document.getElementById('bookingMsg');

    const nombre   = document.getElementById('bNombre').value.trim();
    const servicio = document.getElementById('bServicio').value;
    const fecha    = document.getElementById('bFecha').value;
    const hora     = document.getElementById('bHora').value;
    const telefono = document.getElementById('bTelefono').value.trim();

    // Validar que no sea domingo
    const day = new Date(fecha).getDay();
    if (day === 0) {
      showMsg('Los domingos estamos cerrados. Por favor elige otro día.', 'error');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Agendando...';
    msg.className = 'booking-msg';
    msg.textContent = '';

    try {
      const res = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, servicio, fecha, hora, telefono }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        showMsg(`✅ ¡Cita confirmada! ${nombre}, te esperamos el ${formatDate(fecha)} a las ${hora} para ${servicio}. ¡Hasta pronto!`, 'success');
        btn.textContent = '✅ ¡Cita confirmada!';
        setTimeout(closeBooking, 4000);
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
