/**
 * Taulukko → saavutettava listbox
 * Malli perustuu combobox-korjaus.js -toteutukseen,
 * mutta käyttää ARIA listbox -patternia (EI comboboxia).
 */

function korjaaTaulukko(table) {
  const container = table.closest(".q-table__container");
  if (!container) return;

  // Estä tuplakorjaus
  if (container.previousElementSibling?.classList.contains("custom-listbox")) {
    return;
  }

  const rows = Array.from(table.querySelectorAll("tbody tr.q-tr"));
  if (rows.length === 0) return;

  const headers = Array.from(table.querySelectorAll("thead th")).map(th =>
    th.innerText.replace("arrow_drop_down", "").trim()
  );

  /* ---------- LISTBOX ---------- */

  const listbox = document.createElement("ul");
  listbox.className = "custom-listbox";
  listbox.setAttribute("role", "listbox");

  const sectionLabel =
    container.closest("div")?.parentElement?.querySelector("h5")?.innerText ||
    "Tulokset";

  listbox.setAttribute("aria-label", sectionLabel);
  listbox.setAttribute("aria-activedescendant", "");

  /* ---------- OPTIONS ---------- */

  const options = [];

  rows.forEach((row, index) => {
    const cells = Array.from(row.querySelectorAll("td.q-td"));
    if (cells.length === 0) return;

    const option = document.createElement("li");
    option.className = "custom-option";
    option.setAttribute("role", "option");
    option.id = `listbox-option-${index}`;
    option.setAttribute("tabindex", "-1");

    const parts = cells
      .map(cell => cell.innerText.trim())
      .filter(value => value);

    option.textContent = parts.join(". ");

    const activate = () => {
      const link = row.querySelector("a");
      if (link) link.click();
      else row.click();
    };

    option.addEventListener("click", activate);

    option.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        activate();
      }
    });

    listbox.appendChild(option);
    options.push(option);
  });

  if (options.length === 0) return;

  /* ---------- TILA ---------- */

  let aktiivinenIndeksi = 0;
  let hakuMerkkijono = "";
  let hakuAjastin = null;

  function paivitaAktiivinen() {
    options.forEach((opt, i) => {
      if (i === aktiivinenIndeksi) {
        opt.setAttribute("tabindex", "0");
        opt.setAttribute("aria-selected", "true");
        listbox.setAttribute("aria-activedescendant", opt.id);
        opt.focus();
      } else {
        opt.setAttribute("tabindex", "-1");
        opt.removeAttribute("aria-selected");
      }
    });
  }

  /* ---------- KIRJAINHAKU ---------- */

  function kirjainhaku(merkki) {
    hakuMerkkijono += merkki.toLowerCase();

    if (hakuAjastin) clearTimeout(hakuAjastin);
    hakuAjastin = setTimeout(() => {
      hakuMerkkijono = "";
    }, 1000);

    const aloitus = hakuMerkkijono.length === 1
      ? aktiivinenIndeksi + 1
      : 0;

    for (let i = 0; i < options.length; i++) {
      const idx = (aloitus + i) % options.length;
      const text = options[idx].textContent.toLowerCase();
      if (text.startsWith(hakuMerkkijono)) {
        aktiivinenIndeksi = idx;
        paivitaAktiivinen();
        return;
      }
    }
  }

  /* ---------- NÄPPÄIMISTÖ ---------- */

  listbox.addEventListener("keydown", (e) => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (aktiivinenIndeksi < options.length - 1) {
          aktiivinenIndeksi++;
          paivitaAktiivinen();
        }
        break;

      case "ArrowUp":
        e.preventDefault();
        if (aktiivinenIndeksi > 0) {
          aktiivinenIndeksi--;
          paivitaAktiivinen();
        }
        break;

      case "Home":
        e.preventDefault();
        aktiivinenIndeksi = 0;
        paivitaAktiivinen();
        break;

      case "End":
        e.preventDefault();
        aktiivinenIndeksi = options.length - 1;
        paivitaAktiivinen();
        break;

      default:
        // Kirjainhaku
        if (
          e.key.length === 1 &&
          e.key.match(/[a-zA-ZäöåÄÖÅ0-9]/)
        ) {
          e.preventDefault();
          kirjainhaku(e.key);
        }
        break;
    }
  }, true); // capture-vaihe, kuten combobox-korjauksessa

  /* ---------- PIILOTA ALKUPERÄINEN ---------- */

  container.setAttribute("aria-hidden", "true");
  container.style.display = "none";
  container.before(listbox);

  /* ---------- ALKUFOKUS ---------- */

  paivitaAktiivinen();
}

/* ---------- MUTATION OBSERVER ---------- */

function korjaaKaikkiTaulukot() {
  document.querySelectorAll("table.q-table").forEach(korjaaTaulukko);
}

const observer = new MutationObserver(() => {
  korjaaKaikkiTaulukot();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});

// Ensimmäinen ajo
korjaaKaikkiTaulukot();