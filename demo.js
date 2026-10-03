// A self-playing tour for the pitch: open index.html#demo (or press
// Shift+D). It drives the real Countertop, plan → ring → earn → monthly
// report, with captions, in about a minute. Press Stop (or Esc) to end it.
(function () {
  let run = 0,
    active = false;
  const bar = document.createElement("div");
  bar.className = "demo-bar";
  // A popover sits in the browser's top layer, so the captions stay visible
  // above the plan, bell and parfait sheets (which are modal dialogs).
  const popover = "showPopover" in bar;
  if (popover) bar.popover = "manual";
  else bar.hidden = true;
  bar.setAttribute("role", "status");
  bar.innerHTML = `<span class="demo-step"></span><p class="demo-text"></p><button type="button" class="demo-stop">Stop</button>`;
  document.body.append(bar);

  const stopped = new Error("stopped"),
    wait = (ms, id) =>
      new Promise((resolve, reject) =>
        setTimeout(() => (id === run ? resolve() : reject(stopped)), ms),
      ),
    click = (target) => {
      (typeof target === "string" ? $(target) : target)?.click();
      if (active) showBar();
    };

  function showBar() {
    if (!popover) return (bar.hidden = false);
    if (bar.matches(":popover-open")) bar.hidePopover();
    bar.showPopover(); // re-opening puts it above any sheet opened since
  }
  function hideBar() {
    if (!popover) return (bar.hidden = true);
    if (bar.matches(":popover-open")) bar.hidePopover();
  }
  function say(step, text) {
    bar.querySelector(".demo-step").textContent = step;
    bar.querySelector(".demo-text").textContent = text;
    showBar();
  }
  async function type(input, text, id) {
    input.focus();
    input.value = "";
    for (const ch of text) {
      input.value += ch;
      input.dispatchEvent(new Event("input", { bubbles: true }));
      await wait(55, id);
    }
  }
  const closeSheets = () =>
    document.querySelectorAll("dialog[open]").forEach((d) => d.close());
  const show = (id) =>
    $(id).scrollIntoView({ behavior: "smooth", block: "center" });

  async function tour() {
    const id = ++run;
    active = true;
    document.body.classList.add("demo-on");
    try {
      closeSheets();
      await Hub.newDay();
      window.scrollTo({ top: 0, behavior: "smooth" });
      say(
        "Grandma’s Bakeria",
        "The Bakery opened next door. So we built Grandma a countertop: three cards, nothing else to learn.",
      );
      await wait(4200, id);

      // 1 · Plan
      show("recipeCard");
      say(
        "1 · Plan",
        "She taps the recipe card: what to bake today, and one plain reason why.",
      );
      await wait(1600, id);
      click("recipeCard");
      await wait(2400, id);
      say(
        "1 · Plan",
        "Cookies sold out yesterday, so she bakes a few more and finalises the plan.",
      );
      click($("planRows").querySelector('[data-i="0"][data-step="1"]'));
      await wait(1600, id);
      click("finalisePlan");
      await wait(2200, id);

      // 2 · Ring
      show("bellCard");
      say(
        "2 · Ring",
        "Six parfaits are left over. She rings the bell and says one sentence…",
      );
      await wait(1400, id);
      click("bellCard");
      await wait(900, id);
      click(document.querySelector('[data-kind="treats"]'));
      await type($("saySentence"), "Six parfaits left, half price", id);
      await wait(800, id);
      say(
        "2 · Ring",
        "…and it becomes an Instagram post, a Discord message and a text, all at once.",
      );
      await wait(3200, id);
      click("ringBtn");
      await wait(2400, id);

      // 3 · Earn
      show("parfaitCard");
      say("3 · Earn", "As the day goes on, she scans each receipt.");
      await wait(1400, id);
      click("parfaitCard");
      await wait(900, id);
      click("sampleReceipt");
      for (
        let t = 0;
        t < 40 && ($("logSale").disabled || $("scanResult").hidden);
        t++
      )
        await wait(500, id);
      say(
        "3 · Earn",
        "The app reads the total and card or cash. She checks it, and adds it.",
      );
      await wait(2600, id);
      click("logSale");
      await wait(1200, id);
      closeSheets();
      show("parfaitCard");
      say("3 · Earn", "Every receipt pours another layer of the parfait…");
      for (const [amount, method, item] of [
        [48.5, "card", "Fall Parfait"],
        [62.25, "cash", "Maple Cookies"],
        [85, "card", "Chocolate Cupcakes"],
        [74.4, "card", "Lemon Cupcakes"],
        [66, "cash", "Fall Parfait"],
        [58, "card", "Maple Cookies"],
      ]) {
        Hub.addSale({
          amount,
          method,
          source: "scan",
          items: [{ name: item, amount }],
        });
        await wait(750, id);
      }
      say(
        "3 · Earn",
        "…until today’s goal is reached: cream and a cherry on top.",
      );
      await wait(3200, id);

      // Monthly check-in
      show("letterBtn");
      say(
        "Every month",
        "A poll goes out by itself, and the answers come back as a letter on her counter.",
      );
      await wait(1600, id);
      click("letterBtn");
      await wait(3000, id);
      const trial = $("addTrial");
      if (trial && !trial.disabled) {
        say(
          "Every month",
          "The neighbours’ favourite goes straight onto tomorrow’s plan as a trial batch.",
        );
        click(trial);
        await wait(2600, id);
      }
      closeSheets();

      // Close
      show("grandma");
      await wait(900, id);
      click("grandma");
      say(
        "Countertop",
        "Plan, ring, earn. Less time guessing, less food thrown out, and Grandma keeps the keys.",
      );
      await wait(5000, id);
    } catch (err) {
      if (err !== stopped) throw err;
    } finally {
      if (id === run) end();
    }
  }

  function end() {
    run++;
    active = false;
    hideBar();
    document.body.classList.remove("demo-on");
  }

  bar.querySelector(".demo-stop").addEventListener("click", () => {
    end();
    closeSheets();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "D" && e.shiftKey && !e.target.closest?.("input, textarea"))
      active ? end() : tour();
    if (e.key === "Escape" && active) end();
  });
  if (location.hash === "#demo") setTimeout(tour, 900);
  window.addEventListener(
    "hashchange",
    () => location.hash === "#demo" && !active && tour(),
  );
})();
