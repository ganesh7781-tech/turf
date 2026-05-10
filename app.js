import { db, collection, addDoc, onSnapshot, query, where, orderBy, getDocs } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    // STATE
    let currentService = 'turf'; // 'turf' or 'swimming'
    let selectedSlot = null;
    let selectedSlotTimes = []; // Added for multiple slot selection
    let allBookings = [];
    
    // FETCH DYNAMIC SLOTS
    const DEFAULT_TSLOTS = ['07:00 AM - 09:00 AM', '09:00 AM - 11:00 AM', '11:00 AM - 01:00 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM', '12:00 AM - 01:00 AM'];
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
        
        let targetView = viewName;
        if (viewName.startsWith('turf')) targetView = 'turf';
        
        if (views[targetView]) views[targetView].classList.add('active');
        currentService = viewName;
        
        // Reset selection when switching views
        resetSelection();

        // Update header text
        if (viewName === 'turf1') {
            document.querySelector('#turf-view h1').textContent = 'K6 Turf 1';
            document.body.className = 'turf-theme';
        } else if (viewName === 'turf2') {
            document.querySelector('#turf-view h1').textContent = 'K6 Turf 2';
            document.body.className = 'turf-theme';
        }
        
        if (targetView === 'turf' || viewName === 'swimming') {
            initBookingPage();
        }
    };

    function resetSelection() {
        selectedSlot = null;
        selectedSlotTimes = [];
        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
        updateButtonStates();
    }

    window.closeModal = (id) => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    };

    // INITIALIZE DATE
    const today = new Date().toISOString().split('T')[0];
    if (turfDateInput) { turfDateInput.value = today; turfDateInput.min = today; }
    if (swimDateInput) { swimDateInput.value = today; swimDateInput.min = today; }

    function getCategory(time) {
        const startPart = time.split(' - ')[0];
        if (startPart.includes('AM')) {
            // 12:00 AM is midnight, should be categorized as night
            if (startPart.startsWith('12:00')) return 'night';
            return 'morning';
        }
        // Afternoon: 12 PM to 4:59 PM
        if (startPart.includes('12:00 PM') || startPart.includes('01:00 PM') || startPart.includes('02:00 PM') || startPart.includes('03:00 PM') || startPart.includes('04:00 PM')) return 'afternoon';
        // Evening: 5 PM to 8:59 PM
        if (startPart.includes('05:00 PM') || startPart.includes('06:00 PM') || startPart.includes('07:00 PM') || startPart.includes('08:00 PM')) return 'evening';
        return 'night';
    }

    function timeToMinutes(timeStr) {
        if (!timeStr) return 0;
        let [time, modifier] = timeStr.trim().split(' ');
        let [hours, minutes] = time.split(':').map(Number);
        if (hours === 12) {
            hours = modifier === 'AM' ? 0 : 12;
        } else if (modifier === 'PM') {
            hours += 12;
        }
        return hours * 60 + (minutes || 0);
    }

    function isOverlapping(slotRange, bookingTime, bookingDuration) {
        let slotStart = timeToMinutes(slotRange.split(' - ')[0]);
        let slotEnd = timeToMinutes(slotRange.split(' - ')[1]);
        if (slotEnd <= slotStart) slotEnd += 1440; // Handle midnight transition
        
        let bookingStart = timeToMinutes(bookingTime.split(' - ')[0]);
        let bookingEnd = bookingStart + (parseFloat(bookingDuration) * 60);
        
        // Overlap occurs if:
        // (slotStart < bookingEnd) AND (slotEnd > bookingStart)
        return slotStart < bookingEnd && slotEnd > bookingStart;
    }

    function initBookingPage() {
        const date = currentService.startsWith('turf') ? turfDateInput.value : swimDateInput.value;
        const rawSlots = currentService.startsWith('turf') ? (JSON.parse(localStorage.getItem('k6_tslots')) || DEFAULT_TSLOTS) : (JSON.parse(localStorage.getItem('k6_sslots')) || DEFAULT_SSLOTS);
        const containers = currentService.startsWith('turf') ? turfSlots : swimSlots;
        
        const bookedEntries = allBookings.filter(b => b.date === date && b.type === currentService && b.status !== 'cancelled');
        const bookedTimes = bookedEntries.map(b => b.time);
        const isFullDay = bookedTimes.includes('Full Day');

        // Clear
        Object.values(containers).forEach(c => { if(c) c.innerHTML = ''; });

        rawSlots.forEach(time => {
            const isBooked = bookedEntries.some(b => {
                if (b.time === 'Full Day') return true;
                return isOverlapping(time, b.time, b.duration || 1);
            });

            const btn = document.createElement('button');
            btn.className = `slot-btn ${isBooked ? 'booked' : ''}`;
            if (isBooked) btn.disabled = true;
            
            let displayPrice = currentService.startsWith('turf') ? getTurfPrice(time) : '₹100/p';
            if (currentService.startsWith('turf')) {
                const startMin = timeToMinutes(time.split(' - ')[0]);
                let endMin = timeToMinutes(time.split(' - ')[1]);
                if (endMin <= startMin) endMin += 1440;
                const slotDur = (endMin - startMin) / 60;
                const hourlyRate = parseInt(displayPrice.replace('₹', ''));
                displayPrice = `₹${hourlyRate * slotDur}`;
            }

            btn.innerHTML = `<span class="slot-time">${time}</span><span class="slot-price">${isBooked ? 'Full' : displayPrice}</span>`;
            
            if (!isBooked) {
                btn.onclick = () => {
                    const price = getTurfPrice(time); // Keep hourly rate for selection logic
                    if (currentService.startsWith('turf')) {
                        // Multi-slot logic for turf
                        if (selectedSlotTimes.includes(time)) {
                            selectedSlotTimes = selectedSlotTimes.filter(t => t !== time);
                        } else {
                            selectedSlotTimes.push(time);
                        }
                        
                        if (selectedSlotTimes.length > 0) {
                            // Sort selected slots by start time
                            selectedSlotTimes.sort((a, b) => timeToMinutes(a.split(' - ')[0]) - timeToMinutes(b.split(' - ')[0]));
                            
                            const firstSlot = selectedSlotTimes[0];
                            const lastSlot = selectedSlotTimes[selectedSlotTimes.length - 1];
                            
                            const startMin = timeToMinutes(firstSlot.split(' - ')[0]);
                            let endMin = timeToMinutes(lastSlot.split(' - ')[1]);
                            if (endMin <= startMin) endMin += 1440;
                            
                            const totalDuration = (endMin - startMin) / 60;
                            
                            // Update selectedSlot to the first one but with recalculated duration
                            selectedSlot = { time: firstSlot, price: getTurfPrice(firstSlot) };
                            
                            // Update duration dropdown automatically
                            updateDurationDropdown(totalDuration);
                        } else {
                            selectedSlot = null;
                        }
                    } else {
                        // Swimming: Single selection logic
                        document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
                        btn.classList.add('selected');
                        selectedSlot = { time: time, price: price };
                        selectedSlotTimes = [time];
                    }
                    
                    updateSlotHighlights();
                    updateButtonStates();
                };
            }
            const cat = getCategory(time);
            if (containers[cat]) containers[cat].appendChild(btn);
        });
        updateSlotHighlights();
        updateButtonStates();
    }

    function updateDurationDropdown(val) {
        const sel = document.getElementById('turf-duration');
        if (!sel) return;
        let found = false;
        for (let i = 0; i < sel.options.length; i++) {
            if (parseFloat(sel.options[i].value) === val) {
                sel.value = val;
                found = true;
                break;
            }
        }
        if (!found) {
            const opt = new Option(`${val} Hour${val > 1 ? 's' : ''}`, val);
            sel.add(opt);
            sel.value = val;
        }
    }

    function updateSlotHighlights() {
        if (!currentService.startsWith('turf')) return;
        
        document.querySelectorAll('.slot-btn').forEach(btn => {
            const btnTimeSpan = btn.querySelector('.slot-time');
            if (!btnTimeSpan) return;
            
            const btnTimeStr = btnTimeSpan.textContent;
            
            // Only highlight slots that are explicitly in the selected list
            if (selectedSlotTimes.includes(btnTimeStr)) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    function syncSelectionFromDuration() {
        if (!selectedSlot || !currentService.startsWith('turf')) return;
        const duration = parseFloat(document.getElementById('turf-duration').value);
        const startTime = timeToMinutes(selectedSlot.time.split(' - ')[0]);
        const endTime = startTime + (duration * 60);
        
        selectedSlotTimes = [];
        const rawSlots = JSON.parse(localStorage.getItem('k6_tslots')) || DEFAULT_TSLOTS;
        rawSlots.forEach(time => {
            const slotStart = timeToMinutes(time.split(' - ')[0]);
            // Add all slots that fall within this duration
            if (slotStart >= startTime && slotStart < endTime) {
                selectedSlotTimes.push(time);
            }
        });
    }

    function getTurfPrice(time) {
        let isNight = false;
        const startPart = time.split(' - ')[0];
        const minutes = timeToMinutes(startPart);
        
        // Night starts from 6:00 PM (1080 minutes)
        // We also check for 12:00 AM as it's night
        if (minutes >= 1080 || startPart.includes('12:00 AM') || startPart.includes('01:00 AM') || startPart.includes('02:00 AM')) {
            isNight = true;
        }

        if (currentService === 'turf1') {
            return isNight ? '₹650' : '₹450';
        } else if (currentService === 'turf2') {
            return isNight ? '₹700' : '₹500';
        }
        return '₹500';
    }

    function updateButtonStates() {
        const btnDesktop = currentService.startsWith('turf') ? document.getElementById('turf-book-btn-desktop') : document.getElementById('swim-book-btn-desktop');
        const btnMobile = currentService.startsWith('turf') ? document.getElementById('turf-book-btn-mobile') : document.getElementById('swim-book-btn-mobile');
        
        let isDisabled = !selectedSlot;
        let overlapError = false;

        if (selectedSlot && currentService.startsWith('turf')) {
            const date = turfDateInput.value;
            const duration = parseFloat(document.getElementById('turf-duration').value);
            const activeBookings = allBookings.filter(b => b.date === date && b.type === currentService && b.status !== 'cancelled');
            
            overlapError = activeBookings.some(b => {
                if (b.time === 'Full Day') return true;
                // isOverlapping(slot, existingBooking, existingDuration)
                // We check if our selected start slot overlaps with an existing booking
                // AND if any existing booking starts within our requested duration
                return isOverlapping(selectedSlot.time, b.time, b.duration || 1) || 
                       isOverlapping(b.time, selectedSlot.time, duration);
            });
            if (overlapError) isDisabled = true;
        }

        if (btnDesktop) btnDesktop.disabled = isDisabled;
        if (btnMobile) {
            btnMobile.disabled = isDisabled;
            const subtitle = btnMobile.querySelector('.btn-subtitle');
            if (subtitle) {
                if (overlapError) {
                    subtitle.textContent = '❌ Time range overlaps existing booking';
                    subtitle.style.color = '#ef4444';
                } else if (selectedSlot) {
                    subtitle.style.color = '';
                    if (currentService.startsWith('turf')) {
                        const duration = parseFloat(document.getElementById('turf-duration').value);
                        const basePrice = parseInt(selectedSlot.price.replace('₹', ''));
                        subtitle.textContent = `Slot: ${selectedSlot.time} (${duration}h) - ₹${basePrice * duration}`;
                    } else {
                        const people = parseInt(document.getElementById('swim-people').value);
                        subtitle.textContent = `Slot: ${selectedSlot.time} (${people} People) - ₹${people * 100}`;
                    }
                } else {
                    subtitle.style.color = '';
                    subtitle.textContent = 'Select a slot to proceed';
                }
            }
        }
    }

    // FORM SUBMISSIONS
    [turfForm, swimForm].forEach(f => {
        if (f) {
            f.onsubmit = (e) => {
                e.preventDefault();
                if (!selectedSlot) return;
                
                const name = currentService.startsWith('turf') ? document.getElementById('turf-name').value : document.getElementById('swim-name').value;
                const phone = currentService.startsWith('turf') ? document.getElementById('turf-whatsapp').value : document.getElementById('swim-whatsapp').value;
                const duration = currentService.startsWith('turf') ? parseFloat(document.getElementById('turf-duration').value) : 1;
                
                const extra = currentService === 'swimming' ? `<div class="confirm-row"><i class="ph-fill ph-users"></i><span><strong>People:</strong> ${swimPeopleInput.value}</span></div>` : '';
                const playtimeRow = currentService.startsWith('turf') ? `<div class="confirm-row"><i class="ph-fill ph-hourglass"></i><span><strong>Playtime:</strong> ${duration} Hour(s)</span></div>` : '';
                
                const basePrice = parseInt(selectedSlot.price.replace('₹', ''));
                const priceVal = currentService.startsWith('turf') ? `₹${basePrice * duration}` : `₹${parseInt(swimPeopleInput.value) * 100}`;

                const fullTimeRange = currentService.startsWith('turf') && selectedSlotTimes.length > 0 
                    ? `${selectedSlotTimes[0].split(' - ')[0]} - ${selectedSlotTimes[selectedSlotTimes.length - 1].split(' - ')[1]}`
                    : selectedSlot.time;

                document.getElementById('confirm-details').innerHTML = `
                    <div class="confirm-row"><i class="ph-fill ph-user"></i><span><strong>Name:</strong> ${name}</span></div>
                    <div class="confirm-row"><i class="ph-fill ph-whatsapp-logo"></i><span><strong>Phone:</strong> ${phone}</span></div>
                    ${extra}
                    ${playtimeRow}
                    <div class="confirm-row"><i class="ph-fill ph-calendar"></i><span><strong>Date:</strong> ${currentService.startsWith('turf') ? turfDateInput.value : swimDateInput.value}</span></div>
                    <div class="confirm-row"><i class="ph-fill ph-clock"></i><span><strong>Time:</strong> ${fullTimeRange}</span></div>
                    <div class="confirm-row"><i class="ph-fill ph-tag"></i><span><strong>Total:</strong> <strong class="price-highlight">${priceVal}</strong></span></div>
                `;
                confirmModal.dataset.finalTimeRange = fullTimeRange;
                confirmModal.dataset.finalPrice = priceVal;
                confirmModal.dataset.duration = duration;
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
        const date = currentService.startsWith('turf') ? turfDateInput.value : swimDateInput.value;
        
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
            
            const alreadyBooked = activeBookings.some(b => {
                if (b.time === 'Full Day') return true;
                const requestedDuration = currentService.startsWith('turf') ? parseFloat(document.getElementById('turf-duration').value) : 1;
                return isOverlapping(selectedSlot.time, b.time, b.duration || 1) || 
                       isOverlapping(b.time, selectedSlot.time, requestedDuration);
            });

            if (alreadyBooked) {
                alert("Sorry, your selected time range overlaps with an existing booking. Please select another slot.");
                location.reload();
                return;
            }

            const id = `${currentService.toUpperCase()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
            const newBooking = {
                bookingId: id, 
                type: currentService, 
                utr,
                name: currentService.startsWith('turf') ? document.getElementById('turf-name').value : document.getElementById('swim-name').value,
                whatsapp: currentService.startsWith('turf') ? document.getElementById('turf-whatsapp').value : document.getElementById('swim-whatsapp').value,
                date: date,
                time: confirmModal.dataset.finalTimeRange || selectedSlot.time,
                duration: confirmModal.dataset.duration || 1,
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

    // RE-INIT ON DATE/DURATION/PEOPLE CHANGE
    [turfDateInput, swimDateInput, document.getElementById('turf-duration'), document.getElementById('swim-people')].forEach(inp => {
        if (inp) {
            const eventType = inp.tagName === 'INPUT' && inp.type === 'number' ? 'input' : 'change';
            inp.addEventListener(eventType, () => {
                if (inp.id === 'turf-date' || inp.id === 'swim-date') {
                    resetSelection();
                    initBookingPage();
                } else if (inp.id === 'turf-duration') {
                    syncSelectionFromDuration();
                    updateSlotHighlights();
                    updateButtonStates();
                } else {
                    updateButtonStates();
                }
            });
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

