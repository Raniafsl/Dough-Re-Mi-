// PART 2 · The shop bell: four picture buttons, one sentence (typed or
// spoken), three channel previews, and the ring itself.
// Uses Hub.rewrite and Hub.ring; claims come back through the hub.

let kind = "treats";

function renderKinds() {
  $("kinds").innerHTML = Object.entries(Hub.kinds)
    .map(
      ([k, v]) =>
        `<button type="button" role="radio" aria-checked="${k === kind}" class="kind${k === kind ? " on" : ""}" data-kind="${k}"><span aria-hidden="true">${v.emoji}</span>${v.label}</button>`,
    )
    .join("");
  $("saySentence").placeholder = Hub.kinds[kind].example;
}

function renderPreviews() {
  const m = Hub.rewrite(kind, $("saySentence").value);
  $("instaEmoji").textContent = m.insta.emoji;
  $("instaHead").textContent = m.insta.head;
  $("instaText").textContent = m.insta.text;
  $("discordHead").textContent = m.discord.head;
  $("discordText").textContent = m.discord.text;
  $("discordActions").replaceChildren(
    ...m.discord.actions.map((a) => {
      const b = document.createElement("span");
      b.textContent = a;
      return b;
    }),
  );
  $("smsText").textContent = m.sms;
  $("smsCount").textContent = `${m.sms.length} / 160 characters`;
}

// A small brass "ding", made in the browser.
function ding() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)(),
      now = ctx.currentTime;
    for (const [f, v] of [
      [1318, 0.32],
      [2637, 0.12],
      [3951, 0.05],
    ]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.frequency.value = f;
      g.gain.setValueAtTime(v, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
      o.connect(g).connect(ctx.destination);
      o.start(now);
      o.stop(now + 1.7);
    }
  } catch {}
}

function ringTheBell() {
  Hub.ring({ kind, text: $("saySentence").value || Hub.kinds[kind].example });
  ding();
  wobble($("bellIcon"));
  wobble($("bellCard"));
  const m = Hub.mode();
  $("ringStatus").textContent = m.discord
    ? `Ding! Posted in #${m.channel || "campus-eats"} on Discord. Instagram and text are previews in this build.`
    : m.live
      ? "Ding! Saved on the server, but Discord isn’t connected yet."
      : "Ding! Demo mode: student replies are simulated.";
  $("ringBtn").disabled = true;
  setTimeout(() => {
    $("bellDialog").close();
    $("ringBtn").disabled = false;
    $("ringStatus").textContent = "";
    $("saySentence").value = "";
    renderPreviews();
  }, 1400);
}

$("bellCard").addEventListener("click", () => {
  wobble($("bellIcon"));
  renderKinds();
  renderPreviews();
  $("bellDialog").showModal();
  $("saySentence").focus();
});
$("kinds").addEventListener("click", (e) => {
  const b = e.target.closest("[data-kind]");
  if (!b) return;
  kind = b.dataset.kind;
  renderKinds();
  renderPreviews();
  $("saySentence").focus();
});
$("saySentence").addEventListener("input", renderPreviews);
$("saySentence").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    ringTheBell();
  }
});
$("ringBtn").addEventListener("click", ringTheBell);

// Speaking works where the browser supports it (Chrome, Edge, Safari);
// typing always works.
const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
if (Speech) {
  $("micBtn").hidden = false;
  $("micBtn").addEventListener("click", () => {
    const rec = new Speech();
    rec.lang = "en-CA";
    rec.onresult = (e) => {
      $("saySentence").value = e.results[0][0].transcript;
      renderPreviews();
    };
    rec.onend = () => $("micBtn").classList.remove("listening");
    $("micBtn").classList.add("listening");
    rec.start();
  });
}
