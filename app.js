// View Switching
function showView(view) {
    document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    window.scrollTo(0, 0);
}

// Global State
let currentType = 'turf';
let selectedSlot = null;
let selectedPrice = null;

// Turf Data
const turfSlots = [
    { time: '11:30 AM - 12:30 PM', basePrice: 500 },
    { time: '12:00 PM - 01:00 PM', basePrice: 500 },
    { time: '01:00 PM - 02:00 PM', basePrice: 500 },
    { time: '02:00 PM - 03:00 PM', basePrice: 500 },
    { time: '03:00 PM - 04:00 PM', basePrice: 500 },
    { time: '04:00 PM - 05:00 PM', basePrice: 500 },
    { time: '04:30 PM - 05:30 PM', basePrice: 600 },
    { time: '05:00 PM - 06:00 PM', basePrice: 700 },
    { time: '06:00 PM - 07:00 PM', basePrice: 700 },
    { time: '07:00 PM - 08:00 PM', basePrice: 700 },
    { time: '08:00 PM - 09:00 PM', basePrice: 700 },
    { time: '09:00 PM - 10:00 PM', basePrice: 700 },
    { time: '10:00 PM - 11:00 PM', basePrice: 700 },
    { time: '11:00 PM - 12:00 AM', basePrice: 700 }
];

// Swimming Data
const swimSlots = [
    { time: '07:00 AM - 08:00 AM', price: 100 },
    { time: '08:00 AM - 09:00 AM', price: 100 },
    { time: '03:00 PM - 04:00 PM', price: 100 },
    { time: '04:00 PM - 05:00 PM', price: 100 },
    { time: '05:00 PM - 06:00 PM', price: 100 },
    { time: '06:00 PM - 07:00 PM', price: 100 }
];

document.addEventListener('DOMContentLoaded', () => {
    initDateInputs();
    setupEventListeners();
    renderAllSlots();
});

function initDateInputs() {
    const today = new Date().toISOString().split('T')[0];
    ['t-date', 's-date'].forEach(id => {
        const el = document.getElementById(id);
        el.value = today;
        el.min = today;
    });
}

function renderAllSlots() {
    renderTurfSlots();
    renderSwimmingSlots();
}

function renderTurfSlots() {
    const container = document.getElementById('t-slots-grid-container');
    container.innerHTML = '<div class="slots-grid"></div>';
    const grid = container.querySelector('.slots-grid');
    const date = document.getElementById('t-date').value;
    const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
    
    turfSlots.forEach(slot => {
        const isBooked = bookings.some(b => b.date === date && b.time === slot.time && b.type === 'turf' && b.status !== 'cancelled');
        const btn = document.createElement('button');
        btn.className = `slot-btn ${isBooked ? 'booked' : ''} ${selectedSlot === slot.time ? 'selected' : ''}`;
        btn.innerHTML = `<span>${slot.time}</span><strong>₹${slot.basePrice}</strong>`;
        btn.onclick = () => {
            if (isBooked) return;
            selectedSlot = slot.time;
            selectedPrice = `₹${slot.basePrice}`;
            currentType = 'turf';
            updateTurfBtn();
            renderTurfSlots();
        };
        grid.appendChild(btn);
    });
}

function renderSwimmingSlots() {
    const container = document.getElementById('s-slots-grid-container');
    container.innerHTML = '<div class="slots-grid"></div>';
    const grid = container.querySelector('.slots-grid');
    const date = document.getElementById('s-date').value;
    const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
    
    swimSlots.forEach(slot => {
        const isBooked = bookings.some(b => b.date === date && b.time === slot.time && b.type === 'swimming' && b.status !== 'cancelled');
        const btn = document.createElement('button');
        btn.className = `slot-btn ${isBooked ? 'booked' : ''} ${selectedSlot === slot.time ? 'selected' : ''}`;
        btn.innerHTML = `<span>${slot.time}</span><strong>₹100/p</strong>`;
        btn.onclick = () => {
            if (isBooked) return;
            selectedSlot = slot.time;
            currentType = 'swimming';
            updateSwimBtn();
            renderSwimmingSlots();
        };
        grid.appendChild(btn);
    });
}

function updateTurfBtn() {
    document.getElementById('t-book-btn').disabled = !selectedSlot;
}

function updateSwimBtn() {
    document.getElementById('s-book-btn').disabled = !selectedSlot;
}

function setupEventListeners() {
    document.getElementById('turf-form').onsubmit = (e) => {
        e.preventDefault();
        openConfirmModal();
    };
    document.getElementById('s-form').onsubmit = (e) => {
        e.preventDefault();
        openConfirmModal();
    };
    document.getElementById('t-date').onchange = renderTurfSlots;
    document.getElementById('s-date').onchange = renderSwimmingSlots;
    document.getElementById('s-people').oninput = updateSwimBtn;

    document.getElementById('utr-input').oninput = (e) => {
        document.getElementById('verify-payment').disabled = e.target.value.length !== 12;
    };

    document.getElementById('go-to-payment').onclick = openQrModal;
    document.getElementById('verify-payment').onclick = () => finalizeBooking(document.getElementById('utr-input').value);
    document.getElementById('pay-at-venue').onclick = () => finalizeBooking('Pay at Venue');
}

function openConfirmModal() {
    const details = document.getElementById('modal-details');
    if (currentType === 'turf') {
        details.innerHTML = `
            <p><strong>Service:</strong> Turf</p>
            <p><strong>Name:</strong> ${document.getElementById('t-name').value}</p>
            <p><strong>Time:</strong> ${selectedSlot}</p>
            <p><strong>Price:</strong> ${selectedPrice}</p>
        `;
    } else {
        const people = document.getElementById('s-people').value;
        selectedPrice = `₹${people * 100}`;
        details.innerHTML = `
            <p><strong>Service:</strong> Swimming</p>
            <p><strong>Name:</strong> ${document.getElementById('s-name').value}</p>
            <p><strong>People:</strong> ${people}</p>
            <p><strong>Time:</strong> ${selectedSlot}</p>
            <p><strong>Total:</strong> ${selectedPrice}</p>
        `;
    }
    document.getElementById('confirm-modal').classList.add('active');
}

function openQrModal() {
    document.getElementById('confirm-modal').classList.remove('active');
    document.getElementById('qr-price').textContent = selectedPrice;
    const amount = selectedPrice.replace(/\D/g,'');
    const upi = `upi://pay?pa=dummy@upi&pn=K6%20Turf&am=${amount}&cu=INR`;
    document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upi)}`;
    document.getElementById('qr-modal').classList.add('active');
}

function finalizeBooking(utr) {
    const id = `${currentType === 'turf' ? 'TURF' : 'SWIM'}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const booking = {
        id, type: currentType,
        name: document.getElementById(`${currentType === 'turf' ? 't' : 's'}-name`).value,
        whatsapp: document.getElementById(`${currentType === 'turf' ? 't' : 's'}-whatsapp`).value,
        date: document.getElementById(`${currentType === 'turf' ? 't' : 's'}-date`).value,
        time: selectedSlot,
        price: selectedPrice,
        utr: utr,
        timestamp: new Date().toISOString()
    };
    
    const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
    bookings.push(booking);
    localStorage.setItem('turf_bookings', JSON.stringify(bookings));
    
    document.getElementById('qr-modal').classList.remove('active');
    document.getElementById('final-booking-id').textContent = id;
    document.getElementById('success-modal').classList.add('active');
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
}
