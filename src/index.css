*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --blue:        #1B4FD8;
  --blue-light:  #EEF2FF;
  --blue-mid:    #C7D2FE;
  --slate:       #64748B;
  --slate-light: #F1F5F9;
  --green:       #16A34A;
  --green-light: #F0FDF4;
  --amber:       #D97706;
  --amber-light: #FFFBEB;
  --red:         #DC2626;
  --red-light:   #FEF2F2;
  --border:      #E2E8F0;
  --white:       #fff;
  --bg:          #F8FAFC;
  --radius:      10px;
  --radius-sm:   6px;
  --text:        #0F172A;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  font-size: 14px;
  color: var(--text);
  background: var(--bg);
  min-height: 100vh;
}

/* ── Layout ─────────────────────────────────────── */
.app        { display: flex; min-height: 100vh; }
.main       { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.content    { padding: 24px 28px; overflow-y: auto; flex: 1; }

/* ── Sidebar ────────────────────────────────────── */
.sidebar            { width: 220px; background: var(--white); border-right: 1px solid var(--border); display: flex; flex-direction: column; flex-shrink: 0; }
.sidebar-logo       { padding: 20px 20px 16px; border-bottom: 1px solid var(--border); }
.sidebar-logo-mark  { font-size: 13px; font-weight: 600; color: var(--blue); display: flex; align-items: center; gap: 7px; }
.sidebar-logo-sub   { font-size: 11px; color: var(--slate); margin-top: 3px; }
.sidebar-nav        { padding: 12px 8px; flex: 1; }
.nav-section        { font-size: 10px; font-weight: 600; color: var(--slate); letter-spacing: .8px; padding: 8px 12px 4px; text-transform: uppercase; }
.nav-item           { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border-radius: var(--radius-sm); cursor: pointer; color: var(--slate); font-size: 13px; font-weight: 500; transition: all .15s; margin-bottom: 2px; text-decoration: none; }
.nav-item:hover     { background: var(--slate-light); color: var(--text); }
.nav-item.active    { background: var(--blue-light); color: var(--blue); }
.nav-item i         { font-size: 17px; flex-shrink: 0; }
.sidebar-footer     { padding: 14px; border-top: 1px solid var(--border); }

/* ── Topbar ─────────────────────────────────────── */
.topbar         { background: var(--white); border-bottom: 1px solid var(--border); padding: 14px 28px; display: flex; align-items: center; justify-content: space-between; flex-shrink: 0; }
.topbar-left h1 { font-size: 16px; font-weight: 600; }
.topbar-left p  { font-size: 12px; color: var(--slate); margin-top: 1px; }
.topbar-right   { display: flex; align-items: center; gap: 12px; }

/* ── Buttons ─────────────────────────────────────── */
.btn           { display: inline-flex; align-items: center; gap: 7px; padding: 8px 16px; border-radius: var(--radius-sm); font-size: 13px; font-weight: 500; cursor: pointer; border: 1px solid transparent; transition: all .15s; font-family: inherit; text-decoration: none; }
.btn-primary   { background: var(--blue); color: #fff; border-color: var(--blue); }
.btn-primary:hover { background: #1642b8; }
.btn-ghost     { background: transparent; color: var(--slate); border-color: var(--border); }
.btn-ghost:hover { background: var(--slate-light); color: var(--text); }
.btn-danger    { background: transparent; color: var(--red); border-color: var(--border); }
.btn-danger:hover { background: var(--red-light); }
.btn-success   { background: var(--green); color: #fff; border-color: var(--green); }
.btn-sm        { padding: 5px 12px; font-size: 12px; }
.btn i         { font-size: 15px; }
.btn:disabled  { opacity: .5; cursor: not-allowed; }

/* ── Cards ───────────────────────────────────────── */
.card           { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
.card-header    { padding: 16px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.card-title     { font-size: 14px; font-weight: 600; }
.card-subtitle  { font-size: 12px; color: var(--slate); margin-top: 2px; }
.card-body      { padding: 20px; }

/* ── Stat grid ───────────────────────────────────── */
.stat-grid      { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
.stat-card      { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 18px 20px; }
.stat-label     { font-size: 11px; font-weight: 600; color: var(--slate); text-transform: uppercase; letter-spacing: .6px; margin-bottom: 8px; }
.stat-value     { font-size: 24px; font-weight: 600; letter-spacing: -.5px; }
.stat-value span { font-size: 14px; color: var(--slate); font-weight: 400; }
.stat-meta      { margin-top: 6px; }

/* ── Badges ──────────────────────────────────────── */
.badge          { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 500; padding: 2px 8px; border-radius: 20px; }
.badge-green    { background: var(--green-light); color: var(--green); }
.badge-amber    { background: var(--amber-light); color: var(--amber); }
.badge-red      { background: var(--red-light); color: var(--red); }
.badge-blue     { background: var(--blue-light); color: var(--blue); }
.badge-gray     { background: var(--slate-light); color: var(--slate); }

/* ── Table ───────────────────────────────────────── */
table           { width: 100%; border-collapse: collapse; }
th              { text-align: left; font-size: 11px; font-weight: 600; color: var(--slate); text-transform: uppercase; letter-spacing: .5px; padding: 10px 20px; background: var(--slate-light); border-bottom: 1px solid var(--border); }
td              { padding: 12px 20px; border-bottom: 1px solid var(--border); font-size: 13px; vertical-align: middle; }
tr:last-child td { border-bottom: none; }
tr:hover td     { background: #fafafa; }
.amount         { font-weight: 600; font-variant-numeric: tabular-nums; }

/* ── Forms ───────────────────────────────────────── */
.form-grid          { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group         { display: flex; flex-direction: column; gap: 5px; }
.form-group.full    { grid-column: 1 / -1; }
label               { font-size: 12px; font-weight: 500; color: var(--slate); }
input, select, textarea {
  padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-sm);
  font-size: 13px; font-family: inherit; background: var(--white); color: var(--text);
  transition: border .15s; outline: none;
}
input:focus, select:focus, textarea:focus { border-color: var(--blue); box-shadow: 0 0 0 3px rgba(27,79,216,.1); }
textarea        { resize: vertical; min-height: 72px; }
.form-section   { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; margin-bottom: 16px; }
.form-section-title { font-size: 13px; font-weight: 600; margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.form-section-title i { color: var(--blue); font-size: 16px; }

/* ── Line items ──────────────────────────────────── */
.line-item          { display: grid; grid-template-columns: 1fr 80px 110px 110px 30px; gap: 8px; align-items: center; margin-bottom: 8px; }
.line-item-header   { display: grid; grid-template-columns: 1fr 80px 110px 110px 30px; gap: 8px; margin-bottom: 6px; }
.line-item-header span { font-size: 11px; font-weight: 600; color: var(--slate); text-transform: uppercase; letter-spacing: .5px; }
.remove-btn         { background: none; border: none; color: var(--slate); cursor: pointer; font-size: 16px; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; }
.remove-btn:hover   { color: var(--red); background: var(--red-light); }
.totals-row         { display: flex; gap: 24px; justify-content: flex-end; font-size: 13px; padding-top: 14px; border-top: 1px solid var(--border); margin-top: 14px; align-items: baseline; }

/* ── Alert ───────────────────────────────────────── */
.alert      { padding: 12px 16px; border-radius: var(--radius-sm); font-size: 13px; display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
.alert-info { background: var(--blue-light); color: #1e3a8a; border: 1px solid var(--blue-mid); }
.alert i    { margin-top: 1px; flex-shrink: 0; font-size: 16px; }

/* ── Toolbar (above tables) ──────────────────────── */
.toolbar    { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; flex-wrap: wrap; }
.toolbar input, .toolbar select { max-width: 220px; }
.toolbar .ml-auto { margin-left: auto; }

/* ── Empty state ─────────────────────────────────── */
.empty      { text-align: center; padding: 48px 20px; color: var(--slate); }
.empty i    { font-size: 36px; margin-bottom: 12px; display: block; opacity: .35; }
.empty p    { font-size: 13px; }

/* ── Status dot ──────────────────────────────────── */
.status-dot   { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; flex-shrink: 0; }
.dot-green    { background: var(--green); }
.dot-amber    { background: var(--amber); }
.dot-red      { background: var(--red); }

/* ── Chat / Conversație ──────────────────────────── */
.chat-wrap      { display: flex; flex-direction: column; gap: 12px; padding: 16px 0; }
.chat-msg       { display: flex; flex-direction: column; max-width: 72%; }
.chat-msg.sent  { align-self: flex-end; align-items: flex-end; }
.chat-msg.note  { align-self: flex-start; align-items: flex-start; }
.chat-bubble    { padding: 10px 14px; border-radius: 12px; font-size: 13px; line-height: 1.5; }
.chat-msg.sent .chat-bubble  { background: var(--blue); color: #fff; border-bottom-right-radius: 3px; }
.chat-msg.note .chat-bubble  { background: var(--slate-light); color: var(--text); border-bottom-left-radius: 3px; }
.chat-meta      { font-size: 11px; color: var(--slate); margin-top: 3px; }

/* ── Contact card ────────────────────────────────── */
.contact-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }

/* ── Login page ──────────────────────────────────── */
.login-wrap     { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg); }
.login-card     { background: var(--white); border: 1px solid var(--border); border-radius: var(--radius); padding: 36px 32px; width: 360px; }
.login-logo     { text-align: center; margin-bottom: 28px; }
.login-logo h1  { font-size: 18px; font-weight: 600; color: var(--blue); }
.login-logo p   { font-size: 12px; color: var(--slate); margin-top: 4px; }
.login-err      { background: var(--red-light); color: var(--red); padding: 10px 14px; border-radius: var(--radius-sm); font-size: 13px; margin-bottom: 14px; }

/* ── Toast ───────────────────────────────────────── */
.toast-wrap   { position: fixed; bottom: 24px; right: 24px; display: flex; flex-direction: column; gap: 8px; z-index: 9999; }
.toast        { background: #1a1a1a; color: #fff; padding: 12px 18px; border-radius: var(--radius); font-size: 13px; display: flex; align-items: center; gap: 10px; animation: slideUp .25s ease; }
.toast i      { font-size: 16px; }
.toast.success i { color: #4ade80; }
.toast.error i   { color: #f87171; }
@keyframes slideUp { from { opacity:0; transform: translateY(12px); } to { opacity:1; transform: translateY(0); } }

/* ── Modal ───────────────────────────────────────── */
.modal-overlay  { position: fixed; inset: 0; background: rgba(0,0,0,.45); z-index: 200; display: flex; align-items: center; justify-content: center; }
.modal-box      { background: var(--white); border-radius: var(--radius); width: 560px; max-width: 95vw; max-height: 90vh; overflow-y: auto; border: 1px solid var(--border); }
.modal-head     { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; justify-content: space-between; }
.modal-head h3  { font-size: 15px; font-weight: 600; }
.modal-close    { background: none; border: none; cursor: pointer; font-size: 20px; color: var(--slate); padding: 2px 6px; border-radius: 4px; }
.modal-close:hover { background: var(--slate-light); }
.modal-body     { padding: 20px; }
.modal-footer   { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; gap: 10px; justify-content: flex-end; }

/* ── Two-col page layout ─────────────────────────── */
.two-col        { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.two-col-3      { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }

/* ═══════════════════════════════════════════════════
   RESPONSIVE — MOBILE FIRST
   ═══════════════════════════════════════════════════ */

/* ── Bottom nav mobile ───────────────────────────── */
.mobile-nav {
  display: none;
  position: fixed;
  bottom: 0; left: 0; right: 0;
  background: var(--white);
  border-top: 1px solid var(--border);
  z-index: 100;
  padding: 6px 0 env(safe-area-inset-bottom, 6px);
}
.mobile-nav-items {
  display: flex;
  justify-content: space-around;
  align-items: center;
}
.mobile-nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 12px;
  border: none;
  background: none;
  cursor: pointer;
  color: var(--slate);
  font-size: 10px;
  font-weight: 500;
  font-family: inherit;
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color .15s;
  min-width: 56px;
}
.mobile-nav-item i { font-size: 22px; }
.mobile-nav-item.active { color: var(--blue); }
.mobile-nav-item.active i { color: var(--blue); }

/* ── Hamburger button ────────────────────────────── */
.hamburger {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 6px;
  color: var(--text);
  font-size: 22px;
  border-radius: var(--radius-sm);
}

/* ── Sidebar overlay on mobile ───────────────────── */
.sidebar-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.5);
  z-index: 149;
}
.sidebar-overlay.open { display: block; }

@media (max-width: 768px) {
  /* Layout */
  .app { flex-direction: column; }

  /* Sidebar — slide in from left on mobile */
  .sidebar {
    position: fixed;
    top: 0; left: 0; bottom: 0;
    z-index: 150;
    transform: translateX(-100%);
    transition: transform .25s ease;
    width: 260px;
    overflow-y: auto;
  }
  .sidebar.open { transform: translateX(0); }

  /* Main content */
  .main { width: 100%; min-height: 100vh; }
  .content {
    padding: 16px;
    padding-bottom: 80px; /* space for bottom nav */
  }

  /* Topbar */
  .topbar {
    padding: 12px 16px;
    position: sticky;
    top: 0;
    z-index: 50;
    flex-wrap: wrap;
    gap: 8px;
  }
  .topbar-left h1 { font-size: 15px; }
  .topbar-right { flex-wrap: wrap; gap: 6px; }
  .hamburger { display: flex; align-items: center; }

  /* Bottom nav */
  .mobile-nav { display: block; }

  /* Grids → single column */
  .stat-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
  .two-col   { grid-template-columns: 1fr; }
  .two-col-3 { grid-template-columns: 1fr; }
  .form-grid { grid-template-columns: 1fr; }
  .form-group.full { grid-column: 1; }

  /* Tables — horizontal scroll */
  .card { overflow-x: auto; }
  table { min-width: 500px; }
  th, td { padding: 10px 12px; font-size: 12px; }

  /* Line items */
  .line-item        { grid-template-columns: 1fr 60px 90px 30px; }
  .line-item-header { grid-template-columns: 1fr 60px 90px 30px; }
  .line-item input:nth-child(3) { display: none; } /* hide total on mobile */
  .line-item-header span:nth-child(4) { display: none; }

  /* Totals row */
  .totals-row { flex-direction: column; align-items: flex-end; gap: 4px; }

  /* Modals — full screen on mobile */
  .modal-overlay { align-items: flex-end; }
  .modal-box {
    width: 100%;
    max-width: 100%;
    max-height: 92vh;
    border-radius: var(--radius) var(--radius) 0 0;
  }

  /* Login */
  .login-card { width: 92vw; padding: 28px 20px; }

  /* Toast */
  .toast-wrap { bottom: 80px; right: 12px; left: 12px; }
  .toast { font-size: 12px; }

  /* Cards */
  .card-header { flex-wrap: wrap; gap: 8px; }
  .card-body { padding: 14px; }

  /* Buttons */
  .btn { font-size: 12px; padding: 7px 12px; }

  /* Toolbar */
  .toolbar { gap: 8px; }
  .toolbar input, .toolbar select { max-width: 100%; flex: 1; }
  .toolbar .ml-auto { margin-left: 0; width: 100%; }
  .toolbar .ml-auto .btn { width: 100%; justify-content: center; }

  /* Chat */
  .chat-msg { max-width: 88%; }

  /* Two col client detail */
  .two-col-3 > div:last-child { order: -1; } /* contact card first on mobile */
}

@media (max-width: 400px) {
  .stat-grid { grid-template-columns: 1fr; }
  .content { padding: 12px; padding-bottom: 80px; }
}

@media (max-width: 768px) {
  .sidebar-close-btn { display: flex !important; }
  .sidebar { box-shadow: 4px 0 20px rgba(0,0,0,.15); }
}

/* Spin animation for upload loader */
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
