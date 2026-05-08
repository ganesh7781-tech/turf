// GLOBAL VIEW SWITCHER
function showView(viewName) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${viewName}`).classList.add('active');
    
    // Manage body classes for theme colors
    if (viewName === 'swimming') {
        document.body.classList.add('swimming-active');
    } else {
        document.body.classList.remove('swimming-active');
    }
    
    // Scroll to top
    window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', () => {
    // --- COMMON ELEMENTS ---
    const modalOverlay = document.getElementById('success-modal');
    const qrModal = document.getElementById('qr-modal');
    const finalTicketModal = document.getElementById('final-ticket-modal');
    const qrImage = document.getElementById('qr-image');
    const qrPrice = document.getElementById('qr-price');
    const utrInput = document.getElementById('utr-input');
    const verifyPaymentBtn = document.getElementById('verify-payment');
    const payAtVenueBtn = document.getElementById('pay-at-venue');
    const finalBookingId = document.getElementById('final-booking-id');

    // --- TURF ELEMENTS ---
    const turfForm = document.getElementById('booking-form-turf');
    const turfDateInput = document.getElementById('turf-date');
    const turfDisplayDate = document.getElementById('turf-display-date');
    const turfBtnDesktop = document.getElementById('turf-btn-desktop');
    const turfBtnMobile = document.getElementById('turf-btn-mobile');
    const turfMobileInfo = document.getElementById('turf-mobile-info');
    const turfContainers = {
        morning: document.getElementById('turf-morning-slots'),
        afternoon: document.getElementById('turf-afternoon-slots'),
        evening: document.getElementById('turf-evening-slots'),
        night: document.getElementById('turf-night-slots')
    };

    // --- SWIMMING ELEMENTS ---
    const swimForm = document.getElementById('booking-form-swim');
    const swimDateInput = document.getElementById('swim-date');
    const swimPeopleInput = document.getElementById('swim-people');
    const swimDisplayDate = document.getElementById('swim-display-date');
    const swimBtnDesktop = document.getElementById('swim-btn-desktop');
    const swimBtnMobile = document.getElementById('swim-btn-mobile');
    const swimMobileInfo = document.getElementById('swim-mobile-info');
    const swimContainers = {
        morning: document.getElementById('swim-morning-slots'),
        afternoon: document.getElementById('swim-afternoon-slots'),
        evening: document.getElementById('swim-evening-slots')
    };

    // --- STATE ---
    let currentAppMode = 'turf'; // 'turf' or 'swimming'
    let selectedSlot = null;
    let selectedPriceText = null;
    let selectedPriceAmount = 0;

    // --- INITIALIZATION ---
    const today = new Date().toISOString().split('T')[0];
    turfDateInput.value = today;
    turfDateInput.min = today;
    swimDateInput.value = today;
    swimDateInput.min = today;

    // --- DATA ---
    const turfSlots = {
        morning: [{ time: '11:30 AM - 12:30 PM', basePrice: 500 }],
        afternoon: [
            { time: '12:00 PM - 01:00 PM', basePrice: 500 },
            { time: '01:00 PM - 02:00 PM', basePrice: 500 },
            { time: '02:00 PM - 03:00 PM', basePrice: 500 },
            { time: '03:00 PM - 04:00 PM', basePrice: 500 },
            { time: '04:00 PM - 05:00 PM', basePrice: 500 },
            { time: '04:30 PM - 05:30 PM', basePrice: 600 }
        ],
        evening: [
            { time: '05:00 PM - 06:00 PM', basePrice: 700 },
            { time: '06:00 PM - 07:00 PM', basePrice: 700 },
            { time: '07:00 PM - 08:00 PM', basePrice: 700 },
            { time: '08:00 PM - 09:00 PM', basePrice: 700 }
        ],
        night: [
            { time: '09:00 PM - 10:00 PM', basePrice: 700 },
            { time: '10:00 PM - 11:00 PM', basePrice: 700 },
            { time: '11:00 PM - 12:00 AM', basePrice: 700 }
        ]
    };

    const swimSlots = {
        morning: [{ time: '07:00 AM - 08:00 AM' }, { time: '09:00 AM - 10:00 AM' }],
        afternoon: [{ time: '03:00 PM - 04:00 PM' }],
        evening: [{ time: '05:00 PM - 06:00 PM' }, { time: '07:00 PM - 08:00 PM' }]
    };

    // --- CORE LOGIC ---

    function updateDisplayDate(input, display) {
        const dateObj = new Date(input.value);
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        let str = dateObj.toLocaleDateString('en-US', options);
        if (input.value === today) str = 'Today, ' + str;
        display.textContent = str;
    }

    function getBookedSlots(type, date) {
        const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        return bookings
            .filter(b => b.type === type && b.date === date && b.status !== 'cancelled')
            .map(b => b.time);
    }

    function renderSlots(type, date) {
        const booked = getBookedSlots(type, date);
        const data = type === 'turf' ? turfSlots : swimSlots;
        const containers = type === 'turf' ? turfContainers : swimContainers;

        Object.keys(data).forEach(period => {
            const container = containers[period];
            container.innerHTML = '';
            data[period].forEach(slot => {
                const isBooked = booked.includes(slot.time);
                const btn = document.createElement('button');
                btn.className = `slot-btn ${isBooked ? 'booked' : ''}`;
                if (isBooked) btn.disabled = true;

                let priceDisplay = '';
                if (type === 'turf') {
                    priceDisplay = `₹${slot.basePrice}`;
                } else {
                    priceDisplay = isBooked ? 'Full' : '₹100/p';
                }

                btn.innerHTML = `<span class="slot-time">${slot.time}</span><span class="slot-price">${isBooked ? 'Booked' : priceDisplay}</span>`;
                
                if (!isBooked) {
                    btn.onclick = () => {
                        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedSlot = slot.time;
                        currentAppMode = type;
                        updatePriceAndUI();
                    };
                }
                container.appendChild(btn);
            });
        });
    }

    function updatePriceAndUI() {
        if (!selectedSlot) return;

        if (currentAppMode === 'turf') {
            // Find turf slot price
            let price = 500;
            Object.values(turfSlots).flat().forEach(s => {
                if (s.time === selectedSlot) price = s.basePrice;
            });
            selectedPriceAmount = price;
            selectedPriceText = `₹${price}`;
            
            turfBtnDesktop.disabled = false;
            turfBtnMobile.disabled = false;
            turfBtnDesktop.querySelector('.btn-subtitle').textContent = `${selectedSlot} • ${selectedPriceText}`;
            turfMobileInfo.textContent = `${selectedSlot} • ${selectedPriceText}`;
        } else {
            const count = parseInt(swimPeopleInput.value) || 1;
            selectedPriceAmount = count * 100;
            selectedPriceText = `₹${selectedPriceAmount}`;

            swimBtnDesktop.disabled = false;
            swimBtnMobile.disabled = false;
            swimBtnDesktop.querySelector('.btn-subtitle').textContent = `${selectedSlot} • Total: ${selectedPriceText}`;
            swimMobileInfo.textContent = `${selectedSlot} • Total: ${selectedPriceText}`;
        }
    }

    // --- EVENT LISTENERS ---

    // View Switching Logic
    window.showView = (name) => {
        document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${name}`).classList.add('active');
        selectedSlot = null;
        if (name === 'swimming') {
            document.body.classList.add('swimming-active');
            renderSlots('swimming', swimDateInput.value);
            updateDisplayDate(swimDateInput, swimDisplayDate);
        } else if (name === 'turf') {
            document.body.classList.remove('swimming-active');
            renderSlots('turf', turfDateInput.value);
            updateDisplayDate(turfDateInput, turfDisplayDate);
        } else {
            document.body.classList.remove('swimming-active');
        }
    };

    turfDateInput.onchange = () => {
        updateDisplayDate(turfDateInput, turfDisplayDate);
        renderSlots('turf', turfDateInput.value);
    };

    swimDateInput.onchange = () => {
        updateDisplayDate(swimDateInput, swimDisplayDate);
        renderSlots('swimming', swimDateInput.value);
    };

    swimPeopleInput.oninput = () => updatePriceAndUI();

    // Booking Submission
    function initiateBooking(e) {
        e.preventDefault();
        const form = currentAppMode === 'turf' ? turfForm : swimForm;
        if (!form.checkValidity()) { form.reportValidity(); return; }

        // Populate Ticket Modal
        document.getElementById('ticket-name').textContent = document.getElementById(`${currentAppMode}-name`).value;
        document.getElementById('ticket-date').textContent = document.getElementById(`${currentAppMode}-date`).value;
        document.getElementById('ticket-time').textContent = selectedSlot;
        document.getElementById('ticket-price').textContent = selectedPriceText;
        
        if (currentAppMode === 'swimming') {
            document.getElementById('ticket-people-row').style.display = 'flex';
            document.getElementById('ticket-people').textContent = swimPeopleInput.value;
            document.getElementById('modal-title').textContent = 'Confirm Pool Booking';
        } else {
            document.getElementById('ticket-people-row').style.display = 'none';
            document.getElementById('modal-title').textContent = 'Confirm Turf Booking';
        }

        modalOverlay.classList.add('active');
    }

    turfForm.onsubmit = initiateBooking;
    swimForm.onsubmit = initiateBooking;
    document.getElementById('turf-btn-mobile').onclick = initiateBooking;
    document.getElementById('swim-btn-mobile').onclick = initiateBooking;

    // Modal Actions
    document.getElementById('cancel-booking').onclick = () => modalOverlay.classList.remove('active');
    
    document.getElementById('confirm-booking').onclick = () => {
        modalOverlay.classList.remove('active');
        qrPrice.textContent = selectedPriceText;
        const upiName = currentAppMode === 'turf' ? 'K6%20Turf' : 'K6%20Swimming';
        const upiString = `upi://pay?pa=dummy@upi&pn=${upiName}&am=${selectedPriceAmount}&cu=INR`;
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
        utrInput.value = '';
        verifyPaymentBtn.disabled = true;
        qrModal.classList.add('active');
    };

    utrInput.oninput = (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        verifyPaymentBtn.disabled = e.target.value.length !== 12;
    };

    document.getElementById('cancel-qr').onclick = () => {
        qrModal.classList.remove('active');
        modalOverlay.classList.add('active');
    };

    function finalizeBooking(utrValue) {
        const prefix = currentAppMode === 'turf' ? 'TURF' : 'SWIM';
        const bookingId = `${prefix}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        
        const booking = {
            id: bookingId,
            type: currentAppMode,
            name: document.getElementById(`${currentAppMode}-name`).value,
            whatsapp: document.getElementById(`${currentAppMode}-whatsapp`).value,
            date: document.getElementById(`${currentAppMode}-date`).value,
            time: selectedSlot,
            price: selectedPriceText,
            utr: utrValue,
            timestamp: new Date().toISOString()
        };
        
        if (currentAppMode === 'swimming') booking.people = swimPeopleInput.value;

        const bookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        bookings.push(booking);
        localStorage.setItem('turf_bookings', JSON.stringify(bookings));

        qrModal.classList.remove('active');
        finalBookingId.textContent = bookingId;
        finalTicketModal.classList.add('active');
    }

    verifyPaymentBtn.onclick = () => finalizeBooking(utrInput.value);
    payAtVenueBtn.onclick = () => finalizeBooking('Pay at Venue');

    document.getElementById('close-ticket').onclick = () => {
        finalTicketModal.classList.remove('active');
        showView('landing');
        turfForm.reset();
        swimForm.reset();
        turfDateInput.value = today;
        swimDateInput.value = today;
    };

    // --- INIT ---
    renderSlots('turf', today);
    renderSlots('swimming', today);
});
