// =========================================================
// BBO Accessibility Extension (Screen Reader Support) - V7.6-FI
// =========================================================
// Suits identified from suitPanelClass structure, played cards
// from handDiagramCurrentTrickClass elements. Compass direction
// from DOM order (S,W,N,E). Aria-live uses clip technique.
// Trick transition resets when card count drops. New game
// detected when handDiagramPanelClass added to DOM. Auction
// bids spoken automatically with seat identification. Speech
// queue ensures all messages spoken in order. Keyboard shortcuts
// use capture phase with stopImmediatePropagation.
// V6.0: Full English translation.
// V6.1: Dummy identified from declarer via tricksPanelClass.
// V6.2: Added vulnerability announcement at board start.
// V6.3: Fixed board start detection.
// V6.4: Added BBO's native keyboard shortcuts for playing cards.
// V6.5: Smart turn detection to play from own hand or dummy.
// V6.6: Improved keyboard simulation (Digit vs Key codes) and
// added fallback mouse click simulation to guarantee card is played.
// V6.7: Fixed old game results bleeding into new game announcements.
// Speech queue cleared on game transition, board end text preserved
// to prevent re-announcement from DOM remnants.
// V6.8: Auto-focus modal dialogs (mat-dialog-container) for NVDA.
// Simulates mouse click to force NVDA virtual cursor into dialog.
// V6.9: Fixed board end result not being announced. Removed speech
// queue clearing on game transition — lastBoardEndText comparison
// alone prevents re-announcement without silencing the result.
// V7.0: Alt+X announces board number, vulnerability, and contract.
// Contract read from tricks panel or derived from auction bids.
// V7.1: Fixed stale bids from previous game bleeding into new game.
// staleBidCount tracks how many DOM bids are old-game remnants.
// readCurrentBids() skips them. All bid consumers updated.
// V7.2: Fixed contract reading from tricks panel. Handles full
// direction names and searches all labels for level+suit pattern.
// V7.4: Fixed stale bid detection. Debug log revealed BBO leaves exactly
// 1 bid in the auction box between boards (the previous contract). On
// first board staleBidCount=0, on subsequent boards staleBidCount=1.
// V7.5: Alt+G = read all own hand. Alt+T = read all dummy hand.
// Alt+H = keyboard help. Debug download removed.
// V7.6: Fixed dummy identification when user is dummy (partner is
// declarer). dummyPanel now points to declarer's panel, which BBO
// displays on screen, instead of incorrectly pointing at own panel.
// V7.6-FI: Suomenkielinen versio. Kaikki ilmoitukset käännetty.
// V7.6-FI.1: Korjattu maakohtainen taivutus: 0=ei kortteja,
// 1=nominatiivi (1 pata), 2+=partitiivi (2 pataa).
// V7.7-FI: Lisätty kolmannen ja neljännen pelaajan näppäinkomennot
// Alt+1234 (padat/hertat/ruudut/ristit) ja Alt+7890. Alt+5 ja Alt+6
// lukevat koko käden. Suunnan nimi ilmoitetaan aina puheessa.
// V7.8-FI: Alt+numerot toimivat vain kun kaikki 4 kättä näkyvissä
// (vugraph tai levitys/claim). Muutoin: "Kortit eivät näkyvissä."
// Tunnistus: 4 handDiagramPanelClass-elementtiä, kaikissa kortit.
// =========================================================
console.log("BBO Accessibility Extension loaded (V7.8-FI)");

// ---------------------------------------------------------
// 1. SCREEN READER SPEAKER
// ---------------------------------------------------------
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.style.position = 'absolute';
liveRegion.style.width = '1px';
liveRegion.style.height = '1px';
liveRegion.style.padding = '0';
liveRegion.style.margin = '-1px';
liveRegion.style.overflow = 'hidden';
liveRegion.style.clip = 'rect(0, 0, 0, 0)';
liveRegion.style.whiteSpace = 'nowrap';
liveRegion.style.border = '0';
document.body.appendChild(liveRegion);

var speechQueue = [];
var isSpeaking = false;
var SPEECH_DELAY = 600;

function speak(text) {
    speechQueue.push(text);
    if (!isSpeaking) processSpeechQueue();
}

function speakNow(text) {
    speechQueue = [];
    isSpeaking = false;
    liveRegion.textContent = '';
    setTimeout(function() { liveRegion.textContent = text; }, 50);
}

function processSpeechQueue() {
    if (speechQueue.length === 0) {
        isSpeaking = false;
        return;
    }
    isSpeaking = true;
    var text = speechQueue.shift();
    liveRegion.textContent = '';
    setTimeout(function() {
        liveRegion.textContent = text;
        setTimeout(processSpeechQueue, SPEECH_DELAY);
    }, 50);
}

// ---------------------------------------------------------
// 1b. INTERNAL DEBUG LOG (console only)
// ---------------------------------------------------------
function dlog(msg) {
    var ts = new Date().toISOString().substring(11, 23);
    console.log('[BBO] ' + ts + '  ' + msg);
}

// ---------------------------------------------------------
// 2. CONSTANTS AND HELPERS
// ---------------------------------------------------------

// Sisäiset avainnimet pysyvät englantina (DOM-rakenne käyttää niitä)
const SUITS_IN_ORDER = ['Club', 'Diamond', 'Heart', 'Spade'];
const SYMBOL_TO_SUIT = { '\u2663': 'Club', '\u2666': 'Diamond', '\u2665': 'Heart', '\u2660': 'Spade' };

// Suomenkieliset maanimi-näytöt kolmessa taivutusmuodossa
// Nominatiivi (kortit näytöissä ja 1 kortti): pata, hertta, ruutu, risti
var SUIT_NAME_FI      = { 'Spade': 'Pata',   'Heart': 'Hertta',  'Diamond': 'Ruutu',  'Club': 'Risti'  };
// Partitiivi yksikkö (2+ korttia): pataa, herttaa, ruutua, ristiä
var SUIT_PARTITIVE_FI = { 'Spade': 'pataa',  'Heart': 'herttaa', 'Diamond': 'ruutua', 'Club': 'ristiä' };
// Nominatiivi monikko (ohjeet): padat, hertat, ruudut, ristit
var SUIT_PLURAL_FI    = { 'Spade': 'padat',  'Heart': 'hertat',  'Diamond': 'ruudut', 'Club': 'ristit' };
// Partitiivi monikko kieltolauseessa (ei patoja): patoja, herttoja, ruutuja, ristejä
var SUIT_NEG_FI       = { 'Spade': 'patoja', 'Heart': 'herttoja', 'Diamond': 'ruutuja', 'Club': 'ristejä' };

// Palauttaa oikean taivutusmuodon korttimäärän mukaan
function suitWordFI(suit, count) {
    if (count === 1) return SUIT_NAME_FI[suit] || suit;
    return SUIT_PARTITIVE_FI[suit] || suit;
}

// Suomenkieliset suuntanimet (näytetään puheessa)
var DIRECTION_FI = { 'S': 'Etelä', 'N': 'Pohjoinen', 'W': 'Länsi', 'E': 'Itä',
                     'South': 'Etelä', 'North': 'Pohjoinen', 'West': 'Länsi', 'East': 'Itä' };

// Tarjousmuunnokset suomeksi
const BID_TRANSLATION = { 'Pass': 'Passi', 'Dbl': 'Tupla', 'Rdbl': 'Retupla' };

var CARD_RANK = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
                  '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function cardRank(value) { return CARD_RANK[value] || 0; }

function translateBid(text) {
    if (!text) return '';
    text = text.replace(/\n| /g, '').trim();
    if (!text) return '';
    if (BID_TRANSLATION[text]) return BID_TRANSLATION[text];
    var level = text.charAt(0);
    if (level >= '1' && level <= '7') {
        var rest = text.substring(1).trim();
        if (rest === 'NT' || rest === 'N') return level + ' SA';
        if (rest.length >= 1 && SYMBOL_TO_SUIT[rest.charAt(0)]) {
            return level + ' ' + SUIT_NAME_FI[SYMBOL_TO_SUIT[rest.charAt(0)]];
        }
        return level + ' ' + rest;
    }
    return text;
}

function parsePlayedCard(text) {
    if (!text) return null;
    text = text.replace(/\n/g, '').trim();
    if (text.length === 0) return null;
    var symbol = text.charAt(0);
    var suit = SYMBOL_TO_SUIT[symbol];
    if (!suit) return null;
    var value = text.substring(1).trim();
    if (!value) return null;
    return { suit: suit, value: value };
}

// ---------------------------------------------------------
// 3. HAND IDENTIFICATION
// ---------------------------------------------------------
function readHandCards(handElement) {
    var cards = [];
    if (!handElement) return cards;
    var suitPanels = handElement.querySelectorAll('.suitPanelClass');
    for (var i = 0; i < suitPanels.length && i < 4; i++) {
        var suit = SUITS_IN_ORDER[i];
        var handCards = suitPanels[i].querySelectorAll('div.handDiagramCardClass');
        for (var j = 0; j < handCards.length; j++) {
            var value = handCards[j].innerText.replace(/\n| /g, '').trim();
            if (value) cards.push({ suit: suit, value: value, element: handCards[j] });
        }
    }
    return cards;
}

var SEAT_TO_PANEL_INDEX = { 'S': 0, 'W': 1, 'N': 2, 'E': 3 };
var PANEL_INDEX_TO_SEAT = ['S', 'W', 'N', 'E'];
var DUMMY_BY_DECLARER = { 'S': 'N', 'N': 'S', 'W': 'E', 'E': 'W' };

function findDeclarer() {
    var tricksPanel = document.querySelector('.tricksPanelClass');
    if (!tricksPanel || tricksPanel.style.display === 'none') return null;
    var labels = tricksPanel.querySelectorAll('.tricksPanelTricksLabelClass');
    if (labels.length === 0) return null;
    var text = labels[0].innerText.trim();
    if (text.length === 0) return null;
    var seatLetter = text.charAt(0).toUpperCase();
    if ('NSEW'.indexOf(seatLetter) !== -1) return seatLetter;
    return null;
}

function identifyPlayers() {
    var panels = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
    if (panels.length === 0) return { own: null, dummy: null, ownSeat: null, dummySeat: null };

    var ownIdx = 0;
    var highestTop = -1;
    for (var i = 0; i < panels.length; i++) {
        var top = panels[i].getBoundingClientRect().top;
        if (top > highestTop) { highestTop = top; ownIdx = i; }
    }
    var ownPanel = panels[ownIdx];
    var ownSeat = PANEL_INDEX_TO_SEAT[ownIdx];

    var dummyPanel = null;
    var dummySeat = null;
    var declarer = findDeclarer();
    if (declarer) {
        dummySeat = DUMMY_BY_DECLARER[declarer];
        var dummyIdx = SEAT_TO_PANEL_INDEX[dummySeat];
        if (dummyIdx !== undefined && dummyIdx < panels.length) dummyPanel = panels[dummyIdx];

        // Erikoistapaus: pelaaja itse on lepääjä (partneri on pelinviejä).
        // dummySeat osoittaisi omaan paneeliin — virheellinen tulos.
        // BBO näyttää tässä tapauksessa pelinviejän kortit ruudulla,
        // joten ohjataan dummyPanel pelinviejän paneeliin.
        if (dummySeat === ownSeat) {
            var declarerIdx = SEAT_TO_PANEL_INDEX[declarer];
            if (declarerIdx !== undefined && declarerIdx < panels.length) {
                dummyPanel = panels[declarerIdx];
                dummySeat = declarer;
            }
        }
    }
    // Kerää loput paneeli (kolmas ja neljäs pelaaja, vugraph-näkymässä 4 kättä näkyvissä)
    var others = [];
    if (panels.length === 4) {
        var usedIdx = {};
        usedIdx[ownIdx] = true;
        // Selvitetään, mihin DOM-indeksiin dummyPanel osoittaa
        var resolvedDummyIdx = -1;
        if (dummySeat) resolvedDummyIdx = SEAT_TO_PANEL_INDEX[dummySeat];
        if (resolvedDummyIdx >= 0) usedIdx[resolvedDummyIdx] = true;
        for (var k = 0; k < 4; k++) {
            if (!usedIdx[k]) {
                others.push({ panel: panels[k], seat: PANEL_INDEX_TO_SEAT[k] });
            }
        }
        // Järjestys DOM-indeksin mukaan (S<W<N<E) — pysyy johdonmukaisena jaon aikana
        others.sort(function(a, b) {
            return SEAT_TO_PANEL_INDEX[a.seat] - SEAT_TO_PANEL_INDEX[b.seat];
        });
    }
    return { own: ownPanel, dummy: dummyPanel, ownSeat: ownSeat, dummySeat: dummySeat, others: others };
}

// Palauttaa true kun kaikki 4 kättä ovat näkyvissä (vugraph tai levitys/claim).
// Normaalipelissä näkyvissä on vain 2 paneelia (oma + lepääjä).
function isAllHandsVisible() {
    var panels = document.querySelectorAll('div.handDiagramPanelClass');
    if (panels.length < 4) return false;
    for (var i = 0; i < 4; i++) {
        if (panels[i].querySelectorAll('div.handDiagramCardClass').length === 0) return false;
    }
    return true;
}

// DOM-järjestys: Etelä=0, Länsi=1, Pohjoinen=2, Itä=3
var TRICK_DIRECTIONS = ['South', 'West', 'North', 'East'];

function readPlayedCards() {
    var played = [];
    var elements = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    for (var i = 0; i < elements.length && i < 4; i++) {
        var el = elements[i];
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var result = parsePlayedCard(el.innerText);
            if (result) { result.player = TRICK_DIRECTIONS[i]; played.push(result); }
        }
    }
    return played;
}

// ---------------------------------------------------------
// 3b. BID READING
// ---------------------------------------------------------
var SEAT_NAME = { 'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West',
                  'North': 'North', 'South': 'South', 'East': 'East', 'West': 'West' };
var spokenBidCount = 0;
var staleBidCount = 0;
var bidCheckTimer = null;

function identifyBidder(bidElement) {
    var auctionBox = bidElement.closest('.auctionBoxClass') || document.querySelector('.auctionBoxClass') || document.querySelector('[class*="auctionBox"]');
    if (!auctionBox) return null;
    var headers = auctionBox.querySelectorAll('.auction-box-header-cell');
    var bidX = bidElement.getBoundingClientRect().x;
    for (var i = 0; i < headers.length; i++) {
        if (Math.abs(headers[i].getBoundingClientRect().x - bidX) < 5) {
            var seat = headers[i].innerText.trim();
            return SEAT_NAME[seat] || seat;
        }
    }
    return null;
}

// Palauttaa tarjoajan suomenkielisen suuntanimen
function bidderFI(bidder) {
    if (!bidder) return '';
    return DIRECTION_FI[bidder] || bidder;
}

function readBids() {
    var bids = [];
    var elements = document.querySelectorAll('auction-box-cell');
    if (elements.length === 0) elements = document.querySelectorAll('div.auction-box-cell');
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var text = el.innerText.replace(/\n| /g, '').trim();
        if (text) bids.push({ text: text, translation: translateBid(text), bidder: identifyBidder(el), index: i });
    }
    return bids;
}

// Palauttaa vain nykyisen pelin tarjoukset, ohittaa edellisen pelin jääneet tarjoukset.
function readCurrentBids() {
    var allBids = readBids();
    if (allBids.length < staleBidCount) {
        dlog('readCurrentBids: allBids=' + allBids.length + ' < staleBidCount=' + staleBidCount + ' -> reset staleBidCount=0');
        staleBidCount = 0;
    }
    var current = allBids.slice(staleBidCount);
    dlog('readCurrentBids: allBids=' + allBids.length + ' staleBidCount=' + staleBidCount + ' spokenBidCount=' + spokenBidCount + ' current=' + current.length + ' [' + current.map(function(b){ return b.text; }).join(',') + ']');
    return current;
}

var bidRetryCounter = 0;
function checkNewBids() {
    var currentBids = readCurrentBids();
    if (currentBids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < currentBids.length; i++) {
            speak((currentBids[i].bidder ? bidderFI(currentBids[i].bidder) + ': ' : '') + currentBids[i].translation);
        }
        spokenBidCount = currentBids.length;
        bidRetryCounter = 0;
    } else if (currentBids.length < spokenBidCount) {
        spokenBidCount = currentBids.length;
        bidRetryCounter = 0;
    } else if (bidRetryCounter < 3) {
        bidRetryCounter++;
        setTimeout(checkNewBids, 500);
    } else { bidRetryCounter = 0; }
}

// ---------------------------------------------------------
// 3c. CONTRACT READING
// ---------------------------------------------------------
function readContract() {
    var tricksPanel = document.querySelector('.tricksPanelClass');
    if (tricksPanel && tricksPanel.style.display !== 'none') {
        var labels = tricksPanel.querySelectorAll('.tricksPanelTricksLabelClass');
        var declarerText = (labels.length > 0) ? labels[0].innerText.trim() : '';

        var seatKey = null;
        var directions = ['North', 'South', 'East', 'West'];
        for (var di = 0; di < directions.length; di++) {
            if (declarerText === directions[di] || declarerText === directions[di].charAt(0)) {
                seatKey = directions[di].charAt(0);
                break;
            }
        }
        var declarerNameFI = seatKey ? (DIRECTION_FI[seatKey] || seatKey) : null;

        var levelEl = tricksPanel.querySelector('.call-level');
        var level = levelEl ? levelEl.innerText.trim() : '';

        var strainEl = tricksPanel.querySelector('.call-strain');
        var suitNameFI = '';
        if (strainEl) {
            if (strainEl.classList.contains('hearts')) suitNameFI = 'Hertta';
            else if (strainEl.classList.contains('spades')) suitNameFI = 'Pata';
            else if (strainEl.classList.contains('diamonds')) suitNameFI = 'Ruutu';
            else if (strainEl.classList.contains('clubs')) suitNameFI = 'Risti';
            else if (strainEl.classList.contains('notrump') || strainEl.classList.contains('no-trump')) suitNameFI = 'SA';
            else {
                var strainText = strainEl.innerText.trim();
                if (SYMBOL_TO_SUIT[strainText]) suitNameFI = SUIT_NAME_FI[SYMBOL_TO_SUIT[strainText]];
                else if (strainText === 'NT' || strainText === 'N') suitNameFI = 'SA';
                else suitNameFI = strainText;
            }
        }

        var doubled = '';
        var dblEl = tricksPanel.querySelector('.call-dbl, .doubled');
        var rdblEl = tricksPanel.querySelector('.call-rdbl, .redoubled');
        if (rdblEl) doubled = ' retupla';
        else if (dblEl) doubled = ' tupla';

        if (declarerNameFI && level && suitNameFI) {
            return declarerNameFI + ' ' + level + ' ' + suitNameFI + doubled;
        }
    }

    // Varapolku: johdetaan sopimus tarjouksista
    var bids = readCurrentBids();
    if (bids.length === 0) return null;

    var lastRealBid = null;
    var doubled = false;
    var redoubled = false;
    var declarer = null;

    for (var i = 0; i < bids.length; i++) {
        var t = bids[i].text.replace(/\n| /g, '').trim();
        if (t === 'Pass') continue;
        if (t === 'Dbl') { doubled = true; redoubled = false; continue; }
        if (t === 'Rdbl') { redoubled = true; doubled = false; continue; }
        lastRealBid = bids[i].translation;
        declarer = bids[i].bidder || null;
        doubled = false;
        redoubled = false;
    }

    if (!lastRealBid) return null;

    var contract = lastRealBid;
    if (redoubled) contract += ' retupla';
    else if (doubled) contract += ' tupla';
    if (declarer) contract = bidderFI(declarer) + ' ' + contract;

    return contract;
}

// ---------------------------------------------------------
// 3d. HAAVOITTUVUUS & JAKO PÄÄTTYY
// ---------------------------------------------------------
var VULNERABILITY_PATTERN = ['None', 'NS', 'EW', 'All', 'NS', 'EW', 'All', 'None',
                              'EW', 'All', 'None', 'NS', 'All', 'None', 'NS', 'EW'];

function readBoardNumber() {
    var el = document.querySelector('div.vulPanelInnerPanelClass');
    if (!el) return 0;
    var num = parseInt(el.innerText.trim());
    return isNaN(num) ? 0 : num;
}

function getVulnerability(boardNumber) {
    if (boardNumber < 1) return { ns: false, ew: false };
    var pattern = VULNERABILITY_PATTERN[(boardNumber - 1) % 16];
    return { ns: (pattern === 'NS' || pattern === 'All'), ew: (pattern === 'EW' || pattern === 'All') };
}

var lastAnnouncedBoard = 0;
function announceVulnerability() {
    var boardNumber = readBoardNumber();
    if (boardNumber < 1 || boardNumber === lastAnnouncedBoard) return;
    lastAnnouncedBoard = boardNumber;

    var vul = getVulnerability(boardNumber);
    var text = 'Jako ' + boardNumber + '. ';
    if (vul.ns && vul.ew) text += 'Kaikki haavoittuvia.';
    else if (!vul.ns && !vul.ew) text += 'Ei kukaan haavoittuva.';
    else if (vul.ns) text += 'Pohjoinen Etelä haavoittuvia.';
    else text += 'Itä Länsi haavoittuvia.';

    speak(text);
}

var lastBoardEndText = '';
function checkBoardEndResult() {
    var endPanel = document.querySelector('.dealEndPanelClass');
    if (!endPanel) return;
    var text = endPanel.innerText.trim();
    if (!text || text === lastBoardEndText) return;
    lastBoardEndText = text;

    var tricksPanel = document.querySelector('.tricksPanelClass');
    var trickInfo = '';
    if (tricksPanel) {
        var labels = tricksPanel.querySelectorAll('.tricksPanelTricksLabelClass');
        if (labels.length >= 3) {
            var ourTricks = labels[1].innerText.trim();
            var theirTricks = labels[2].innerText.trim();
            if (ourTricks || theirTricks) {
                trickInfo = ' Tikit: me ' + (ourTricks || '0') + ', he ' + (theirTricks || '0') + '.';
            }
        }
    }
    speak('Tulos: ' + text + '.' + trickInfo);
}

// ---------------------------------------------------------
// 4. KORTTIEN SAAVUTETTAVUUSATTRIBUUTIT
// ---------------------------------------------------------
function updateCardAccessibility() {
    document.querySelectorAll('div.handDiagramPanelClass').forEach(function(panel) {
        var suitPanels = panel.querySelectorAll('.suitPanelClass');
        for (var i = 0; i < suitPanels.length && i < 4; i++) {
            var suit = SUITS_IN_ORDER[i];
            var suitFI = SUIT_NAME_FI[suit] || suit;
            suitPanels[i].querySelectorAll('div.handDiagramCardClass').forEach(function(card) {
                var value = card.innerText.replace(/\n| /g, '').trim();
                if (value) card.setAttribute('aria-label', suitFI + ' ' + value);
            });
            suitPanels[i].querySelectorAll('.suitSymbolClass').forEach(function(sym) {
                sym.setAttribute('aria-hidden', 'true');
            });
        }
    });

    document.querySelectorAll('div.handDiagramCurrentTrickClass').forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var result = parsePlayedCard(el.innerText);
            if (result) el.setAttribute('aria-label', (SUIT_NAME_FI[result.suit] || result.suit) + ' ' + result.value);
        }
    });
}

// ---------------------------------------------------------
// 5. NÄPPÄINOIKOPOLUT JA TIKKINPELAUSLOGIIKKA
// ---------------------------------------------------------

// Lukee yhden maan kortit tietylle pelaajalle — ilmoittaa suunnan nimen
function readSuitCardsFor(cards, targetSuit, seatKey) {
    var ownerFI = DIRECTION_FI[seatKey] || seatKey;
    var suitCards = cards.filter(function(k) { return k.suit === targetSuit; }).map(function(k) { return k.value; });
    var n = suitCards.length;
    if (n === 0) speakNow(ownerFI + ': ei kortteja.');
    else speakNow(ownerFI + ': ' + n + ' ' + suitWordFI(targetSuit, n) + ' ' + suitCards.join(' '));
}

function readSuitCards(cards, targetSuit) {
    var suitCards = cards.filter(function(k) { return k.suit === targetSuit; }).map(function(k) { return k.value; });
    var n = suitCards.length;
    if (n === 0) speakNow('Ei kortteja.');
    else speakNow(n + ' ' + suitWordFI(targetSuit, n) + ' ' + suitCards.join(' '));
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': ei kortteja näkyvissä.'); return; }
    var parts = [];
    ['Spade', 'Heart', 'Diamond', 'Club'].forEach(function(suit) {
        var suitCards = cards.filter(function(k) { return k.suit === suit; }).map(function(k) { return k.value; });
        var n = suitCards.length;
        if (n > 0) {
            parts.push(n + ' ' + suitWordFI(suit, n) + ' ' + suitCards.join(' '));
        }
    });
    speakNow(ownerName + ': ' + parts.join('. '));
}

function announceHelp() {
    var lines = [
        'Näppäinoikopolut.',
        'Oma käsi maan mukaan: Alt A padat, Alt S hertat, Alt D ruudut, Alt F ristit.',
        'Lepääjä maan mukaan: Alt Q padat, Alt W hertat, Alt E ruudut, Alt R ristit.',
        'Alt G: lue koko oma käsi.',
        'Alt T: lue lepääjän käsi.',
        'Kolmas pelaaja maan mukaan: Alt 1 padat, Alt 2 hertat, Alt 3 ruudut, Alt 4 ristit.',
        'Alt 5: lue koko kolmannen pelaajan käsi.',
        'Neljäs pelaaja maan mukaan: Alt 7 padat, Alt 8 hertat, Alt 9 ruudut, Alt 0 ristit.',
        'Alt 6: lue koko neljännen pelaajan käsi.',
        'Huom: kolmas ja neljäs pelaaja vaihtelevat lepääjän mukaan.',
        'Alt P: pöydällä olevat kortit.',
        'Alt B: lue tarjoukset.',
        'Alt V: haavoittuvuus.',
        'Alt X: jako, haavoittuvuus ja sopimus.',
        'Alt C: tikkimäärä.',
        'Alt Nuoli ylös: pelaa korkein kortti avartusmaan mukaan.',
        'Alt Nuoli alas: pelaa matalin kortti avartusmaan mukaan.',
        'Alt H: tämä ohje.'
    ];
    speechQueue = [];
    isSpeaking = false;
    lines.forEach(function(line) { speak(line); });
}

// Parannettu näppäinsimulaattori (Key vs Digit)
function dispatchBBOKey(char) {
    var isDigit = (char >= '2' && char <= '9');
    var keyCode = char.toUpperCase().charCodeAt(0);
    var codeString = isDigit ? 'Digit' + char : 'Key' + char.toUpperCase();

    var options = {
        key: char,
        code: codeString,
        keyCode: keyCode,
        which: keyCode,
        bubbles: true,
        cancelable: true,
        composed: true
    };

    var target = document.activeElement || document.body;
    target.dispatchEvent(new KeyboardEvent('keydown', options));
    target.dispatchEvent(new KeyboardEvent('keypress', options));
    target.dispatchEvent(new KeyboardEvent('keyup', options));
}

// Varapolku: aito hiirenklikkausimulaatio
function simulateRealClick(element) {
    if (!element) return;
    var opts = { bubbles: true, cancelable: true, view: window };
    element.dispatchEvent(new PointerEvent('pointerdown', opts));
    element.dispatchEvent(new MouseEvent('mousedown', opts));
    element.dispatchEvent(new PointerEvent('pointerup', opts));
    element.dispatchEvent(new MouseEvent('mouseup', opts));
    element.dispatchEvent(new MouseEvent('click', opts));
}

var currentTrickChronological = [];

function playCardFromLedSuit(mode) {
    if (currentTrickChronological.length === 0) { speakNow('Ei avausta vielä.'); return; }
    if (currentTrickChronological.length >= 4) { speakNow('Tikki täynnä.'); return; }

    var ledCard = currentTrickChronological[0];
    var ledSuit = ledCard.suit;

    var ledIndex = TRICK_DIRECTIONS.indexOf(ledCard.player);
    var nextIndex = (ledIndex + currentTrickChronological.length) % 4;
    var nextPlayerEng = TRICK_DIRECTIONS[nextIndex];
    var nextPlayerSeat = nextPlayerEng.charAt(0);
    var nextPlayerFI = DIRECTION_FI[nextPlayerEng] || nextPlayerEng;

    var players = identifyPlayers();
    var activeHandElement = null;
    var activeHandName = '';

    if (players.ownSeat && nextPlayerSeat === players.ownSeat) {
        activeHandElement = players.own;
        activeHandName = 'Oma käsi';
    } else if (players.dummySeat && nextPlayerSeat === players.dummySeat) {
        activeHandElement = players.dummy;
        activeHandName = 'Lepääjä';
    } else {
        speakNow(nextPlayerFI + ' pelaa.');
        return;
    }

    if (!activeHandElement) { speakNow(activeHandName + ' ei näkyvissä.'); return; }

    var handCards = readHandCards(activeHandElement);
    var matchingCards = handCards.filter(function(c) { return c.suit === ledSuit; });

    if (matchingCards.length === 0) {
        speakNow(activeHandName + ': ei ' + (SUIT_NEG_FI[ledSuit] || ledSuit) + '.');
        return;
    }

    matchingCards.sort(function(a, b) { return cardRank(a.value) - cardRank(b.value); });

    var card = (mode === 'lowest') ? matchingCards[0] : matchingCards[matchingCards.length - 1];

    var suitChar = card.suit.charAt(0).toLowerCase();
    var valChar = card.value.toLowerCase();
    if (valChar === '10') valChar = 't';

    dispatchBBOKey(suitChar);
    setTimeout(function() {
        dispatchBBOKey(valChar);
        setTimeout(function() {
            simulateRealClick(card.element);
        }, 50);
    }, 150);

    speakNow(activeHandName + ' pelasi ' + (SUIT_NAME_FI[card.suit] || card.suit) + ' ' + card.value);
}

// ---------------------------------------------------------
// 5b. NÄPPÄINTAPAHTUMAKUUNTELIJA
// ---------------------------------------------------------
document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();

    function blockBBO(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }

    if (e.altKey) {
        var players = identifyPlayers();

        // --- Oma käsi maan mukaan ---
        if (key === 'a') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Spade'); return; }
        if (key === 's') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Heart'); return; }
        if (key === 'd') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Diamond'); return; }
        if (key === 'f') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Club'); return; }

        // --- Lepääjä maan mukaan ---
        if (key === 'q') { blockBBO(e); if (!players.dummy) { speakNow('Lepääjän kortit eivät näy.'); return; } readSuitCards(readHandCards(players.dummy), 'Spade'); return; }
        if (key === 'w') { blockBBO(e); if (!players.dummy) { speakNow('Lepääjän kortit eivät näy.'); return; } readSuitCards(readHandCards(players.dummy), 'Heart'); return; }
        if (key === 'e') { blockBBO(e); if (!players.dummy) { speakNow('Lepääjän kortit eivät näy.'); return; } readSuitCards(readHandCards(players.dummy), 'Diamond'); return; }
        if (key === 'r') { blockBBO(e); if (!players.dummy) { speakNow('Lepääjän kortit eivät näy.'); return; } readSuitCards(readHandCards(players.dummy), 'Club'); return; }

        // --- Koko käsi ---
        if (key === 'g') { blockBBO(e); readAllCards(readHandCards(players.own), 'Oma käsi'); return; }
        if (key === 't') { blockBBO(e); if (!players.dummy) { speakNow('Lepääjän kortit eivät näy.'); return; } readAllCards(readHandCards(players.dummy), 'Lepääjä'); return; }

        // --- Pöytä ja tarjoukset ---
        if (key === 'p') {
            blockBBO(e);
            if (currentTrickChronological.length === 0) { speakNow('Pöydällä ei kortteja.'); }
            else {
                speakNow('Pöytä: ' + currentTrickChronological.map(function(k) {
                    return (DIRECTION_FI[k.player] || k.player) + ' ' + (SUIT_NAME_FI[k.suit] || k.suit) + ' ' + k.value;
                }).join(', '));
            }
            return;
        }
        if (key === 'b') {
            blockBBO(e);
            var bids = readCurrentBids();
            if (bids.length === 0) { speakNow('Ei tarjouksia.'); }
            else {
                speakNow('Tarjoukset: ' + bids.map(function(b) {
                    return (b.bidder ? bidderFI(b.bidder) + ' ' : '') + b.translation;
                }).join(', '));
            }
            return;
        }

        // --- Jakotiedot ---
        if (key === 'v') { blockBBO(e); announceVulnerability(); return; }
        if (key === 'x') {
            blockBBO(e);
            var parts = [];
            var bn = readBoardNumber();
            if (bn > 0) parts.push('Jako ' + bn);
            var vul = bn > 0 ? getVulnerability(bn) : null;
            if (vul) {
                if (vul.ns && vul.ew) parts.push('Kaikki haavoittuvia');
                else if (!vul.ns && !vul.ew) parts.push('Ei kukaan haavoittuva');
                else if (vul.ns) parts.push('Pohjoinen Etelä haavoittuvia');
                else parts.push('Itä Länsi haavoittuvia');
            }
            var contract = readContract();
            if (contract) parts.push('Sopimus: ' + contract);
            else parts.push('Ei sopimusta vielä');
            speakNow(parts.join('. ') + '.');
            return;
        }

        // --- Tikkimäärä ---
        if (key === 'c') {
            blockBBO(e);
            var tricksC = document.querySelector('.tricksPanelClass');
            if (!tricksC) { speakNow('Tikkitietoa ei saatavilla.'); return; }
            var cLabels = tricksC.querySelectorAll('.tricksPanelTricksLabelClass');
            if (cLabels.length >= 3) {
                speakNow('Me ' + (cLabels[1].innerText.trim() || '0') + ', he ' + (cLabels[2].innerText.trim() || '0'));
            } else {
                speakNow('Tikkitietoa ei saatavilla.');
            }
            return;
        }

        // --- Kolmas ja neljäs pelaaja (Alt+1-6, Alt+7-0) ---
        // Toimivat vain kun kaikki 4 kättä ovat näkyvissä (vugraph tai levitys/claim)
        var allVisible = isAllHandsVisible();
        if (key === '1' || key === '2' || key === '3' || key === '4' || key === '5' ||
            key === '6' || key === '7' || key === '8' || key === '9' || key === '0') {
            blockBBO(e);
            if (!allVisible) { speakNow('Kortit eivät näkyvissä.'); return; }
        }

        // --- Kolmas pelaaja maan mukaan (Alt+1234) ---
        if (key === '1') { if (!players.others[0]) { speakNow('Kolmas käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[0].panel), 'Spade', players.others[0].seat); return; }
        if (key === '2') { if (!players.others[0]) { speakNow('Kolmas käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[0].panel), 'Heart', players.others[0].seat); return; }
        if (key === '3') { if (!players.others[0]) { speakNow('Kolmas käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[0].panel), 'Diamond', players.others[0].seat); return; }
        if (key === '4') { if (!players.others[0]) { speakNow('Kolmas käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[0].panel), 'Club', players.others[0].seat); return; }
        if (key === '5') { if (!players.others[0]) { speakNow('Kolmas käsi ei näy.'); return; } readAllCards(readHandCards(players.others[0].panel), DIRECTION_FI[players.others[0].seat] || players.others[0].seat); return; }

        // --- Neljäs pelaaja maan mukaan (Alt+7890) ---
        if (key === '7') { if (!players.others[1]) { speakNow('Neljäs käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[1].panel), 'Spade', players.others[1].seat); return; }
        if (key === '8') { if (!players.others[1]) { speakNow('Neljäs käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[1].panel), 'Heart', players.others[1].seat); return; }
        if (key === '9') { if (!players.others[1]) { speakNow('Neljäs käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[1].panel), 'Diamond', players.others[1].seat); return; }
        if (key === '0') { if (!players.others[1]) { speakNow('Neljäs käsi ei näy.'); return; } readSuitCardsFor(readHandCards(players.others[1].panel), 'Club', players.others[1].seat); return; }
        if (key === '6') { if (!players.others[1]) { speakNow('Neljäs käsi ei näy.'); return; } readAllCards(readHandCards(players.others[1].panel), DIRECTION_FI[players.others[1].seat] || players.others[1].seat); return; }

        // --- Ohje ---
        if (key === 'h') { blockBBO(e); announceHelp(); return; }

        // --- Kortin pelaus ---
        if (key === 'arrowdown') { blockBBO(e); playCardFromLedSuit('lowest'); return; }
        if (key === 'arrowup') { blockBBO(e); playCardFromLedSuit('highest'); return; }
    }
}, true);

// ---------------------------------------------------------
// 6. TARKKAILIJA (MutationObserver)
// ---------------------------------------------------------
var updateTimer = null;
var previousPlayedCards = [];

var gameObserver = new MutationObserver(function(mutations) {
    var needsUpdate = false, checkPlayed = false, newGame = false, checkBids = false, checkBoardEnd = false, boardNumberChanged = false;

    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('handDiagramPanelClass')) { needsUpdate = true; newGame = true; }
                    if (node.classList && (node.classList.contains('handDiagramCardClass') || node.classList.contains('suitPanelClass'))) { needsUpdate = true; }
                    if ((node.tagName && node.tagName.toLowerCase() === 'auction-box-cell') || (node.classList && (node.classList.contains('auction-box-cell') || node.classList.contains('call-level')))) { checkBids = true; }
                    if (node.querySelector && (node.querySelector('auction-box-cell') || node.querySelector('.call-level'))) { checkBids = true; }
                    if (node.classList && node.classList.contains('dealEndPanelClass')) { checkBoardEnd = true; }
                }
            });
        }

        if (mutation.type === 'characterData') {
            var parent = mutation.target.parentElement;
            if (parent && parent.classList && parent.classList.contains('vulPanelInnerPanelClass')) { boardNumberChanged = true; }
        }
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('vulPanelInnerPanelClass')) { boardNumberChanged = true; }
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('handDiagramCurrentTrickClass')) { checkPlayed = true; }
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('dealEndPanelClass')) { checkBoardEnd = true; }

        var target = mutation.target;
        while (target) {
            if (target.classList && target.classList.contains('handDiagramCurrentTrickClass')) { checkPlayed = true; break; }
            if ((target.tagName && target.tagName.toLowerCase() === 'auction-box-cell') || (target.classList && (target.classList.contains('auction-box-cell') || target.classList.contains('call-level')))) { checkBids = true; break; }
            if (target.classList && target.classList.contains('dealEndPanelClass')) { checkBoardEnd = true; break; }
            target = target.parentElement;
        }
    });

    if (needsUpdate) {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(updateCardAccessibility, 800);
    }

    if (newGame || boardNumberChanged) {
        // BBO jättää yhden vanhan tarjouksen huutolaatikkoon jakojen välissä.
        // Ensimmäisellä jaolla staleBidCount=0, sen jälkeen staleBidCount=1.
        var newStaleBidCount = (lastAnnouncedBoard > 0) ? 1 : 0;
        dlog('newGame=' + newGame + ' boardNumberChanged=' + boardNumberChanged + ' boardInDOM=' + readBoardNumber() + ' lastAnnouncedBoard=' + lastAnnouncedBoard + ' staleBidCount=' + staleBidCount + '->' + newStaleBidCount + ' allBidsInDOM=' + readBids().length);
        previousPlayedCards = [];
        currentTrickChronological = [];
        staleBidCount = newStaleBidCount;
        spokenBidCount = 0;
        // lastBoardEndText EI nollaudu — estää vanhan tuloksen uudelleenlukemisen.
        setTimeout(announceVulnerability, 1000);
    }

    if (checkBids) {
        if (bidCheckTimer) clearTimeout(bidCheckTimer);
        bidCheckTimer = setTimeout(checkNewBids, 300);
    }

    if (checkBoardEnd) { setTimeout(checkBoardEndResult, 500); }

    if (checkPlayed) {
        setTimeout(function() {
            var played = readPlayedCards();

            if (played.length < previousPlayedCards.length) {
                previousPlayedCards = [];
                currentTrickChronological = [];
            }

            if (played.length > 0 && played.length > previousPlayedCards.length) {
                var previousKeys = previousPlayedCards.map(function(k) { return k.player + k.suit + k.value; });
                for (var i = 0; i < played.length; i++) {
                    var cardKey = played[i].player + played[i].suit + played[i].value;
                    if (previousKeys.indexOf(cardKey) === -1) {
                        currentTrickChronological.push(played[i]);
                        speak((DIRECTION_FI[played[i].player] || played[i].player) + ': ' +
                              (SUIT_NAME_FI[played[i].suit] || played[i].suit) + ' ' + played[i].value);
                    }
                }
                previousPlayedCards = played.map(function(k) { return { player: k.player, suit: k.suit, value: k.value }; });
            }
            if (played.length === 0) {
                previousPlayedCards = [];
                currentTrickChronological = [];
            }

            if (currentTrickChronological.length === 0 && played.length > 0) {
                currentTrickChronological = played.slice();
            }
        }, 200);
    }
});

gameObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
setTimeout(updateCardAccessibility, 2000);

var boardNumberObsSetup = false;
function setupBoardNumberObserver() {
    if (boardNumberObsSetup) return;
    var boardNumEl = document.querySelector('div.vulPanelInnerPanelClass');
    if (!boardNumEl) return;
    boardNumberObsSetup = true;
    var boardNumObs = new MutationObserver(function() {
        setTimeout(function() {
            var bn = readBoardNumber();
            if (bn > 0 && bn !== lastAnnouncedBoard) {
                var newStaleBidCount2 = (lastAnnouncedBoard > 0) ? 1 : 0;
                dlog('boardNumObs: bn=' + bn + ' lastAnnouncedBoard=' + lastAnnouncedBoard + ' staleBidCount=' + staleBidCount + '->' + newStaleBidCount2 + ' allBidsInDOM=' + readBids().length);
                previousPlayedCards = [];
                currentTrickChronological = [];
                staleBidCount = newStaleBidCount2;
                spokenBidCount = 0;
                announceVulnerability();
            }
        }, 500);
    });
    boardNumObs.observe(boardNumEl, { childList: true, subtree: true, characterData: true });
}

setTimeout(setupBoardNumberObserver, 2000);
setInterval(function() { if (!boardNumberObsSetup) setupBoardNumberObserver(); }, 3000);
setInterval(function() { var bids = readCurrentBids(); if (bids.length !== spokenBidCount) { checkNewBids(); } }, 500);
setInterval(function() { var endPanel = document.querySelector('.dealEndPanelClass'); if (endPanel) { var text = endPanel.innerText.trim(); if (text && text !== lastBoardEndText) { checkBoardEndResult(); } } }, 1000);
setInterval(function() { var boardNumber = readBoardNumber(); if (boardNumber > 0 && boardNumber !== lastAnnouncedBoard) { announceVulnerability(); } }, 1500);

// ---------------------------------------------------------
// 7. MODAALIVALINTAIKKUNA AUTO-FOCUS
// ---------------------------------------------------------
// BBO käyttää Angular Material -valintaikkunoita (mat-dialog-container),
// joihin NVDA ei siirry automaattisesti. Tämä tarkkailija havaitsee
// valintaikkunan ilmaantumisen ja siirtää kohdistuksen siihen.

function focusModalDialog(dialogElement) {
    if (!dialogElement) return;

    if (!dialogElement.getAttribute('tabindex')) {
        dialogElement.setAttribute('tabindex', '-1');
    }
    if (!dialogElement.getAttribute('role')) {
        dialogElement.setAttribute('role', 'dialog');
    }
    if (!dialogElement.getAttribute('aria-modal')) {
        dialogElement.setAttribute('aria-modal', 'true');
    }

    setTimeout(function() {
        var focusTarget = dialogElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusTarget) focusTarget = dialogElement;

        if (!focusTarget.getAttribute('tabindex') && focusTarget === dialogElement) {
            focusTarget.setAttribute('tabindex', '-1');
        }

        var clickOpts = { bubbles: true, cancelable: true, view: window };
        focusTarget.dispatchEvent(new PointerEvent('pointerdown', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('mousedown', clickOpts));
        focusTarget.dispatchEvent(new PointerEvent('pointerup', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('mouseup', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('click', clickOpts));

        focusTarget.focus();

        var dialogText = dialogElement.innerText.trim();
        if (dialogText) {
            var announcement = dialogText.length > 200
                ? dialogText.substring(0, 200) + '...'
                : dialogText;
            speak('Ikkuna: ' + announcement);
        }
    }, 400);
}

var modalObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType !== 1) return;

                var tag = node.tagName ? node.tagName.toLowerCase() : '';
                var role = node.getAttribute ? node.getAttribute('role') : '';
                if (tag === 'mat-dialog-container' || role === 'dialog') {
                    focusModalDialog(node);
                    return;
                }
                if (node.querySelector) {
                    var dialog = node.querySelector(
                        'mat-dialog-container, [role="dialog"]'
                    );
                    if (dialog) focusModalDialog(dialog);
                }
            });
        }
    });
});

modalObserver.observe(document.body, { childList: true, subtree: true });
