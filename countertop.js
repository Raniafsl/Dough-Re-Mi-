// PART 1 · Countertop home screen: the recipe card and the parfait.
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

// ── 3 · The parfait (its data comes from the hub) ──────────────────────
// Each ring pours one layer, and every paid claim from that ring makes it
// thicker. Yogurt separates the rings; the glass is full at tonight's goal.
const GLASS_BOTTOM = 194,
  GLASS_TOP = 32,
  YOGURT = 5,
  layerFor = (item) =>
    /cookie/i.test(item)
      ? { fill: "#c48a4a", fleck: "#8a5a2b" } // granola crumble
      : /parfait/i.test(item)
        ? { fill: "#e28a45", fleck: "#c2662a" } // pumpkin-maple cream
        : /cupcake/i.test(item)
          ? { fill: "#8b5a2b", fleck: "#5e3b1a" } // chocolate
          : { fill: "#e9b4c7", fleck: "#c46a88" }; // berries

function renderParfait(newClaims = 0) {
  const s = Hub.summary(),
    perDollar = (GLASS_BOTTOM - GLASS_TOP - YOGURT * 3) / s.goal,
    rings = s.rings.filter((r) => r.claims.some((c) => c.amount > 0));
  let y = GLASS_BOTTOM,
    svg = "";
  rings.forEach((r, i) => {
    const paid = r.claims.filter((c) => c.amount > 0),
      { fill, fleck } = layerFor(paid[0].item),
      latest = i === rings.length - 1 && newClaims > 0,
      fresh = latest
        ? paid.slice(-newClaims).reduce((t, c) => t + c.amount, 0) * perDollar
        : 0,
      h = Math.min(
        y - GLASS_TOP,
        paid.reduce((t, c) => t + c.amount, 0) * perDollar,
      );
    if (h <= 0) return;
    if (i > 0 && y - YOGURT > GLASS_TOP) {
      y -= YOGURT;
      svg += `<rect x="30" y="${y}" width="140" height="${YOGURT + 0.5}" fill="#fbf0dd"/>`;
    }
    y -= h;
    svg += `<rect x="30" y="${y}" width="140" height="${h - Math.min(fresh, h) + 0.5}" transform="translate(0 ${Math.min(fresh, h)})" fill="${fill}"/>`;
    if (fresh)
      svg += `<rect class="pour" x="30" y="${y}" width="140" height="${Math.min(fresh, h) + 0.5}" fill="${fill}"/>`;
    for (let k = 0; k < Math.min(14, Math.floor(h / 4) * 3); k++)
      svg += `<circle cx="${44 + ((k * 37) % 112)}" cy="${y + 3 + ((k * 13) % Math.max(1, h - 6))}" r="2" fill="${fleck}" opacity=".7"/>`;
  });
  $("parfaitLayers").innerHTML = svg;
  const full = s.tonight >= s.goal;
  $("parfaitTop").innerHTML = full
    ? `<g class="topping"><ellipse cx="100" cy="30" rx="58" ry="12" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><ellipse cx="100" cy="20" rx="38" ry="11" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><ellipse cx="100" cy="11" rx="18" ry="8" fill="#fffdf8" stroke="#b8a584" stroke-width="2.5"/><circle cx="104" cy="-2" r="7" fill="#c0392b"/><path d="M104 -8 q4 -8 10 -10" fill="none" stroke="#6d896c" stroke-width="2"/></g>`
    : "";
  $("parfaitTonight").textContent = `${money(s.tonight)} tonight`;
  $("parfaitNote").textContent = full
    ? `${s.claims} claims · topped off! 🍒`
    : `${s.claims} claim${s.claims === 1 ? "" : "s"} · ${Math.round((s.tonight / s.goal) * 100)}% of tonight’s goal`;
}

function renderParfaitSheet() {
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
    renderParfait(1);
    wobble($("parfaitCard"));
  }
  if ($("parfaitDialog").open) renderParfaitSheet();
});
Hub.onRingDone((ring) => {
  toastsThisRing = 0;
  toast(
    ring.kind === "poll"
      ? `🗳️ ${ring.votes?.length || 0} votes in. Tap the parfait to see the result.`
      : ring.kind === "event"
        ? `✅ ${ring.claims.length} seats saved.`
        : `🍪 ${ring.claims.length} claimed, ${money(ring.claims.reduce((s, c) => s + c.amount, 0))} in the parfait.`,
  );
  renderParfait();
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
$("parfaitCard").addEventListener("click", () => {
  renderParfaitSheet();
  $("parfaitDialog").showModal();
});
$("newDay").addEventListener("click", () => {
  Hub.newDay();
  renderRecipe();
  renderParfait();
  renderParfaitSheet();
});
// Close a sheet by tapping outside it.
for (const d of document.querySelectorAll("dialog.sheet"))
  d.addEventListener("click", (e) => {
    if (e.target === d) d.close();
  });

renderHeader();
renderRecipe();
renderParfait();
flipRecipe(false, false);
