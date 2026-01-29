/**
 * SISTEM ABSENSI FOKSI - LOGIC UTAMA
 * Menggunakan LocalStorage sebagai database sederhana
 */

// === 1. KONFIGURASI & DATABASE ===
const DB_USERS = 'foksi_users';
const DB_SCHEDULE = 'foksi_schedule';
const DB_ATTENDANCE = 'foksi_attendance';
const SESSION_KEY = 'foksi_session';

// Default Admin Credentials
const ADMIN_USER = 'admin';
const ADMIN_PASS = 'admin123';

// Load Data Helper
const getDB = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setDB = (key, data) => localStorage.setItem(key, JSON.stringify(data));
const getSession = () => JSON.parse(sessionStorage.getItem(SESSION_KEY));

// === 2. AUTHENTICATION ===

// Handle Login Form
function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();

    if (u === ADMIN_USER && p === ADMIN_PASS) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ role: 'admin', name: 'Administrator' }));
        showToast('Login Admin Berhasil');
        setTimeout(() => window.location.href = 'admin.html', 1000);
        return;
    }

    const users = getDB(DB_USERS);
    const user = users.find(acc => acc.username === u && acc.password === p);

    if (user) {
        sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, role: 'member' }));
        showToast('Login Berhasil');
        setTimeout(() => window.location.href = 'member.html', 1000);
    } else {
        showToast('Username atau Password salah!', 'error');
    }
}

// Check Auth & Redirect
function checkAuthOnLogin() {
    const session = getSession();
    if (session) {
        window.location.href = session.role === 'admin' ? 'admin.html' : 'member.html';
    }
}

function checkAuth(requiredRole) {
    const session = getSession();
    if (!session) {
        window.location.href = 'index.html';
        return;
    }
    if (requiredRole && session.role !== requiredRole) {
        alert('Akses Ditolak!');
        window.location.href = 'index.html';
    }
}

function logout() {
    if (confirm('Yakin ingin keluar?')) {
        sessionStorage.removeItem(SESSION_KEY);
        window.location.href = 'index.html';
    }
}

// === 3. ADMIN PAGE LOGIC ===

function initAdminPage() {
    // Tab Switching
    window.switchTab = (tabName) => {
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
        
        document.getElementById(`view${capitalize(tabName)}`).classList.remove('hidden');
        document.getElementById(`tab${capitalize(tabName)}`).classList.add('active');

        if(tabName === 'users') renderUserTable();
        if(tabName === 'report') renderReportTable();
    };

    // Render Schedule Info
    renderScheduleDisplay();

    // Event Listeners
    document.getElementById('scheduleForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const sched = {
            name: document.getElementById('schedName').value,
            date: document.getElementById('schedDate').value,
            start: document.getElementById('schedStart').value,
            end: document.getElementById('schedEnd').value
        };
        localStorage.setItem(DB_SCHEDULE, JSON.stringify(sched));
        showToast('Jadwal disimpan!');
        renderScheduleDisplay();
    });

    document.getElementById('userForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const users = getDB(DB_USERS);
        const newUser = {
            username: document.getElementById('regUser').value,
            password: document.getElementById('regPass').value, // Plain text for demo
            name: document.getElementById('regName').value,
            job: document.getElementById('regJob').value,
            region: document.getElementById('regReg').value,
            school: document.getElementById('regSch').value
        };

        if (users.some(u => u.username === newUser.username)) {
            showToast('Username sudah ada!', 'error');
            return;
        }

        users.push(newUser);
        setDB(DB_USERS, users);
        showToast('User ditambahkan!');
        e.target.reset();
        renderUserTable();
    });
}

function renderScheduleDisplay() {
    const sched = JSON.parse(localStorage.getItem(DB_SCHEDULE));
    const el = document.getElementById('activeScheduleDisplay');
    if(sched) {
        el.className = "bg-indigo-50 p-4 rounded-lg border border-indigo-200 text-left";
        el.innerHTML = `
            <p class="font-bold text-indigo-900 text-lg">${sched.name}</p>
            <p class="text-indigo-700 mt-1"><i class="fa-regular fa-calendar mr-2"></i> ${sched.date}</p>
            <p class="text-indigo-700"><i class="fa-regular fa-clock mr-2"></i> ${sched.start} - ${sched.end} WIB</p>
        `;
    }
}

function renderUserTable() {
    const users = getDB(DB_USERS);
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = users.length ? '' : '<tr><td colspan="4" class="p-4 text-center text-slate-400">Belum ada data.</td></tr>';
    
    users.forEach((u, i) => {
        tbody.innerHTML += `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3">${u.name}</td>
                <td class="p-3 font-mono text-xs text-slate-500">${u.username}</td>
                <td class="p-3">${u.job}</td>
                <td class="p-3 text-center">
                    <button onclick="deleteUser(${i})" class="text-red-500 hover:text-red-700"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

window.deleteUser = (idx) => {
    if(confirm('Hapus user ini?')) {
        const users = getDB(DB_USERS);
        users.splice(idx, 1);
        setDB(DB_USERS, users);
        renderUserTable();
    }
};

function getReportData() {
    const sched = JSON.parse(localStorage.getItem(DB_SCHEDULE));
    if(!sched) return [];
    
    const users = getDB(DB_USERS);
    const attendance = getDB(DB_ATTENDANCE);
    
    // Check if time is over (Automated Alpha Logic)
    const now = new Date();
    const closeTime = new Date(`${sched.date}T${sched.end}`);
    const isClosed = now > closeTime;

    return users.map(u => {
        const record = attendance.find(a => a.username === u.username && a.date === sched.date);
        let status = 'Belum Absen';
        let rawStatus = 'NONE'; // For styling/logic
        
        if (record) {
            status = record.status === 'H' ? 'Hadir' : record.status === 'I' ? 'Izin' : 'Sakit';
            rawStatus = record.status;
        } else if (isClosed) {
            status = 'Alpa (A)';
            rawStatus = 'A';
        }

        return {
            name: u.name,
            job: u.job,
            school: u.school,
            status: status,
            rawStatus: rawStatus,
            time: record ? record.timestamp : '-',
            note: record ? record.note : '-'
        };
    });
}

function renderReportTable() {
    const data = getReportData();
    const tbody = document.getElementById('reportTableBody');
    tbody.innerHTML = data.length ? '' : '<tr><td colspan="6" class="p-4 text-center text-slate-400">Tidak ada data / Jadwal belum ada.</td></tr>';

    data.forEach(d => {
        let badgeColor = "bg-slate-100 text-slate-600";
        if(d.rawStatus === 'H') badgeColor = "bg-green-100 text-green-700";
        if(d.rawStatus === 'I') badgeColor = "bg-yellow-100 text-yellow-700";
        if(d.rawStatus === 'S') badgeColor = "bg-blue-100 text-blue-700";
        if(d.rawStatus === 'A') badgeColor = "bg-red-100 text-red-700 font-bold";

        tbody.innerHTML += `
            <tr class="border-b">
                <td class="p-3">${d.name}</td>
                <td class="p-3 text-xs">${d.job}</td>
                <td class="p-3 text-xs">${d.school}</td>
                <td class="p-3 text-center"><span class="px-2 py-1 rounded text-xs ${badgeColor}">${d.status}</span></td>
                <td class="p-3 font-mono text-xs">${d.time}</td>
                <td class="p-3 text-xs italic text-slate-500">${d.note}</td>
            </tr>
        `;
    });
}

window.exportExcel = () => {
    const sched = JSON.parse(localStorage.getItem(DB_SCHEDULE));
    if(!sched) return showToast('Buat jadwal dulu!', 'error');

    const data = getReportData().map(row => ({
        "Nama": row.name,
        "Jabatan": row.job,
        "Sekolah": row.school,
        "Status": row.status,
        "Waktu": row.time,
        "Keterangan": row.note
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Absensi");
    XLSX.writeFile(wb, `Absensi_FOKSI_${sched.date}.xlsx`);
};


// === 4. MEMBER PAGE LOGIC ===

function initMemberPage() {
    const user = getSession();
    const sched = JSON.parse(localStorage.getItem(DB_SCHEDULE));
    const attendance = getDB(DB_ATTENDANCE);

    // Set Profile
    document.getElementById('navUserName').innerText = user.username;
    document.getElementById('profileName').innerText = user.name;
    document.getElementById('profileJob').innerText = user.job;
    document.getElementById('profileReg').innerText = user.region;
    document.getElementById('formSchool').value = user.school;

    // Helper UI Function
    const setUI = (state, msg, color) => {
        const alert = document.getElementById('alertBox');
        const btn = document.getElementById('btnSubmit');
        const inputs = document.querySelectorAll('#attendanceForm select, #attendanceForm textarea');
        
        alert.classList.remove('hidden');
        alert.className = `mb-4 p-4 rounded-lg text-sm border bg-${color}-50 text-${color}-700 border-${color}-200`;
        alert.innerHTML = msg;

        if(state === 'lock') {
            btn.disabled = true;
            btn.classList.add('opacity-50', 'cursor-not-allowed');
            inputs.forEach(i => i.disabled = true);
        } else {
            btn.disabled = false;
            btn.classList.remove('opacity-50', 'cursor-not-allowed');
            inputs.forEach(i => i.disabled = false);
        }
    };

    if(!sched) {
        document.getElementById('activityName').innerText = "Tidak ada jadwal";
        setUI('lock', 'Belum ada jadwal absensi aktif.', 'slate');
        return;
    }

    document.getElementById('activityName').innerText = sched.name;
    document.getElementById('activityTime').innerText = `${sched.date} | ${sched.start} - ${sched.end}`;

    // Logic Check
    const existing = attendance.find(a => a.username === user.username && a.date === sched.date);
    
    if(existing) {
        const statusMap = { 'H': 'Hadir', 'I': 'Izin', 'S': 'Sakit' };
        setUI('lock', `Anda sudah absen: <b>${statusMap[existing.status]}</b> pada ${existing.timestamp}`, 'green');
        
        const badge = document.getElementById('statusBadge');
        badge.classList.remove('hidden');
        badge.className = "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-green-100 text-green-700";
        badge.innerText = "SUDAH ABSEN";
        return;
    }

    // Time Check
    const now = new Date();
    const openTime = new Date(`${sched.date}T${sched.start}`);
    const closeTime = new Date(`${sched.date}T${sched.end}`);

    // Pastikan user membuka di hari yang sama dengan jadwal
    const todayStr = now.toISOString().split('T')[0];
    if(todayStr !== sched.date) {
        if(now > closeTime) setUI('lock', 'Masa absensi berakhir. Status: <b>ALPA (A)</b>', 'red');
        else setUI('lock', 'Absensi bukan untuk hari ini.', 'slate');
        return;
    }

    if(now < openTime) {
        setUI('lock', 'Absensi belum dibuka.', 'yellow');
    } else if(now > closeTime) {
        setUI('lock', 'Waktu habis! Status Anda: <b>ALPA (A)</b>', 'red');
        
        const badge = document.getElementById('statusBadge');
        badge.classList.remove('hidden');
        badge.className = "px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide bg-red-100 text-red-700";
        badge.innerText = "ALPA";
    } else {
        setUI('open', 'Silakan isi form di bawah ini.', 'blue');
    }

    // Submit Handler
    document.getElementById('attendanceForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const status = document.getElementById('formStatus').value;
        const note = document.getElementById('formNote').value;
        const timeStr = new Date().toLocaleTimeString('id-ID', {hour12: false});

        const newRecord = {
            username: user.username,
            status: status,
            note: note,
            date: sched.date,
            timestamp: timeStr
        };

        const currentAtt = getDB(DB_ATTENDANCE);
        currentAtt.push(newRecord);
        setDB(DB_ATTENDANCE, currentAtt);
        
        showToast('Absensi Terkirim!');
        setTimeout(() => location.reload(), 1000);
    });
}

// === 5. UTILS ===

function showToast(msg, type = 'success') {
    const toast = document.getElementById('toast');
    toast.innerText = msg;
    toast.classList.remove('hidden');
    
    // Style
    if(type === 'error') {
        toast.className = "toast bg-white text-red-700 border-red-500";
    } else {
        toast.className = "toast bg-white text-green-700 border-green-500";
    }

    setTimeout(() => {
        toast.classList.add('hidden');
    }, 3000);
}

function capitalize(s) {
    return s && s[0].toUpperCase() + s.slice(1);
}

document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('loginForm')) {
        checkAuthOnLogin();
        document.getElementById('loginForm')
            .addEventListener('submit', handleLogin);
    }
});
