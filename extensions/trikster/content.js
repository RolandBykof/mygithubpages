// ================================================================
// Hertta-apuri – Trickster Cards ruudunlukutuki  V1.5
// ================================================================
// KORTTIEN LUKEMINEN – OMA KÄSI (Alt-komennot):
//   Alt+A  Pata       Alt+S  Hertta
//   Alt+D  Ruutu      Alt+F  Risti
//   Alt+G  Koko käsi  Alt+L  Pelattavat
//   Alt+P  Loki       Alt+H  Ohjeet
//
// SOPIMUS JA TIKKILASKURI:
//   Alt+C  Sopimus ja tilannetilanne  (esim. "1 Pata. Pelinviejä 2/7. Puolustus 1.")
//
// KORTTIEN LUKEMINEN – LEPÄÄJÄN KÄSI (Alt-komennot):
//   Alt+Q  Lepääjän Pata      Alt+W  Lepääjän Hertta
//   Alt+E  Lepääjän Ruutu     Alt+R  Lepääjän Risti
//   Alt+T  Lepääjän koko käsi
//
// KORTIN PELAAMINEN – kaksivaiheinen:
//   Vaihe 1 – maaväri:   S=Pata  H=Hertta  D=Ruutu  C=Risti
//   Vaihe 2 – arvo:      2–9  0=Kymmenen  J Q K A
//   Laajennus tunnistaa automaattisesti onko oma vai lepääjän vuoro.
//   Escape peruuttaa valinnan.
//   Esim. Pata 9: S 9   Hertta K: H K   Ruutu 10: D 0
//
// PYYDETYN MAAN PELAAMINEN (yksittäinen näppäin, kun maaväriä ei valittuna):
//   L  Suurin pelattava kortti pyydettyä maata
//   K  Pienin pelattava kortti pyydettyä maata
//   (Toimii sekä omasta kädestä että lepääjältä vuoron mukaan.)
//
//   Huom: K toimii myös Kuninkaana kaksivaiheisessa systeemissä
//   (esim. Pata K: S K) — tila ratkaisee merkityksen.
//
// PELIPAIKAN VALINTA (pöytään liittymisnäkymässä):
//   Tab-näppäimellä tavoitetaan vapaat paikat: Länsi, Pohjoinen, Itä.
//   Enter tai Välilyönti valitsee paikan.
//   Varattujen paikkojen pelaajanimet kuuluvat ruudunlukijalla.
// ================================================================

console.log('Hertta-apuri V1.5 ladattu');

const HertApuri = (function () {

    // ----------------------------------------------------------------
    // 1. ÄÄNIALUE
    // ----------------------------------------------------------------
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'assertive');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = [
        'position:absolute', 'width:1px', 'height:1px', 'padding:0',
        'margin:-1px', 'overflow:hidden', 'clip:rect(0,0,0,0)',
        'white-space:nowrap', 'border:0'
    ].join(';');
    document.body.appendChild(liveRegion);

    let _speechTimer = null;

    function speak(text) {
        liveRegion.textContent = '';
        clearTimeout(_speechTimer);
        _speechTimer = setTimeout(function () {
            liveRegion.textContent = text;
        }, 50);
    }

    // ----------------------------------------------------------------
    // 2. VAKIOT
    // ----------------------------------------------------------------

    const RANK_EN_TO_SHORT = {
        'Two': '2', 'Three': '3', 'Four': '4', 'Five': '5', 'Six': '6',
        'Seven': '7', 'Eight': '8', 'Nine': '9', 'Ten': '10',
        'Jack': 'J', 'Queen': 'Q', 'King': 'K', 'Ace': 'A'
    };

    // Järjestys laskevaan lajitteluun (A korkein)
    const RANK_ORDER = ['2','3','4','5','6','7','8','9','10','J','Q','K','A'];

    const SUIT_FI = {
        'Spades': 'Pata', 'Hearts': 'Hertta', 'Diamonds': 'Ruutu', 'Clubs': 'Risti'
    };

    const SUIT_ORDER = ['Spades', 'Hearts', 'Diamonds', 'Clubs'];

    // Pelaamistarkoituksessa käytetty kirjain → englanninkielinen maaväri
    const KEY_TO_SUIT = {
        's': 'Spades', 'h': 'Hearts', 'd': 'Diamonds', 'c': 'Clubs'
    };

    // Näppäin → lyhyt arvo
    const KEY_TO_RANK = {
        '2': '2', '3': '3', '4': '4', '5': '5', '6': '6',
        '7': '7', '8': '8', '9': '9',
        '0': '10',   // 0 = Kymmenen
        'j': 'J', 'q': 'Q', 'k': 'K', 'a': 'A'
    };

    // ----------------------------------------------------------------
    // 3. APUFUNKTIOT – OMA KÄSI
    // ----------------------------------------------------------------

    function parseLabel(label) {
        if (!label) return null;
        const m = label.match(/^(\w+)\s+of\s+(\w+)/);
        if (!m) return null;
        return {
            rankShort: RANK_EN_TO_SHORT[m[1]] || m[1],
            suitEn:    m[2],
            suitFi:    SUIT_FI[m[2]] || m[2]
        };
    }

    function rankIndex(rankShort) {
        const idx = RANK_ORDER.indexOf(rankShort);
        return idx === -1 ? -1 : idx;
    }

    /** Palauttaa pelaajan oman käden kortit (class="card hand face-up"). */
    function getHandCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up'));
    }

    /** Palauttaa pelaajan oman käden pelattavissa olevat kortit. */
    function getLegalCards() {
        return Array.from(document.querySelectorAll('#cards .card.hand.face-up.legal'));
    }

    function getHandBySuit(suitEn) {
        return getHandCards().filter(function (el) {
            return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
        });
    }

    // Lajittelee parsed-taulun laskevasti (A ensin)
    function sortDesc(parsedArr) {
        return parsedArr.slice().sort(function (a, b) {
            return rankIndex(b.rankShort) - rankIndex(a.rankShort);
        });
    }

    // ----------------------------------------------------------------
    // 3b. APUFUNKTIOT – LEPÄÄJÄN KÄSI
    // ----------------------------------------------------------------

    /**
     * Palauttaa lepääjän kortit.
     * Lepääjän kortit ovat näkyvillä (face-up, revealed) mutta niissä
     * ei ole "hand"-luokkaa – ne kuuluvat kumppanille tai vastustajalle
     * joka on lepääjä.
     *
     * DOM: #cards .card.face-up.revealed   (ilman .hand-luokkaa)
     */
    function getDummyCards() {
        return Array.from(document.querySelectorAll('#cards .card.face-up.revealed')).filter(function (el) {
            return !el.classList.contains('hand');
        });
    }

    /** Palauttaa lepääjän pelattavissa olevat kortit. */
    function getLegalDummyCards() {
        return Array.from(document.querySelectorAll('#cards .card.face-up.revealed.legal')).filter(function (el) {
            return !el.classList.contains('hand');
        });
    }

    function getDummyBySuit(suitEn) {
        return getDummyCards().filter(function (el) {
            return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
        });
    }

    /**
     * Palauttaa true jos on lepääjän vuoro pelata.
     * Lepääjän vuoro tunnistetaan siitä, että pelattavissa olevat legal-kortit
     * löytyvät lepääjän kädestä (revealed ilman hand), eikä omasta kädestä.
     */
    function isDummyTurn() {
        return getLegalDummyCards().length > 0 && getLegalCards().length === 0;
    }

    /**
     * Palauttaa true jos pelinvienti on käynnissä (oma tai lepääjän vuoro).
     * Käytetään tarkistamaan kannattaako maavärikomento aktivoida.
     */
    function hasAnyLegalCards() {
        return getLegalCards().length > 0 || getLegalDummyCards().length > 0;
    }

    // ----------------------------------------------------------------
    // 4. LUKEMISFUNKTIOT – OMA KÄSI
    // ----------------------------------------------------------------

    /**
     * Lukee yhden maavärin kortit omasta kädestä.
     * Formaatti: "5 Pata A Q J 10 9"
     */
    function readSuit(suitEn) {
        const suitFi = SUIT_FI[suitEn] || suitEn;
        const cards = getHandBySuit(suitEn);

        if (cards.length === 0) {
            speak('Ei ' + suitFi + 'a');
            return;
        }

        const parsed = sortDesc(
            cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
        );

        speak(cards.length + ' ' + suitFi + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
    }

    /**
     * Lukee koko oman käden maaväreittäin.
     * Formaatti: "13 korttia. 5 Pata A Q J 10 9. 4 Hertta ..."
     */
    function readFullHand() {
        const hand = getHandCards();

        if (hand.length === 0) {
            speak('Oma käsi on tyhjä');
            return;
        }

        const parts = [];

        SUIT_ORDER.forEach(function (suitEn) {
            const cards = hand.filter(function (el) {
                return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
            });
            if (cards.length === 0) return;

            const parsed = sortDesc(
                cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
            );
            parts.push(cards.length + ' ' + SUIT_FI[suitEn] + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
        });

        speak(hand.length + ' korttia. ' + parts.join('. '));
    }

    /** Lukee pelattavissa olevat kortit maaväreittäin. */
    function readLegalCards() {
        const cards = getLegalCards();

        if (cards.length === 0) {
            speak('Ei pelattavia kortteja');
            return;
        }

        const bySuit = {};
        SUIT_ORDER.forEach(function (s) { bySuit[s] = []; });

        cards.forEach(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            if (p && bySuit[p.suitEn]) bySuit[p.suitEn].push(p);
        });

        const parts = [];
        SUIT_ORDER.forEach(function (suitEn) {
            const list = sortDesc(bySuit[suitEn]);
            if (list.length === 0) return;
            parts.push(list.length + ' ' + SUIT_FI[suitEn] + ' ' + list.map(function (p) { return p.rankShort; }).join(' '));
        });

        speak('Pelattavat ' + cards.length + ' kpl: ' + parts.join('. '));
    }

    // ----------------------------------------------------------------
    // 4b. LUKEMISFUNKTIOT – LEPÄÄJÄN KÄSI
    // ----------------------------------------------------------------

    /**
     * Lukee yhden maavärin kortit lepääjän kädestä.
     * Formaatti: "Lepääjä 4 Pata K J 9 4"
     */
    function readDummySuit(suitEn) {
        const suitFi = SUIT_FI[suitEn] || suitEn;
        const cards = getDummyBySuit(suitEn);

        if (getDummyCards().length === 0) {
            speak('Lepääjän käsi ei näkyvissä');
            return;
        }

        if (cards.length === 0) {
            speak('Lepääjällä ei ' + suitFi + 'a');
            return;
        }

        const parsed = sortDesc(
            cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
        );

        speak('Lepääjä ' + cards.length + ' ' + suitFi + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
    }

    /**
     * Lukee lepääjän koko käden maaväreittäin.
     * Formaatti: "Lepääjällä 13 korttia. 4 Pata K J 9 4. ..."
     */
    function readFullDummyHand() {
        const hand = getDummyCards();

        if (hand.length === 0) {
            speak('Lepääjän käsi ei näkyvissä');
            return;
        }

        const parts = [];

        SUIT_ORDER.forEach(function (suitEn) {
            const cards = hand.filter(function (el) {
                return (el.getAttribute('aria-label') || '').indexOf('of ' + suitEn) !== -1;
            });
            if (cards.length === 0) return;

            const parsed = sortDesc(
                cards.map(function (el) { return parseLabel(el.getAttribute('aria-label')); }).filter(Boolean)
            );
            parts.push(cards.length + ' ' + SUIT_FI[suitEn] + ' ' + parsed.map(function (p) { return p.rankShort; }).join(' '));
        });

        speak('Lepääjällä ' + hand.length + ' korttia. ' + parts.join('. '));
    }

    /** Kertaa pelin tapahtumalokia. */
    function readGameLog() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) { speak('Lokia ei löydy'); return; }

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        if (entries.length === 0) { speak('Loki on tyhjä'); return; }

        speak('Loki: ' + entries.slice(-5).join('. '));
    }

    // ----------------------------------------------------------------
    // 5. PYYDETYN MAAN SELVITTÄMINEN LOKISTA
    // ----------------------------------------------------------------

    /**
     * Selvittää pyydetyn maan (led suit) pelin tapahtumalokista.
     * Palauttaa englanninkielisen maavärin ('Spades' jne.) tai null
     * jos ei pyydettyä maata (pelaaja avaa vuoron tai loki ei kerro).
     *
     * Logiikka:
     *   1. Etsi viimeisin "Trick to …" -merkintä, joka päättää edellisen voiton.
     *   2. Kaikki sen jälkeiset merkinnät kuuluvat käynnissä olevaan vuoroon.
     *   3. Ensimmäinen korttimerkintä näistä on avaava kortti → sen maaväri.
     */
    function getLedSuit() {
        const log = document.querySelector('.sr-only[role="log"]');
        if (!log) return null;

        const entries = Array.from(log.querySelectorAll('div'))
            .map(function (d) { return d.textContent.trim(); })
            .filter(Boolean);

        // Etsi viimeisin vuoronvaihtorajapyykki ("Trick to …")
        let lastTrickIdx = -1;
        for (let i = entries.length - 1; i >= 0; i--) {
            if (/^Trick\b/i.test(entries[i])) {
                lastTrickIdx = i;
                break;
            }
        }

        // Käy läpi tämän vuoron merkinnät
        const currentTrick = entries.slice(lastTrickIdx + 1);

        for (let i = 0; i < currentTrick.length; i++) {
            const entry = currentTrick[i];

            // "West led Six of Hearts."  tai  "[Nimi] led Rank of Suit."
            const mLed = entry.match(/\bled\s+(\w+)\s+of\s+(\w+)/i);
            if (mLed && RANK_EN_TO_SHORT[mLed[1]]) {
                return mLed[2];
            }

            // "You played Five of Clubs."  tai  "[Nimi] played Five of Clubs."
            const mPlayed = entry.match(/\bplayed\s+(\w+)\s+of\s+(\w+)/i);
            if (mPlayed && RANK_EN_TO_SHORT[mPlayed[1]]) {
                return mPlayed[2];
            }

            // "Five of Clubs."  (lyhyt muoto muiden pelaajien korteille)
            const mCard = entry.match(/^(\w+)\s+of\s+(\w+)\.?$/i);
            if (mCard && RANK_EN_TO_SHORT[mCard[1]]) {
                return mCard[2];
            }
        }

        return null; // pelaaja avaa vuoron, ei pyydettyä maata
    }

    // ----------------------------------------------------------------
    // 6. PYYDETYN MAAN PELAAMINEN  (L = suurin, K = pienin)
    //    Tunnistaa automaattisesti lepääjän vuoron.
    // ----------------------------------------------------------------

    function simulateClick(el) {
        if (!el) return;
        const opts = { bubbles: true, cancelable: true, view: window };
        el.dispatchEvent(new PointerEvent('pointerdown', opts));
        el.dispatchEvent(new MouseEvent('mousedown', opts));
        el.dispatchEvent(new PointerEvent('pointerup', opts));
        el.dispatchEvent(new MouseEvent('mouseup', opts));
        el.dispatchEvent(new MouseEvent('click', opts));
    }

    /**
     * Pelaa suurimman tai pienimmän pelattavan kortin pyydettyä maata.
     * Käyttää automaattisesti oikeaa kättä (oma / lepääjä) vuoron mukaan.
     * mode: 'highest' | 'lowest'
     */
    function playLedSuitCard(mode) {
        const suitEn = getLedSuit();

        if (!suitEn) {
            speak('Ei pyydettyä maata — olet avaaja');
            return;
        }

        const suitFi = SUIT_FI[suitEn] || suitEn;
        const dummyTurn = isDummyTurn();

        // Pelattavissa olevat kortit pyydettyä maata oikeasta kädestä
        const legalPool = dummyTurn ? getLegalDummyCards() : getLegalCards();
        const legal = legalPool.filter(function (el) {
            const p = parseLabel(el.getAttribute('aria-label'));
            return p && p.suitEn === suitEn;
        });

        if (legal.length === 0) {
            const prefix = dummyTurn ? 'Lepääjällä ' : '';
            speak(prefix + 'Ei ' + suitFi + 'a pelattavana');
            return;
        }

        // Järjestä ja valitse
        const candidates = legal.map(function (el) {
            return { el: el, p: parseLabel(el.getAttribute('aria-label')) };
        });
        candidates.sort(function (a, b) {
            return rankIndex(b.p.rankShort) - rankIndex(a.p.rankShort);
        });

        const chosen = (mode === 'highest') ? candidates[0] : candidates[candidates.length - 1];
        const prefix = dummyTurn ? 'Lepääjältä ' : '';
        speak(prefix + 'Pelataan ' + chosen.p.suitFi + ' ' + chosen.p.rankShort);
        simulateClick(chosen.el);
    }

    // ----------------------------------------------------------------
    // 7. KORTIN PELAAMINEN – KAKSIVAIHEINEN PIKANÄPPÄIN
    //    Tunnistaa automaattisesti lepääjän vuoron.
    // ----------------------------------------------------------------

    let _pendingSuit = null;
    let _pendingTimer = null;

    function cancelPending() {
        _pendingSuit = null;
        clearTimeout(_pendingTimer);
        _pendingTimer = null;
    }

    function suitKeyPressed(suitEn) {
        // Aktivoituu vain kun on pelattavia kortteja (omassa tai lepääjän kädessä)
        if (!hasAnyLegalCards()) return false;

        cancelPending();
        _pendingSuit = suitEn;

        // Kerro myös kummasta kädestä ollaan pelaamassa
        const dummyTurn = isDummyTurn();
        const prefix = dummyTurn ? 'Lepääjä ' : '';
        speak(prefix + SUIT_FI[suitEn] + '?');

        _pendingTimer = setTimeout(function () {
            if (_pendingSuit) { speak('Peruutettu'); cancelPending(); }
        }, 5000);

        return true;
    }

    function rankKeyPressed(rankShort) {
        const suitEn = _pendingSuit;
        const suitFi = SUIT_FI[suitEn];
        cancelPending();

        const cardName = suitFi + ' ' + rankShort;
        const dummyTurn = isDummyTurn();

        if (dummyTurn) {
            // --- Lepääjän vuoro ---
            const inDummy = getDummyCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (inDummy.length === 0) {
                speak('Lepääjällä ei ' + cardName + ':ää');
                return;
            }

            const legalDummy = getLegalDummyCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (legalDummy.length === 0) {
                speak('Lepääjän ' + cardName + ' ei pelattavissa');
                return;
            }

            speak('Lepääjältä pelataan ' + cardName);
            simulateClick(legalDummy[0]);

        } else {
            // --- Oma vuoro ---
            const inHand = getHandCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (inHand.length === 0) {
                speak('Ei ' + cardName + ':ää kädessä');
                return;
            }

            const legal = getLegalCards().filter(function (el) {
                const p = parseLabel(el.getAttribute('aria-label'));
                return p && p.suitEn === suitEn && p.rankShort === rankShort;
            });

            if (legal.length === 0) {
                speak(cardName + ' ei pelattavissa');
                return;
            }

            speak('Pelataan ' + cardName);
            simulateClick(legal[0]);
        }
    }

    // ----------------------------------------------------------------
    // 8. SOPIMUS JA TIKKILASKURI  (Alt+C)
    // ----------------------------------------------------------------

    /**
     * Lukee sopimuksen ja tikkilanteen ääneen.
     *
     * Pelinviejä tunnistetaan: ainoa pelaajadivi, jolla on
     * aria-label="Expected Score: N" täytettynä.
     *
     * Sopimus: pelinviejän div.trump > span (taso) + span.suit.* tai span.notrump.
     *
     * Tikit:
     *   - Pelinviejän tikit:  pelinviejän span.hand-score  (aria-label="Hand score: N")
     *   - Puolustuksen tikit: kaikkien muiden hand-scorejen summa
     *
     * Esimerkkilausuma: "1 Pata. Pelinviejä 2/7. Puolustus 1."
     */
    function readContractStatus() {
        const players = Array.from(document.querySelectorAll('#players .player'));

        if (players.length === 0) {
            speak('Pelaajia ei löydy');
            return;
        }

        // --- Etsi pelinviejä: sillä on expected-score-arvo ---
        let declarerEl    = null;
        let expectedTricks = null;
        let declarerTricks = 0;

        for (const player of players) {
            const expEl = player.querySelector('span.expected-score');
            if (!expEl) continue;
            const expLabel = expEl.getAttribute('aria-label') || '';
            const mExp = expLabel.match(/Expected Score:\s*(\d+)/i);
            if (!mExp) continue;

            declarerEl     = player;
            expectedTricks = parseInt(mExp[1], 10);

            const scoreEl = player.querySelector('span.hand-score');
            if (scoreEl) {
                const mScore = (scoreEl.getAttribute('aria-label') || '').match(/Hand score:\s*(\d+)/i);
                if (mScore) declarerTricks = parseInt(mScore[1], 10);
            }
            break;
        }

        if (!declarerEl || expectedTricks === null) {
            speak('Sopimusta ei löydy — onko pelinvientivaihe käynnissä?');
            return;
        }

        // --- Sopimus div.trump:sta ---
        let contractStr = '';
        const trumpDiv = declarerEl.querySelector('div.trump');
        if (trumpDiv) {
            // Taso: ensimmäinen suora span-lapsi
            const spans = Array.from(trumpDiv.querySelectorAll(':scope > span'));
            const level = spans.length > 0 ? spans[0].textContent.trim() : '';

            // Maaväri: span.suit.Spades jne., tai span.notrump
            let suitFi = '';
            const notrumpSpan = trumpDiv.querySelector('span.notrump');
            if (notrumpSpan) {
                suitFi = 'Sa';   // Sa = sanssi (no trump)
            } else {
                const suitSpan = trumpDiv.querySelector('span.suit');
                if (suitSpan) {
                    const suitClass = Array.from(suitSpan.classList).find(function (c) { return SUIT_FI[c]; });
                    suitFi = suitClass ? SUIT_FI[suitClass] : '';
                }
            }

            if (level) {
                contractStr = level + (suitFi ? ' ' + suitFi : '') + '. ';
            }
        }

        // --- Puolustuksen tikit: kaikkien pelaajien summa miinus pelinviejä ---
        let totalTricks = 0;
        players.forEach(function (player) {
            const scoreEl = player.querySelector('span.hand-score');
            if (!scoreEl) return;
            const m = (scoreEl.getAttribute('aria-label') || '').match(/Hand score:\s*(\d+)/i);
            if (m) totalTricks += parseInt(m[1], 10);
        });
        const defenderTricks = totalTricks - declarerTricks;

        speak(contractStr + 'Pelinviejä ' + declarerTricks + '/' + expectedTricks + '. Puolustus ' + defenderTricks + '.');
    }

    // ----------------------------------------------------------------
    // 8b. OHJE
    // ----------------------------------------------------------------
    function showHelp() {
        speak([
            'Ohjeet.',
            'Oma käsi Alt A pata, Alt S hertta, Alt D ruutu, Alt F risti, Alt G koko käsi.',
            'Lepääjän käsi Alt Q pata, Alt W hertta, Alt E ruutu, Alt R risti, Alt T koko käsi.',
            'Muut: Alt C sopimus ja tikkilaskuri, Alt L pelattavat, Alt P loki.',
            'Pelaaminen: ensin maavärikirjain S H D tai C, sitten arvo 2 9 0 J Q K A.',
            'Laajennus tunnistaa automaattisesti oman ja lepääjän vuoron.',
            'L pelaa suurimman, K pienimmän pyydettyä maata.',
            'Huom: K toimii myös Kuninkaana (esim. S K = pata kuningas).',
            'Escape peruuttaa maavärin.',
            'Pöytään liittyessä Tab tavoittaa vapaat paikat Länsi, Pohjoinen, Itä.',
            'Enter tai Välilyönti valitsee paikan.'
        ].join(' '));
    }

    // ----------------------------------------------------------------
    // 9. NÄPPÄIMISTÖNKÄSITTELIJÄ
    // ----------------------------------------------------------------
    document.addEventListener('keydown', function (e) {

        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        function block() {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
        }

        // --- ALT-KOMENNOT: korttien lukeminen ---
        if (e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();

            // Oma käsi
            if (key === 'a') { block(); readSuit('Spades');      return; }
            if (key === 's') { block(); readSuit('Hearts');      return; }
            if (key === 'd') { block(); readSuit('Diamonds');    return; }
            if (key === 'f') { block(); readSuit('Clubs');       return; }
            if (key === 'g') { block(); readFullHand();          return; }

            // Lepääjän käsi
            if (key === 'q') { block(); readDummySuit('Spades');   return; }
            if (key === 'w') { block(); readDummySuit('Hearts');   return; }
            if (key === 'e') { block(); readDummySuit('Diamonds'); return; }
            if (key === 'r') { block(); readDummySuit('Clubs');    return; }
            if (key === 't') { block(); readFullDummyHand();       return; }

            // Sopimus ja tikkilaskuri
            if (key === 'c') { block(); readContractStatus();      return; }

            // Muut
            if (key === 'l') { block(); readLegalCards();        return; }
            if (key === 'p') { block(); readGameLog();           return; }
            if (key === 'h') { block(); showHelp();              return; }
            return;
        }

        // --- PELAAMINEN (ei modifikaattoreja) ---
        if (!e.altKey && !e.ctrlKey && !e.shiftKey) {
            const key = e.key.toLowerCase();

            // Escape: peruuta odottava maaväri
            if (e.key === 'Escape' && _pendingSuit) {
                block();
                speak('Peruutettu');
                cancelPending();
                return;
            }

            // Vaihe 2: arvo (kun maaväri odottaa)
            if (_pendingSuit) {
                const rankShort = KEY_TO_RANK[key];
                if (rankShort) {
                    block();
                    rankKeyPressed(rankShort);
                } else {
                    cancelPending();
                }
                return;
            }

            // L / K: pyydetyn maan suurin / pienin (vain kun ei maaväriä odottamassa)
            if (key === 'l') {
                if (hasAnyLegalCards()) {
                    block();
                    playLedSuitCard('highest');
                    return;
                }
            }
            if (key === 'k') {
                if (hasAnyLegalCards()) {
                    block();
                    playLedSuitCard('lowest');
                    return;
                }
            }

            // Vaihe 1: maavärikirjain
            if (KEY_TO_SUIT[key]) {
                const captured = suitKeyPressed(KEY_TO_SUIT[key]);
                if (captured) { block(); return; }
            }
        }

    }, true); // capture-vaihe

    // ----------------------------------------------------------------
    // 11. PELIPAIKAN VALINTA – SAAVUTETTAVUUSPATCHAUS
    // ----------------------------------------------------------------
    //
    // Pöytään liittymisnäkymässä jokaisen avoimen pelin alla näkyy
    // kolme paikkadiveä: .user.left.open, .user.top.open, .user.right.open
    // (siltakompassi: left=Länsi, top=Pohjoinen, right=Itä).
    // Varatut paikat ovat .user.*.disabled.
    //
    // Kaikki nämä divit ovat oletuksena tabindex="-1", joten niitä ei
    // voi tavoittaa näppäimistöllä. Tämä osio korjaa tilanteen:
    //
    //   Vapaa paikka (.open):
    //     → tabindex="0" + role="button"
    //     → aria-label="Valitse paikka: Länsi" (/ Pohjoinen / Itä)
    //     → Enter tai Välilyönti simuloi hiiriklikkauksen
    //
    //   Varattu paikka (.disabled):
    //     → aria-label="Paikka Pohjoinen: Matti" (pelaajan nimi)
    //       (helpottaa pöydän tilanteen hahmottamista)
    //
    // MutationObserver pitää patchauksen ajan tasalla kun pelilistaa
    // ladataan tai paikat täyttyvät reaaliajassa.
    // ----------------------------------------------------------------

    (function () {

        const SEAT_POS = { left: 'Länsi', top: 'Pohjoinen', right: 'Itä' };

        function seatPosOf(el) {
            return ['left', 'top', 'right'].find(function (c) {
                return el.classList.contains(c);
            }) || null;
        }

        function playerNameOf(el) {
            var nameEl = el.querySelector('.unique-name-text');
            if (!nameEl) return null;
            var name = nameEl.textContent.trim();
            return (name && name !== 'Open Seat') ? name : null;
        }

        function patchSeat(el) {
            var pos      = seatPosOf(el);
            var posLabel = pos ? SEAT_POS[pos] : 'vapaa';

            if (el.classList.contains('open')) {
                // Vapaa paikka → näppäimistöllä valittava painike
                el.setAttribute('tabindex', '0');
                el.setAttribute('role', 'button');
                el.setAttribute('aria-label', 'Valitse paikka: ' + posLabel);
            } else {
                // Varattu tai ei tiedossa → ilmoita kuka istuu
                var name  = playerNameOf(el);
                var label = 'Paikka ' + posLabel + (name ? ': ' + name : ': varattuna');
                el.setAttribute('aria-label', label);
                el.setAttribute('tabindex', '-1');
                el.removeAttribute('role');
            }
        }

        function patchAll() {
            document.querySelectorAll('.users .user').forEach(patchSeat);
        }

        // Näppäimistökäsittely: delegointi koko dokumentille (capture-vaihe)
        // Aktivoituu vain kun fokus on avoimessa paikkadivissä.
        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var el = e.target;
            if (!el.classList.contains('user') || !el.classList.contains('open')) return;
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            var posLabel = SEAT_POS[seatPosOf(el)] || 'vapaa';
            speak('Valitaan paikka: ' + posLabel);
            // Kohdennetaan klikki sisempään lapseen, koska sovellus todennäköisesti
            // käyttää event delegointia ja tarkistaa event.target:n.
            // Hiirinapin painalluksessa target on aina jokin sisempi elementti,
            // ei itse .user-div.
            var clickTarget = el.querySelector('.name-tag') ||
                              el.querySelector('.unique-name-text') ||
                              el;
            simulateClick(clickTarget);
        }, true);

        // MutationObserver: reagoi kun pelilista latautuu tai paikat muuttuvat
        new MutationObserver(patchAll).observe(document.body, {
            childList:       true,
            subtree:         true,
            attributes:      true,
            attributeFilter: ['class']
        });

        // Alkupatchaus (jos lista jo näkyvissä)
        patchAll();

    }());

    // ----------------------------------------------------------------
    // 10. KÄYNNISTYSILMOITUS
    // ----------------------------------------------------------------
    setTimeout(function () {
        speak('Hertta-apuri V1.5 ladattu. Alt H avaa ohjeet.');
    }, 1500);

    return {
        readSuit:            readSuit,
        readFullHand:        readFullHand,
        readDummySuit:       readDummySuit,
        readFullDummyHand:   readFullDummyHand,
        readLegalCards:      readLegalCards,
        readContractStatus:  readContractStatus,
        getLedSuit:          getLedSuit,
        isDummyTurn:         isDummyTurn
    };

})();
