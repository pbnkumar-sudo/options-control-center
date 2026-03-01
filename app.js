// app.js — Options Control Center PWA
// Features: localStorage persistence, lot calculator, BTST checker, installable PWA

'use strict';

let currentLots = 0;
let deferredPrompt = null;

// ── PWA INSTALL PROMPT ──
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install banner if not dismissed before
    if (!localStorage.getItem('installDismissed')) {
        document.getElementById('install-banner').classList.add('show');
    }
});

window.addEventListener('appinstalled', () => {
    document.getElementById('install-banner').classList.remove('show');
    deferredPrompt = null;
    console.log('OCC installed as PWA');
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(choice => {
            deferredPrompt = null;
            document.getElementById('install-banner').classList.remove('show');
        });
    } else {
        // Fallback: show manual instructions
        alert(
            '📱 To install on Android:\n' +
            '1. Open this page in Chrome\n' +
            '2. Tap the ⋮ menu → "Add to Home screen"\n\n' +
            '💻 To install on Windows:\n' +
            '1. Open in Edge or Chrome\n' +
            '2. Click the ⊕ icon in the address bar → Install\n\n' +
            'Or use Chrome menu → "Install Options Control Center"'
        );
    }
}

function dismissInstall() {
    localStorage.setItem('installDismissed', '1');
    document.getElementById('install-banner').classList.remove('show');
}

// ── SERVICE WORKER ──
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js')
            .then(reg => console.log('SW registered:', reg.scope))
            .catch(err => console.log('SW error:', err));
    });
}

// ── TAB SWITCHING ──
function switchTab(tab) {
    ['dashboard', 'tradingview', 'sahi'].forEach(t => {
        document.getElementById(t + '-tab').style.display = 'none';
        document.getElementById('btn-' + t).classList.remove('active');
    });
    document.getElementById(tab + '-tab').style.display = 'block';
    document.getElementById('btn-' + tab).classList.add('active');

    // Lazy-load iframes on first visit
    if (tab === 'tradingview') {
        const iframe = document.getElementById('tv-iframe');
        if (iframe.src === 'about:blank') {
            iframe.src = localStorage.getItem('tvUrl') || 'https://in.tradingview.com/chart/';
        }
    }
    if (tab === 'sahi') {
        const iframe = document.getElementById('sahi-iframe');
        if (iframe.src === 'about:blank') {
            iframe.src = localStorage.getItem('sahiUrl') || 'https://sahi.example.com/login';
        }
    }
}

// ── LOCAL STORAGE LOAD / SAVE ──
function loadFromStorage() {
    const map = {
        'fo-symbols':         'foSymbols',
        'pead-symbols':       'peadSymbols',
        'available-capital':  'capital',
        'risk-percent':       'riskPct',
        'lot-size':           'lotSize',
        'option-price':       'optPrice',
        'tv-url':             'tvUrl',
        'sahi-url':           'sahiUrl'
    };
    for (const [id, key] of Object.entries(map)) {
        const val = localStorage.getItem(key);
        if (val !== null) {
            const el = document.getElementById(id);
            if (el) el.value = val;
        }
    }
}

function saveToStorage() {
    localStorage.setItem('foSymbols',  document.getElementById('fo-symbols').value);
    localStorage.setItem('peadSymbols', document.getElementById('pead-symbols').value);
    localStorage.setItem('capital',    document.getElementById('available-capital').value);
    localStorage.setItem('riskPct',    document.getElementById('risk-percent').value);
    localStorage.setItem('lotSize',    document.getElementById('lot-size').value);
    localStorage.setItem('optPrice',   document.getElementById('option-price').value);
}

// ── LOT CALCULATOR ──
function recalculateLots() {
    const capital   = parseFloat(document.getElementById('available-capital').value) || 100000;
    const riskPct   = parseFloat(document.getElementById('risk-percent').value) || 2;
    const lotSize   = parseFloat(document.getElementById('lot-size').value) || 50;
    const optPrice  = parseFloat(document.getElementById('option-price').value) || 100;

    const riskAmt      = capital * (riskPct / 100);
    const maxByCapital = Math.floor(capital / (optPrice * lotSize));
    const riskPerLot   = optPrice * lotSize * 0.30;
    const maxByRisk    = riskPerLot > 0 ? Math.floor(riskAmt / riskPerLot) : 0;
    currentLots = Math.max(0, Math.min(maxByCapital, maxByRisk));

    document.getElementById('disp-capital').textContent   = capital.toLocaleString('en-IN');
    document.getElementById('disp-risk-amt').textContent  = riskAmt.toLocaleString('en-IN');
    document.getElementById('disp-max-cap').textContent   = maxByCapital;
    document.getElementById('disp-max-risk').textContent  = maxByRisk;
    document.getElementById('disp-final-lots').textContent = currentLots;

    saveToStorage();
    renderFoTable();
    renderPeadTable();
}

// ── F&O TABLE ──
function renderFoTable() {
    const symbols = document.getElementById('fo-symbols').value
        .split(',').map(s => s.trim()).filter(Boolean);
    const tbody = document.getElementById('fo-tbody');
    tbody.innerHTML = '';
    symbols.forEach(sym => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="sym-cell">${sym}</td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable">CE/PE/None</td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable"></td>
            <td class="lots-cell">${currentLots}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ── PEAD TABLE ──
function renderPeadTable() {
    const symbols = document.getElementById('pead-symbols').value
        .split(',').map(s => s.trim()).filter(Boolean);
    const tbody = document.getElementById('pead-tbody');
    tbody.innerHTML = '';
    symbols.forEach(sym => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="sym-cell">${sym}</td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable"></td>
            <td contenteditable="true" class="editable">Yes</td>
            <td class="lots-cell">${currentLots}</td>
        `;
        tbody.appendChild(tr);
    });
}

// ── IFRAME CONTROLS ──
function openTvChart() {
    const url = document.getElementById('tv-url').value.trim();
    if (url) {
        document.getElementById('tv-iframe').src = url;
        localStorage.setItem('tvUrl', url);
    }
}

function openSahi() {
    const url = document.getElementById('sahi-url').value.trim();
    if (url) {
        document.getElementById('sahi-iframe').src = url;
        localStorage.setItem('sahiUrl', url);
    }
}

// ── BTST WINDOW STATUS ──
function updateBtstWindowStatus() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();
    const s = now.getSeconds();
    const timeStr = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`;

    document.getElementById('current-time').textContent = timeStr;

    const inWindow = (h === 15 && m >= 15 && m <= 25);
    const block = document.getElementById('btst-block');
    const text  = document.getElementById('btst-status-text');

    if (inWindow) {
        block.className = 'btst-status-block on';
        text.textContent = '🟢 BTST WINDOW ON';
    } else {
        block.className = 'btst-status-block off';
        text.textContent = 'BTST WINDOW OFF';
    }
}

// ── INIT ──
function init() {
    loadFromStorage();
    switchTab('dashboard');
    recalculateLots();
    updateBtstWindowStatus();

    // Update BTST every second for live clock
    setInterval(updateBtstWindowStatus, 1000);

    // Auto-save on input change
    document.querySelectorAll('input, textarea').forEach(el => {
        if (!['tv-url', 'sahi-url'].includes(el.id)) {
            el.addEventListener('input', saveToStorage);
        }
    });
}

window.onload = init;
