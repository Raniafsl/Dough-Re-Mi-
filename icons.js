// Hand-drawn pastel icons (brown outline, soft fills) used across the
// Countertop instead of emoji. icon("cookie") returns an inline <svg>.

const ICON_LINE =
  'stroke="#6b4a3a" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"';

// The parfait glass narrows from 24 wide at the rim (y 14) to 16 at the base (y 38).
function glassBand(top, bottom, fill) {
  const x = (y) => [12 + ((y - 14) * 4) / 24, 36 - ((y - 14) * 4) / 24];
  const [l1, r1] = x(top),
    [l2, r2] = x(bottom);
  return `<path d="M${l1} ${top}H${r1}L${r2} ${bottom}H${l2}Z" fill="${fill}"/>`;
}

const cupcake = (frosting) =>
  `<path d="M13 26H35L32 41H16Z" fill="#f3c5d4" ${ICON_LINE}/>
   <path d="M20 27l1 13M28 27l-1 13" stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"/>
   <path d="M11 27q-2-6 4-8q0-7 9-7t9 7q6 2 4 8Z" fill="${frosting}" ${ICON_LINE}/>
   <path d="M17 20q3-2 6-1" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".8"/>
   <circle cx="24" cy="9" r="3.2" fill="#e8768f" ${ICON_LINE}/>`;

const ICONS = {
  cookie: `<path d="M24 7a17 17 0 1 0 16.6 13.3a5 5 0 0 1-6.2-4.9a5 5 0 0 1-4.6-7.3A17 17 0 0 0 24 7Z" fill="#ecc68f" ${ICON_LINE}/>
    <ellipse cx="17" cy="20" rx="2.3" ry="1.7" fill="#8a5a3c"/><ellipse cx="26" cy="27" rx="2.3" ry="1.7" fill="#8a5a3c"/>
    <ellipse cx="17" cy="31" rx="2.3" ry="1.7" fill="#8a5a3c"/><ellipse cx="30" cy="35" rx="2.3" ry="1.7" fill="#8a5a3c"/>
    <ellipse cx="24" cy="17" rx="2" ry="1.5" fill="#8a5a3c"/>`,
  parfait: `${glassBand(31, 38, "#e9c48f")}${glassBand(25, 31, "#f3c5d4")}${glassBand(20, 25, "#fbe9cf")}${glassBand(14, 20, "#e8a2b8")}
    <path d="M12 14H36L32 38Q31 41 28 41H20Q17 41 16 38Z" fill="none" ${ICON_LINE}/>
    <path d="M12 14q2-7 12-7t12 7Z" fill="#fffaf2" ${ICON_LINE}/>
    <circle cx="24" cy="5.5" r="3" fill="#e8768f" ${ICON_LINE}/>`,
  "cupcake-choc": cupcake("#b98563"),
  "cupcake-lemon": cupcake("#f7e39a"),
  cupcake: cupcake("#fbe9cf"),
  scroll: `<rect x="12" y="9" width="24" height="30" rx="2" fill="#fbf3e4" ${ICON_LINE}/>
    <rect x="9" y="6" width="30" height="6" rx="3" fill="#ecc68f" ${ICON_LINE}/>
    <rect x="9" y="36" width="30" height="6" rx="3" fill="#ecc68f" ${ICON_LINE}/>
    <path d="M17 18h14M17 23h14M17 28h9" stroke="#c9a77f" stroke-width="2" stroke-linecap="round"/>
    <path d="M31 31c-1.5-2.5-4.5-1-3 1l3 3l3-3c1.5-2-1.5-3.5-3-1Z" fill="#e8768f"/>`,
  bell: `<rect x="21" y="9" width="6" height="5" rx="2" fill="#f3d48a" ${ICON_LINE}/>
    <path d="M10 34C10 21 16 14 24 14S38 21 38 34Z" fill="#f3d48a" ${ICON_LINE}/>
    <path d="M16 29c1-6 4-9 7-10" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>
    <rect x="6" y="34" width="36" height="6" rx="3" fill="#e9c48f" ${ICON_LINE}/>`,
  star: `<path d="M24 7l5 10.4l11.4 1.7l-8.3 8l2 11.4L24 33l-10.1 5.5l2-11.4l-8.3-8l11.4-1.7Z" fill="#f7e39a" ${ICON_LINE}/>
    <circle cx="19.5" cy="25" r="1.6" fill="#e8768f" opacity=".7"/><circle cx="28.5" cy="25" r="1.6" fill="#e8768f" opacity=".7"/>`,
  party: `<path d="M9 41L17 19L29 31Z" fill="#f3c5d4" ${ICON_LINE}/>
    <path d="M13 30l7 7M15 24l9 9" stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M26 20q2-6 8-5q-1-6 5-7" fill="none" stroke="#9fc7a4" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="33" cy="25" r="2" fill="#f7e39a" ${ICON_LINE}/><rect x="22" y="9" width="4" height="4" rx="1" fill="#e8768f" transform="rotate(20 24 11)"/>
    <circle cx="39" cy="17" r="1.8" fill="#e8768f"/><rect x="36" y="29" width="4" height="4" rx="1" fill="#9fc7a4" transform="rotate(-15 38 31)"/>`,
  poll: `<rect x="17" y="7" width="14" height="18" rx="2" fill="#fffaf2" transform="rotate(-6 24 16)" ${ICON_LINE}/>
    <path d="M24 19c-2-3.4-6.2-1.4-4.2 1.4L24 24.5l4.2-4.1c2-2.8-2.2-4.8-4.2-1.4Z" fill="#e8768f" transform="rotate(-6 24 16)"/>
    <rect x="8" y="22" width="32" height="19" rx="3" fill="#cfe3d1" ${ICON_LINE}/>
    <rect x="16" y="22" width="16" height="3.4" rx="1.5" fill="#6b4a3a"/>`,
  tea: `<path d="M17 13q-3-3 0-6M24 13q-3-3 0-6" fill="none" stroke="#c9a77f" stroke-width="2" stroke-linecap="round"/>
    <path d="M33 22q8 0 8 6.5T33 35" fill="none" ${ICON_LINE}/>
    <rect x="9" y="17" width="25" height="23" rx="6" fill="#cfe3d1" ${ICON_LINE}/>
    <path d="M17 26c-1.5-2.5-4.5-1-3 1l3 3l3-3c1.5-2-1.5-3.5-3-1Z" fill="#e8768f"/>`,
  cap: `<path d="M14 22v8q10 6 20 0v-8" fill="#d9cdea" ${ICON_LINE}/>
    <path d="M24 10L43 18L24 26L5 18Z" fill="#d9cdea" ${ICON_LINE}/>
    <path d="M24 18L38 21V31" fill="none" stroke="#e3b04b" stroke-width="2.2" stroke-linecap="round"/>
    <circle cx="38" cy="33" r="2.6" fill="#f3d48a" ${ICON_LINE}/>`,
  books: `<rect x="7" y="31" width="34" height="9" rx="2" fill="#f3c5d4" ${ICON_LINE}/>
    <rect x="10" y="22" width="29" height="9" rx="2" fill="#cfe3d1" ${ICON_LINE}/>
    <rect x="8" y="13" width="30" height="9" rx="2" fill="#f7e39a" ${ICON_LINE}/>
    <path d="M13 35.5h10M16 26.5h8M13 17.5h9" stroke="#6b4a3a" stroke-width="1.6" stroke-linecap="round"/>`,
  coin: `<circle cx="24" cy="24" r="17" fill="#f3d48a" ${ICON_LINE}/>
    <circle cx="24" cy="24" r="12" fill="none" stroke="#c99a3c" stroke-width="2"/>
    <path d="M24 23c-2-3.6-7-1.6-4.6 1.6L24 29l4.6-4.4c2.4-3.2-2.6-5.2-4.6-1.6Z" fill="#e8768f"/>`,
  check: `<circle cx="24" cy="24" r="17" fill="#cfe3d1" ${ICON_LINE}/><path d="M16 24.5l5.5 5.5L33 18.5" fill="none" ${ICON_LINE} stroke-width="3"/>`,
  mic: `<rect x="17" y="6" width="14" height="24" rx="7" fill="#f3c5d4" ${ICON_LINE}/>
    <path d="M11 22q0 12 13 12t13-12M24 34v7M17 41h14" fill="none" ${ICON_LINE}/>
    <path d="M21 12v6" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".85"/>`,
};

(function injectSprite() {
  const sprite = `<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0;overflow:hidden" aria-hidden="true">${Object.entries(
    ICONS,
  )
    .map(
      ([name, body]) =>
        `<symbol id="i-${name}" viewBox="0 0 48 48">${body}</symbol>`,
    )
    .join("")}</svg>`;
  document.body.insertAdjacentHTML("afterbegin", sprite);
})();

function icon(name, cls = "ico") {
  return `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${name}"/></svg>`;
}

// Static markup can ask for an icon with <i data-icon="bell"></i>.
for (const el of document.querySelectorAll("[data-icon]"))
  el.outerHTML = icon(el.dataset.icon, el.className || "ico");
