// Global State
let turfSlotData = [
    { time: '11:30 AM - 12:30 PM', cat: 'morning' },
    { time: '12:00 PM - 01:00 PM', cat: 'afternoon' }, { time: '01:00 PM - 02:00 PM', cat: 'afternoon' },
    { time: '02:00 PM - 03:00 PM', cat: 'afternoon' }, { time: '03:00 PM - 04:00 PM', cat: 'afternoon' },
    { time: '04:00 PM - 05:00 PM', cat: 'afternoon' }, { time: '05:00 PM - 06:00 PM', cat: 'evening' },
    { time: '06:00 PM - 07:00 PM', cat: 'evening' }, { time: '07:00 PM - 08:00 PM', cat: 'evening' },
    { time: '08:00 PM - 09:00 PM', cat: 'evening' }, { time: '09:00 PM - 10:00 PM', cat: 'night' },
    { time: '10:00 PM - 11:00 PM', cat: 'night' }, { time: '11:00 PM - 12:00 AM', cat: 'night' }
];

let swimSlotData = [
    { time: '07:00 AM - 08:00 AM', cat: 'morning' }, { time: '08:00 AM - 09:00 AM', cat: 'morning' },
    { time: '09:00 AM - 10:00 AM', cat: 'morning' }, { time: '10:00 AM - 11:00 AM', cat: 'morning' },
    { time: '03:00 PM - 04:00 PM', cat: 'afternoon' }, { time: '04:00 PM - 05:00 PM', cat: 'afternoon' },
    { time: '05:00 PM - 06:00 PM', cat: 'evening' }, { time: '06:00 PM - 07:00 PM', cat: 'evening' },
    { time: '07:00 PM - 08:00 PM', cat: 'evening' }, { time: '08:00 PM - 09:00 PM', cat: 'evening' }
];

let currentFilteredBookings = [];

function getPriceForSlot(time) {
    if (time.includes('04:30')) return '600';
    if (time.includes('05:') || time.includes('06:') || time.includes('07:') || time.includes('08:') || time.includes('09:') || time.includes('10:') || time.includes('11:')) return '700';
    return '500';
}

window.loadBookings = function(startDateStr = null, endDateStr = null) {
    const bookingsData = localStorage.getItem('turf_bookings');
    const bookings = bookingsData ? JSON.parse(bookingsData) : [];
    
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const typeFilter = document.getElementById('type-filter');
    const bookingsBody = document.getElementById('bookings-body');
    const emptyState = document.getElementById('empty-state');
    const tableElement = document.getElementById('bookings-table');
    const totalBookingsEl = document.getElementById('total-bookings');
    const totalRevenueEl = document.getElementById('total-revenue');

    let filtered = [...bookings];

    const startVal = startDateStr !== null ? startDateStr : (filterFrom ? filterFrom.value : "");
    const endVal = endDateStr !== null ? endDateStr : (filterTo ? filterTo.value : "");
    const type = typeFilter ? typeFilter.value : 'all';

    if (startVal && startVal !== "") {
        const s = new Date(startVal); s.setHours(0,0,0,0);
        filtered = filtered.filter(b => {
            const bDate = new Date(b.date); bDate.setHours(0,0,0,0);
            return bDate >= s;
        });
    }
    if (endVal && endVal !== "") {
        const e = new Date(endVal); e.setHours(23,59,59,999);
        filtered = filtered.filter(b => {
            const bDate = new Date(b.date); bDate.setHours(0,0,0,0);
            return bDate <= e;
        });
    }
    if (type !== 'all') {
        filtered = filtered.filter(b => b.type === type);
    }

    currentFilteredBookings = [...filtered];
    filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest by timestamp

    if (totalBookingsEl) totalBookingsEl.textContent = filtered.filter(b => b.status !== 'cancelled').length;
    
    let revenue = 0;
    filtered.forEach(b => {
        if (b.status !== 'cancelled' && b.price) {
            revenue += parseInt(b.price.replace(/[^0-9]/g, '')) || 0;
        }
    });
    if (totalRevenueEl) totalRevenueEl.textContent = `₹${revenue}`;

    if (filtered.length === 0) {
        if (tableElement) tableElement.style.display = 'none';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (tableElement) tableElement.style.display = 'table';
    if (emptyState) emptyState.style.display = 'none';
    
    if (bookingsBody) {
        bookingsBody.innerHTML = '';
        filtered.forEach(b => {
            const tr = document.createElement('tr');
            const bDate = new Date(b.date);
            const dateStr = isNaN(bDate.getTime()) ? b.date : bDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
            const whatsappClean = (b.whatsapp || '').replace(/[^0-9]/g, '');
            
            tr.innerHTML = `
                <td><strong>${b.id}</strong></td>
                <td><span style="color:${b.type === 'swimming' ? '#0ea5e9' : '#10b981'}; font-weight:700;">${b.type.toUpperCase()}</span></td>
                <td>${b.name}</td>
                <td><a href="https://wa.me/${whatsappClean}" target="_blank" style="color:var(--primary); font-weight:600;">${b.whatsapp}</a></td>
                <td>${dateStr}</td>
                <td>${b.time}</td>
                <td><strong>${b.price}</strong></td>
                <td>
                    <span class="badge" style="${b.status === 'cancelled' ? 'background:var(--danger);color:white;' : 'background:#dcfce7;color:#166534;'}">
                        ${b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}
                    </span>
                </td>
                <td>
                    ${b.status !== 'cancelled' ? `<button onclick="cancelBooking('${b.id}')" class="btn-cancel" style="border:1px solid var(--danger); color:var(--danger); background:white; padding:0.25rem 0.5rem; font-size:0.75rem; border-radius:4px; cursor:pointer;">Cancel</button>` : ''}
                </td>
            `;
            bookingsBody.appendChild(tr);
        });
    }
};

window.cancelBooking = function(id) {
    if (confirm("Cancel booking " + id + "?")) {
        let bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        const idx = bookings.findIndex(b => b.id === id);
        if (idx > -1) {
            bookings[idx].status = 'cancelled';
            localStorage.setItem('turf_bookings', JSON.stringify(bookings));
            loadBookings();
        }
    }
};

window.loadSchedule = function() {
    const scheduleTypeEl = document.getElementById('schedule-type');
    const scheduleDateEl = document.getElementById('schedule-date');
    if (!scheduleTypeEl || !scheduleDateEl) return;

    const type = scheduleTypeEl.value;
    const date = scheduleDateEl.value;
    const grid = document.getElementById('schedule-slots-grid');
    const displayDate = document.getElementById('schedule-display-date');
    const title = document.getElementById('schedule-title');

    if (!date || !grid) return;

    const dateObj = new Date(date);
    if (displayDate) displayDate.textContent = isNaN(dateObj.getTime()) ? date : dateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
    if (title) title.textContent = `${type.toUpperCase()} Slots`;

    const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
    const booked = bookings.filter(b => b.date === date && b.type === type && b.status !== 'cancelled');
    const slots = type === 'turf' ? turfSlotData : swimSlotData;

    grid.innerHTML = '';
    slots.forEach(slot => {
        const booking = booked.find(b => b.time === slot.time);
        const div = document.createElement('div');
        div.className = `slot-btn ${booking ? 'booked' : ''}`;
        div.style.height = 'auto'; div.style.padding = '1rem';
        
        if (booking) {
            div.innerHTML = `
                <div style="font-weight:700;">${slot.time}</div>
                <div style="color:var(--danger); font-size:0.8rem; margin-top:0.5rem; font-weight:600;"><i class="ph-fill ph-user"></i> ${booking.name}</div>
                <div style="font-size:0.7rem; color:var(--text-muted);">${booking.whatsapp}</div>
            `;
        } else {
            const price = type === 'turf' ? '₹' + getPriceForSlot(slot.time) : '₹100/p';
            div.innerHTML = `
                <div>${slot.time}</div>
                <div style="color:var(--primary); font-weight:700;">${price}</div>
                <div style="font-size:0.7rem; color:var(--primary); margin-top:0.5rem; font-weight:600;">+ Add Manual</div>
            `;
            div.style.cursor = 'pointer';
            div.onclick = () => openManualBookingModal(slot.time, type, date, price);
        }
        grid.appendChild(div);
    });
};

window.initScheduleView = function() {
    const dateInp = document.getElementById('schedule-date');
    if (dateInp && !dateInp.value) {
        dateInp.value = new Date().toISOString().split('T')[0];
    }
    loadSchedule();
};

let currentManualData = null;
function openManualBookingModal(time, type, date, price) {
    currentManualData = { time, type, date };
    document.getElementById('manual-slot-time').value = time;
    document.getElementById('manual-slot-display').textContent = `${time} (${type.toUpperCase()})`;
    document.getElementById('manual-price').value = price.replace(/[^0-9]/g, '');
    const durationGroup = document.getElementById('manual-duration-group');
    if (durationGroup) durationGroup.style.display = type === 'turf' ? 'block' : 'none';
    document.getElementById('manual-booking-modal').classList.add('active');
}

window.closeModal = function(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
};

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Auth Check
    if (sessionStorage.getItem('admin_logged_in') === 'true') {
        const overlay = document.getElementById('login-overlay');
        const main = document.getElementById('admin-main');
        if (overlay) overlay.style.display = 'none';
        if (main) main.style.display = 'block';
        loadBookings();
    }

    // Manual Form Submit
    const manualForm = document.getElementById('manual-booking-form');
    if (manualForm) {
        manualForm.onsubmit = (e) => {
            e.preventDefault();
            const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
            const newBooking = {
                id: 'ADMIN-' + Math.random().toString(36).substring(2, 8).toUpperCase(),
                type: currentManualData.type,
                name: document.getElementById('manual-name').value,
                whatsapp: document.getElementById('manual-whatsapp').value,
                date: currentManualData.date,
                time: currentManualData.time,
                price: '₹' + document.getElementById('manual-price').value,
                utr: 'Manual Admin Entry',
                status: 'confirmed',
                timestamp: new Date().toISOString()
            };
            bookings.push(newBooking);
            localStorage.setItem('turf_bookings', JSON.stringify(bookings));
            
            closeModal('manual-booking-modal');
            manualForm.reset();
            loadSchedule();
            loadBookings(); // Refresh bookings list immediately
            alert("Booking added successfully!");
        };
    }

    // Buttons
    const viewBtn = document.getElementById('view-schedule');
    if (viewBtn) viewBtn.onclick = loadSchedule;
    
    const refreshBtn = document.getElementById('refresh-schedule');
    if (refreshBtn) refreshBtn.onclick = loadSchedule;

    const applyFilterBtn = document.getElementById('apply-filter');
    if (applyFilterBtn) applyFilterBtn.onclick = () => loadBookings();

    const resetFilterBtn = document.getElementById('reset-filter');
    if (resetFilterBtn) resetFilterBtn.onclick = () => {
        document.getElementById('filter-from').value = '';
        document.getElementById('filter-to').value = '';
        loadBookings();
    };

    const clearDataBtn = document.getElementById('clear-data');
    if (clearDataBtn) clearDataBtn.onclick = () => {
        if (confirm("Delete ALL bookings? This cannot be undone.")) {
            localStorage.removeItem('turf_bookings');
            loadBookings();
            loadSchedule();
        }
    };
    
    const exportBtn = document.getElementById('export-csv');
    if (exportBtn) exportBtn.onclick = () => {
        if (currentFilteredBookings.length === 0) return alert("No data to export");
        let csv = "ID,Type,Name,WhatsApp,Date,Time,Price,Status\n";
        currentFilteredBookings.forEach(b => {
            csv += `${b.id},${b.type},${b.name},${b.whatsapp},${b.date},${b.time},${b.price},${b.status}\n`;
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'bookings.csv'; a.click();
    };
});

window.verifyAdmin = function() {
    const passInput = document.getElementById('admin-password');
    if (!passInput) return;
    const pass = passInput.value;
    if (pass === 'k6admin') {
        sessionStorage.setItem('admin_logged_in', 'true');
        location.reload();
    } else {
        const err = document.getElementById('login-error');
        if (err) err.style.display = 'block';
    }
};
