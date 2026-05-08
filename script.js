document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('booking-form');
    const dateInput = document.getElementById('date');
    const displayDate = document.getElementById('display-date');
    const morningSlotsContainer = document.getElementById('morning-slots');
    const afternoonSlotsContainer = document.getElementById('afternoon-slots');
    const eveningSlotsContainer = document.getElementById('evening-slots');
    const nightSlotsContainer = document.getElementById('night-slots');
    
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
    const ticketDate = document.getElementById('ticket-date');
    const ticketTime = document.getElementById('ticket-time');
    const ticketPrice = document.getElementById('ticket-price');
    
    // State
    let selectedSlot = null;
    let selectedPrice = null;
    
    // Initialize date to today
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    dateInput.value = formattedDate;
    dateInput.min = formattedDate;
    updateDisplayDate(today);

    // Slot Data Generation
    const morningSlots = [
        { time: '11:30 AM - 12:30 PM', price: '₹500', isBooked: false }
    ];

    const afternoonSlots = [
        { time: '12:00 PM - 01:00 PM', price: '₹500', isBooked: false },
        { time: '12:30 PM - 01:30 PM', price: '₹500', isBooked: false },
        { time: '01:00 PM - 02:00 PM', price: '₹500', isBooked: false },
        { time: '01:30 PM - 02:30 PM', price: '₹500', isBooked: false },
        { time: '02:00 PM - 03:00 PM', price: '₹500', isBooked: false },
        { time: '02:30 PM - 03:30 PM', price: '₹500', isBooked: false },
        { time: '03:00 PM - 04:00 PM', price: '₹500', isBooked: false },
        { time: '03:30 PM - 04:30 PM', price: '₹500', isBooked: false },
        { time: '04:00 PM - 05:00 PM', price: '₹500', isBooked: false },
        { time: '04:30 PM - 05:30 PM', price: '₹600', isBooked: false }
    ];

    const eveningSlots = [
        { time: '05:00 PM - 06:00 PM', price: '₹700', isBooked: false },
        { time: '05:30 PM - 06:30 PM', price: '₹700', isBooked: false },
        { time: '06:00 PM - 07:00 PM', price: '₹700', isBooked: false },
        { time: '06:30 PM - 07:30 PM', price: '₹700', isBooked: false },
        { time: '07:00 PM - 08:00 PM', price: '₹700', isBooked: false },
        { time: '07:30 PM - 08:30 PM', price: '₹700', isBooked: false },
        { time: '08:00 PM - 09:00 PM', price: '₹700', isBooked: false },
        { time: '08:30 PM - 09:30 PM', price: '₹700', isBooked: false }
    ];

    const nightSlots = [
        { time: '09:00 PM - 10:00 PM', price: '₹700', isBooked: false },
        { time: '09:30 PM - 10:30 PM', price: '₹700', isBooked: false },
        { time: '10:00 PM - 11:00 PM', price: '₹700', isBooked: false },
        { time: '10:30 PM - 11:30 PM', price: '₹700', isBooked: false },
        { time: '11:00 PM - 12:00 AM', price: '₹700', isBooked: false },
        { time: '11:30 PM - 12:30 AM', price: '₹700', isBooked: false }
    ];

    // Render Slots
    function renderSlots(slots, container) {
        container.innerHTML = '';
        slots.forEach(slot => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `slot-btn ${slot.isBooked ? 'booked' : ''}`;
            if (slot.isBooked) {
                btn.disabled = true;
            }
            
            btn.innerHTML = `
                <span class="slot-time">${slot.time}</span>
                <span class="slot-price">${slot.isBooked ? 'Booked' : slot.price}</span>
            `;
            
            if (!slot.isBooked) {
                btn.addEventListener('click', () => selectSlot(btn, slot));
            }
            
            container.appendChild(btn);
        });
    }

    function initSlots() {
        renderSlots(morningSlots, morningSlotsContainer);
        renderSlots(afternoonSlots, afternoonSlotsContainer);
        renderSlots(eveningSlots, eveningSlotsContainer);
        renderSlots(nightSlots, nightSlotsContainer);
    }

    // Slot Selection
    function selectSlot(btnElement, slotData) {
        // Remove previous selection
        document.querySelectorAll('.slot-btn').forEach(btn => btn.classList.remove('selected'));
        
        // Add to new selection
        btnElement.classList.add('selected');
        selectedSlot = slotData.time;
        selectedPrice = slotData.price;
        
        updateButtonState();
    }

    // Update UI based on state
    function updateButtonState() {
        const isValid = selectedSlot !== null && form.checkValidity();
        
        // Enable/Disable buttons
        btnDesktop.disabled = !selectedSlot;
        btnMobile.disabled = !selectedSlot;
        
        const subtitleText = selectedSlot 
            ? `${selectedSlot} • ${selectedPrice}` 
            : 'Select a time slot first';
            
        // Update subtitle text
        btnDesktop.querySelector('.btn-subtitle').textContent = subtitleText;
        mobileSelectedInfo.textContent = subtitleText;
        
        // Add pulse animation to button if form is partially filled but no slot
        if (!selectedSlot) {
            btnDesktop.classList.remove('ready');
            btnMobile.classList.remove('ready');
        } else {
            btnDesktop.classList.add('ready');
            btnMobile.classList.add('ready');
        }
    }

    // Date changes
    dateInput.addEventListener('change', (e) => {
        const dateObj = new Date(e.target.value);
        updateDisplayDate(dateObj);
        selectedSlot = null;
        selectedPrice = null;
        updateButtonState();
        
        checkAndInitSlots(e.target.value);
    });

    function checkAndInitSlots(dateStr) {
        const existingBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        const bookedTimes = existingBookings
            .filter(b => b.date === dateStr && b.status !== 'cancelled')
            .map(b => b.time);
            
        [...morningSlots, ...afternoonSlots, ...eveningSlots, ...nightSlots].forEach(slot => {
            slot.isBooked = bookedTimes.includes(slot.time);
        });
        
        initSlots();
    }

    function updateDisplayDate(dateObj) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        let dateString = dateObj.toLocaleDateString('en-US', options);
        
        // Check if today
        const todayStr = new Date().toDateString();
        if (dateObj.toDateString() === todayStr) {
            dateString = 'Today, ' + dateString;
        }
        
        displayDate.textContent = dateString;
    }

    // Form inputs validation event
    form.addEventListener('input', updateButtonState);

    // Submission
    function handleBooking() {
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        
        if (!selectedSlot) return;

        // Populate Ticket
        ticketName.textContent = document.getElementById('name').value;
        const dateObj = new Date(dateInput.value);
        ticketDate.textContent = dateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        ticketTime.textContent = selectedSlot;
        ticketPrice.textContent = selectedPrice;

        // Show Modal
        modalOverlay.classList.add('active');
    }

    btnDesktop.addEventListener('click', (e) => {
        e.preventDefault();
        handleBooking();
    });

    btnMobile.addEventListener('click', (e) => {
        e.preventDefault();
        handleBooking();
    });

    // Modal actions
    function closeAndResetModal() {
        modalOverlay.classList.remove('active');
        // Reset form
        form.reset();
        dateInput.value = formattedDate;
        updateDisplayDate(today);
        selectedSlot = null;
        selectedPrice = null;
        checkAndInitSlots(formattedDate);
        updateButtonState();
    }

    cancelBookingBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
    });

    confirmBookingBtn.addEventListener('click', () => {
        modalOverlay.classList.remove('active');
        
        qrPrice.textContent = selectedPrice;
        
        // Generate real UPI link QR code for the specific price
        const amountStr = selectedPrice.replace(/[^0-9]/g, '');
        const upiString = `upi://pay?pa=dummy@upi&pn=K6%20Turf&am=${amountStr}&cu=INR`;
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiString)}`;
        
        // Reset UTR
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
        modalOverlay.classList.add('active'); // Go back to confirm
    });

    verifyPaymentBtn.addEventListener('click', () => {
        const utrNumber = utrInput.value;
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingId = `TURF-${randomStr}`;
        
        const newBooking = {
            id: bookingId,
            type: 'turf',
            name: document.getElementById('name').value,
            whatsapp: document.getElementById('whatsapp').value,
            date: dateInput.value,
            time: selectedSlot,
            price: selectedPrice,
            utr: utrNumber,
            timestamp: new Date().toISOString()
        };
        const existingBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        existingBookings.push(newBooking);
        localStorage.setItem('turf_bookings', JSON.stringify(existingBookings));
        
        qrModal.classList.remove('active');
        
        finalBookingId.textContent = bookingId;
        finalTicketModal.classList.add('active');
    });

    payAtVenueBtn.addEventListener('click', () => {
        const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
        const bookingId = `TURF-${randomStr}`;
        
        const newBooking = {
            id: bookingId,
            type: 'turf',
            name: document.getElementById('name').value,
            whatsapp: document.getElementById('whatsapp').value,
            date: dateInput.value,
            time: selectedSlot,
            price: selectedPrice,
            utr: 'Pay at Venue',
            timestamp: new Date().toISOString()
        };
        const existingBookings = JSON.parse(localStorage.getItem('turf_bookings') || '[]');
        existingBookings.push(newBooking);
        localStorage.setItem('turf_bookings', JSON.stringify(existingBookings));
        
        qrModal.classList.remove('active');
        
        finalBookingId.textContent = bookingId;
        finalTicketModal.classList.add('active');
    });

    closeTicketBtn.addEventListener('click', () => {
        finalTicketModal.classList.remove('active');
        closeAndResetModal();
    });

    // Close on overlay click
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            modalOverlay.classList.remove('active');
        }
    });
    
    finalTicketModal.addEventListener('click', (e) => {
        if (e.target === finalTicketModal) {
            finalTicketModal.classList.remove('active');
            closeAndResetModal();
        }
    });

    // Initialize
    checkAndInitSlots(formattedDate);
});
