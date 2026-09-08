// ---------------------------------------------------------------------------
// Telavox-testipaja – taustan service worker
//
// Ainoa tehtävä: globaali pikanäppäin Ctrl+Shift+0 nostaa Telavox-välilehden
// esiin, vaikka selain ei olisi aktiivinen. Puheluun vastataan sen jälkeen
// normaalisti sivun omalla Alt+V-näppäimellä.
//
// Miksi tämä on taustaskriptissä eikä content.js:ssä: sivun keydown-kuuntelija
// tavoittaa vain avoinna ja aktiivisena olevan välilehden. Käyttöjärjestelmä-
// tason pikanäppäin on mahdollinen vain chrome.commands-rajapinnan kautta, ja
// sen tapahtumat tulevat taustaskriptille.
//
// Service worker nukahtaa käyttämättömänä, mutta chrome.commands.onCommand
// herättää sen, joten erillistä hereillä pitämistä ei tarvita.
// ---------------------------------------------------------------------------

const COMMAND_FOCUS_TAB = 'focus-telavox-tab';
const TELAVOX_URL       = 'https://app.telavox.com/*';

chrome.commands.onCommand.addListener(command => {
  if (command !== COMMAND_FOCUS_TAB) return;
  focusTelavoxTab();
});

async function focusTelavoxTab() {
  let tabs;
  try {
    // URL-suodatin vaatii host_permissions-oikeuden kyseiseen osoitteeseen.
    tabs = await chrome.tabs.query({ url: TELAVOX_URL });
  } catch (error) {
    console.warn('[Telavox-a11y] Välilehtihaku epäonnistui:', error);
    return;
  }

  if (!tabs.length) {
    // Telavox ei ole auki. Ei avata sitä automaattisesti: se veisi käyttäjän
    // yllättäen kirjautumissivulle kesken toisen työn.
    console.info('[Telavox-a11y] Telavox-välilehteä ei löytynyt.');
    return;
  }

  // Jos Telavox on auki useassa välilehdessä, valitaan ensisijaisesti se, joka
  // toistaa ääntä – soiva puhelu tekee välilehdestä audible-tilaisen.
  const tab =
    tabs.find(t => t.audible) ||
    tabs.find(t => t.active)  ||
    tabs[0];

  // Ikkunan tila luetaan ensin: minimoitu ikkuna pitää palauttaa normaaliksi,
  // mutta maksimoitua ei saa vahingossa pienentää.
  try {
    const win    = await chrome.windows.get(tab.windowId);
    const update = { focused: true };
    if (win.state === 'minimized') update.state = 'normal';
    await chrome.windows.update(tab.windowId, update);
  } catch (error) {
    console.warn('[Telavox-a11y] Ikkunan aktivointi epäonnistui:', error);
  }

  try {
    await chrome.tabs.update(tab.id, { active: true });
  } catch (error) {
    console.warn('[Telavox-a11y] Välilehden aktivointi epäonnistui:', error);
    return;
  }

  // Pelkkä välilehden aktivointi ei takaa, että näppäimistöfokus on sivulla;
  // se voi jäädä selaimen omaan käyttöliittymään, jolloin ruudunlukija ei ole
  // sivun puskurissa eikä Alt+V mene perille. Pyydetään content.js:ää
  // siirtämään fokus sivulle.
  requestPageFocus(tab.id);
}

// Viesti voi mennä ohi, jos välilehti on juuri heräämässä muistista (Chromen
// Memory Saver on saattanut pudottaa sen). Yritetään muutaman kerran uudelleen.
function requestPageFocus(tabId, attempt = 0) {
  chrome.tabs.sendMessage(tabId, { type: 'tvx-focus-page' }, () => {
    // lastError on luettava, muuten Chrome kirjaa käsittelemättömän virheen.
    if (chrome.runtime.lastError && attempt < 5) {
      setTimeout(() => requestPageFocus(tabId, attempt + 1), 300);
    }
  });
}
