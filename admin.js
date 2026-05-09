import { db, collection, addDoc, onSnapshot, query, where, orderBy, updateDoc, doc, getDocs } from './firebase-config.js';

window.onerror = function(m, u, l) { alert("Admin Pro Error: " + m); return false; };

const DEFAULT_TSLOTS = ['11:30 AM - 12:30 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM', '09:00 PM - 10:00 PM', '10:00 PM - 11:00 PM', '11:00 PM - 12:00 AM'];
const DEFAULT_SSLOTS = ['07:00 AM - 08:00 AM', '08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '03:00 PM - 04:00 PM', '04:00 PM - 05:00 PM', '05:00 PM - 06:00 PM', '06:00 PM - 07:00 PM', '07:00 PM - 08:00 PM', '08:00 PM - 09:00 PM'];

let TSLOTS = JSON.parse(localStorage.getItem('k6_tslots')) || [...DEFAULT_TSLOTS];
let SSLOTS = JSON.parse(localStorage.getItem('k6_sslots')) || [...DEFAULT_SSLOTS];
let bp = 700;
let allBookings = [];

function timeToMinutes(timeStr) {
    if (!timeStr || timeStr === 'Full Day') return 0;
    let parts = timeStr.trim().split(' ');
    if (parts.length < 2) return 0;
    let [time, modifier] = parts;
    let [hours, minutes] = time.split(':').map(Number);
    if (hours === 12) {
        hours = modifier === 'AM' ? 0 : 12;
    } else if (modifier === 'PM') {
        hours += 12;
    }
    return hours * 60 + (minutes || 0);
}

function isOverlapping(slotRange, bookingTime, bookingDuration) {
    if (bookingTime === 'Full Day' || slotRange === 'Full Day') return true;
    let slotStart = timeToMinutes(slotRange.split(' - ')[0]);
    let slotEnd = timeToMinutes(slotRange.split(' - ')[1]);
    if (slotEnd <= slotStart) slotEnd += 1440; 
    
    let bookingStart = timeToMinutes(bookingTime.split(' - ')[0]);
    let bookingEnd = bookingStart + (parseFloat(bookingDuration) * 60);
    
    return slotStart < bookingEnd && slotEnd > bookingStart;
}

// ATTACH FUNCTIONS TO WINDOW FOR HTML CALLS
window.doLogin = () => {
    if (document.getElementById('pw').value === 'k6admin') {
        sessionStorage.setItem('k6_auth', 'true');
        document.getElementById('login').style.display = 'none';
        document.getElementById('main').style.display = 'block';
        initFirebase();
    } else alert("Invalid Password");
};

window.setTab = (id) => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tb-' + id).classList.add('active');
    document.querySelectorAll('.content').forEach(c => c.classList.remove('active'));
    document.getElementById(id + '-tab').classList.add('active');
    if (id === 'sch') {
        if(!document.getElementById('sdate').value) document.getElementById('sdate').value = new Date().toISOString().split('T')[0];
        showSch();
    } else showList();
};

function initFirebase() {
    const bookingsRef = collection(db, 'bookings');
    onSnapshot(bookingsRef, (snapshot) => {
        allBookings = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        window.showList();
        window.showSch();
    });
}

window.showList = () => {
    if (!document.getElementById('btable')) return;
    const data = [...allBookings];
    data.sort((a,b) => new Date(b.timestamp||0) - new Date(a.timestamp||0));
    const body = document.getElementById('btable');
    body.innerHTML = '';
    let totalRev = 0;
    let todayRev = 0;
    let pendingPay = 0;
    const today = new Date().toISOString().split('T')[0];

    data.forEach(b => {
        const bPrice = parseInt((b.price||'0').replace(/[^0-9]/g, '')) || 0;
        if(b.status !== 'cancelled') {
            totalRev += bPrice;
            if(b.date === today) todayRev += bPrice;
            if(b.payMode === 'Pending') pendingPay += bPrice;
        }
        
        const tr = document.createElement('tr');
        const bc = b.status === 'cancelled' ? 'badge-cancel' : (b.status === 'pending' ? 'badge-pending' : 'badge-ok');
        const pc = b.payMode === 'UPI' ? 'badge-upi' : (b.payMode==='Cash'?'badge-cash':'badge-pending');
        const source = b.source || (b.bookingId && b.bookingId.startsWith('A-') ? 'Admin' : 'Online');
        
        tr.innerHTML = `
            <td><small>#${(b.bookingId || b.id).slice(-5)}</small></td>
            <td><span class="badge" style="background:#f1f5f9; color:#475569;">${source}</span></td>
            <td><b>${b.name}</b></td>
            <td>${b.whatsapp}</td>
            <td>${b.date}</td>
            <td>${b.time}</td>
            <td>${b.price}</td>
            <td><span class="badge ${pc}">${b.payMode||'?'}${b.count?` (${b.count}p)`:''}</span></td>
            <td><span class="badge ${bc}">${b.status||'confirmed'}</span></td>
            <td>
                <div style="display:flex; gap:5px;">
                    ${b.status === 'pending' ? `<button class="btn btn-p" style="padding:6px; background:#f59e0b;" onclick="approveB('${b.id}')" title="Approve Payment"><i class="ph ph-check-circle"></i></button>` : ''}
                    <button class="btn btn-s" style="padding:6px;" onclick="editB('${b.id}')"><i class="ph ph-pencil"></i></button>
                    <button class="btn-d" onclick="cancelB('${b.id}')"><i class="ph ph-trash"></i></button>
                </div>
            </td>
        `;
        body.appendChild(tr);
    });
    document.getElementById('stat-c').textContent = data.filter(b => b.status !== 'cancelled').length;
    document.getElementById('stat-r-today').textContent = '₹' + todayRev.toLocaleString();
    document.getElementById('stat-pending').textContent = '₹' + pendingPay.toLocaleString();
    if (document.getElementById('db-total-records')) {
        document.getElementById('db-total-records').textContent = data.length;
    }
}

window.editB = (id) => {
    const b = allBookings.find(x => x.id === id);
    if (!b) return;
    document.getElementById('mid').value = b.id;
    document.getElementById('mtype').value = b.type || 'turf1';
    document.getElementById('mdate').value = b.date;
    document.getElementById('mtime').setAttribute('data-val', b.time); 
    document.getElementById('mname').value = b.name;
    document.getElementById('mphone').value = b.whatsapp;
    document.getElementById('mprice').value = (b.price||'').replace(/[^0-9]/g, '');
    document.getElementById('mpay').value = b.payMode || 'Cash';
    document.getElementById('mcount').value = b.count || 1;
    document.getElementById('mdur').value = b.duration || 1;
    document.getElementById('mtitle').textContent = "Edit Booking";
    toggleMFields();
    document.getElementById('mbg').style.display = 'flex';
};

window.approveB = async (id) => {
    if(confirm("Confirm payment received and approve this booking?")) {
        try {
            const bRef = doc(db, 'bookings', id);
            await updateDoc(bRef, { status: 'confirmed' });
        } catch (e) {
            console.error(e);
            alert("Error approving booking");
        }
    }
};

window.cancelB = async (id) => {
    if(confirm("Cancel this booking?")) {
        try {
            const bRef = doc(db, 'bookings', id);
            await updateDoc(bRef, { status: 'cancelled' });
        } catch (e) {
            console.error(e);
            alert("Error cancelling booking");
        }
    }
};

window.showSch = () => {
    const type = document.getElementById('stype').value;
    const date = document.getElementById('sdate').value;
    if(!date || !document.getElementById('sgrid')) return;
    
    const [y,m,d] = date.split('-');
    document.getElementById('sdisplay').textContent = new Date(y, m-1, d).toLocaleDateString('en-US', {weekday:'long', month:'short', day:'numeric'});
    document.getElementById('stitle').textContent = type.startsWith('turf') ? (type === 'turf1' ? "TURF 1 SLOTS" : "TURF 2 SLOTS") : "SWIMMING SLOTS";
    
    const booked = allBookings.filter(b => b.date===date && b.type===type && b.status!=='cancelled');
    const slots = type.startsWith('turf') ? TSLOTS : SSLOTS;
    const grid = document.getElementById('sgrid');
    grid.innerHTML = '';
    
    let bookedCount = 0;
    let totalSlots = slots.length;

    slots.forEach(s => {
        const bList = booked.filter(x => {
            if (x.time === 'Full Day') return true;
            return isOverlapping(s, x.time, x.duration || 1);
        });
        let totalP = 0; bList.forEach(x => totalP += parseInt(x.count || 1));
        
        const div = document.createElement('div');
        let status = 'available';
        if (type.startsWith('turf') && bList.length > 0) { status = 'booked'; bookedCount++; }
        if (type === 'swimming' && totalP >= 50) { status = 'full'; bookedCount++; }
        
        div.className = 'slot ' + status;
        let info = '';
        if (type.startsWith('turf')) {
            info = bList.length > 0 ? `<span style="color:#ef4444;">${bList[0].name}</span>` : `<span style="color:var(--primary);">Available</span>`;
        } else {
            info = `<span style="${totalP >= 50 ? 'color:#ef4444' : 'color:var(--primary)'}">${totalP}/50 People</span>`;
        }
        
        const price = type.startsWith('turf') ? (getP(s, type)) : 100;
        div.innerHTML = `<span class="slot-time">${s}</span><div class="slot-info">${info}</div><div class="slot-price">₹${price}${type==='swimming'?'/p':''}</div>`;
        
        if(status !== 'full' && (type==='swimming' || status==='available')) {
            div.onclick = () => openM(s, type, date, price);
        }
        grid.appendChild(div);
    });

    document.getElementById('stat-booked').textContent = bookedCount;
    document.getElementById('stat-empty').textContent = totalSlots - bookedCount;
};

window.manageSlots = () => {
    const type = document.getElementById('stype').value;
    const slots = type.startsWith('turf') ? TSLOTS : SSLOTS;
    const list = document.getElementById('slot-list');
    list.innerHTML = '';
    slots.forEach((s, i) => {
        const item = document.createElement('div');
        item.style = "display:flex; justify-content:space-between; align-items:center; padding:8px; border-bottom:1px solid #eee;";
        item.innerHTML = `<span>${s}</span><button class="btn-d" onclick="deleteSlot(${i})"><i class="ph ph-trash"></i></button>`;
        list.appendChild(item);
    });
    document.getElementById('slot-modal-bg').style.display = 'flex';
};

window.deleteSlot = (index) => {
    const type = document.getElementById('stype').value;
    if (type.startsWith('turf')) { TSLOTS.splice(index, 1); localStorage.setItem('k6_tslots', JSON.stringify(TSLOTS)); }
    else { SSLOTS.splice(index, 1); localStorage.setItem('k6_sslots', JSON.stringify(SSLOTS)); }
    window.manageSlots(); window.showSch();
};

window.addNewSlot = () => {
    const time = document.getElementById('new-slot-time').value;
    if (!time) return alert("Enter time");
    const type = document.getElementById('stype').value;
    if (type.startsWith('turf')) { TSLOTS.push(time); localStorage.setItem('k6_tslots', JSON.stringify(TSLOTS)); }
    else { SSLOTS.push(time); localStorage.setItem('k6_sslots', JSON.stringify(SSLOTS)); }
    document.getElementById('new-slot-time').value = '';
    window.manageSlots(); window.showSch();
};

window.resetSlots = () => {
    if(confirm("Reset to default slots?")) {
        const type = document.getElementById('stype').value;
        if(type.startsWith('turf')) { TSLOTS = [...DEFAULT_TSLOTS]; localStorage.removeItem('k6_tslots'); }
        else { SSLOTS = [...DEFAULT_SSLOTS]; localStorage.removeItem('k6_sslots'); }
        window.manageSlots(); window.showSch();
    }
};

window.closeSlotModal = () => { document.getElementById('slot-modal-bg').style.display = 'none'; };

function getP(time, type) {
    let isNight = false;
    const startPart = time.split(' - ')[0];
    const minutes = timeToMinutes(startPart);
    
    // Night starts from 6:00 PM (1080 minutes)
    if (minutes >= 1080 || startPart.includes('12:00 AM') || startPart.includes('01:00 AM') || startPart.includes('02:00 AM')) {
        isNight = true;
    }

    if (type === 'turf1') return isNight ? 650 : 450;
    if (type === 'turf2') return isNight ? 700 : 500;
    return 500;
}

window.updateAvailableSlots = () => {
    const type = document.getElementById('mtype').value;
    const date = document.getElementById('mdate').value;
    const timeSelect = document.getElementById('mtime');
    const currentVal = timeSelect.getAttribute('data-val') || '';
    timeSelect.innerHTML = '';
    
    const booked = allBookings.filter(b => b.date === date && b.type === type && b.status !== 'cancelled');
    const slots = type.startsWith('turf') ? [...TSLOTS, 'Full Day'] : SSLOTS;
    
    slots.forEach(s => {
        const isBooked = type.startsWith('turf') && booked.some(b => {
            if (b.time === 'Full Day') return true;
            return isOverlapping(s, b.time, b.duration || 1);
        });
        if (!isBooked || s === currentVal) {
            const opt = document.createElement('option');
            opt.value = s;
            opt.textContent = s;
            if (s === currentVal) opt.selected = true;
            timeSelect.appendChild(opt);
        }
    });
};

function toggleMFields() {
    const type = document.getElementById('mtype').value;
    document.getElementById('mdur-g').style.display = type.startsWith('turf') ? 'flex' : 'none';
    document.getElementById('mcount-g').style.display = type === 'swimming' ? 'block' : 'none';
    window.updateAvailableSlots();
}

function openM(s, type, date, p) {
    bp = p;
    document.getElementById('mid').value = '';
    document.getElementById('mtype').value = type;
    document.getElementById('mdate').value = date;
    document.getElementById('mtime').setAttribute('data-val', s); 
    document.getElementById('mprice').value = p;
    document.getElementById('mname').value = '';
    document.getElementById('mphone').value = '';
    document.getElementById('mcount').value = 1;
    document.getElementById('mtitle').textContent = "Manual Booking";
    toggleMFields();
    document.getElementById('mbg').style.display = 'flex';
}

window.openNew = () => { 
    const date = document.getElementById('sdate').value || new Date().toISOString().split('T')[0];
    const type = document.getElementById('stype').value || 'turf1';
    openM('', type, date, type.startsWith('turf')?getP('', type):100); 
};

window.closeModal = () => { document.getElementById('mbg').style.display = 'none'; };

document.getElementById('mform').onsubmit = async (e) => {
    e.preventDefault();
    const mid = document.getElementById('mid').value;
    const type = document.getElementById('mtype').value;
    const newB = {
        type: type,
        name: document.getElementById('mname').value,
        whatsapp: document.getElementById('mphone').value,
        date: document.getElementById('mdate').value,
        time: document.getElementById('mtime').value,
        price: '₹' + document.getElementById('mprice').value,
        payMode: document.getElementById('mpay').value,
        duration: type.startsWith('turf') ? (document.getElementById('mdur').value === 'full' ? 'full' : parseFloat(document.getElementById('mdur').value)) : 1,
        count: type === 'swimming' ? document.getElementById('mcount').value : 1,
        timestamp: new Date().toISOString(),
        status: 'confirmed',
        source: 'Admin'
    };

    if (!mid) {
        newB.bookingId = 'A-' + Math.random().toString(36).substring(2,7).toUpperCase();
    }

    try {
        if (mid) {
            const bRef = doc(db, 'bookings', mid);
            await updateDoc(bRef, newB);
        } else {
            await addDoc(collection(db, 'bookings'), newB);
        }
        window.closeModal();
        alert(mid ? "Updated!" : "Booked!");
    } catch (err) {
        console.error(err);
        alert("Error saving booking");
    }
};

document.getElementById('mdur').onchange = () => {
    const dur = document.getElementById('mdur').value;
    if (dur === 'full') {
        document.getElementById('mprice').value = 5000;
        document.getElementById('mtime').innerHTML = '<option value="Full Day">Full Day</option>';
    } else {
        document.getElementById('mprice').value = Math.round(bp * parseFloat(dur));
        window.updateAvailableSlots();
    }
};

document.getElementById('mcount').onchange = () => {
    if(document.getElementById('mtype').value === 'swimming') document.getElementById('mprice').value = 100 * parseInt(document.getElementById('mcount').value);
};

window.exportCSV = () => {
    if (allBookings.length === 0) return alert("No data");
    let csv = "ID,Type,Name,WhatsApp,Date,Time,Price,PayMode,Status\n";
    allBookings.forEach(b => { csv += `${b.bookingId || b.id},${b.type},${b.name},${b.whatsapp},${b.date},${b.time},${b.price},${b.payMode||''},${b.status||'confirmed'}\n`; });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'bookings.csv'; a.click();
};

// INITIAL AUTH CHECK
if(sessionStorage.getItem('k6_auth') === 'true') {
    document.getElementById('login').style.display = 'none';
    document.getElementById('main').style.display = 'block';
    initFirebase();
}

// SETUP SELECT EVENT
document.getElementById('mtype').onchange = toggleMFields;
document.getElementById('stype').onchange = window.showSch;
document.getElementById('sdate').onchange = window.showSch;
