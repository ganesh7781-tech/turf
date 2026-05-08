document.addEventListener('DOMContentLoaded', () => {
    // STATE
    let currentService = 'turf'; // 'turf' or 'swimming'
    let selectedSlot = null;
    let currentBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');

    // DOM ELEMENTS - VIEWS
    const views = {
        landing: document.getElementById('landing-view'),
        turf: document.getElementById('turf-view'),
        swimming: document.getElementById('swimming-view')
    };

    // DOM ELEMENTS - TURF
    const turfForm = document.getElementById('turf-form');
    const turfDateInput = document.getElementById('turf-date');
    const turfSlots = {
        morning: document.getElementById('turf-morning-slots'),
        afternoon: document.getElementById('turf-afternoon-slots'),
        evening: document.getElementById('turf-evening-slots'),
        night: document.getElementById('turf-night-slots')
    };

    // DOM ELEMENTS - SWIMMING
    const swimForm = document.getElementById('swimming-form');
    const swimDateInput = document.getElementById('swim-date');
    const swimPeopleInput = document.getElementById('swim-people');
    const swimSlots = {
        morning: document.getElementById('swim-morning-slots'),
        afternoon: document.getElementById('swim-afternoon-slots'),
        evening: document.getElementById('swim-evening-slots')
    };

    // SHARED MODALS
    const confirmModal = document.getElementById('confirm-modal');
    const qrModal = document.getElementById('qr-modal');
    const ticketModal = document.getElementById('ticket-modal');

    // VIEW SWITCHER
    window.showView = (viewName) => {
        Object.values(views).forEach(v => v.classList.remove('active'));
        views[viewName].classList.add('active');
        currentService = viewName;
        if (viewName === 'turf' || viewName === 'swimming') {
            initBookingPage();
        }
    };

    window.closeModal = (id) => {
        document.getElementById(id).classList.remove('active');
    };

    // INITIALIZE DATE
    const today = new Date().toISOString().split('T')[0];
    [turfDateInput, swimDateInput].forEach(inp => {
        inp.value = today;
        inp.min = today;
    });

    // SLOT DATA
    const turfSlotData = [
        { time: '11:30 AM - 12:30 PM', cat: 'morning' },
        { time: '12:00 PM - 01:00 PM', cat: 'afternoon' }, { time: '01:00 PM - 02:00 PM', cat: 'afternoon' },
        { time: '02:00 PM - 03:00 PM', cat: 'afternoon' }, { time: '03:00 PM - 04:00 PM', cat: 'afternoon' },
        { time: '04:00 PM - 05:00 PM', cat: 'afternoon' }, { time: '05:00 PM - 06:00 PM', cat: 'evening' },
        { time: '06:00 PM - 07:00 PM', cat: 'evening' }, { time: '07:00 PM - 08:00 PM', cat: 'evening' },
        { time: '08:00 PM - 09:00 PM', cat: 'evening' }, { time: '09:00 PM - 10:00 PM', cat: 'night' },
        { time: '10:00 PM - 11:00 PM', cat: 'night' }, { time: '11:00 PM - 12:00 AM', cat: 'night' }
    ];

    const swimSlotData = [
        { time: '07:00 AM - 08:00 AM', cat: 'morning' }, { time: '08:00 AM - 09:00 AM', cat: 'morning' },
        { time: '09:00 AM - 10:00 AM', cat: 'morning' }, { time: '10:00 AM - 11:00 AM', cat: 'morning' },
        { time: '03:00 PM - 04:00 PM', cat: 'afternoon' }, { time: '04:00 PM - 05:00 PM', cat: 'afternoon' },
        { time: '05:00 PM - 06:00 PM', cat: 'evening' }, { time: '06:00 PM - 07:00 PM', cat: 'evening' },
        { time: '07:00 PM - 08:00 PM', cat: 'evening' }, { time: '08:00 PM - 09:00 PM', cat: 'evening' }
    ];

    function initBookingPage() {
        const date = currentService === 'turf' ? turfDateInput.value : swimDateInput.value;
        const slots = currentService === 'turf' ? turfSlotData : swimSlotData;
        const containers = currentService === 'turf' ? turfSlots : swimSlots;
        const booked = currentBookings.filter(b => b.date === date && b.type === currentService && b.status !== 'cancelled').map(b => b.time);

        // Clear
        Object.values(containers).forEach(c => c.innerHTML = '');

        slots.forEach(slot => {
            const isBooked = booked.includes(slot.time);
            const btn = document.createElement('button');
            btn.className = `slot-btn ${isBooked ? 'booked' : ''}`;
            if (isBooked) btn.disabled = true;
            
            const price = currentService === 'turf' ? getTurfPrice(slot.time) : '₹100/p';
            btn.innerHTML = `<span class="slot-time">${slot.time}</span><span class="slot-price">${isBooked ? 'Full' : price}</span>`;
            
            if (!isBooked) {
                btn.onclick = () => {
                    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedSlot = { time: slot.time, price: price };
                    updateButtonStates();
                };
            }
            containers[slot.cat].appendChild(btn);
        });
        updateButtonStates();
    }

    function getTurfPrice(time) {
        if (time.includes('04:30')) return '₹600';
        if (time.includes('05:') || time.includes('06:') || time.includes('07:') || time.includes('08:') || time.includes('09:') || time.includes('10:') || time.includes('11:')) return '₹700';
        return '₹500';
    }

    function updateButtonStates() {
        const btn = currentService === 'turf' ? document.getElementById('turf-book-btn-desktop') : document.getElementById('swim-book-btn-desktop');
        btn.disabled = !selectedSlot;
    }

    // FORM SUBMISSIONS
    [turfForm, swimForm].forEach(f => {
        f.onsubmit = (e) => {
            e.preventDefault();
            if (!selectedSlot) return;
            
            const name = currentService === 'turf' ? document.getElementById('turf-name').value : document.getElementById('swim-name').value;
            const phone = currentService === 'turf' ? document.getElementById('turf-whatsapp').value : document.getElementById('swim-whatsapp').value;
            const extra = currentService === 'swimming' ? `<div class="confirm-row"><i class="ph-fill ph-users"></i><span><strong>People:</strong> ${swimPeopleInput.value}</span></div>` : '';
            const priceVal = currentService === 'turf' ? selectedSlot.price : `₹${parseInt(swimPeopleInput.value) * 100}`;

            document.getElementById('confirm-details').innerHTML = `
                <div class="confirm-row"><i class="ph-fill ph-user"></i><span><strong>Name:</strong> ${name}</span></div>
                ${extra}
                <div class="confirm-row"><i class="ph-fill ph-calendar"></i><span><strong>Date:</strong> ${currentService === 'turf' ? turfDateInput.value : swimDateInput.value}</span></div>
                <div class="confirm-row"><i class="ph-fill ph-clock"></i><span><strong>Time:</strong> ${selectedSlot.time}</span></div>
                <div class="confirm-row"><i class="ph-fill ph-tag"></i><span><strong>Total:</strong> <strong class="price-highlight">${priceVal}</strong></span></div>
            `;
            confirmModal.dataset.finalPrice = priceVal;
            confirmModal.classList.add('active');
        };
    });

    document.getElementById('final-confirm-btn').onclick = () => {
        confirmModal.classList.remove('active');
        const price = confirmModal.dataset.finalPrice;
        document.getElementById('qr-price').textContent = price;
        const cleanPrice = price.replace(/[^0-9]/g, '');
        const upi = `upi://pay?pa=dummy@upi&pn=K6%20Turf&am=${cleanPrice}&cu=INR`;
        document.getElementById('qr-image').src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upi)}`;
        qrModal.classList.add('active');
    };

    // PAYMENT VERIFICATION
    const utrInput = document.getElementById('utr-input');
    const verifyBtn = document.getElementById('verify-btn');
    utrInput.oninput = () => verifyBtn.disabled = utrInput.value.length !== 12;

    const finalizeBooking = (utr) => {
        const id = `${currentService.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        const newBooking = {
            id, type: currentService, utr,
            name: currentService === 'turf' ? document.getElementById('turf-name').value : document.getElementById('swim-name').value,
            whatsapp: currentService === 'turf' ? document.getElementById('turf-whatsapp').value : document.getElementById('swim-whatsapp').value,
            date: currentService === 'turf' ? turfDateInput.value : swimDateInput.value,
            time: selectedSlot.time,
            price: confirmModal.dataset.finalPrice,
            timestamp: new Date().toISOString()
        };
        currentBookings.push(newBooking);
        localStorage.setItem('turf_bookings', JSON.stringify(currentBookings));
        qrModal.classList.remove('active');
        document.getElementById('final-id').textContent = id;
        ticketModal.classList.add('active');
    };

    verifyBtn.onclick = () => finalizeBooking(utrInput.value);
    document.getElementById('venue-btn').onclick = () => finalizeBooking('Pay at Venue');

    // RE-INIT ON DATE CHANGE
    [turfDateInput, swimDateInput].forEach(inp => {
        inp.onchange = () => {
            selectedSlot = null;
            initBookingPage();
        };
    });

    // HIDDEN ADMIN ACCESS (Click logo 5 times in 3 seconds)
    let clicks = 0;
    window.logoClick = () => {
        clicks++;
        if (clicks >= 5) {
            window.location.href = 'admin.html';
        }
        setTimeout(() => { clicks = 0; }, 3000);
    };
});
