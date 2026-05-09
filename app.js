import { db, collection, addDoc, onSnapshot, query, where, orderBy, getDocs } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // STATE
    let currentService = 'turf'; // 'turf' or 'swimming'
    let selectedSlot = null;
    let allBookings = [];
    
    // FETCH DYNAMIC SLOTS
    const DEFAULT_TSLOTS = ['11:30 AM - 12:30 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM'];
    const DEFAULT_SSLOTS = ['07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM'];
    
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

    // INITIALIZE FIREBASE LISTENER
    const bookingsRef = collection(db, 'bookings');
    onSnapshot(bookingsRef, (snapshot) => {
        allBookings = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (currentService === 'turf' || currentService === 'swimming') {
            initBookingPage();
        }
    });

    // VIEW SWITCHER
    window.showView = (viewName) => {
        Object.values(views).forEach(v => v.classList.remove('active'));
        if (views[viewName]) views[viewName].classList.add('active');
        currentService = viewName;
        if (viewName === 'turf' || viewName === 'swimming') {
            initBookingPage();
        }
    };

    window.closeModal = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    };

    // INITIALIZE DATE
    const today = new Date().toISOString().split('T')[0];
    if (turfDateInput) { turfDateInput.value = today; turfDateInput.min = today; }
    if (swimDateInput) { swimDateInput.value = today; swimDateInput.min = today; }

    function getCategory(time) {
        if (time.includes('AM')) return 'morning';
        if (time.includes('12:00 PM') || time.includes('01:00 PM') || time.includes('02:00 PM') || time.includes('03:00 PM') || time.includes('04:00 PM')) return 'afternoon';
        if (time.includes('05:00 PM') || time.includes('06:00 PM') || time.includes('07:00 PM') || time.includes('08:00 PM')) return 'evening';
        return 'night';
    }

    function initBookingPage() {
        const date = currentService === 'turf' ? turfDateInput.value : swimDateInput.value;
        const rawSlots = currentService === 'turf' ? (JSON.parse(localStorage.getItem('k6_tslots')) || DEFAULT_TSLOTS) : (JSON.parse(localStorage.getItem('k6_sslots')) || DEFAULT_SSLOTS);
        const containers = currentService === 'turf' ? turfSlots : swimSlots;
        
        const bookedEntries = allBookings.filter(b => b.date === date && b.type === currentService && b.status !== 'cancelled');
        const bookedTimes = bookedEntries.map(b => b.time);
        const isFullDay = bookedTimes.includes('Full Day');

        // Clear
        Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

        rawSlots.forEach(time => {
            const isBooked = bookedTimes.includes(time) || isFullDay;
            const btn = document.createElement('button');
            btn.className = `slot-btn ${isBooked ? 'booked' : ''}`;
            if (isBooked) btn.disabled = true;
            
            const price = currentService === 'turf' ? getTurfPrice(time) : '₹100/p';
            btn.innerHTML = `<span class="slot-time">${time}</span><span class="slot-price">${isBooked ? 'Full' : price}</span>`;
            
            if (!isBooked) {
                btn.onclick = () => {
                    document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                    selectedSlot = { time: time, price: price };
                    updateButtonStates();
                };
            }
            const cat = getCategory(time);
            if (containers[cat]) containers[cat].appendChild(btn);
        });
        updateButtonStates();
    }

    function getTurfPrice(time) {
        if (time.includes('04:30')) return '₹600';
        if (time.includes('05:') || time.includes('06:') || time.includes('07:') || time.includes('08:') || time.includes('09:') || time.includes('10:') || time.includes('11:')) return '₹700';
        return '₹500';
    }

    function updateButtonStates() {
        const btnDesktop = currentService === 'turf' ? document.getElementById('turf-book-btn-desktop') : document.getElementById('swim-book-btn-desktop');
        const btnMobile = currentService === 'turf' ? document.getElementById('turf-book-btn-mobile') : document.getElementById('swim-book-btn-mobile');
        
        const isDisabled = !selectedSlot;
        if (btnDesktop) btnDesktop.disabled = isDisabled;
        if (btnMobile) {
            btnMobile.disabled = isDisabled;
            const subtitle = btnMobile.querySelector('.btn-subtitle');
            if (subtitle) {
                subtitle.textContent = selectedSlot ? `Slot: ${selectedSlot.time}` : 'Select a slot to proceed';
            }
        }
    }

    // FORM SUBMISSIONS
    [turfForm, swimForm].forEach(f => {
        if (f) {
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
        }
    });

    const finalConfirmBtn = document.getElementById('final-confirm-btn');
    if (finalConfirmBtn) {
        finalConfirmBtn.onclick = () => {
            confirmModal.classList.remove('active');
            const price = confirmModal.dataset.finalPrice;
            document.getElementById('qr-price').textContent = price;
            const cleanPrice = price.replace(/[^0-9]/g, '');
            const upi = `upi://pay?pa=dummy@upi&pn=K6%20Turf&am=${cleanPrice}&cu=INR`;
            document.getElementById('qr-image').src = 'payment qr.jpeg';
            qrModal.classList.add('active');
        };
    }

    // PAYMENT VERIFICATION
    const utrInput = document.getElementById('utr-input');
    const verifyBtn = document.getElementById('verify-btn');
    if (utrInput) utrInput.oninput = () => verifyBtn.disabled = utrInput.value.length !== 12;

    const finalizeBooking = async (utr) => {
        if (!selectedSlot) return alert("Please select a slot first.");
        const date = currentService === 'turf' ? turfDateInput.value : swimDateInput.value;
        
        try {
            // SIMPLE QUERY (Avoids indexing errors)
            const q = query(collection(db, 'bookings'), 
                where('date', '==', date), 
                where('type', '==', currentService)
            );
            const snapshot = await getDocs(q);
            const latestBookings = snapshot.docs.map(d => d.data());
            
            // Filter non-cancelled bookings in memory
            const activeBookings = latestBookings.filter(b => b.status !== 'cancelled');
            
            const alreadyBooked = activeBookings.some(b => b.time === selectedSlot.time);
            const isFullDay = activeBookings.some(b => b.time === 'Full Day');

            if (alreadyBooked || isFullDay) {
                alert("Sorry, this slot was just booked by someone else. Please select another slot.");
                location.reload();
                return;
            }

            const id = `${currentService.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const newBooking = {
                bookingId: id, 
                type: currentService, 
                utr,
                name: currentService === 'turf' ? document.getElementById('turf-name').value : document.getElementById('swim-name').value,
                whatsapp: currentService === 'turf' ? document.getElementById('turf-whatsapp').value : document.getElementById('swim-whatsapp').value,
                date: date,
                time: selectedSlot.time,
                price: confirmModal.dataset.finalPrice,
                status: utr === 'Pay at Venue' ? 'confirmed' : 'pending',
                timestamp: new Date().toISOString(),
                source: 'Online',
                payMode: utr === 'Pay at Venue' ? 'Pending' : 'UPI'
            };
            
            await addDoc(collection(db, 'bookings'), newBooking);
            qrModal.classList.remove('active');
            document.getElementById('final-id').textContent = id;
            ticketModal.classList.add('active');
        } catch (error) {
            console.error("Booking Error: ", error);
            alert("Firebase Error: " + error.message);
        }
    };

    if (verifyBtn) verifyBtn.onclick = () => finalizeBooking(utrInput.value);
    const venueBtn = document.getElementById('venue-btn');
    if (venueBtn) venueBtn.onclick = () => finalizeBooking('Pay at Venue');

    // RE-INIT ON DATE CHANGE
    [turfDateInput, swimDateInput].forEach(inp => {
        if (inp) {
            inp.onchange = () => {
                selectedSlot = null;
                initBookingPage();
            };
        }
    });

    // HIDDEN ADMIN ACCESS
    let clicks = 0;
    window.logoClick = () => {
        clicks++;
        if (clicks >= 5) {
            window.location.href = 'admin.html';
        }
        setTimeout(() => { clicks = 0; }, 3000);
    };
});

