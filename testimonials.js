// Neighbourhood testimonials and the friendly comparison with the chain.
const KIND_KEY = "drm-kind-words-v1";

const testimonials = [
  {
    name: "Mrs. Patel",
    tag: "Regular since 1998",
    stars: 5,
    text: "She remembered my granddaughter’s nut allergy three years after I mentioned it once. The chain asked me to spell my name twice.",
  },
  {
    name: "Milo R.",
    tag: "Office party, 48 cupcakes",
    stars: 5,
    text: "Grandma was honest about what a rush order really costs, then offered a pickup that worked for both of us. Still the best chocolate cupcakes on the block.",
  },
  {
    name: "June & Ada",
    tag: "Saturday picnics",
    stars: 5,
    text: "Lemon cupcakes that actually taste like lemons. We walk past two other bakeries to get here.",
  },
  {
    name: "Ben",
    tag: "Owner, the bookshop next door",
    stars: 5,
    text: "My customers come in smelling of cinnamon. That’s free advertising for both of us.",
  },
  {
    name: "The Okafor family",
    tag: "Birthday regulars",
    stars: 5,
    text: "Our kids helped fund the fall parfait and now they tell everyone it’s ‘their’ recipe.",
  },
  {
    name: "Daniel K.",
    tag: "Switched from the chain",
    stars: 5,
    text: "Same price, twice the care. The chain’s muffins are fine. Grandma’s are a reason to get up early.",
  },
  {
    name: "Lucía",
    tag: "Morning coffee crowd",
    stars: 4,
    text: "The parfaits come out faster since she rearranged the kitchen, and they’re still made by hand.",
  },
];

const versus = [
  ["Would recommend to a friend", 97, 61],
  ["Remembers my order", 92, 18],
  ["Baked fresh that morning", 100, 55],
  ["Custom orders priced fairly", 94, 47],
];

function loadKind() {
  try {
    const saved = JSON.parse(localStorage.getItem(KIND_KEY));
    if (Array.isArray(saved)) return saved;
  } catch {}
  return [];
}
let kindWords = loadKind(),
  featureIndex = 0,
  featureTimer;

const allQuotes = () => [...kindWords, ...testimonials];
const stars = (n) => "★".repeat(n) + "☆".repeat(5 - n);

function quoteCard(q, fresh) {
  const card = document.createElement("figure");
  card.className = "quote-card-small" + (fresh ? " fresh" : "");
  card.innerHTML = `<div class="stars"></div><blockquote></blockquote><figcaption><b></b><span></span></figcaption>`;
  card.querySelector(".stars").textContent = stars(q.stars);
  card
    .querySelector(".stars")
    .setAttribute("aria-label", `${q.stars} out of 5 stars`);
  card.querySelector("blockquote").textContent = `“${q.text}”`;
  card.querySelector("b").textContent = q.name;
  card.querySelector("span").textContent = q.tag;
  return card;
}

function renderWallOfLove() {
  const wall = $("quoteWall");
  wall.replaceChildren(
    ...allQuotes().map((q, i) => quoteCard(q, i < kindWords.length)),
  );
  const all = allQuotes(),
    total = 214 + kindWords.length,
    avg = (4.9 * 214 + kindWords.reduce((s, k) => s + k.stars, 0)) / total;
  $("ourScore").textContent = avg.toFixed(1);
  $("ourCount").textContent = `${stars(Math.round(avg))} · ${total} reviews`;
  $("quoteDots").innerHTML = all
    .map(
      (_, i) =>
        `<button type="button" aria-label="Show testimonial ${i + 1}" class="${i === featureIndex ? "on" : ""}" data-i="${i}"></button>`,
    )
    .join("");
}

function showFeature(i) {
  const all = allQuotes();
  featureIndex = (i + all.length) % all.length;
  const q = all[featureIndex];
  $("featureText").textContent = `“${q.text}”`;
  $("featureWho").textContent = `${stars(q.stars)}  ${q.name} · ${q.tag}`;
  $("quoteDots")
    .querySelectorAll("button")
    .forEach((b, n) => b.classList.toggle("on", n === featureIndex));
}

function startRotation() {
  clearInterval(featureTimer);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  featureTimer = setInterval(() => showFeature(featureIndex + 1), 7000);
}

$("versus").innerHTML =
  `<div class="versus-key"><span><i class="ours"></i>Grandma’s</span><span><i class="theirs"></i>The chain</span></div>` +
  versus
    .map(
      ([label, ours, theirs]) => `<div class="versus-row">
        <span>${label}</span>
        <div class="vbar ours" style="--w:${ours}%"><b>${ours}%</b></div>
        <div class="vbar theirs" style="--w:${theirs}%"><b>${theirs}%</b></div>
      </div>`,
    )
    .join("");

$("quoteDots").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-i]");
  if (!b) return;
  showFeature(Number(b.dataset.i));
  startRotation();
});

$("kindForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = $("kindName").value.trim(),
    text = $("kindText").value.trim();
  if (!name || !text) return;
  kindWords.unshift({
    name,
    text,
    stars: Number($("kindStars").value),
    tag: "Added just now",
  });
  try {
    localStorage.setItem(KIND_KEY, JSON.stringify(kindWords));
  } catch {}
  $("kindForm").reset();
  renderWallOfLove();
  showFeature(0);
  startRotation();
});

renderWallOfLove();
showFeature(0);
startRotation();
