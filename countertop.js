// PART 1 · Countertop home screen: the recipe card and the parfait.
// Reads everything from the hub (hub.js); the bell lives in bell.js.

const $ = (id) => document.getElementById(id),
  money = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(n);

function toast(text, iconName) {
  const t = document.createElement("div");
  t.className = "toast";
  t.innerHTML = iconName ? icon(iconName, "ico ico-sm") : "";
  t.append(text);
  $("toasts").append(t);
  setTimeout(() => t.remove(), 3600);
  while ($("toasts").children.length > 3) $("toasts").firstChild.remove();
}
function wobble(el) {
  el.classList.remove("wobble");
  void el.getBoundingClientRect();
  el.classList.add("wobble");
}

function renderHeader() {
  $("todayDate").textContent = new Date().toLocaleDateString("en-CA", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const h = new Date().getHours();
  $("hello").textContent =
    `${h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"}, Grandma.`;
}

// ── 1 · The recipe card and the plan sheet ─────────────────────────────
// The card shows the finalised plan once Grandma has accepted it; tapping it
// opens the plan sheet, where she can adjust the suggestions and finalise.
let draft = [];
// Plans saved before icons existed still find theirs by id.
const iconFor = (item) =>
  item.icon || Hub.plan().items.find((p) => p.id === item.id)?.icon || "cookie";

function renderRecipe() {
  const final = Hub.finalPlan(),
    items = final?.items.filter((i) => i.qty > 0) || [];
  $("planStamp").hidden = !final;
  $("recipeEmoji").hidden = !!final;
  $("cardPlan").hidden = !final;
  $("cardPlan").innerHTML = items
    .map(
      (i) =>
        `<li>${icon(iconFor(i), "ico ico-sm")}<b>${i.qty}</b> ${i.name}</li>`,
    )
    .join("");
  $("recipeNote").textContent = final
    ? `Finalised at ${final.at} · tap to change`
    : "Tap to see today’s plan";
}

function startDraft(fromSuggestions = false) {
  const final = Hub.finalPlan();
  draft = Hub.plan().items.map((s) => {
    const kept = !fromSuggestions && final?.items.find((f) => f.id === s.id);
    return { ...s, suggested: s.qty, qty: kept ? kept.qty : s.qty };
  });
}

function renderPlanSheet() {
  const plan = Hub.plan(),
    final = Hub.finalPlan();
  $("planReason").textContent = plan.reason;
  const rows = $("planRows");
  rows.replaceChildren();
  draft.forEach((d, i) => {
    const li = document.createElement("li");
    li.className = "plan-row" + (d.qty === 0 ? " skipped" : "");
    li.innerHTML = `
      <span class="plan-emoji">${icon(d.icon, "ico ico-lg")}</span>
      <span class="plan-what"><b>${d.name}</b><small>${d.when} · ${d.why}</small>
        ${d.qty !== d.suggested ? `<em>suggested ${d.suggested}</em>` : ""}</span>
      <span class="stepper" role="group" aria-label="${d.name}">
        <button type="button" data-i="${i}" data-step="-1" aria-label="Fewer ${d.name}">−</button>
        <output aria-live="polite">${d.qty}</output>
        <button type="button" data-i="${i}" data-step="1" aria-label="More ${d.name}">+</button>
      </span>
      <button type="button" class="skip" data-i="${i}" data-skip aria-pressed="${d.qty === 0}">${d.qty === 0 ? "Add back" : "Skip"}</button>`;
    rows.append(li);
  });
  const baking = draft
      .filter((d) => d.qty > 0)
      .map((d) => ({
        when: d.when,
        icon: d.icon,
        text: `Bake ${d.qty} ${d.name}`,
      })),
    toMinutes = (t) => {
      const [, h, m, ap] = t.match(/(\d+):(\d+) (AM|PM)/);
      return ((Number(h) % 12) + (ap === "PM" ? 12 : 0)) * 60 + Number(m);
    };
  $("agendaList").innerHTML = [...baking, ...plan.agenda]
    .sort((a, b) => toMinutes(a.when) - toMinutes(b.when))
    .map(
      (a) =>
        `<li><time>${a.when}</time>${icon(a.icon, "ico ico-sm")}<span>${a.text}</span></li>`,
    )
    .join("");
  $("finalisePlan").textContent = final
    ? "Update today’s plan ✓"
    : "Finalise today’s plan ✓";
  $("planStatus").textContent = final ? `Finalised at ${final.at}.` : "";
}

function openPlan() {
  startDraft();
  renderPlanSheet();
  $("planDialog").showModal();
  $("finalisePlan").focus();
}

function renderMode(m) {
  const chip = $("modeChip");
  if (!chip) return;
  chip.classList.toggle("live", m.live && m.discord);
  chip.textContent = m.live
    ? m.discord
      ? `● Live on Discord${m.channel ? ` #${m.channel}` : ""}`
      : "● Server on · Discord not connected"
    : "Demo mode · replies simulated";
}

// ── 3 · The parfait: today's takings, from scanned receipts ────────────
// Every receipt pours one layer (its colour follows what sold), with yogurt
// between them; the glass is full at the day's goal.
const GLASS_BOTTOM = 194,
  GLASS_TOP = 32,
  YOGURT = 4,
  layerFor = (item = "") =>
    /cookie/i.test(item)
      ? { fill: "#c48a4a", fleck: "#8a5a2b" } // granola crumble
      : /parfait/i.test(item)
        ? { fill: "#e28a45", fleck: "#c2662a" } // pumpkin-maple cream
        : /chocolate|cupcake|brownie/i.test(item)
          ? { fill: "#8b5a2b", fleck: "#5e3b1a" } // chocolate
          : /lemon/i.test(item)
            ? { fill: "#f2d572", fleck: "#c9a63a" } // lemon curd
            : { fill: "#e9b4c7", fleck: "#c46a88" }; // berries

function renderParfait(fresh = false) {
  const s = Hub.summary(),
    perDollar = (GLASS_BOTTOM - GLASS_TOP - YOGURT * 4) / s.goal;
  let y = GLASS_BOTTOM,
    svg = "";
  s.sales.forEach((sale, i) => {
    const h = Math.min(y - GLASS_TOP, Math.max(4, sale.amount * perDollar));
    if (h <= 0) return;
    if (i > 0 && y - YOGURT > GLASS_TOP) {
      y -= YOGURT;
      svg += `<rect x="30" y="${y}" width="140" height="${YOGURT + 0.5}" fill="#fbf0dd"/>`;
    }
    y -= h;
    const { fill, fleck } = layerFor(sale.items?.[0]?.name),
      pour = fresh && i === s.sales.length - 1 ? ' class="pour"' : "";
    svg += `<g${pour}><rect x="30" y="${y}" width="140" height="${h + 0.5}" fill="${fill}"/>`;
    for (let k = 0; k < Math.min(10, Math.floor(h / 4) * 2); k++)
      svg += `<circle cx="${44 + ((k * 37 + i * 11) % 112)}" cy="${y + 3 + ((k * 13) % Math.max(1, h - 6))}" r="2" fill="${fleck}" opacity=".7"/>`;
    svg += "</g>";
  });
  $("parfaitLayers").innerHTML = svg;
  const full = s.today >= s.goal;
  $("parfaitTop").innerHTML = full
    ? `<g class="topping"><ellipse cx="100" cy="30" rx="58" ry="12" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><ellipse cx="100" cy="20" rx="38" ry="11" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><ellipse cx="100" cy="11" rx="18" ry="8" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><circle cx="104" cy="-2" r="7" fill="#c0392b"/><path d="M104 -8 q4 -8 10 -10" fill="none" stroke="#6d896c" stroke-width="2"/></g>`
    : "";
  $("parfaitTonight").textContent = `${money(s.today)} today`;
  $("parfaitNote").textContent = full
    ? `${s.count} receipts · goal reached! 🍒`
    : `${s.count} receipt${s.count === 1 ? "" : "s"} · ${Math.round((s.today / s.goal) * 100)}% of today’s ${money(s.goal)} goal`;
}

function renderParfaitSheet() {
  const s = Hub.summary();
  $("totals").innerHTML = `
    <div class="tile hot"><span>Today</span><b>${money(s.today)}</b><small>${Math.min(100, Math.round((s.today / s.goal) * 100))}% of the ${money(s.goal)} goal</small></div>
    <div class="tile"><span>Receipts</span><b>${s.count}</b><small>average ${money(s.average)}</small></div>
    <div class="tile"><span>This week</span><b>${money(s.week)}</b><small>Monday to today</small></div>
    <div class="tile"><span>Still to go</span><b>${money(Math.max(0, s.goal - s.today))}</b><small>to fill the parfait</small></div>`;
  const methods = [
      ["Card", s.byMethod.card],
      ["Cash", s.byMethod.cash],
      ["Not sure", s.byMethod.other],
    ].filter(([, v]) => v > 0),
    max = Math.max(1, ...methods.map(([, v]) => v));
  $("methodBars").innerHTML =
    methods
      .map(
        ([k, v]) =>
          `<div class="cbar"><span>${k}</span><i style="width:${(v / max) * 100}%"></i><b>${money(v)}</b></div>`,
      )
      .join("") || '<p class="fine">No receipts yet.</p>';
  const sold = $("soldList");
  sold.replaceChildren();
  const items = Object.entries(s.items).sort((a, b) => b[1].cash - a[1].cash);
  if (!items.length)
    sold.innerHTML =
      "<li><span>Items show up here when a receipt lists them.</span></li>";
  for (const [name, v] of items.slice(0, 8)) {
    const li = document.createElement("li");
    li.innerHTML = "<span></span><b></b>";
    li.querySelector("span").textContent = `${v.n} × ${name}`;
    li.querySelector("b").textContent = money(v.cash);
    sold.append(li);
  }
  const list = $("receiptList");
  list.replaceChildren();
  for (const sale of [...s.sales].reverse()) {
    const li = document.createElement("li");
    li.innerHTML = `<span class="r-time"></span><span class="r-what"></span><b></b><button type="button" class="remove-sale">×</button>`;
    li.querySelector(".r-time").textContent = sale.time;
    li.querySelector(".r-what").textContent = [
      sale.method === "card" ? "Card" : sale.method === "cash" ? "Cash" : null,
      sale.source === "typed" ? "typed in" : "scanned",
    ]
      .filter(Boolean)
      .join(" · ");
    li.querySelector("b").textContent = money(sale.amount);
    const x = li.querySelector("button");
    x.setAttribute(
      "aria-label",
      `Remove the ${money(sale.amount)} receipt from ${sale.time}`,
    );
    x.addEventListener("click", () => Hub.removeSale(sale.id));
    list.append(li);
  }
}

Hub.onSales((e) => {
  renderParfait(e.type === "added");
  if (e.type === "added") wobble($("parfaitCard"));
  if ($("parfaitDialog").open) renderParfaitSheet();
  const s = Hub.summary();
  if (
    e.type === "added" &&
    s.today >= s.goal &&
    s.today - e.sale.amount < s.goal
  )
    toast("The parfait is full: today’s goal is reached!", "parfait");
});

// ── The monthly check-in letter ────────────────────────────────────────
const longDate = (d) =>
  new Date(d).toLocaleDateString("en-CA", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

function renderLetter() {
  const m = Hub.monthly(),
    fresh = m.reports[0] && !m.reports[0].seen;
  $("letterBadge").hidden = !(fresh || m.current?.open);
  $("letterBadge").textContent = m.current?.open ? "Voting now" : "New report";
  $("letterBtn").classList.toggle("has-news", !!(fresh || m.current?.open));
  $("letterBtn").setAttribute(
    "aria-label",
    `Monthly check-in${m.current?.open ? ", voting now" : fresh ? ", new report" : ""}`,
  );
}

function bars(results) {
  const total = results.reduce((t, [, n]) => t + n, 0) || 1;
  return results
    .map(
      ([o, n], i) => `<div class="vote-row${i === 0 ? " top" : ""}">
        <span class="vote-label"></span>
        <span class="vote-track"><i style="width:${(n / total) * 100}%"></i></span>
        <b>${Math.round((n / total) * 100)}%</b>
      </div>`,
    )
    .join("");
}
function fillLabels(box, results) {
  box
    .querySelectorAll(".vote-label")
    .forEach((el, i) => (el.textContent = results[i][0]));
}

function renderMonthlySheet() {
  const m = Hub.monthly(),
    box = $("reportBox"),
    report = m.reports[0];
  $("monthlyLede").textContent =
    `Goes out by itself on the 1st of every month at 10 AM, to Discord, Instagram and text. Voting stays open ${m.closeDays} days, then the results land on your counter.`;
  if (m.current?.open) {
    const results = m.current.options.map((o) => [o, m.current.votes[o] || 0]),
      total = results.reduce((t, [, n]) => t + n, 0);
    $("reportHead").textContent = "Voting now";
    box.innerHTML = `<p class="report-head">“${m.current.question}”</p>
      ${bars(results)}
      <p class="fine">${total} vote${total === 1 ? "" : "s"} so far · closes ${longDate(m.current.closesAt)}</p>
      <button type="button" class="secondary-btn" id="closeNow">Close voting now</button>`;
    fillLabels(box, results);
    box.querySelector("#closeNow").addEventListener("click", () => {
      Hub.closeMonthlyNow();
      $("monthlyStatus").textContent = "Closing the poll…";
    });
  } else if (report) {
    const [top, second] = report.results,
      total = report.results.reduce((t, [, n]) => t + n, 0),
      share = Math.round((top[1] / (total || 1)) * 100),
      trialToday =
        m.trial?.name === top[0] && m.trial?.day === new Date().toDateString(),
      ch = report.byChannel || {};
    $("reportHead").textContent = `${report.month}’s report`;
    box.innerHTML = `<p class="report-head">The neighbours want <b class="top-pick"></b>.</p>
      ${bars(report.results)}
      <p class="takeaway"></p>
      <p class="fine">${total} votes · ${ch.discord || 0} on Discord, ${ch.text || 0} by text, ${ch.instagram || 0} on Instagram</p>
      <button type="button" class="big-btn" id="addTrial" ${trialToday ? "disabled" : ""}>${trialToday ? "On today’s plan ✓" : "Add a trial batch to today’s plan"}</button>`;
    box.querySelector(".top-pick").textContent = top[0];
    box.querySelector(".takeaway").textContent =
      `${share}% picked it${second ? `, and “${second[0]}” came second` : ""}. A small trial batch is a safe way to start.`;
    fillLabels(box, report.results);
    box.querySelector("#addTrial").addEventListener("click", () => {
      Hub.addTrial(top[0], report.month);
      renderMonthlySheet();
      toast(`${top[0]} added to today’s plan as a trial batch.`, "scroll");
    });
  } else {
    $("reportHead").textContent = "Latest report";
    box.innerHTML =
      '<p class="fine">No reports yet. The first one arrives after the 1st.</p>';
  }
  $("nextHead").textContent = `Next poll · ${longDate(m.nextRun)}, 10 AM`;
  if (document.activeElement?.closest?.("#monthlyOptions, #monthlyQuestion"))
    return;
  $("monthlyQuestion").value = m.question;
  $("monthlyOptions").innerHTML = [0, 1, 2, 3]
    .map(
      (i) =>
        `<label class="field">Choice ${i + 1}<input type="text" maxlength="60" data-opt="${i}" /></label>`,
    )
    .join("");
  $("monthlyOptions")
    .querySelectorAll("input")
    .forEach((inp, i) => (inp.value = m.options[i] || ""));
  $("monthlySendNow").disabled = !!m.current?.open;
}

function saveMonthlyFields() {
  Hub.setMonthly({
    question: $("monthlyQuestion").value,
    options: [...$("monthlyOptions").querySelectorAll("input")].map(
      (i) => i.value,
    ),
  });
}

Hub.onMonthly((e) => {
  renderLetter();
  if ($("monthlyDialog").open) renderMonthlySheet();
  if (e.type === "report") {
    toast(
      "Your monthly report is in. Tap the letter on the counter.",
      "letter",
    );
    wobble($("letterBtn"));
  }
});

// ── Grandma ────────────────────────────────────────────────────────────
// She sways when you hover, and says something kind when you tap her.
function grandmaLine() {
  const final = Hub.finalPlan(),
    s = Hub.summary(),
    lines = [
      "Have you eaten yet, dear?",
      "Midterms week! I’ll keep the cookies coming.",
      "Take a cookie for the road.",
      "The Bakery next door can’t copy a grandma.",
    ];
  if (!final)
    lines.unshift("Shall we look at today’s bake? Tap the recipe card.");
  if (s.today >= s.goal) lines.unshift("Look at that parfait! Cherry on top!");
  else if (s.count > 4) lines.unshift("Busy day! The parfait is growing.");
  if (Hub.monthly().reports[0] && !Hub.monthly().reports[0].seen)
    lines.unshift("A letter came! The neighbours voted.");
  return lines[Math.floor(Math.random() * Math.min(lines.length, 3))];
}
let grandmaTimer;
function grandmaSays(text) {
  const say = $("grandmaSays");
  say.textContent = text;
  say.hidden = false;
  clearTimeout(grandmaTimer);
  grandmaTimer = setTimeout(() => (say.hidden = true), 3800);
}
function hearts() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  for (let i = 0; i < 4; i++) {
    const h = document.createElement("span");
    h.className = "heart-pop";
    h.textContent = "♥";
    h.style.left = `${30 + Math.random() * 40}%`;
    h.style.animationDelay = `${i * 0.12}s`;
    $("grandma").append(h);
    setTimeout(() => h.remove(), 1600);
  }
}

// ── Wiring ─────────────────────────────────────────────────────────────
$("recipeCard").addEventListener("click", openPlan);
$("planRows").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (!b) return;
  const d = draft[Number(b.dataset.i)];
  if ("skip" in b.dataset) d.qty = d.qty === 0 ? d.suggested : 0;
  else d.qty = Math.max(0, d.qty + Number(b.dataset.step) * d.step);
  renderPlanSheet();
  const again = $("planRows").querySelector(
    `button[data-i="${b.dataset.i}"]${"skip" in b.dataset ? "[data-skip]" : `[data-step="${b.dataset.step}"]`}`,
  );
  again?.focus();
});
$("useSuggested").addEventListener("click", () => {
  startDraft(true);
  renderPlanSheet();
  $("planStatus").textContent = "Back to Grandma’s suggestions.";
});
$("finalisePlan").addEventListener("click", () => {
  Hub.finalisePlan(draft);
  renderRecipe();
  renderPlanSheet();
  wobble($("recipeCard"));
  toast("Today’s plan is final. Happy baking!", "scroll");
  setTimeout(() => $("planDialog").close(), 900);
});
$("parfaitCard").addEventListener("click", () => {
  renderParfaitSheet();
  $("parfaitDialog").showModal();
});
$("newDay").addEventListener("click", async () => {
  await Hub.newDay();
  renderRecipe();
  renderParfait();
  renderParfaitSheet();
});
// Close a sheet by tapping outside it.
for (const d of document.querySelectorAll("dialog.sheet"))
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });
Hub.onMode(renderMode);
Hub.onSync(() => {
  renderRecipe();
  renderParfait();
  renderLetter();
});
$("letterBtn").addEventListener("click", () => {
  Hub.markReportSeen();
  renderLetter();
  renderMonthlySheet();
  $("monthlyDialog").showModal();
});
$("monthlySave").addEventListener("click", () => {
  saveMonthlyFields();
  $("monthlyStatus").textContent = "Saved. These go out on the 1st.";
});
$("monthlySendNow").addEventListener("click", () => {
  saveMonthlyFields();
  Hub.runMonthly();
  $("monthlyStatus").textContent = Hub.mode().discord
    ? "Sent to Discord. Votes will show up here as they come in."
    : "Sent. Votes will show up here as they come in.";
  renderMonthlySheet();
});
$("grandma").addEventListener("click", () => {
  $("grandma").classList.remove("giggle");
  void $("grandma").offsetWidth;
  $("grandma").classList.add("giggle");
  hearts();
  grandmaSays(grandmaLine());
});

renderHeader();
renderRecipe();
renderParfait();
renderMode(Hub.mode());
renderLetter();
