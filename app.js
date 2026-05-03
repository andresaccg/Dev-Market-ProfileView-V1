/* SPA micro-interactions + A11y Guided Focus + Realtime stubs (SSE/WS simulation) */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const settings = {
  announcements: true,
  guidedFocus: true,
  reduceMotion: false,
};

function prefersReducedMotion() {
  return settings.reduceMotion || (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false);
}

function announce(message) {
  if (!settings.announcements) return;
  const live = $("#sr-live");
  if (!live) return;
  // Reset text so SR re-reads even same string.
  live.textContent = "";
  window.setTimeout(() => {
    live.textContent = message;
  }, 30);
}

function focusGuided(el, announcement) {
  if (announcement) announce(announcement);
  if (!el) return;
  if (!settings.guidedFocus) return;
  // Guided focus: move focus to new context anchor (self-focused).
  // Avoid scroll-jumps if user prefers reduced motion.
  const opts = prefersReducedMotion() ? { preventScroll: true } : { preventScroll: false };
  try {
    el.focus(opts);
  } catch {
    el.focus();
  }
}

function initTabs() {
  const root = $("[data-view='profile']");
  if (!root) return;
  const tabs = $$(".tab[role='tab']", root);
  const panels = $$(".panel[role='tabpanel']", root);

  function activate(tab, { announceChange = true, focusPanel = true } = {}) {
    const panelId = tab.getAttribute("aria-controls");
    const panel = panelId ? document.getElementById(panelId) : null;
    if (!panel) return;

    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle("is-active", active);
      t.setAttribute("aria-selected", String(active));
      t.tabIndex = active ? 0 : -1;
    });

    panels.forEach((p) => p.classList.toggle("is-active", p === panel));

    const label = tab.textContent?.trim() || "Sección";
    const details =
      label === "Portafolio"
        ? "12 proyectos."
        : label === "Reviews"
          ? "2 reseñas visibles (demo)."
          : undefined;

    if (announceChange) {
      announce(`Se abrió ${label}.${details ? " " + details : ""}`);
    }

    if (focusPanel) {
      focusGuided(panel, null);
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activate(tab));
    tab.addEventListener("keydown", (e) => {
      const idx = tabs.indexOf(tab);
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const dir = e.key === "ArrowRight" ? 1 : -1;
        const next = tabs[(idx + dir + tabs.length) % tabs.length];
        next?.focus();
      }
      if (e.key === "Home") {
        e.preventDefault();
        tabs[0]?.focus();
      }
      if (e.key === "End") {
        e.preventDefault();
        tabs[tabs.length - 1]?.focus();
      }
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate(tab);
      }
    });
  });

  // Ensure roving tabindex state.
  tabs.forEach((t) => (t.tabIndex = t.classList.contains("is-active") ? 0 : -1));
}

function initDialog() {
  const btn = $("#btn-reviews");
  const dialog = $("#dialog-reviews");
  if (!btn || !dialog) return;

  let lastFocused = null;

  btn.addEventListener("click", () => {
    lastFocused = document.activeElement;
    dialog.showModal();
    const title = $("#dialog-title", dialog);
    focusGuided(title, "Se abrió el diálogo de reviews verificadas.");
  });

  dialog.addEventListener("close", () => {
    announce("Se cerró el diálogo.");
    if (lastFocused && typeof lastFocused.focus === "function") {
      lastFocused.focus();
    }
  });
}

function setActiveView(view) {
  const views = $$("[data-view]");
  views.forEach((v) => {
    const active = v.getAttribute("data-view") === view;
    v.classList.toggle("is-active", active);
    v.toggleAttribute("hidden", !active);
  });
}

function viewTitle(view) {
  switch (view) {
    case "profile":
      return "Perfil";
    case "explore":
      return "Explorar";
    case "contracts":
      return "Contratos";
    case "messages":
      return "Mensajes";
    case "billing":
      return "Suscripción";
    case "settings":
      return "Ajustes";
    default:
      return "Devhub";
  }
}

function focusViewHeading(view) {
  const v = $(`[data-view='${view}']`);
  if (!v) return;
  const h1 = $(".page__title", v) || $("#page-title", v) || $("h1", v);
  focusGuided(h1, null);
}

function setRoute(route, { announceChange = true } = {}) {
  const view = route || "profile";
  setActiveView(view);

  const items = $$(".nav__item");
  items.forEach((a) => {
    const isActive = a.getAttribute("data-nav") === view;
    a.classList.toggle("nav__item--active", isActive);
    if (isActive) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });

  document.title = `Devhub — ${viewTitle(view)}`;
  if (announceChange) announce(`Navegación: ${viewTitle(view)}.`);
  focusViewHeading(view);
}

function initRouter() {
  const hashRoute = () => (location.hash || "#profile").replace("#", "");
  window.addEventListener("hashchange", () => setRoute(hashRoute()));
  setRoute(hashRoute(), { announceChange: false });
}

function initFollow() {
  const btn = $("#btn-follow");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const pressed = btn.getAttribute("aria-pressed") === "true";
    const next = !pressed;
    btn.setAttribute("aria-pressed", String(next));
    btn.textContent = next ? "Siguiendo" : "Seguir";
    announce(next ? "Has seguido a @andres.camilo." : "Has dejado de seguir a @andres.camilo.");
    // Simulate social notification event
    realtime.emit("notifs", {
      kind: "social",
      title: next ? "Nuevo follow" : "Unfollow",
      body: next ? "Ahora sigues a Andrés Camilo." : "Has dejado de seguir a Andrés Camilo.",
    });
  });
}

function initNav() {
  const items = $$(".nav__item");
  items.forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const next = a.getAttribute("data-nav") || "profile";
      location.hash = `#${next}`;
    });
  });

  $("#btn-messages")?.addEventListener("click", () => {
    location.hash = "#messages";
  });
}

function setPresence({ state, subtitle }) {
  const dot = $("#presence-dot");
  const text = $("#presence-text");
  const sub = $("#presence-sub");
  if (!dot || !text || !sub) return;
  dot.classList.toggle("dot--online", state === "online");
  dot.classList.toggle("dot--warn", state !== "online");
  text.textContent = state === "online" ? "Online" : state === "away" ? "Away" : "Offline";
  sub.textContent = subtitle || "";
}

// Minimal realtime bus: simulates SSE/WS events and cross-feature announcements.
const realtime = (() => {
  /** @type {Record<string, Set<(payload:any)=>void>>} */
  const listeners = Object.create(null);
  return {
    on(topic, cb) {
      listeners[topic] ??= new Set();
      listeners[topic].add(cb);
      return () => listeners[topic].delete(cb);
    },
    emit(topic, payload) {
      listeners[topic]?.forEach((cb) => cb(payload));
    },
  };
})();

function initNotifications() {
  const badge = $("#notifs-badge");
  const btn = $("#btn-notifs");
  let count = 0;

  function bump() {
    count += 1;
    if (badge) {
      badge.hidden = false;
      badge.textContent = String(count);
    }
  }

  realtime.on("notifs", (evt) => {
    bump();
    // Self-focused spoken feedback: tell user what happened in their context.
    if (evt?.kind === "social") announce(`${evt.title}. ${evt.body}`);
    else announce("Tienes una nueva notificación.");
  });

  btn?.addEventListener("click", () => {
    if (badge) badge.hidden = true;
    count = 0;
    announce("Notificaciones vistas.");
  });
}

function initPresenceHeartbeats() {
  // Heartbeat every 30s; simulate presence transitions.
  let last = Date.now();
  setPresence({ state: "online", subtitle: "Heartbeat cada 30s" });

  window.setInterval(() => {
    const now = Date.now();
    last = now;
    setPresence({ state: "online", subtitle: `Último heartbeat: ${new Date(now).toLocaleTimeString()}` });
    // Simulate occasional follower presence signal pushed from server.
    if (Math.random() < 0.18) {
      realtime.emit("notifs", {
        kind: "presence",
        title: "Presencia",
        body: "Un seguidor acaba de conectarse (demo).",
      });
    }
  }, 30_000);

  // If tab is hidden, mark away after a bit (UX-friendly).
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      window.setTimeout(() => {
        if (document.hidden) setPresence({ state: "away", subtitle: "En segundo plano" });
      }, 12_000);
    } else {
      const now = Date.now();
      setPresence({ state: "online", subtitle: `De vuelta: ${new Date(now).toLocaleTimeString()}` });
      announce("Has vuelto a la aplicación.");
    }
  });
}

function initPrimaryCTAs() {
  $("#btn-hire")?.addEventListener("click", () => {
    location.hash = "#contracts";
    announce("Iniciaste el flujo de contratación. Se creó un borrador (demo).");
    realtime.emit("contract:new", { creator: "Ana G.", status: "draft" });
    realtime.emit("notifs", { kind: "contract", title: "Contrato", body: "Borrador creado (demo)." });
  });

  $("#btn-message")?.addEventListener("click", () => {
    location.hash = "#messages";
    announce("Abriste mensajes.");
    realtime.emit("notifs", { kind: "chat", title: "Chat", body: "Conexión WebSocket simulada." });
  });
}

function initExplore() {
  const root = $("[data-view='explore']");
  if (!root) return;

  const results = $("#explore-results");
  const skillSel = $("#explore-skill");
  const sortSel = $("#explore-sort");

  const creators = [
    { id: "user1", name: "Usuario", handle: "@usuario1", tags: ["React", "A11y", "AWS"], rating: 4.9, price: 55, premium: true },
    { id: "user2", name: "Usuario", handle: "@usuario2", tags: ["Backend", "MySQL", "Redis"], rating: 4.8, price: 60, premium: false },
    { id: "user3", name: "Usuario", handle: "@usuario3", tags: ["UX", "Figma", "Design"], rating: 5.0, price: 50, premium: true },
    { id: "user4", name: "Usuario", handle: "@usuario4", tags: ["Mobile", "Swift", "iOS"], rating: 4.7, price: 65, premium: false },
    { id: "user5", name: "Usuario", handle: "@usuario5", tags: ["React", "Node", "Socket.IO"], rating: 4.9, price: 70, premium: true },
    { id: "user6", name: "Usuario", handle: "@usuario6", tags: ["Backend", "Events", "AWS"], rating: 4.6, price: 75, premium: false },
  ];

  function avatarData(seed) {
    const hue = (seed * 47) % 360;
    return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cdefs%3E%3CradialGradient id='g' cx='30%25' cy='30%25'%3E%3Cstop offset='0%25' stop-color='%23ffffff' stop-opacity='.95'/%3E%3Cstop offset='100%25' stop-color='hsl(${hue}%2C90%25%2C82%25)'/%3E%3C/radialGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='28' fill='url(%23g)'/%3E%3Cpath d='M26 92c10-16 58-16 68 0' fill='%230a1629' fill-opacity='.22'/%3E%3Ccircle cx='60' cy='50' r='18' fill='%230a1629' fill-opacity='.2'/%3E%3C/svg%3E`;
  }

  function matchSkill(c, val) {
    if (val === "all") return true;
    if (val === "react") return c.tags.includes("React");
    if (val === "backend") return c.tags.includes("Backend") || c.tags.includes("MySQL") || c.tags.includes("Redis");
    if (val === "mobile") return c.tags.includes("Mobile") || c.tags.includes("iOS") || c.tags.includes("Swift");
    if (val === "ux") return c.tags.includes("UX") || c.tags.includes("Design") || c.tags.includes("Figma");
    return true;
  }

  function sortCreators(list, val) {
    const arr = [...list];
    if (val === "recent") return arr.reverse();
    if (val === "price_low") return arr.sort((a, b) => a.price - b.price);
    if (val === "price_high") return arr.sort((a, b) => b.price - a.price);
    return arr.sort((a, b) => b.rating - a.rating);
  }

  function render() {
    if (!results) return;
    const skill = skillSel?.value || "all";
    const sort = sortSel?.value || "top";
    const filtered = creators.filter((c) => matchSkill(c, skill));
    const sorted = sortCreators(filtered, sort);
    results.innerHTML = "";

    sorted.forEach((c, i) => {
      const el = document.createElement("article");
      el.className = "creator glass";
      el.setAttribute("role", "listitem");
      el.innerHTML = `
        <div class="creator__top">
          <img class="avatar avatar--md" alt="Avatar de ${c.name}" src="${avatarData(i + 1)}" />
          <div>
            <h3 class="creator__name">${c.name}</h3>
            <div class="creator__meta">${c.handle} · ${c.rating} ★ · $${c.price}/h ${c.premium ? "· Premium" : ""}</div>
          </div>
        </div>
        <div class="creator__tags">
          ${c.tags.map((t) => `<span class="tag glass">${t}</span>`).join("")}
        </div>
        <div class="creator__actions">
          <button class="btn btn--glass" type="button" data-action="follow" data-id="${c.id}">Seguir</button>
          <button class="btn btn--primary" type="button" data-action="hire" data-id="${c.id}">Contratar</button>
        </div>
      `;
      results.appendChild(el);
    });

    announce(`Resultados actualizados. ${sorted.length} creadores.`);
  }

  skillSel?.addEventListener("change", render);
  sortSel?.addEventListener("change", render);
  results?.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("button[data-action]");
    if (!btn) return;
    const action = btn.getAttribute("data-action");
    const id = btn.getAttribute("data-id");
    const c = creators.find((x) => x.id === id);
    if (!c) return;
    if (action === "follow") {
      announce(`Has seguido a ${c.handle}.`);
      realtime.emit("notifs", { kind: "social", title: "Nuevo follow", body: `Ahora sigues a ${c.name}.` });
    }
    if (action === "hire") {
      location.hash = "#contracts";
      announce(`Iniciaste contratación con ${c.name}. Se creó un borrador (demo).`);
      realtime.emit("contract:new", { creator: c.name, status: "draft" });
    }
  });

  render();
}

function initContracts() {
  const list = $("#contracts-list");
  const count = $("#contracts-count");
  const detail = $("#contract-detail");
  const statusPill = $("#contract-status-pill");
  const btnNew = $("#btn-new-contract");

  /** @type {{id:string,title:string,with:string,status:"draft"|"active"|"completed",budget:string,scope:string,canRate:boolean}[]} */
  const contracts = [
    { id: "c1", title: "Landing premium", with: "Andrés Camilo", status: "active", budget: "$2,400", scope: "Landing + CMS + performance budget", canRate: false },
    { id: "c2", title: "App marketplace", with: "Valeria P.", status: "completed", budget: "$6,900", scope: "Chat WS + SSE + reputación + suscripción", canRate: true },
    { id: "c3", title: "Auditoría backend", with: "Leo M.", status: "draft", budget: "$900", scope: "MySQL + Redis + eventos + hardening", canRate: false },
  ];

  let selectedId = null;

  function statusLabel(s) {
    if (s === "draft") return "Draft";
    if (s === "active") return "Activo";
    return "Completado";
  }

  function renderList() {
    if (!list) return;
    list.innerHTML = "";
    if (count) count.textContent = `${contracts.length}`;

    contracts.forEach((c) => {
      const el = document.createElement("div");
      el.className = `item${c.id === selectedId ? " is-selected" : ""}`;
      el.setAttribute("role", "option");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-selected", String(c.id === selectedId));
      el.dataset.id = c.id;
      el.innerHTML = `
        <div class="item__title">
          <span>${c.title}</span>
          <span class="muted">${statusLabel(c.status)}</span>
        </div>
        <div class="item__sub">Con: ${c.with} · Presupuesto: ${c.budget}</div>
      `;
      list.appendChild(el);
    });
  }

  function renderDetail() {
    if (!detail) return;
    const c = contracts.find((x) => x.id === selectedId);
    if (!c) {
      detail.innerHTML = `<p class="p muted">Selecciona un contrato para ver el detalle.</p>`;
      if (statusPill) statusPill.textContent = "—";
      return;
    }

    if (statusPill) statusPill.textContent = statusLabel(c.status);

    detail.innerHTML = `
      <div class="kv"><div class="kv__k">Título</div><div><strong>${c.title}</strong></div></div>
      <div class="kv"><div class="kv__k">Con</div><div>${c.with}</div></div>
      <div class="kv"><div class="kv__k">Estado</div><div>${statusLabel(c.status)}</div></div>
      <div class="kv"><div class="kv__k">Presupuesto</div><div>${c.budget}</div></div>
      <div class="kv"><div class="kv__k">Scope</div><div>${c.scope}</div></div>
      <div class="kv">
        <div class="kv__k">Review</div>
        <div>
          ${
            c.canRate
              ? `<button class="btn btn--primary" type="button" id="btn-rate">Dejar review (demo)</button>
                 <div class="muted" style="margin-top:6px">Permitido porque el contrato está completado.</div>`
              : `<span class="muted">Disponible sólo al completar el contrato.</span>`
          }
        </div>
      </div>
    `;

    $("#btn-rate")?.addEventListener("click", () => {
      announce("Review enviada: 5 estrellas (demo).");
      realtime.emit("notifs", { kind: "rating", title: "Review", body: "Calificación registrada (demo)." });
    });
  }

  function select(id, { focus = false } = {}) {
    selectedId = id;
    renderList();
    renderDetail();
    const c = contracts.find((x) => x.id === selectedId);
    if (c) announce(`Contrato seleccionado: ${c.title}. Estado: ${statusLabel(c.status)}.`);
    if (focus) $("#contract-detail")?.scrollIntoView?.({ block: "nearest" });
  }

  list?.addEventListener("click", (e) => {
    const el = e.target?.closest?.(".item");
    if (!el) return;
    select(el.dataset.id);
  });

  list?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target?.closest?.(".item");
    if (!el) return;
    e.preventDefault();
    select(el.dataset.id, { focus: true });
  });

  btnNew?.addEventListener("click", () => {
    const id = `c${contracts.length + 1}`;
    contracts.unshift({
      id,
      title: "Nuevo contrato",
      with: "—",
      status: "draft",
      budget: "$0",
      scope: "Define el scope y presupuesto (demo).",
      canRate: false,
    });
    select(id);
    announce("Se creó un nuevo contrato en draft (demo).");
  });

  realtime.on("contract:new", (evt) => {
    const id = `c${contracts.length + 1}`;
    contracts.unshift({
      id,
      title: "Contrato (borrador)",
      with: evt?.creator || "Creador",
      status: "draft",
      budget: "$0",
      scope: "Borrador creado desde contratación (demo).",
      canRate: false,
    });
    if ((location.hash || "#profile") === "#contracts") select(id);
    if (count) count.textContent = `${contracts.length}`;
  });

  renderList();
  select(contracts[0]?.id ?? null);
}

function initMessages() {
  const list = $("#conversations");
  const title = $("#chat-title");
  const presence = $("#chat-presence");
  const typing = $("#chat-typing");
  const log = $("#chat-messages");
  const form = $("#chat-form");
  const input = $("#chat-input");

  const conversations = [
    { id: "m1", with: "Valeria P.", handle: "@vale.fullstack", state: "online" },
    { id: "m2", with: "Leo M.", handle: "@leo.backend", state: "away" },
    { id: "m3", with: "Nina R.", handle: "@nina.ux", state: "offline" },
  ];

  /** @type {Record<string, {from:"me"|"them",text:string,ts:number}[]>} */
  const messages = {
    m1: [
      { from: "them", text: "¿Te interesa unirte al proyecto? Tengo un deadline ajustado.", ts: Date.now() - 1000 * 60 * 38 },
      { from: "me", text: "Sí. Puedo ayudarte si definimos scope y hitos.", ts: Date.now() - 1000 * 60 * 37 },
    ],
    m2: [{ from: "them", text: "Te paso el diagrama de microservicios en un rato.", ts: Date.now() - 1000 * 60 * 120 }],
    m3: [{ from: "them", text: "¿Podemos revisar el sistema de diseño Liquid Glass?", ts: Date.now() - 1000 * 60 * 300 }],
  };

  let activeId = conversations[0]?.id ?? null;
  let typingTimer = null;

  function renderConversations() {
    if (!list) return;
    list.innerHTML = "";
    conversations.forEach((c) => {
      const el = document.createElement("div");
      el.className = `item${c.id === activeId ? " is-selected" : ""}`;
      el.setAttribute("role", "option");
      el.setAttribute("tabindex", "0");
      el.setAttribute("aria-selected", String(c.id === activeId));
      el.dataset.id = c.id;
      el.innerHTML = `
        <div class="item__title"><span>${c.with}</span><span class="muted">${c.state}</span></div>
        <div class="item__sub">${c.handle}</div>
      `;
      list.appendChild(el);
    });
  }

  function renderActive() {
    const c = conversations.find((x) => x.id === activeId);
    if (!c) return;
    if (title) title.textContent = `${c.with} ${c.handle}`;
    if (presence) presence.textContent = `Presencia: ${c.state}`;
    if (!log) return;
    log.innerHTML = "";
    (messages[activeId] || []).forEach((m) => {
      const el = document.createElement("div");
      el.className = `msg${m.from === "me" ? " msg--me" : ""}`;
      el.innerHTML = `
        <div class="msg__bubble">${escapeHtml(m.text)}</div>
        <div class="msg__meta">${m.from === "me" ? "Tú" : c.with} · ${new Date(m.ts).toLocaleTimeString()}</div>
      `;
      log.appendChild(el);
    });
    log.scrollTop = log.scrollHeight;
  }

  function selectConversation(id) {
    activeId = id;
    renderConversations();
    renderActive();
    const c = conversations.find((x) => x.id === activeId);
    if (c) announce(`Conversación abierta con ${c.with}.`);
  }

  list?.addEventListener("click", (e) => {
    const el = e.target?.closest?.(".item");
    if (!el) return;
    selectConversation(el.dataset.id);
  });

  list?.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const el = e.target?.closest?.(".item");
    if (!el) return;
    e.preventDefault();
    selectConversation(el.dataset.id);
  });

  input?.addEventListener("input", () => {
    if (!typing) return;
    realtime.emit("chat:typing", { convId: activeId, who: "me" });
  });

  realtime.on("chat:typing", (evt) => {
    if (!typing) return;
    if (evt?.convId !== activeId) return;
    if (evt?.who === "them") {
      typing.textContent = "Escribiendo…";
      clearTimeout(typingTimer);
      typingTimer = setTimeout(() => {
        typing.textContent = "";
      }, 1200);
    }
  });

  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input?.value?.trim();
    if (!text) return;
    messages[activeId] ??= [];
    messages[activeId].push({ from: "me", text, ts: Date.now() });
    if (input) input.value = "";
    renderActive();
    announce("Mensaje enviado.");

    // Simulate echo + typing + reply
    realtime.emit("chat:typing", { convId: activeId, who: "them" });
    window.setTimeout(() => {
      messages[activeId].push({ from: "them", text: "Perfecto. Propongo 2 hitos y una review de alcance.", ts: Date.now() });
      renderActive();
      realtime.emit("notifs", { kind: "chat", title: "Nuevo mensaje", body: "Recibiste una respuesta (demo)." });
    }, 900);
  });

  renderConversations();
  selectConversation(activeId);
}

function initBilling() {
  const root = $("#plans");
  const state = $("#billing-state");
  if (!root) return;

  const plans = [
    { id: "free", name: "Free", price: "$0/mes", perks: ["Perfil público", "Portafolio básico", "Reviews verificadas"] },
    { id: "pro", name: "Pro", price: "$19/mes", perks: ["Mayor visibilidad", "Insights de perfil", "Herramientas premium"] },
    { id: "studio", name: "Studio", price: "$49/mes", perks: ["Prioridad en búsqueda", "Soporte prioritario", "Múltiples portafolios"] },
  ];

  let current = "free";

  function render() {
    root.innerHTML = "";
    plans.forEach((p) => {
      const el = document.createElement("section");
      el.className = "plan glass";
      el.innerHTML = `
        <div>
          <strong>${p.name}</strong>
          <div class="plan__price">${p.price}</div>
        </div>
        <div class="rows">
          ${p.perks.map((x) => `<div class="muted">• ${x}</div>`).join("")}
        </div>
        <div>
          <button class="btn ${p.id === current ? "btn--glass" : "btn--primary"}" type="button" data-plan="${p.id}">
            ${p.id === current ? "Plan actual" : "Elegir plan"}
          </button>
        </div>
      `;
      root.appendChild(el);
    });
    if (state) state.textContent = `Estado: ${current === "free" ? "Free" : current.toUpperCase()}`;
  }

  root.addEventListener("click", (e) => {
    const btn = e.target?.closest?.("button[data-plan]");
    if (!btn) return;
    const next = btn.getAttribute("data-plan");
    if (!next || next === current) return;
    current = next;
    render();
    announce(`Suscripción actualizada a ${next.toUpperCase()} (demo).`);
    realtime.emit("notifs", { kind: "billing", title: "Suscripción", body: `Plan cambiado a ${next.toUpperCase()} (demo).` });
  });

  render();
}

function initSettings() {
  const a = $("#set-announcements");
  const g = $("#set-guided-focus");
  const r = $("#set-reduce-motion");

  function sync() {
    if (a) a.checked = settings.announcements;
    if (g) g.checked = settings.guidedFocus;
    if (r) r.checked = settings.reduceMotion;
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
  }

  a?.addEventListener("change", () => {
    settings.announcements = a.checked;
    announce("Feedback hablado activado.");
  });
  g?.addEventListener("change", () => {
    settings.guidedFocus = g.checked;
    announce(settings.guidedFocus ? "Foco guiado activado." : "Foco guiado desactivado.");
  });
  r?.addEventListener("change", () => {
    settings.reduceMotion = r.checked;
    document.body.classList.toggle("reduce-motion", settings.reduceMotion);
    announce(settings.reduceMotion ? "Reducir movimiento activado." : "Reducir movimiento desactivado.");
  });

  $("#btn-export")?.addEventListener("click", () => {
    announce("Exportación iniciada (demo).");
    realtime.emit("notifs", { kind: "export", title: "Exportar", body: "Tu exportación está lista (demo)." });
  });

  $("#btn-signout")?.addEventListener("click", () => {
    announce("Sesión cerrada (demo).");
  });

  sync();
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function init() {
  initTabs();
  initDialog();
  initFollow();
  initNav();
  initNotifications();
  initPresenceHeartbeats();
  initPrimaryCTAs();
  initExplore();
  initContracts();
  initMessages();
  initBilling();
  initSettings();
  initRouter();

  // Initial guided focus: anchor on H1 for SR users without stealing focus from mouse users.
  // If user starts tabbing, they'll land on the first interactive element naturally.
  announce("Aplicación cargada. Estás en Devhub.");
}

init();

