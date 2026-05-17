// -----------------------------------------------------------------------------
// leden.js
// Javascript frontend logica passend bij het nieuwe Kanban Dark-mode thema
// Verbindt met de MariaDB endpoints via Fetch requests.
// -----------------------------------------------------------------------------

const API = {
  adminLogin: "api.php?action=" + "admin" + "Login",
  ledenLogin: "api.php?action=" + "leden" + "Login",
  items: "api.php?action=" + "leden" + "Items",
  approve: (id) => `api.php?action=${"leden"}Approve&id=${encodeURIComponent(id)}`,
  del: (id) => `api.php?action=${"leden"}Delete&id=${encodeURIComponent(id)}`,
  download: (id, f) => `api.php?action=${"leden"}Download&id=${encodeURIComponent(id)}&filename=${encodeURIComponent(f)}`,
  accessList: "api.php?action=" + "leden" + "AccessList",
  accessUpsert: "api.php?action=" + "leden" + "AccessUpsert",
  accessDelete: (label) => `api.php?action=${"leden"}AccessDelete&label=${encodeURIComponent(label)}`
};

const VOICES = ["Sopraan", "Alt", "Tenor", "Bas"];

function getToken() {
  return (
    sessionStorage.getItem("leden_token") ||
    sessionStorage.getItem("dash_token") ||
    localStorage.getItem("leden_token") ||
    localStorage.getItem("dash_token") ||
    ""
  );
}

function setToken(tok, key = "leden_token") {
  sessionStorage.setItem(key, tok);
}

async function postJSON(url, body, token) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body || {})
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

async function getJSON(url, token) {
  const res = await fetch(url, {
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `HTTP ${res.status}`);
  return data;
}

function el(id) {
  return document.getElementById(id);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function escapeAttr(s) {
  return escapeHtml(s).replaceAll('"', "&quot;");
}

function normalizeVoice(v) {
  const x = String(v || "").trim();
  return VOICES.includes(x) ? x : "";
}

// ---------- Downloads met Token beveiliging ----------
async function downloadWithAuth(subId, filename, openInNewTab = false) {
  const token = getToken();
  const url = API.download(subId, filename);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) {
    let msg = `Bestand was niet beschikbaar op de site (HTTP ${res.status})`;
    try {
      const data = await res.json();
      if (data && data.detail) msg = data.detail;
    } catch (_) {}
    throw new Error(msg);
  }

  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);

  if (openInNewTab) {
    window.open(objUrl, "_blank", "noopener");
    setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
    return;
  }

  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(objUrl), 60000);
}

// ---------- Foto rendering helper ----------
async function loadPhotos(items) {
  const token = getToken();
  for (const it of items || []) {
    // Foto detection obv bestanden extensie (simplificatie als foto niet apart is)
    // Nieuwe backend layout plaatst bestanden in de array 'bestanden'
    const bestanden = it.bestanden || [];
    const fotoMatch = bestanden.find(f => f.naam.match(/\.(jpg|jpeg|png|webp|gif)$/i));
    
    // We checken de img_ tags via id
    const img = document.getElementById(`img_${it.id}`);
    if (!img) continue;

    if (!fotoMatch) {
      img.style.display = 'none';
      continue;
    }

    try {
      const url = API.download(it.id, fotoMatch.naam);
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) continue;
      const blob = await res.blob();
      img.src = URL.createObjectURL(blob);
    } catch (_) {}
  }
}

// ---------- HTML Tile Generatie ----------
function renderTile(item, opts) {
  const manage = !!opts.manage;
  const showFiles = !!opts.showFiles;
  
  // We sturen altjd een img placeholder uit, laden de foto later in `loadPhotos`
  const imgId = `img_${item.id}`;

  const filesHtml = (item.bestanden || [])
    .map((f) => {
      return `
      <div style="display:flex; gap:8px; align-items:center; margin-bottom: 6px;">
        <button class="iconBtn" title="Bestand downloaden" data-act="file" data-id="${escapeAttr(item.id)}" data-file="${escapeAttr(f.naam)}">
          📎 ${escapeHtml(f.naam)}
        </button>
        <button class="iconBtn" title="Openen in nieuw scherm" data-act="fileopen" data-id="${escapeAttr(item.id)}" data-file="${escapeAttr(f.naam)}">
          ↗︎
        </button>
      </div>`;
    })
    .join("");

  return `
  <div class="tileCard">
    <div class="tileHead">
      <div class="tileHeadTitle">${escapeHtml(item.naam || "Aanmelding")}</div>
      <div class="small">${item.created_at ? item.created_at.slice(0, 10) : ''}</div>
    </div>
    
    <img class="tilePhoto" id="${imgId}" alt="foto" onerror="this.style.display='none'">
    
    <div class="tileBody">
      <details>
        <summary><b>Naam & e-mail</b></summary>
        <div class="kv">E-mail: ${escapeHtml(item.email || "")}</div>
        <div class="kv">Stem: ${escapeHtml(item.stem || "")}</div>
      </details>

      <details>
        <summary><b>Motivatie / Vertel meer</b></summary>
        <div class="kv">${escapeHtml(item.motivatie || item.over || "").replace(/\n/g, "<br>")}</div>
      </details>
      
      ${showFiles ? `
      <details open>
        <summary><b>Bestanden</b></summary>
        <div style="padding: 10px;">
          ${filesHtml || `<div class="small">(geen bestanden)</div>`}
        </div>
      </details>
      ` : ''}

      ${manage ? `
      <div class="actions">
        <button class="btn primary" data-act="approve" data-id="${escapeAttr(item.id)}">✅ Goedkeuren</button>
        <button class="btn danger" style="background: rgba(255,82,82,0.2); color: #ff5252; border-color: rgba(255,82,82,0.4);" data-act="delete" data-id="${escapeAttr(item.id)}">🗑️ Verwijderen</button>
      </div>` : ``}
      
    </div>
  </div>`;
}

// Group array function by Stem
function renderMembersByVoice(items, { idPrefix = "", tileOpts = {} } = {}) {
  let foundAnyVoiceContainer = false;

  VOICES.forEach((v) => {
    const wrap = document.getElementById(`${idPrefix}${v}`);
    if (!wrap) return;
    foundAnyVoiceContainer = true;

    const filtered = (items || []).filter((i) => normalizeVoice(i.stem) === v);
    wrap.innerHTML =
      filtered.map((i) => renderTile(i, tileOpts)).join("") ||
      `<div class="small" style="padding: 10px;">(geen leden in deze sectie)</div>`;
  });
}

// -----------------------------------------------------------------------------
// Paginabeheerders
// -----------------------------------------------------------------------------

// ---- 1. LEDENBEHEER PAGINA ----
async function initLedenbeheer() {
  const token = getToken();
  const msg = el("loginMsg");
  const pendingWrap = el("pendingWrap");

  async function refresh() {
    // Laden data MariaDB
    const pend = await getJSON(`${API.items}&status=pending`, token);
    const mem = await getJSON(`${API.items}&status=member`, token);

    if (pendingWrap) {
      pendingWrap.innerHTML =
        (pend.items || [])
          .map((i) => renderTile(i, { manage: true, showFiles: true }))
          .join("") || `<div class="small" style="padding: 10px;">(Geen nieuwe aanmelders te beoordelen)</div>`;
    }

    renderMembersByVoice(mem.items || [], {
      idPrefix: "member_",
      tileOpts: { manage: true, showFiles: true } // Ledenbeheer: bestanden altijd laten zien en verwijder actie
    });

    await loadPhotos(pend.items);
    await loadPhotos(mem.items);
  }

  async function doApprove(id) {
    if(!confirm("Weet je zeker dat je deze kandidaat als volwaardig lid wil accepteren?")) return;
    await fetch(API.approve(id), {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    await refresh();
  }

  async function doDelete(id) {
    if (!confirm("Weet je zeker dat je deze inschrijving of dit lid wilt verwijderen? Data wordt ook uit database gewist."))
      return;
    await fetch(API.del(id), {
      method: "POST",
      headers: { Authorization: `Bearer ${getToken()}` }
    });
    await refresh();
  }

  // Event Delegation voor click acties
  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-act]");
    if (!b) return;

    const act = b.dataset.act;
    const id = b.dataset.id;
    const file = b.dataset.file;

    try {
      if (act === "approve") await doApprove(id);
      if (act === "delete") await doDelete(id);
      if (act === "file") await downloadWithAuth(id, file, false);
      if (act === "fileopen") await downloadWithAuth(id, file, true);
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  const loginBtn = el("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      if (msg) msg.textContent = "";
      const code = el("pw")?.value.trim();
      if (!code) return;

      try {
        const r = await postJSON(API.ledenLogin, { code }, "");
        setToken(r.token, "leden_token");
        location.reload();
      } catch (e1) {
        try {
          // Fallback legacy admin flow
          const r = await postJSON(API.adminLogin, { password: code }, "");
          sessionStorage.setItem("dash_token", r.token);
          location.reload();
        } catch (e2) {
          if (msg) msg.textContent = "Geen toegang (code/wachtwoord onjuist).";
        }
      }
    });
  }

  try {
    await refresh();
    const lb = el("loginbar");
    if (lb) lb.style.display = "none";
  } catch (err) {
    const lb = el("loginbar");
    if (lb) lb.style.display = "flex";
  }
}


// ---- 2. LEDEN OVERZICHT PAGINA ----
async function initLedenlijst() {
  const token = getToken();
  const msg = el("loginMsg");

  async function refresh() {
    const mem = await getJSON(`${API.items}&status=member`, token);
    renderMembersByVoice(mem.items || [], {
      idPrefix: "",
      tileOpts: { manage: false, showFiles: false } // Vreemden/gewone leden zien geen prive bestanden en beheer buttons
    });
    await loadPhotos(mem.items);
  }

  const loginBtn = el("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      if (msg) msg.textContent = "";
      const code = el("pw")?.value.trim();
      if (!code) return;
      try {
        const r = await postJSON(API.ledenLogin, { code }, "");
        setToken(r.token, "leden_token");
        location.reload();
      } catch (e) {
        if (msg) msg.textContent = "Geen toegang (code onjuist).";
      }
    });
  }

  // Start init
  try {
    const memTest = await getJSON(`${API.items}&status=member`, token); // trigger auth error indien nodig
    await refresh();
    const lb = el("loginbar");
    if (lb) lb.style.display = "none";
  } catch (err) {
    const lb = el("loginbar");
    if (lb) lb.style.display = "flex";
  }
}


// ---- 3. LEDENTOEGANG PAGINA ----
async function initToegang() {
  const token = getToken();
  const wrap = el("wrap");

  async function refresh() {
    const data = await getJSON(API.accessList, token);
    const rows = (data.codes || [])
      .map(c => `
      <div class="tileCard">
        <div class="tileHead">
          <div class="tileHeadTitle">${escapeHtml(c.label || "")}</div>
          <button class="iconBtn" data-del="${escapeAttr(c.label)}" style="color:#ff5252; border-color: rgba(255,82,82,0.3)">🗑️</button>
        </div>
        <div class="tileBody">
          <div class="kv"><b>Code:</b> ${escapeHtml(c.code || "")}</div>
          <div class="kv"><b>Leden bekijken:</b> ${c.leden_view ? "ja" : "nee"}</div>
          <div class="kv"><b>Leden beheren:</b> ${c.leden_manage ? "ja" : "nee"}</div>
        </div>
      </div>
      `)
      .join("");

    if (wrap) wrap.innerHTML = rows || `<div class="small" style="padding:10px;">(nog geen toegangscodes gedefinieerd in MariaDB)</div>`;
  }

  const saveBtn = el("saveBtn");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      const label = el("label")?.value.trim();
      const code = el("code")?.value.trim();
      const leden_view = !!el("leden_view")?.checked;
      const leden_manage = !!el("leden_manage")?.checked;

      try {
        await postJSON(API.accessUpsert, { label, code, leden_view, leden_manage }, token);

        if (el("label")) el("label").value = "";
        if (el("code")) el("code").value = "";
        if (el("leden_view")) el("leden_view").checked = true;
        if (el("leden_manage")) el("leden_manage").checked = false;

        await refresh();
      } catch (err) {
        alert(err.message || String(err));
      }
    });
  }

  document.addEventListener("click", async (e) => {
    const b = e.target.closest("button[data-del]");
    if (!b) return;
    const label = b.dataset.del;
    if (!confirm(`Toegang "${label}" verwijderen?`)) return;
    try {
      await fetch(API.accessDelete(label), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      await refresh();
    } catch (err) {
      alert(err.message || String(err));
    }
  });

  const loginBtn = el("loginBtn");
  if (loginBtn) {
    loginBtn.addEventListener("click", async () => {
      const lm = el("loginMsg");
      if (lm) lm.textContent = "";
      const pw = el("pw")?.value.trim();
      if (!pw) return;
      try {
        const r = await postJSON(API.adminLogin, { password: pw }, "");
        sessionStorage.setItem("dash_token", r.token);
        location.reload();
      } catch (e) {
        const lm2 = el("loginMsg");
        if (lm2) lm2.textContent = "Admin wachtwoord onjuist.";
      }
    });
  }

  try {
    await refresh();
    const lb = el("loginbar");
    if (lb) lb.style.display = "none";
  } catch (err) {
    const lb = el("loginbar");
    if (lb) lb.style.display = "flex";
  }
}

// ---- Routing basis setup ----
window.addEventListener("DOMContentLoaded", () => {
  const page = document.body.dataset.page;
  if (page === "ledenbeheer") initLedenbeheer();
  if (page === "leden") initLedenlijst();
  if (page === "toegang") initToegang();
});
