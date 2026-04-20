/**
 * DAZN Saavutettavuus -laajennus
 * Tekee videosoittimen painikkeet saavutettaviksi NVDA-ruudunlukijalle
 * ja mahdollistaa videon kelauksen näppäimistöllä.
 */

const DaznA11y = (() => {
  'use strict';

  // ── Tila ──────────────────────────────────────────────────────────────
  let liveRegion = null;
  let controlPanel = null;
  let panelVisible = false;
  let patchApplied = false;
  let updateTimer = null;

  // Painikeselectori → aria-label -korjaukset (DOM-analyysistä)
  const BUTTON_LABELS = {
    '#player-BUTTON_PAUSE_TOOLTIP':         'Tauko',
    '#player-BUTTON_PLAY_TOOLTIP':          'Toista',
    '#player-BUTTON_SKIP_BACK_TOOLTIP':     'Kelaa taaksepäin 10 sekuntia',
    '#player-BUTTON_SKIP_FORWARD_TOOLTIP':  'Kelaa eteenpäin 10 sekuntia',
    '#player-VOLUME_BUTTON_TOOLTIP':        'Mykistä / palauta ääni',
    '#player-BUTTON_WATCH_FROM_START_TOOLTIP': 'Katso alusta',
    '#player-HELP_BUTTON_TOOLTIP':          'Ohje',
    '#player-FULLSCREEN_BUTTON_TOOLTIP':    'Koko näyttö',
  };

  // Näppäimistöoikotiet
  const SEEK_SMALL  = 10;   // sekuntia
  const SEEK_MEDIUM = 30;   // sekuntia
  const SEEK_LARGE  = 60;   // sekuntia

  // ── Apufunktiot ───────────────────────────────────────────────────────

  function getVideo() {
    return document.querySelector('video');
  }

  function announce(text, priority = 'polite') {
    if (!liveRegion) return;
    // Tyhjennä ensin jotta sama teksti luetaan uudelleen
    liveRegion.textContent = '';
    requestAnimationFrame(() => {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = text;
    });
  }

  function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  function formatValueText(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0 minuuttia 0 sekuntia';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h} tunti${h !== 1 ? 'a' : ''} ${m} minuuttia ${s} sekuntia`;
    }
    return `${m} minuuttia ${s} sekuntia`;
  }

  function clickNativeButton(selector) {
    // Varmistaa että native player-UI on näkyvissä ennen klikkausta
    const playerUI = document.querySelector('.player-ui');
    if (playerUI) {
      playerUI.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
    }
    const btn = document.querySelector(selector);
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  }

  // ── Kuuntelijoiden luominen ────────────────────────────────────────────

  function createLiveRegion() {
    if (document.getElementById('dazn-a11y-live')) return;
    liveRegion = document.createElement('div');
    liveRegion.id = 'dazn-a11y-live';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    Object.assign(liveRegion.style, {
      position: 'absolute',
      left: '-9999px',
      top: '-9999px',
      width: '1px',
      height: '1px',
      overflow: 'hidden',
    });
    document.body.appendChild(liveRegion);
  }

  // ── Aria-label -korjaukset natiiveille painikkeille ────────────────────

  function fixButtonLabels() {
    let fixed = 0;
    for (const [selector, label] of Object.entries(BUTTON_LABELS)) {
      const btn = document.querySelector(selector);
      if (btn && btn.getAttribute('aria-label') !== label) {
        btn.setAttribute('aria-label', label);
        fixed++;
      }
    }
    return fixed;
  }

  // ── Peitetään player-UI:n häipyminen ──────────────────────────────────
  // DAZN piilottaa ohjaimet CSS:llä kun hiiri ei ole playerilla.
  // Injektoidaan style joka pitää ne näkyvissä.

  function injectPersistentControlsStyle() {
    if (document.getElementById('dazn-a11y-style')) return;
    const style = document.createElement('style');
    style.id = 'dazn-a11y-style';
    // Pitää player-controllit näkyvissä (opacity > 0) jotta natiivit
    // painikkeet pysyvät saavutettavina. Voidaan kytkeä pois päältä
    // kontrollipaneelista jos halutaan.
    style.textContent = `
      /* DAZN A11y: Pitää player-controllit näkyvissä */
      .player-ui [class*="_15tgyri4"],
      .player-ui [class*="_15tgyri9"],
      .player-ui [class*="_15tgyria"],
      .player-ui [class*="_3g507d0"],
      .player-ui [class*="_1txupki0"] {
        opacity: 1 !important;
        visibility: visible !important;
        pointer-events: auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function removeControlsStyle() {
    const s = document.getElementById('dazn-a11y-style');
    if (s) s.remove();
  }

  // Carousel-piilotus suoraan DOM-elementteihin JS:llä
  // Selektorit vahvistettu NVDA DOM Inspector -raportista:
  //   section.rail__rail-container___1yh0T  (rail-karusellit)
  //   [class*="hero-banner-slider"]          (hero-banneri ylhäällä)
  const CAROUSEL_SELECTORS = [
    'section.rail__rail-container___1yh0T',
    '[class*="hero-banner-slider__hero-banner"]',
  ];
  // Varaselektorit jos hash muuttuu DAZN-päivityksessä
  const CAROUSEL_FALLBACK_SELECTORS = [
    'section[class*="rail__rail-container"]',
    'section[class*="rail__rail"]',
  ];

  let carouselObserver = null;

  function applyCarouselHide() {
    const allSelectors = [...CAROUSEL_SELECTORS, ...CAROUSEL_FALLBACK_SELECTORS];
    let found = 0;
    allSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.dataset.daznA11yCarousel !== 'hidden') {
          el.dataset.daznA11yCarousel = 'hidden';
          el.style.setProperty('display', 'none', 'important');
          el.setAttribute('aria-hidden', 'true');
          found++;
        }
      });
    });
    return found;
  }

  function applyCarouselShow() {
    document.querySelectorAll('[data-dazn-a11y-carousel="hidden"]').forEach(el => {
      el.style.removeProperty('display');
      el.removeAttribute('aria-hidden');
      delete el.dataset.daznA11yCarousel;
    });
  }

  let carouselCurrentlyHidden = false;

  function hideCarousel() {
    carouselCurrentlyHidden = true;
    applyCarouselHide();
    // MutationObserver: piilota myös dynaamisesti lisättävät elementit
    if (!carouselObserver) {
      carouselObserver = new MutationObserver(() => {
        if (carouselCurrentlyHidden) applyCarouselHide();
      });
      carouselObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  function showCarousel() {
    carouselCurrentlyHidden = false;
    applyCarouselShow();
    // Pysäytä observer kun carousel näkyvissä
    if (carouselObserver) {
      carouselObserver.disconnect();
      carouselObserver = null;
    }
  }

  function toggleCarousel() {
    if (carouselCurrentlyHidden) {
      showCarousel();
      announce('Carousel näkyvissä', 'assertive');
    } else {
      hideCarousel();
      announce('Carousel piilotettu', 'assertive');
    }
    const btn = document.getElementById('dazn-a11y-carousel-toggle');
    if (btn) {
      btn.textContent = carouselCurrentlyHidden ? '🎠 Näytä carousel' : '🎠 Piilota carousel';
      btn.setAttribute('aria-label', carouselCurrentlyHidden ? 'Näytä carousel' : 'Piilota carousel');
    }
  }

  // ── Saavutettava kontrollipaneeli ─────────────────────────────────────

  function createControlPanel() {
    if (document.getElementById('dazn-a11y-panel')) {
      controlPanel = document.getElementById('dazn-a11y-panel');
      return;
    }

    controlPanel = document.createElement('div');
    controlPanel.id = 'dazn-a11y-panel';
    controlPanel.setAttribute('role', 'region');
    controlPanel.setAttribute('aria-label', 'DAZN videosoittimen saavutettavat ohjaimet');

    controlPanel.innerHTML = `
      <style>
        #dazn-a11y-panel {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          z-index: 999999;
          background: rgba(0, 0, 0, 0.92);
          color: #fff;
          font-family: Arial, sans-serif;
          font-size: 14px;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          border-top: 2px solid #f5a623;
        }
        #dazn-a11y-panel[hidden] {
          display: none;
        }
        #dazn-a11y-panel button {
          background: #222;
          color: #fff;
          border: 1px solid #555;
          border-radius: 4px;
          padding: 6px 12px;
          cursor: pointer;
          font-size: 13px;
          min-width: 40px;
          white-space: nowrap;
        }
        #dazn-a11y-panel button:focus {
          outline: 2px solid #f5a623;
          outline-offset: 2px;
        }
        #dazn-a11y-panel button:hover {
          background: #444;
        }
        #dazn-a11y-panel .a11y-time {
          font-family: monospace;
          font-size: 15px;
          padding: 4px 8px;
          background: #111;
          border-radius: 4px;
          min-width: 110px;
          text-align: center;
          border: 1px solid #555;
        }
        #dazn-a11y-panel .a11y-section-label {
          color: #aaa;
          font-size: 12px;
          margin-right: 2px;
        }
        #dazn-a11y-panel .a11y-separator {
          width: 1px;
          height: 28px;
          background: #444;
          margin: 0 4px;
        }
        #dazn-a11y-panel .a11y-shortcuts {
          color: #888;
          font-size: 11px;
          flex: 1;
          text-align: right;
        }
        #dazn-a11y-panel input[type=range] {
          cursor: pointer;
          accent-color: #f5a623;
          height: 20px;
        }
        #dazn-a11y-panel input[type=range]:focus {
          outline: 2px solid #f5a623;
          outline-offset: 2px;
        }
        #dazn-a11y-panel #dazn-a11y-volume {
          width: 80px;
        }
        #dazn-a11y-panel #dazn-a11y-seek {
          flex: 1;
          min-width: 200px;
        }
        #dazn-a11y-panel label {
          color: #ccc;
          font-size: 12px;
          white-space: nowrap;
        }
        #dazn-a11y-panel .a11y-seek-row {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          padding-top: 4px;
          border-top: 1px solid #333;
          margin-top: 2px;
        }
      </style>

      <span class="a11y-section-label">▶ Toisto:</span>

      <button id="dazn-a11y-playpause" aria-label="Tauko" title="Välilyönti / K">⏸</button>

      <div class="a11y-separator" aria-hidden="true"></div>
      <span class="a11y-section-label">⏪ Kelaus:</span>

      <button id="dazn-a11y-back60"  aria-label="Kelaa taaksepäin 60 sekuntia"  title="Shift+Vasen">−60s</button>
      <button id="dazn-a11y-back30"  aria-label="Kelaa taaksepäin 30 sekuntia"  title="Alt+Vasen">−30s</button>
      <button id="dazn-a11y-back10"  aria-label="Kelaa taaksepäin 10 sekuntia"  title="Nuoli vasemmalle">−10s</button>
      <button id="dazn-a11y-fwd10"   aria-label="Kelaa eteenpäin 10 sekuntia"   title="Nuoli oikealle">+10s</button>
      <button id="dazn-a11y-fwd30"   aria-label="Kelaa eteenpäin 30 sekuntia"   title="Alt+Oikea">+30s</button>
      <button id="dazn-a11y-fwd60"   aria-label="Kelaa eteenpäin 60 sekuntia"   title="Shift+Oikea">+60s</button>

      <div class="a11y-separator" aria-hidden="true"></div>

      <span class="a11y-time" id="dazn-a11y-time" aria-label="Toiston sijainti" aria-live="off">0:00 / 0:00</span>

      <button id="dazn-a11y-announce-time" aria-label="Lue toiston sijainti ääneen">🕐 Aika</button>

      <div class="a11y-separator" aria-hidden="true"></div>

      <button id="dazn-a11y-mute"  aria-label="Mykistä" title="M">🔊</button>

      <label for="dazn-a11y-volume">Äänenvoimakkuus</label>
      <input type="range" id="dazn-a11y-volume" min="0" max="100" value="100"
             aria-label="Äänenvoimakkuus" aria-valuemin="0" aria-valuemax="100">

      <div class="a11y-separator" aria-hidden="true"></div>

      <button id="dazn-a11y-toggle-native" aria-label="Näytä tai piilota natiivit ohjaimet" title="Näytä/piilota natiivit ohjaimet">👁 Ohjaimet</button>

      <button id="dazn-a11y-carousel-toggle" aria-label="Näytä carousel">🎠 Näytä carousel</button>

      <span class="a11y-shortcuts">
        Oikotiet: Välilyönti=tauko, ←/→=10s, Alt+←/→=30s, Shift+←/→=60s, M=mykistys, Alt+P=paneeli
      </span>

      <button id="dazn-a11y-close" aria-label="Sulje saavutettavuuspaneeli" style="margin-left:auto">✕ Sulje</button>

      <div class="a11y-seek-row">
        <label for="dazn-a11y-seek">Kelaa:</label>
        <input type="range"
               id="dazn-a11y-seek"
               min="0"
               max="100"
               value="0"
               step="1"
               aria-label="Kelaussijainti"
               aria-valuemin="0"
               aria-valuemax="100"
               aria-valuenow="0"
               aria-valuetext="0 minuuttia 0 sekuntia">
        <span id="dazn-a11y-seek-label" aria-hidden="true" style="font-family:monospace;font-size:13px;min-width:110px;">0:00 / 0:00</span>
      </div>
    `;

    document.body.appendChild(controlPanel);
    bindPanelEvents();
  }

  function bindPanelEvents() {
    const panel = controlPanel;

    // Toista / Tauko
    panel.querySelector('#dazn-a11y-playpause').addEventListener('click', () => {
      togglePlayPause();
    });

    // Kelausnapit
    panel.querySelector('#dazn-a11y-back60').addEventListener('click', () => seekBy(-60));
    panel.querySelector('#dazn-a11y-back30').addEventListener('click', () => seekBy(-30));
    panel.querySelector('#dazn-a11y-back10').addEventListener('click', () => seekBy(-10));
    panel.querySelector('#dazn-a11y-fwd10').addEventListener('click',  () => seekBy(10));
    panel.querySelector('#dazn-a11y-fwd30').addEventListener('click',  () => seekBy(30));
    panel.querySelector('#dazn-a11y-fwd60').addEventListener('click',  () => seekBy(60));

    // Lue aika
    panel.querySelector('#dazn-a11y-announce-time').addEventListener('click', () => {
      announceCurrentTime();
    });

    // Mykistys
    panel.querySelector('#dazn-a11y-mute').addEventListener('click', () => {
      toggleMute();
    });

    // Äänenvoimakkuus
    panel.querySelector('#dazn-a11y-volume').addEventListener('input', (e) => {
      const video = getVideo();
      if (video) {
        video.volume = e.target.value / 100;
        video.muted = (e.target.value === '0');
        announce(`Äänenvoimakkuus ${e.target.value} %`);
      }
    });

    // Natiivien ohjainten näkyvyys
    let nativeVisible = true;
    panel.querySelector('#dazn-a11y-toggle-native').addEventListener('click', () => {
      nativeVisible = !nativeVisible;
      if (nativeVisible) {
        injectPersistentControlsStyle();
        announce('Natiivit ohjaimet näkyvissä');
      } else {
        removeControlsStyle();
        announce('Natiivit ohjaimet piilotettu');
      }
    });

    // Kelausliukusäädin
    let isSeeking = false;
    const seekSlider = panel.querySelector('#dazn-a11y-seek');

    seekSlider.addEventListener('mousedown',  () => { isSeeking = true; });
    seekSlider.addEventListener('touchstart', () => { isSeeking = true; }, { passive: true });
    seekSlider.addEventListener('mouseup',  () => { isSeeking = false; });
    seekSlider.addEventListener('touchend', () => { isSeeking = false; });

    seekSlider.addEventListener('input', () => {
      const video = getVideo();
      if (!video || !video.duration) return;
      const newTime = parseFloat(seekSlider.value);
      video.currentTime = newTime;
      const vtext = formatValueText(newTime);
      seekSlider.setAttribute('aria-valuenow',  Math.round(newTime));
      seekSlider.setAttribute('aria-valuetext', vtext);
      const seekLabel = panel.querySelector('#dazn-a11y-seek-label');
      if (seekLabel) seekLabel.textContent = `${formatTime(newTime)} / ${formatTime(video.duration)}`;
    });

    // Nuolinäppäimet liukusäätimessä: ilmoita uusi sijainti NVDA:lle
    seekSlider.addEventListener('keyup', () => {
      const video = getVideo();
      if (!video) return;
      announceCurrentTime();
    });

    // Carousel-toggle
    panel.querySelector('#dazn-a11y-carousel-toggle').addEventListener('click', () => {
      toggleCarousel();
    });

    // Sulje paneeli
    panel.querySelector('#dazn-a11y-close').addEventListener('click', () => {
      hidePanel();
      announce('Saavutettavuuspaneeli suljettu. Avaa Alt+P.');
    });
  }

  function updatePanelState() {
    if (!controlPanel || !panelVisible) return;
    const video = getVideo();
    if (!video) return;

    // Aika-näyttö — luetaan suoraan player-elementistä ._1txupki0
    const timeEl = controlPanel.querySelector('#dazn-a11y-time');
    if (timeEl) {
      const timeInfo = getPlayerTimeText();
      timeEl.textContent = (timeInfo && timeInfo.raw)
        ? timeInfo.raw
        : `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
    }

    // Play/Pause-nappi
    const ppBtn = controlPanel.querySelector('#dazn-a11y-playpause');
    if (ppBtn) {
      if (video.paused) {
        ppBtn.textContent = '▶';
        ppBtn.setAttribute('aria-label', 'Toista');
      } else {
        ppBtn.textContent = '⏸';
        ppBtn.setAttribute('aria-label', 'Tauko');
      }
    }

    // Mute-nappi
    const muteBtn = controlPanel.querySelector('#dazn-a11y-mute');
    if (muteBtn) {
      if (video.muted || video.volume === 0) {
        muteBtn.textContent = '🔇';
        muteBtn.setAttribute('aria-label', 'Palauta ääni');
      } else {
        muteBtn.textContent = '🔊';
        muteBtn.setAttribute('aria-label', 'Mykistä');
      }
    }

    // Äänenvoimakkuusliukusäädin
    const volSlider = controlPanel.querySelector('#dazn-a11y-volume');
    if (volSlider && !video.muted) {
      volSlider.value = Math.round(video.volume * 100);
    }

    // Kelausliukusäädin — päivitetään vain kun käyttäjä ei vedä
    const seekSlider = controlPanel.querySelector('#dazn-a11y-seek');
    if (seekSlider && video.duration && !isNaN(video.duration)) {
      const dur = Math.floor(video.duration);
      const cur = video.currentTime;
      // Päivitä max jos kesto on muuttunut
      if (parseInt(seekSlider.max) !== dur) {
        seekSlider.max = dur;
        seekSlider.setAttribute('aria-valuemax', dur);
      }
      // Älä päivitä jos käyttäjä vetää (isSeeking on paneelin sisäinen muuttuja)
      // Tarkistamme epäsuorasti: jos slider on aktiivinen fokus, skipataan
      if (document.activeElement !== seekSlider) {
        seekSlider.value = Math.floor(cur);
      }
      seekSlider.setAttribute('aria-valuenow',  Math.round(cur));
      seekSlider.setAttribute('aria-valuetext', formatValueText(cur));
      const seekLabel = controlPanel.querySelector('#dazn-a11y-seek-label');
      if (seekLabel) {
        const timeInfo = getPlayerTimeText();
        seekLabel.textContent = (timeInfo && timeInfo.raw)
          ? timeInfo.raw
          : `${formatTime(cur)} / ${formatTime(video.duration)}`;
      }
    }
  }

  function showPanel() {
    panelVisible = true;
    controlPanel.removeAttribute('hidden');
    // Käynnistä tilapäivitys
    clearInterval(updateTimer);
    updateTimer = setInterval(updatePanelState, 1000);
    updatePanelState();
    // Siirrä fokus paneeliiin
    const firstBtn = controlPanel.querySelector('button');
    if (firstBtn) firstBtn.focus();
  }

  function hidePanel() {
    panelVisible = false;
    controlPanel.setAttribute('hidden', '');
    clearInterval(updateTimer);
  }

  function togglePanel() {
    if (panelVisible) {
      hidePanel();
    } else {
      showPanel();
    }
  }

  // ── Video-operaatiot ──────────────────────────────────────────────────

  function seekBy(seconds) {
    const video = getVideo();
    if (!video) {
      announce('Videota ei löydy');
      return;
    }
    const newTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || Infinity));
    video.currentTime = newTime;
    const direction = seconds > 0 ? 'eteenpäin' : 'taaksepäin';
    announce(`Kelattu ${direction} ${Math.abs(seconds)} sekuntia. Sijainti: ${formatTime(newTime)}`);
    updatePanelState();
  }

  function togglePlayPause() {
    const video = getVideo();
    if (!video) {
      // Kokeile natiivia nappia
      const btn = document.querySelector('#player-BUTTON_PAUSE_TOOLTIP') ||
                  document.querySelector('#player-BUTTON_PLAY_TOOLTIP');
      if (btn) btn.click();
      return;
    }
    if (video.paused) {
      video.play();
      announce('Toisto käynnissä');
    } else {
      video.pause();
      announce('Tauko');
    }
    updatePanelState();
  }

  function toggleMute() {
    const video = getVideo();
    if (!video) return;
    video.muted = !video.muted;
    announce(video.muted ? 'Mykistetty' : `Ääni palautettu, ${Math.round(video.volume * 100)} %`);
    updatePanelState();
  }

  function getPlayerTimeText() {
    // Luetaan aika suoraan DOM-elementistä _1txupki0
    // joka sisältää tekstin muodossa "00:28:56 / 03:56:52"
    const timeDiv = document.querySelector('._1txupki0');
    if (timeDiv) {
      // Kerää kaikki lapsisolmujen tekstit siivottuna
      const spans = timeDiv.querySelectorAll('span');
      if (spans.length >= 2) {
        const current = spans[0].textContent.trim();
        // Viimeinen span on kesto (rakenne: [current] [/] [duration])
        const last = spans[spans.length - 1].textContent.trim();
        return { current, duration: last, raw: `${current} / ${last}` };
      }
      // Fallback: koko tekstisisältö
      const raw = timeDiv.textContent.replace(/\s+/g, ' ').trim();
      return { raw };
    }
    return null;
  }

  function announceCurrentTime() {
    const timeInfo = getPlayerTimeText();
    if (timeInfo) {
      if (timeInfo.current && timeInfo.duration) {
        announce(`Kulunut aika ${timeInfo.current}, kesto ${timeInfo.duration}`, 'assertive');
      } else {
        announce(`Aika: ${timeInfo.raw}`, 'assertive');
      }
      return;
    }
    // Fallback video-elementtiin
    const video = getVideo();
    if (!video) {
      announce('Videota ei löydy');
      return;
    }
    announce(`Kulunut aika ${formatTime(video.currentTime)}, kesto ${formatTime(video.duration)}`, 'assertive');
  }

  // ── Näppäimistöoikotiet ───────────────────────────────────────────────

  function initKeyboardShortcuts() {
    // Käytetään sekä document- että window-tasoa varmuuden vuoksi.
    // DAZN:n oma capture-handler ei voi estää window-tason capture-kuuntelijaa.
    document.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keydown', (e) => {
      // Vain Alt+P ja Alt+T – ei muuta jotta ei häiritä muita toimintoja
      if (!e.altKey) return;
      if (e.code === 'KeyP') {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
      } else if (e.code === 'KeyT') {
        e.preventDefault();
        e.stopPropagation();
        announceCurrentTime();
      }
    }, true);
  }

  function isInTextInput(e) {
    const tag = e.target.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable;
  }

  function onKeyDown(e) {
    // Alt-yhdistelmät käsitellään AINA ensin – eivät ole tekstinsyöttöä
    if (e.altKey) {
      if (e.code === 'KeyP') {
        e.preventDefault();
        e.stopPropagation();
        togglePanel();
        return;
      }
      if (e.code === 'KeyT') {
        e.preventDefault();
        e.stopPropagation();
        announceCurrentTime();
        return;
      }
      // Muut Alt-yhdistelmät: älä puutu niihin
      return;
    }

    // Älä reagoi tekstikenttiin muilla näppäimillä
    if (isInTextInput(e)) return;

    // Nuolioikotiet – aktiivisina kun fokus EI ole natiiveissa ohjaimissa
    // (vältetään konflikti videosoittimen omien oikoteiden kanssa)
    const focusedId = document.activeElement ? document.activeElement.id : '';
    const focusInPlayer = focusedId.startsWith('player-');
    if (focusInPlayer) return; // anna natiivin soittimen hoitaa

    switch (e.code) {
      case 'Space':
      case 'KeyK':
        e.preventDefault();
        e.stopPropagation();
        togglePlayPause();
        break;

      case 'ArrowLeft':
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) seekBy(-SEEK_LARGE);
        else if (e.altKey) seekBy(-SEEK_MEDIUM);
        else seekBy(-SEEK_SMALL);
        break;

      case 'ArrowRight':
        e.preventDefault();
        e.stopPropagation();
        if (e.shiftKey) seekBy(SEEK_LARGE);
        else if (e.altKey) seekBy(SEEK_MEDIUM);
        else seekBy(SEEK_SMALL);
        break;

      case 'KeyM':
        e.preventDefault();
        e.stopPropagation();
        toggleMute();
        break;

      case 'ArrowUp':
        // Äänenvoimakkuus ylös 10%
        e.preventDefault();
        e.stopPropagation();
        adjustVolume(0.1);
        break;

      case 'ArrowDown':
        // Äänenvoimakkuus alas 10%
        e.preventDefault();
        e.stopPropagation();
        adjustVolume(-0.1);
        break;
    }
  }

  function adjustVolume(delta) {
    const video = getVideo();
    if (!video) return;
    video.volume = Math.max(0, Math.min(1, video.volume + delta));
    if (video.muted && video.volume > 0) video.muted = false;
    announce(`Äänenvoimakkuus ${Math.round(video.volume * 100)} %`);
    updatePanelState();
  }

  // ── Paneelin avaaminen näppäimistökomentona ───────────────────────────
  // Lisätään myös "ohituspiste" (skip link) sivun yläosaan

  function addSkipLink() {
    if (document.getElementById('dazn-a11y-skiplink')) return;
    const skip = document.createElement('a');
    skip.id = 'dazn-a11y-skiplink';
    skip.href = '#dazn-a11y-panel';
    skip.textContent = 'Siirry videosoittimen saavutettaviin ohjaimiin';
    skip.setAttribute('role', 'link');
    Object.assign(skip.style, {
      position: 'fixed',
      top: '-999px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: '#f5a623',
      color: '#000',
      padding: '10px 20px',
      fontWeight: 'bold',
      zIndex: '1000000',
      borderRadius: '0 0 6px 6px',
      textDecoration: 'none',
      fontSize: '14px',
      transition: 'top 0.2s',
    });
    skip.addEventListener('focus', () => {
      skip.style.top = '0';
      if (!panelVisible) showPanel();
    });
    skip.addEventListener('blur', () => {
      skip.style.top = '-999px';
    });
    skip.addEventListener('click', (e) => {
      e.preventDefault();
      if (!panelVisible) showPanel();
      controlPanel.querySelector('button').focus();
    });
    document.body.insertBefore(skip, document.body.firstChild);
  }

  // ── Video-tapahtumien kuuntelu ────────────────────────────────────────

  function attachVideoListeners() {
    const video = getVideo();
    if (!video || video._daznA11yPatched) return;
    video._daznA11yPatched = true;

    video.addEventListener('play',  () => {
      announce('Toisto käynnissä');
      updatePanelState();
    });
    video.addEventListener('pause', () => {
      announce('Tauko');
      updatePanelState();
    });
    video.addEventListener('volumechange', updatePanelState);
    video.addEventListener('seeking', () => {
      updatePanelState();
    });
  }

  // ── SPA-navigaation havainnointi (DAZN vaihtaa sivun ilman latausta) ─

  function observeNavigation() {
    const observer = new MutationObserver(() => {
      // Tarkista onko video tai player-napit muuttuneet
      const video = getVideo();
      if (video && !video._daznA11yPatched) {
        attachVideoListeners();
      }
      // Päivitä aria-labelit aina kun DOM muuttuu
      fixButtonLabels();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  // ── Alustus ───────────────────────────────────────────────────────────

  function init() {
    // Odota DOMia
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    createLiveRegion();
    addSkipLink();
    createControlPanel();
    // Paneeli alkaa piilotettuna - käyttäjä avaa Alt+P tai skip-linkillä
    hidePanel();

    injectPersistentControlsStyle();
    hideCarousel();
    fixButtonLabels();
    attachVideoListeners();
    initKeyboardShortcuts();
    observeNavigation();

    // Toista korjaus lyhyen viiveen jälkeen kun player on latautunut
    setTimeout(() => {
      fixButtonLabels();
      attachVideoListeners();
      announce('DAZN saavutettavuuslaajennus aktiivinen. Paina Alt+P avataksesi ohjainpaneelin tai käytä näppäimistöoikoteitä.');
    }, 3000);

    // Uudelleen pätchäys 10s kohdalla (player saattaa ladata myöhään)
    setTimeout(() => {
      fixButtonLabels();
      attachVideoListeners();
    }, 10000);
  }

  return { init, togglePanel, seekBy, togglePlayPause, announceCurrentTime };
})();

DaznA11y.init();
