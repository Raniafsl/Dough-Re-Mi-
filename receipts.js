// Receipt scanning: Grandma photographs a receipt, the browser reads it
// (Tesseract OCR, loaded only when first needed), and she confirms the total
// before it's logged as a sale through the hub.

const TESSERACT_URL =
  "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";
let ocrWorker = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = () =>
      reject(
        new Error(
          "Couldn’t load the receipt reader. Check the internet connection, or type the total in.",
        ),
      );
    document.head.append(s);
  });
}
async function readText(image, onProgress) {
  if (!window.Tesseract) await loadScript(TESSERACT_URL);
  if (!ocrWorker)
    ocrWorker = await Tesseract.createWorker("eng", 1, {
      logger: (m) =>
        m.status === "recognizing text" && onProgress?.(m.progress),
    });
  const { data } = await ocrWorker.recognize(image);
  return data.text;
}

// Turn the receipt's text into { total, method, items }. Receipts vary, so
// this looks for a TOTAL line first and falls back to the largest amount.
const SKIP =
  /sub\s*-?\s*total|total|tax|gst|hst|pst|visa|master|amex|debit|credit|card|cash|change|tend|balance|approved|tip/i;
function parseReceipt(text) {
  const lines = text
      .split("\n")
      .map((l) => l.replace(/[|]/g, " ").trim())
      .filter(Boolean),
    amountIn = (l) => {
      const m = l.replace(/,/g, ".").match(/(\d{1,4}\.\d{2})(?!.*\d\.\d{2})/);
      return m ? Number(m[1]) : null;
    };
  let total = null;
  for (const l of lines)
    if (/total/i.test(l) && !/sub\s*-?\s*total/i.test(l) && amountIn(l) != null)
      total = amountIn(l);
  const amounts = lines.map(amountIn).filter((a) => a != null);
  if (total == null && amounts.length) total = Math.max(...amounts);
  const method = /visa|master|amex|debit|credit|card|approved|chip|tap/i.test(
    text,
  )
    ? "card"
    : /\bcash\b|change due/i.test(text)
      ? "cash"
      : null;
  const items = lines
    .filter((l) => amountIn(l) != null && !SKIP.test(l))
    .map((l) => ({
      name: l
        .replace(/(\d{1,4}[.,]\d{2})\s*$/, "")
        .replace(/\b[xX]\s?\d+\b|\b\d+\s?[xX]\b|[$@]/g, "")
        .replace(/\s{2,}/g, " ")
        .trim()
        .replace(/^\W+|\W+$/g, ""),
      amount: amountIn(l),
    }))
    .filter((i) => i.name.length > 1)
    .slice(0, 12);
  return { total, method, items };
}

// A printed-looking sample receipt, so the demo works without a camera.
const SAMPLE_LINES = [
  ["Fall Parfait", 6.5],
  ["Maple Cookie", 2.5],
  ["Chocolate Cupcake", 3.5],
  ["Chai Latte", 4.75],
  ["Lemon Cupcake", 3.5],
  ["Coffee", 3.0],
];
function sampleReceipt() {
  const picks = [...SAMPLE_LINES].sort(() => Math.random() - 0.5).slice(0, 3),
    rows = picks.map(([name, price]) => {
      const qty = 1 + Math.floor(Math.random() * 3);
      return [name, qty, price * qty];
    }),
    subtotal = rows.reduce((t, r) => t + r[2], 0),
    tax = Math.round(subtotal * 0.13 * 100) / 100,
    total = subtotal + tax,
    card = Math.random() < 0.65,
    now = new Date(),
    lines = [
      ["center", "GRANDMA'S BAKERIA"],
      ["center", "12 Maple Street"],
      [
        "center",
        `${now.toLocaleDateString("en-CA")}  ${now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
      ],
      ["rule"],
      ...rows.map(([n, q, a]) => ["row", `${n} x${q}`, a.toFixed(2)]),
      ["rule"],
      ["row", "SUBTOTAL", subtotal.toFixed(2)],
      ["row", "TAX", tax.toFixed(2)],
      ["row", "TOTAL", total.toFixed(2), true],
      ["row", card ? "VISA APPROVED" : "CASH", total.toFixed(2)],
      ["blank"],
      ["center", "Thank you, dear!"],
    ],
    scale = 2,
    w = 380,
    lh = 30,
    canvas = document.createElement("canvas");
  canvas.width = w * scale;
  canvas.height = (lines.length * lh + 40) * scale;
  const ctx = canvas.getContext("2d");
  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, canvas.height);
  ctx.fillStyle = "#111";
  ctx.textBaseline = "middle";
  lines.forEach(([type, a, b, bold], i) => {
    const y = 26 + i * lh;
    ctx.font = `${bold ? "bold " : ""}18px "Courier New", Courier, monospace`;
    if (type === "center") {
      ctx.textAlign = "center";
      ctx.fillText(a, w / 2, y);
    } else if (type === "row") {
      ctx.textAlign = "left";
      ctx.fillText(a, 20, y);
      ctx.textAlign = "right";
      ctx.fillText(b, w - 20, y);
    } else if (type === "rule") {
      ctx.fillRect(20, y, w - 40, 1.5);
    }
  });
  return { canvas, expected: Math.round(total * 100) / 100 };
}

// ── The scan flow in the parfait sheet ──────────────────────────────────
let pending = null; // { items, source }

function showScanForm({
  preview,
  status,
  total = "",
  method = null,
  items = [],
  source,
}) {
  pending = { items, source };
  $("scanResult").hidden = false;
  $("receiptPreview").hidden = !preview;
  if (preview) $("receiptPreview").src = preview;
  $("scanStatus").textContent = status;
  $("saleAmount").value =
    total === "" || total == null ? "" : Number(total).toFixed(2);
  for (const r of document.querySelectorAll('input[name="saleMethod"]'))
    r.checked = r.value === method;
  $("saleItems").replaceChildren(
    ...items.map((i) => {
      const li = document.createElement("li");
      li.textContent = `${i.name}${i.amount ? ` · ${money(i.amount)}` : ""}`;
      return li;
    }),
  );
  $("saleItemsHead").hidden = !items.length;
}

async function scanImage(image, preview, source) {
  showScanForm({ preview, status: "Reading the receipt…", source });
  $("saleAmount").disabled = $("logSale").disabled = true;
  try {
    const text = await readText(
        image,
        (p) =>
          ($("scanStatus").textContent =
            `Reading the receipt… ${Math.round(p * 100)}%`),
      ),
      found = parseReceipt(text);
    showScanForm({
      preview,
      source,
      total: found.total ?? "",
      method: found.method,
      items: found.items,
      status:
        found.total != null
          ? "Here’s what I read. Check the total, then add it."
          : "I couldn’t find a total. Please type it in.",
    });
  } catch (err) {
    showScanForm({ preview, source, status: err.message });
  } finally {
    $("saleAmount").disabled = $("logSale").disabled = false;
    $("saleAmount").focus();
  }
}

$("receiptFile").addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  scanImage(file, url, "scan");
  e.target.value = "";
});
$("sampleReceipt").addEventListener("click", () => {
  const { canvas } = sampleReceipt();
  scanImage(canvas, canvas.toDataURL("image/png"), "scan");
});
$("typeAmount").addEventListener("click", () => {
  showScanForm({ status: "Type the total from the receipt.", source: "typed" });
  $("saleAmount").focus();
});
$("cancelSale").addEventListener("click", () => {
  $("scanResult").hidden = true;
  pending = null;
});
$("logSale").addEventListener("click", () => {
  const amount = Number($("saleAmount").value);
  if (!(amount > 0)) {
    $("scanStatus").textContent = "Please enter the receipt’s total.";
    $("saleAmount").focus();
    return;
  }
  const method =
      document.querySelector('input[name="saleMethod"]:checked')?.value || null,
    sale = Hub.addSale({
      amount,
      method,
      items: pending?.items || [],
      source: pending?.source || "typed",
    });
  if (sale) {
    $("scanResult").hidden = true;
    pending = null;
    toast(`${money(sale.amount)} added to today’s parfait.`, "parfait");
  }
});
