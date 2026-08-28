/**
 * myClub – saavutettavuuslaajennus
 *
 * Injektoi jokaiselle tapahtumalle (.event) h5-tason otsikon, joka sisältää
 * tapahtuman nimen, ryhmän, päivän ja kellonajan sekä oman osallistumistilan.
 * Ruudunlukuohjelman käyttäjä voi näin selata tapahtumia otsikkonavigoinnilla
 * (esim. NVDA/JAWS: 5) ja kuulee kaikki olennaiset tiedot kerralla.
 *
 * Otsikot piilotetaan visuaalisesti, koska sama tieto näkyy jo sivulla.
 * Tila päivittyy automaattisesti, kun sivun sisältö muuttuu (MutationObserver).
 */

(() => {
  'use strict';

  const ASETUKSET = {
    // Piilota otsikot näkeviltä käyttäjiltä (tieto on jo visuaalisesti näkyvissä)
    piilotaOtsikotVisuaalisesti: true,
    naytaRyhma: true,
    naytaPaikka: false,
    // Lisää tapahtuman nimen Osallistun / En osallistu -linkkien saavutettavaan nimeen
    parannaNappienNimet: true
  };

  const OTSIKKO_LUOKKA = 'mc-a11y-otsikko';
  const TYYLI_ID = 'mc-a11y-tyylit';

  /* ---------------------------------------------------------------- apurit */

  const teksti = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');

  function lisaaTyylit() {
    if (document.getElementById(TYYLI_ID)) return;
    const style = document.createElement('style');
    style.id = TYYLI_ID;
    style.textContent = ASETUKSET.piilotaOtsikotVisuaalisesti
      ? `.${OTSIKKO_LUOKKA} {
           position: absolute !important;
           width: 1px !important;
           height: 1px !important;
           margin: -1px !important;
           padding: 0 !important;
           overflow: hidden !important;
           clip: rect(0 0 0 0) !important;
           clip-path: inset(50%) !important;
           white-space: nowrap !important;
           border: 0 !important;
         }`
      : `.${OTSIKKO_LUOKKA} {
           font-size: 1rem;
           font-weight: 600;
           margin: 0.25rem 0;
         }`;
    (document.head || document.documentElement).appendChild(style);
  }

  /* --------------------------------------------------- tapahtuman tiedot */

  function haeNapit(evt) {
    const linkit = Array.from(evt.querySelectorAll('.event-indication-buttons a'));
    const nimi = (a) => teksti(a).toLowerCase();
    return {
      linkit,
      osallistun: linkit.find((a) => nimi(a).startsWith('osallistun')),
      enOsallistu: linkit.find((a) => nimi(a).startsWith('en osallistu')),
      ilmoittaudu: linkit.find((a) => nimi(a).startsWith('ilmoittaudu'))
    };
  }

  /**
   * myClub merkitsee valitun vaihtoehdon napin luokalla:
   *   Osallistun   -> btn-success
   *   En osallistu -> btn-danger
   * Jos kumpikaan ei ole korostettu, vastausta ei ole vielä annettu.
   */
  function haeTila(napit) {
    const { osallistun, enOsallistu, ilmoittaudu, linkit } = napit;

    if (osallistun && osallistun.classList.contains('btn-success')) return 'osallistut';
    if (enOsallistu && enOsallistu.classList.contains('btn-danger')) return 'et osallistu';
    if (osallistun || enOsallistu) return 'ei vastausta';
    if (ilmoittaudu) return 'ilmoittautuminen avoinna';
    if (linkit.length === 0) return 'ilmoittautuminen ei käytössä';
    return '';
  }

  function rakennaOtsikkoteksti(evt) {
    const nimi = teksti(evt.querySelector('.event-name-text')) || 'Tapahtuma';
    const paiva = teksti(evt.querySelector('.event-time .day'));
    const aika = teksti(evt.querySelector('.event-time .time'));
    const ryhma = ASETUKSET.naytaRyhma ? teksti(evt.querySelector('.event-group-name')) : '';
    const paikka = ASETUKSET.naytaPaikka ? teksti(evt.querySelector('.event-venue-name')) : '';
    const tila = haeTila(haeNapit(evt));

    const osat = [nimi];
    if (ryhma) osat.push(ryhma);

    const ajankohta = [paiva, aika ? `klo ${aika}` : ''].filter(Boolean).join(' ');
    if (ajankohta) osat.push(ajankohta);

    if (paikka) osat.push(paikka);
    if (tila) osat.push(tila);

    return osat.join(', ');
  }

  /* ------------------------------------------------------------ injektointi */

  function injektoiOtsikko(evt) {
    const uusiTeksti = rakennaOtsikkoteksti(evt);
    let otsikko = evt.querySelector(`.${OTSIKKO_LUOKKA}`);

    if (otsikko) {
      // Päivitetään vain, jos tiedot ovat muuttuneet (esim. osallistumistila)
      if (otsikko.textContent !== uusiTeksti) otsikko.textContent = uusiTeksti;
    } else {
      otsikko = document.createElement('h5');
      otsikko.className = OTSIKKO_LUOKKA;
      otsikko.textContent = uusiTeksti;
      // Otsikko sijoitetaan tapahtuman sisällön alkuun, jotta se edeltää
      // kaikkea siihen kuuluvaa tietoa ja toimintoja.
      const kohde = evt.querySelector('.details') || evt;
      kohde.insertBefore(otsikko, kohde.firstChild);
    }

    if (ASETUKSET.parannaNappienNimet) parannaNappienNimet(evt);
  }

  /**
   * Linkkien teksti on joka tapahtumassa sama ("Osallistun" / "En osallistu"),
   * joten esim. linkkilistassa niitä ei voi erottaa toisistaan. Lisätään
   * saavutettavaan nimeen tapahtuman nimi ja ajankohta.
   */
  function parannaNappienNimet(evt) {
    const nimi = teksti(evt.querySelector('.event-name-text'));
    const paiva = teksti(evt.querySelector('.event-time .day'));
    const lisays = [nimi, paiva].filter(Boolean).join(' ');
    if (!lisays) return;

    haeNapit(evt).linkit.forEach((a) => {
      const perusteksti = a.dataset.mcPerusteksti || teksti(a);
      if (!perusteksti) return;
      a.dataset.mcPerusteksti = perusteksti;
      const nimiJono = `${perusteksti}: ${lisays}`;
      if (a.getAttribute('aria-label') !== nimiJono) a.setAttribute('aria-label', nimiJono);
    });
  }

  /* ------------------------------------------------------- ajo ja seuranta */

  function haeTapahtumat() {
    const solmut = document.querySelectorAll('.list-events .event, #events .event');
    return solmut.length ? solmut : document.querySelectorAll('.event');
  }

  let paivitetaan = false;
  let ajastin = null;

  function paivitaKaikki() {
    if (paivitetaan) return;
    paivitetaan = true;
    try {
      lisaaTyylit();
      haeTapahtumat().forEach(injektoiOtsikko);
    } catch (e) {
      console.error('mc-a11y: otsikoiden injektointi epäonnistui', e);
    } finally {
      paivitetaan = false;
    }
  }

  function ajastaPaivitys() {
    if (paivitetaan) return;
    clearTimeout(ajastin);
    ajastin = setTimeout(paivitaKaikki, 200);
  }

  function kaynnista() {
    paivitaKaikki();

    // Seurataan sekä uusia tapahtumia (suodatus, lisälataus) että
    // luokkamuutoksia, joilla myClub merkitsee osallistumistilan.
    const observer = new MutationObserver(ajastaPaivitys);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', kaynnista);
  } else {
    kaynnista();
  }
})();
