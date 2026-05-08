document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('booking-form');
    const dateInput = document.getElementById('date');
    const peopleInput = document.getElementById('people-count');
    const displayDate = document.getElementById('display-date');
    const morningSlotsContainer = document.getElementById('morning-slots');
    const afternoonSlotsContainer = document.getElementById('afternoon-slots');
    const eveningSlotsContainer = document.getElementById('evening-slots');
    
    const btnDesktop = document.getElementById('book-btn-desktop');
    const btnMobile = document.getElementById('book-btn-mobile');
    const mobileSelectedInfo = document.getElementById('mobile-selected-info');
    
    const modalOverlay = document.getElementById('success-modal');
    const cancelBookingBtn = document.getElementById('cancel-booking');
    const confirmBookingBtn = document.getElementById('confirm-booking');
    
    const qrModal = document.getElementById('qr-modal');
    const cancelQrBtn = document.getElementById('cancel-qr');
    const verifyPaymentBtn = document.getElementById('verify-payment');
    const payAtVenueBtn = document.getElementById('pay-at-venue');
    const utrInput = document.getElementById('utr-input');
    const qrPrice = document.getElementById('qr-price');
    const qrImage = document.getElementById('qr-image');
    
    const finalTicketModal = document.getElementById('final-ticket-modal');
    const finalBookingId = document.getElementById('final-booking-id');
    const closeTicketBtn = document.getElementById('close-ticket');
    
    const ticketName = document.getElementById('ticket-name');
    const ticketPeople = document.getElementById('ticket-people');
    const ticketDate = document.getElementById('ticket-date');
    const ticketTime = document.getElementById('ticket-time');
    const ticketPrice = document.getElementById('ticket-price');
    
    // State
    let selectedSlot = null;
    let basePricePerPerson = 100;
    
    // Initialize date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    dateInput.min = formattedDate;
    updateDisplayDate(today);

    // Swimming Sessions (Simpler than Turf)
    const morningSessions = [
        { time: '07:00 AM - 08:00 AM', isBooked: false },
        { time: '08:00 AM - 09:00 AM', isBooked: false },
        { time: '09:00 AM - 10:00 AM', isBooked: false },
        { time: '10:00 AM - 11:00 AM', isBooked: false }
    ];

    const afternoonSessions = [
        { time: '03:00 PM - 04:00 PM', isBooked: false },
        { time: '04:00 PM - 05:00 PM', isBooked: false }
    ];

    const eveningSessions = [
        { time: '05:00 PM - 06:00 PM', isBooked: false },
        { time: '06:00 PM - 07:00 PM', isBooked: false },
        { time: '07:00 PM - 08:00 PM', isBooked: false },
        { time: '08:00 PM - 09:00 PM', isBooked: false }
    ];

    function calculateTotalPrice() {
        const count = parseInt(peopleInput.value) || 1;
        return count * basePricePerPerson;
    }

    function renderSlots(slots, container) {
        container.innerHTML = '';
        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `slot-btn ${slot.isBooked ? 'booked' : ''}`;
            if (slot.isBooked) btn.disabled = true;
            
            btn.innerHTML = `
                <span class="slot-time">${slot.time}</span>
                <span class="slot-price">${slot.isBooked ? 'Full' : '₹100/p'}</span>
            `;
            
            if (!slot.isBooked) {
                btn.addEventListener('click', () => selectSlot(btn, slot));
            }
            container.appendChild(btn);
        });
    }

    function initSlots() {
        renderSlots(morningSessions, morningSlotsContainer);
        renderSlots(afternoonSessions, afternoonSlotsContainer);
        renderSlots(eveningSessions, eveningSlotsContainer);
    }

    function selectSlot(btnElement, slotData) {
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('selected'));
        btnElement.classList.add('selected');
        selectedSlot = slotData.time;
        updateButtonState();
    }

    function updateButtonState() {
        const totalPrice = calculateTotalPrice();
        btnDesktop.disabled = !selectedSlot;
        btnMobile.disabled = !selectedSlot;
        
        const subtitleText = selectedSlot 
            ? `${selectedSlot} • Total: ₹${totalPrice}` 
            : 'Select a session first';
            
        btnDesktop.querySelector('.btn-subtitle').textContent = subtitleText;
        mobileSelectedInfo.textContent = subtitleText;
    }

    dateInput.addEventListener('change', (e) => {
        updateDisplayDate(new Date(e.target.value));
        selectedSlot = null;
        updateButtonState();
        checkAndInitSlots(e.target.value);
    });

    peopleInput.addEventListener('input', updateButtonState);

    function checkAndInitSlots(dateStr) {
        const existingBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        // We filter for swimming type and session time
        const bookedTimes = existingBookings
            .filter(b => b.date === dateStr && b.status !== 'cancelled' && b.type === 'swimming')
            .map(b => b.time);
            
        [...morningSessions, ...afternoonSessions, ...eveningSessions].forEach(slot => {
            slot.isBooked = bookedTimes.includes(slot.time);
        });
        initSlots();
    }

    function updateDisplayDate(dateObj) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        let dateString = dateObj.toLocaleDateString('en-US', options);
        if (dateObj.toDateString() === new Date().toDateString()) dateString = 'Today, ' + dateString;
        displayDate.textContent = dateString;
    }

    form.addEventListener('input', updateButtonState);

    function handleBooking() {
        if (!form.checkValidity()) { form.reportValidity(); return; }
        if (!selectedSlot) return;

        const totalPrice = calculateTotalPrice();
        ticketName.textContent = document.getElementById('name').value;
        ticketPeople.textContent = peopleInput.value;
        ticketDate.textContent = new Date(dateInput.value).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        ticketTime.textContent = selectedSlot;
        ticketPrice.textContent = `₹${totalPrice}`;

        modalOverlay.classList.add('active');
    }

    btnDesktop.addEventListener('click', (e) => { e.preventDefault(); handleBooking(); });
    btnMobile.addEventListener('click', (e) => { e.preventDefault(); handleBooking(); });

    cancelBookingBtn.addEventListener('click', () => modalOverlay.classList.remove('active'));

    confirmBookingBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        const totalPrice = calculateTotalPrice();
        qrPrice.textContent = `₹${totalPrice}`;
        const upiString = `upi://pay?pa=dummy@upi&pn=K6%20Swimming&am=${totalPrice}&cu=INR`;
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
        utrInput.value = '';
        verifyPaymentBtn.disabled = true;
        qrModal.classList.add('active');
    });

    utrInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        verifyPaymentBtn.disabled = e.target.value.length !== 12;
    });

    cancelQrBtn.addEventListener('click', () => {
        qrModal.classList.remove('active');
        modalOverlay.classList.add('active');
    });

    function saveBooking(utrValue) {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingId = `SWIM-${randomStr}`;
        const totalPrice = calculateTotalPrice();
        
        const newBooking = {
            id: bookingId,
            type: 'swimming',
            name: document.getElementById('name').value,
            whatsapp: document.getElementById('whatsapp').value,
            people: peopleInput.value,
            date: dateInput.value,
            time: selectedSlot,
            price: `₹${totalPrice}`,
            utr: utrValue,
            timestamp: new Date().toISOString()
        };
        
        const existingBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        existingBookings.push(newBooking);
        localStorage.setItem('turf_bookings', JSON.stringify(existingBookings));
        
        qrModal.classList.remove('active');
        finalBookingId.textContent = bookingId;
        finalTicketModal.classList.add('active');
    }

    verifyPaymentBtn.addEventListener('click', () => saveBooking(utrInput.value));
    payAtVenueBtn.addEventListener('click', () => saveBooking('Pay at Venue'));

    closeTicketBtn.addEventListener('click', () => {
        finalTicketModal.classList.remove('active');
        form.reset();
        dateInput.value = formattedDate;
        peopleInput.value = "1";
        selectedSlot = null;
        checkAndInitSlots(formattedDate);
        updateButtonState();
    });

    checkAndInitSlots(formattedDate);
});
