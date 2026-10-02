// PART 1 · Countertop home screen: the recipe card and the jar.
// Reads everything from the hub (hub.js); the bell lives in bell.js.

const $ = (id) => document.getElementById(id),
  money = (n) =>
    new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency: "CAD",
    }).format(n),
  channelName = (c) =>
    ({ discord: "Discord", text: "text", instagram: "Instagram" })[c];

function toast(text) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = text;
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

// ── 1 · The recipe card ────────────────────────────────────────────────
function renderRecipe() {
  const plan = Hub.plan(),
    planned = Hub.planned();
  $("planList").innerHTML = plan.items
    .map(
      (i) =>
        `<li><span class="qty">${i.qty}</span><span>${i.emoji} ${i.name}<small>${i.note}</small></span></li>`,
    )
    .join("");
  $("planReason").textContent = plan.reason;
  $("planStamp").hidden = !planned;
  $("recipeNote").textContent = planned
    ? plan.items
        .map((i) => `${i.qty} ${i.name.split(" ").pop().toLowerCase()}`)
        .join(" · ")
    : "Tap to see what to make";
  $("soundsGood").textContent = planned ? "Planned ✓" : "Sounds good 👍";
}

function flipRecipe(open, focus = true) {
  $("recipe").classList.toggle("flipped", open);
  $("recipeFront").setAttribute("aria-hidden", String(open));
  $("recipeBack").setAttribute("aria-hidden", String(!open));
  $("recipeFront").tabIndex = open ? -1 : 0;
  $("recipeBack")
    .querySelectorAll("button")
    .forEach((b) => (b.tabIndex = open ? 0 : -1));
  if (focus)
    (open ? $("soundsGood") : $("recipeFront")).focus({ preventScroll: true });
}

// ── 3 · The jar (its data comes from the hub) ──────────────────────────
// Coins settle in a pile from the bottom of the jar; cookies sit among them.
const coinSpot = (i) => {
  const row = Math.floor(i / 6),
    col = i % 6;
  return { x: 52 + col * 19 + (row % 2) * 9, y: 190 - row * 9 };
};
function renderJar(newCoins = 0) {
  const s = Hub.summary(),
    coins = Math.min(84, Math.round((s.tonight / s.goal) * 84));
  let svg = "";
  for (let i = 0; i < coins; i++) {
    const { x, y } = coinSpot(i),
      fresh = i >= coins - newCoins ? "drop" : "";
    svg +=
      i % 7 === 3
        ? `<g class="${fresh}"><circle cx="${x}" cy="${y}" r="9" fill="#c48a4a" stroke="#8a5a2b" stroke-width="1.5"/><circle cx="${x - 3}" cy="${y - 2}" r="1.6" fill="#4f2a12"/><circle cx="${x + 3}" cy="${y + 2}" r="1.6" fill="#4f2a12"/></g>`
        : `<g class="${fresh}"><ellipse cx="${x}" cy="${y}" rx="9" ry="5" fill="#e3b04b" stroke="#9c6f1e" stroke-width="1.5"/></g>`;
  }
  $("jarCoins").innerHTML = svg;
  $("jarTonight").textContent = `${money(s.tonight)} tonight`;
  $("jarNote").textContent =
    `${s.claims} claim${s.claims === 1 ? "" : "s"} · ${Math.min(100, Math.round((s.tonight / s.goal) * 100))}% full`;
}

function renderJarSheet() {
  const s = Hub.summary();
  $("totals").innerHTML = `
    <div class="tile hot"><span>Tonight</span><b>${money(s.tonight)}</b><small>${s.claims} claims</small></div>
    <div class="tile"><span>This week</span><b>${money(s.week)}</b><small>from claims after a ring</small></div>
    <div class="tile"><span>Saved from the bin</span><b>${s.rescued}</b><small>treats that would have been thrown out</small></div>
    <div class="tile"><span>Seats & votes</span><b>${s.seats + s.votes}</b><small>${s.seats} seats saved · ${s.votes} votes</small></div>`;
  const max = Math.max(1, ...Object.values(s.byChannel)),
    names = { discord: "Discord", text: "Text", instagram: "Instagram" };
  $("channelBars").innerHTML = Object.entries(s.byChannel)
    .map(
      ([k, n]) =>
        `<div class="cbar"><span>${names[k]}</span><i style="width:${(n / max) * 100}%"></i><b>${n}</b></div>`,
    )
    .join("");
  $("soldList").innerHTML =
    Object.entries(s.sold)
      .sort((a, b) => b[1].cash - a[1].cash)
      .map(
        ([item, v]) =>
          `<li><span>${v.n} × ${item}</span><b>${money(v.cash)}</b></li>`,
      )
      .join("") || "<li><span>Nothing sold from a ring yet.</span></li>";
  const list = $("ringList");
  list.replaceChildren();
  for (const r of [...s.rings].reverse()) {
    const li = document.createElement("li"),
      result =
        r.kind === "poll"
          ? Object.entries(
              (r.votes || []).reduce(
                (m, v) => ((m[v] = (m[v] || 0) + 1), m),
                {},
              ),
            )
              .map(([o, n]) => `${o}: ${n}`)
              .join(" · ") || "votes coming in"
          : r.kind === "event"
            ? `${r.claims.length} seats saved`
            : `${r.claims.length} claimed · ${money(r.claims.reduce((t, c) => t + c.amount, 0))}`;
    li.innerHTML = `<span class="ring-kind"></span><span class="ring-text"><q></q><small></small></span>`;
    li.querySelector(".ring-kind").textContent =
      `${Hub.kinds[r.kind].emoji} ${r.time}`;
    li.querySelector("q").textContent = r.text;
    li.querySelector("small").textContent = result;
    list.append(li);
  }
}

// Every claim, from any channel, lands here.
let toastsThisRing = 0;
Hub.onClaim((claim, ring) => {
  if (toastsThisRing++ < 4)
    toast(
      ring.kind === "poll"
        ? `🗳️ ${claim.name} voted “${claim.choice}” on ${channelName(claim.channel)}`
        : ring.kind === "event"
          ? `✅ ${claim.name} saved a seat on ${channelName(claim.channel)}`
          : `🪙 ${claim.name} claimed on ${channelName(claim.channel)}`,
    );
  if (claim.amount > 0) {
    renderJar(1);
    wobble($("jarCard"));
  }
  if ($("jarDialog").open) renderJarSheet();
});
Hub.onRingDone((ring) => {
  toastsThisRing = 0;
  toast(
    ring.kind === "poll"
      ? `🗳️ ${ring.votes?.length || 0} votes in. Tap the jar to see the result.`
      : ring.kind === "event"
        ? `✅ ${ring.claims.length} seats saved.`
        : `🍪 ${ring.claims.length} claimed, ${money(ring.claims.reduce((s, c) => s + c.amount, 0))} in the jar.`,
  );
  renderJar();
});

// ── Wiring ─────────────────────────────────────────────────────────────
$("recipeFront").addEventListener("click", () => flipRecipe(true));
$("flipBack").addEventListener("click", () => flipRecipe(false));
$("soundsGood").addEventListener("click", () => {
  Hub.confirmPlan();
  renderRecipe();
  toast("📜 Today’s plan is set. Happy baking!");
  setTimeout(() => flipRecipe(false), 700);
});
$("jarCard").addEventListener("click", () => {
  renderJarSheet();
  $("jarDialog").showModal();
});
$("newDay").addEventListener("click", () => {
  Hub.newDay();
  renderRecipe();
  renderJar();
  renderJarSheet();
});
// Close a sheet by tapping outside it.
for (const d of document.querySelectorAll("dialog.sheet"))
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });

renderHeader();
renderRecipe();
renderJar();
flipRecipe(false, false);
