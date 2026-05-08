document.addEventListener('DOMContentLoaded', () => {
    const bookingsBody = document.getElementById('bookings-body');
    const emptyState = document.getElementById('empty-state');
    const tableElement = document.getElementById('bookings-table');
    const totalBookingsEl = document.getElementById('total-bookings');
    const totalRevenueEl = document.getElementById('total-revenue');
    const clearDataBtn = document.getElementById('clear-data');
    
    const filterFrom = document.getElementById('filter-from');
    const filterTo = document.getElementById('filter-to');
    const applyFilterBtn = document.getElementById('apply-filter');
    const resetFilterBtn = document.getElementById('reset-filter');
    const exportCsvBtn = document.getElementById('export-csv');
    const typeFilter = document.getElementById('type-filter');
    
    let currentFilteredBookings = [];

    const allSlots = [
        '11:30 AM - 12:30 PM', '12:00 PM - 01:00 PM', '12:30 PM - 01:30 PM', '01:00 PM - 02:00 PM', '01:30 PM - 02:30 PM', '02:00 PM - 03:00 PM', '02:30 PM - 03:30 PM', '03:00 PM - 04:00 PM', '03:30 PM - 04:30 PM', '04:00 PM - 05:00 PM', '04:30 PM - 05:30 PM', '05:00 PM - 06:00 PM', '05:30 PM - 06:30 PM', '06:00 PM - 07:00 PM', '06:30 PM - 07:30 PM', '07:00 PM - 08:00 PM', '07:30 PM - 08:30 PM', '08:00 PM - 09:00 PM', '08:30 PM - 09:30 PM', '09:00 PM - 10:00 PM', '09:30 PM - 10:30 PM', '10:00 PM - 11:00 PM', '10:30 PM - 11:30 PM', '11:00 PM - 12:00 AM', '11:30 PM - 12:30 AM'
    ];

    let editingId = null;

    function loadBookings(startDateStr = null, endDateStr = null) {
        const bookingsData = localStorage.getItem('turf_bookings');
        let bookings = bookingsData ? JSON.parse(bookingsData) : [];

        // Apply filters if provided
        if (startDateStr) {
            const startObj = new Date(startDateStr);
            startObj.setHours(0, 0, 0, 0);
            bookings = bookings.filter(b => {
                const bDate = new Date(b.date);
                bDate.setHours(0, 0, 0, 0);
                return bDate >= startObj;
            });
        }
        
        if (endDateStr) {
            const endObj = new Date(endDateStr);
            endObj.setHours(23, 59, 59, 999);
            bookings = bookings.filter(b => {
                const bDate = new Date(b.date);
                bDate.setHours(0, 0, 0, 0);
                return bDate <= endObj;
            });
        }

        if (typeFilter && typeFilter.value !== 'all') {
            bookings = bookings.filter(b => b.type === typeFilter.value);
        }

        // Save current filtered list for export
        currentFilteredBookings = [...bookings];

        // Reverse to show newest first
        bookings.reverse();

        if (bookings.length === 0) {
            tableElement.style.display = 'none';
            emptyState.style.display = 'block';
            totalBookingsEl.textContent = '0';
            totalRevenueEl.textContent = '₹0';
            return;
        }

        tableElement.style.display = 'table';
        emptyState.style.display = 'none';
        
        let revenue = 0;
        bookingsBody.innerHTML = '';

        bookings.forEach(booking => {
            // Calculate revenue
            if (booking.price && booking.status !== 'cancelled') {
                const amountStr = booking.price.replace(/[^0-9]/g, '');
                revenue += parseInt(amountStr) || 0;
            }

            const tr = document.createElement('tr');
            
            // Format date nicely
            const dateObj = new Date(booking.date);
            const dateFormatted = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            tr.innerHTML = `
                <td><strong>${booking.id || 'N/A'}</strong></td>
                <td>
                    <span style="display:inline-flex; align-items:center; gap:0.25rem; font-size:0.75rem; font-weight:700; text-transform:uppercase; color:${booking.type === 'swimming' ? '#0ea5e9' : '#10b981'};">
                        <i class="ph-fill ${booking.type === 'swimming' ? 'ph-waves' : 'ph-baseball'}"></i>
                        ${booking.type || 'Turf'}
                    </span>
                </td>
                <td>${booking.name || 'Unknown'}</td>
                <td>
                    <a href="https://wa.me/${booking.whatsapp.replace(/[^0-9]/g, '')}" target="_blank" style="color: var(--primary); text-decoration: none; font-weight: 500;">
                        ${booking.whatsapp || 'N/A'}
                    </a>
                </td>
                <td>${dateFormatted}</td>
                <td>
                    ${editingId === booking.id ? 
                        `<select id="edit-slot-${booking.id}" style="padding: 0.25rem; border: 1px solid var(--primary); border-radius: var(--radius-sm);">
                            ${allSlots.map(s => `<option value="${s}" ${s === booking.time ? 'selected' : ''}>${s}</option>`).join('')}
                         </select>` 
                        : (booking.time || 'N/A')}
                </td>
                <td><strong>${booking.price || '₹0'}</strong></td>
                <td>
                    <span class="badge" ${booking.status === 'cancelled' ? 'style="background-color:var(--danger);color:white;"' : 'style="background-color:#dcfce7;color:#166534;"'}>
                        ${booking.status === 'cancelled' ? '<i class="ph-fill ph-x-circle"></i> Cancelled' : '<i class="ph-fill ph-check-circle"></i> Confirmed'}
                    </span><br>
                    <div style="margin-top:0.25rem;">
                        ${booking.utr === 'Pay at Venue' ? 
                            '<span style="background:#fef3c7; color:#b45309; padding:0.15rem 0.4rem; border-radius:4px; font-size:0.7rem; font-weight:600; display:inline-flex; align-items:center; gap:0.2rem;"><i class="ph-fill ph-money"></i> Pay at Venue</span>' 
                            : `<small style="color:var(--text-muted);font-size:0.75rem; font-family: monospace;">UTR: ${booking.utr || 'N/A'}</small>`}
                    </div>
                </td>
                <td>
                    ${booking.status !== 'cancelled' ? 
                        (editingId === booking.id ? 
                            `<div style="display:flex;gap:0.5rem;">
                                <button onclick="saveBookingTime('${booking.id}')" class="btn-confirm" style="padding:0.35rem 0.75rem;font-size:0.75rem;width:auto;display:flex;align-items:center;gap:0.25rem;"><i class="ph ph-floppy-disk"></i> Save</button>
                                <button onclick="cancelEdit()" class="btn-cancel" style="padding:0.35rem 0.75rem;font-size:0.75rem;width:auto;display:flex;align-items:center;gap:0.25rem;"><i class="ph ph-x"></i> Cancel</button>
                            </div>` 
                        :
                            `<div style="display:flex;gap:0.5rem;">
                                <button onclick="startEdit('${booking.id}')" class="btn-secondary" style="padding:0.35rem 0.75rem;font-size:0.75rem;width:auto;display:flex;align-items:center;gap:0.25rem;"><i class="ph ph-pencil-simple"></i> Edit</button>
                                <button onclick="cancelBooking('${booking.id}')" class="btn-cancel" style="padding:0.35rem 0.75rem;font-size:0.75rem;width:auto;display:flex;align-items:center;gap:0.25rem;"><i class="ph ph-trash"></i> Cancel</button>
                            </div>`
                        )
                        : ''}
                </td>
            `;
            
            bookingsBody.appendChild(tr);
        });

        // Filter valid bookings for count
        const activeBookings = bookings.filter(b => b.status !== 'cancelled');
        totalBookingsEl.textContent = activeBookings.length;
        totalRevenueEl.textContent = `₹${revenue}`;
    }

    window.cancelBooking = function(id) {
        if (confirm("Are you sure you want to cancel booking " + id + "?")) {
            const bookingsData = localStorage.getItem('turf_bookings');
            let bookings = bookingsData ? JSON.parse(bookingsData) : [];
            const idx = bookings.findIndex(b => b.id === id);
            if (idx > -1) {
                bookings[idx].status = 'cancelled';
                localStorage.setItem('turf_bookings', JSON.stringify(bookings));
                loadBookings();
            }
        }
    };

    window.startEdit = function(id) {
        editingId = id;
        loadBookings();
    };

    window.cancelEdit = function() {
        editingId = null;
        loadBookings();
    };

    function getPriceForSlot(time) {
        if (time === '04:30 PM - 05:30 PM') return '₹600';
        
        const isEveningOrNight = time.includes('PM') && (
            time.startsWith('05:') || time.startsWith('06:') || time.startsWith('07:') || 
            time.startsWith('08:') || time.startsWith('09:') || time.startsWith('10:') || time.startsWith('11:')
        );
        
        if (isEveningOrNight) return '₹700';
        return '₹500';
    }

    window.saveBookingTime = function(id) {
        const select = document.getElementById(`edit-slot-${id}`);
        if (!select) return;
        const newTime = select.value;
        
        const bookingsData = localStorage.getItem('turf_bookings');
        let bookings = bookingsData ? JSON.parse(bookingsData) : [];
        const idx = bookings.findIndex(b => b.id === id);
        if (idx > -1) {
            bookings[idx].time = newTime;
            // Only update price automatically for Turf (since swimming price is per person)
            if (bookings[idx].type === 'turf') {
                bookings[idx].price = getPriceForSlot(newTime);
            }
            localStorage.setItem('turf_bookings', JSON.stringify(bookings));
            editingId = null;
            loadBookings(filterFrom.value, filterTo.value);
        }
    };

    clearDataBtn.addEventListener('click', () => {
        if (confirm("Are you sure you want to delete all bookings? This cannot be undone.")) {
            localStorage.removeItem('turf_bookings');
            loadBookings();
        }
    });

    applyFilterBtn.addEventListener('click', () => {
        loadBookings(filterFrom.value, filterTo.value);
    });

    if (typeFilter) {
        typeFilter.addEventListener('change', () => {
            loadBookings(filterFrom.value, filterTo.value);
        });
    }

    resetFilterBtn.addEventListener('click', () => {
        filterFrom.value = '';
        filterTo.value = '';
        loadBookings();
    });

    exportCsvBtn.addEventListener('click', () => {
        if (!currentFilteredBookings || currentFilteredBookings.length === 0) {
            alert("No data to export!");
            return;
        }

        // CSV Header
        let csvContent = "Booking ID,Type,Player Name,WhatsApp,Date,Time Slot,Price,Status,Payment Info\n";

        currentFilteredBookings.forEach(b => {
            const id = `"${b.id || ''}"`;
            const name = `"${b.name || ''}"`;
            const phone = `"${b.whatsapp || ''}"`;
            const date = `"${b.date || ''}"`;
            const time = `"${b.time || ''}"`;
            const price = `"${(b.price || '').replace('₹', 'Rs. ')}"`;
            const type = `"${b.type || 'turf'}"`;
            const status = `"${b.status === 'cancelled' ? 'Cancelled' : 'Confirmed'}"`;
            const utr = `"${b.utr || ''}"`;

            csvContent += `${id},${type},${name},${phone},${date},${time},${price},${status},${utr}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `Turf_Bookings_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // Initialize
    loadBookings();
});
