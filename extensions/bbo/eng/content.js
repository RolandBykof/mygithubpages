// =========================================================
// BBO Accessibility Extension (Screen Reader Support) - V9.1
// =========================================================
// V9.1: Brilliant simplification based on user feedback. 
// Instead of complex timing or DOM tracking, the extension now 
// simply ignores any "bid" element that doesn't vertically align 
// with a compass direction header (N/S/E/W). This perfectly filters 
// out leftover "previous contract" summaries that BBO leaves in the DOM.
// =========================================================
console.log("BBO Accessibility Extension loaded (V9.1 - Seat Filter Edition)");

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

function dlog(msg) {
    var ts = new Date().toISOString().substring(11, 23);
    console.log('[BBO] ' + ts + '  ' + msg);
}

// ---------------------------------------------------------
// 2. CONSTANTS AND HELPERS
// ---------------------------------------------------------
const SUITS_IN_ORDER = ['Club', 'Diamond', 'Heart', 'Spade'];
const SYMBOL_TO_SUIT = { '\u2663': 'Club', '\u2666': 'Diamond', '\u2665': 'Heart', '\u2660': 'Spade' };
const BID_TRANSLATION = { 'Pass': 'Pass', 'Dbl': 'Double', 'Rdbl': 'Redouble' };
var CARD_RANK = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };

function cardRank(value) { return CARD_RANK[value] || 0; }

function translateBid(text) {
    if (!text) return '';
    text = text.replace(/\n| /g, '').trim();
    if (!text) return '';
    if (BID_TRANSLATION[text]) return BID_TRANSLATION[text];
    var level = text.charAt(0);
    if (level >= '1' && level <= '7') {
        var rest = text.substring(1).trim();
        if (rest === 'NT' || rest === 'N') return level + ' No Trump';
        if (rest.length >= 1 && SYMBOL_TO_SUIT[rest.charAt(0)]) return level + ' ' + SYMBOL_TO_SUIT[rest.charAt(0)];
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

        if (dummySeat === ownSeat) {
            var declarerIdx = SEAT_TO_PANEL_INDEX[declarer];
            if (declarerIdx !== undefined && declarerIdx < panels.length) {
                dummyPanel = panels[declarerIdx];
                dummySeat = declarer;
            }
        }
    }
    return { own: ownPanel, dummy: dummyPanel, ownSeat: ownSeat, dummySeat: dummySeat };
}

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
// 3b. BID READING (V9.1 - SEAT FILTER)
// ---------------------------------------------------------
var SEAT_NAME = { 'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West', 'North': 'North', 'South': 'South', 'East': 'East', 'West': 'West' };
var spokenBidCount = 0;
var bidCheckTimer = null;

function identifyBidder(bidElement) {
    var auctionBox = bidElement.closest('.auctionBoxClass') || document.querySelector('.auctionBoxClass') || document.querySelector('[class*="auctionBox"]');
    if (!auctionBox) return null;
    var headers = auctionBox.querySelectorAll('.auction-box-header-cell');
    var bidX = bidElement.getBoundingClientRect().x;
    for (var i = 0; i < headers.length; i++) {
        // Sallitaan hieman enemmän joustoa pikseleissä (10px), jotta aito tarjous ei vahingossa putoa pois
        if (Math.abs(headers[i].getBoundingClientRect().x - bidX) < 10) {
            var seat = headers[i].innerText.trim();
            return SEAT_NAME[seat] || seat;
        }
    }
    return null;
}

function readCurrentBids() {
    var elements = document.querySelectorAll('auction-box-cell');
    if (elements.length === 0) elements = document.querySelectorAll('div.auction-box-cell');
    
    var current = [];
    for (var i = 0; i < elements.length; i++) {
        var elText = elements[i].innerText.trim();
        var text = elText.replace(/\n| /g, '');
        if (text) {
            var bidderName = identifyBidder(elements[i]);
            
            // TÄSSÄ ON EHDOTTAMASI KORJAUS:
            // Hyväksytään vain ne tarjoukset, jotka on kyetty yhdistämään ilmansuuntaan!
            if (bidderName) {
                current.push({ text: text, translation: translateBid(text), bidder: bidderName, index: i });
            } else {
                dlog('Hylättiin tarjous ilman ilmansuuntaa (todennäköisesti vanha roskateksti): ' + text);
            }
        }
    }
    return current;
}

var bidRetryCounter = 0;
function checkNewBids() {
    var currentBids = readCurrentBids();
    if (currentBids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < currentBids.length; i++) {
            speak(currentBids[i].bidder + ': ' + currentBids[i].translation);
        }
        spokenBidCount = currentBids.length;
        bidRetryCounter = 0;
    } else if (currentBids.length < spokenBidCount) {
        // Jos tarjousten määrä jostain syystä putoaa (esim. uusi jako alkaa), nollataan laskuri
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

        var seatName = null;
        var directions = ['North', 'South', 'East', 'West'];
        for (var di = 0; di < directions.length; di++) {
            if (declarerText === directions[di] || declarerText === directions[di].charAt(0)) {
                seatName = directions[di];
                break;
            }
        }

        var levelEl = tricksPanel.querySelector('.call-level');
        var level = levelEl ? levelEl.innerText.trim() : '';

        var strainEl = tricksPanel.querySelector('.call-strain');
        var suitName = '';
        if (strainEl) {
            if (strainEl.classList.contains('hearts')) suitName = 'Heart';
            else if (strainEl.classList.contains('spades')) suitName = 'Spade';
            else if (strainEl.classList.contains('diamonds')) suitName = 'Diamond';
            else if (strainEl.classList.contains('clubs')) suitName = 'Club';
            else if (strainEl.classList.contains('notrump') || strainEl.classList.contains('no-trump')) suitName = 'No Trump';
            else {
                var strainText = strainEl.innerText.trim();
                if (SYMBOL_TO_SUIT[strainText]) suitName = SYMBOL_TO_SUIT[strainText];
                else if (strainText === 'NT' || strainText === 'N') suitName = 'No Trump';
                else suitName = strainText;
            }
        }

        var doubled = '';
        var dblEl = tricksPanel.querySelector('.call-dbl, .doubled');
        var rdblEl = tricksPanel.querySelector('.call-rdbl, .redoubled');
        if (rdblEl) doubled = ' Redoubled';
        else if (dblEl) doubled = ' Doubled';

        if (seatName && level && suitName) {
            return seatName + ' ' + level + ' ' + suitName + doubled;
        }
    }

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
    if (redoubled) contract += ' Redoubled';
    else if (doubled) contract += ' Doubled';
    if (declarer) contract = declarer + ' ' + contract;

    return contract;
}

// ---------------------------------------------------------
// 3d. VULNERABILITY & BOARD END
// ---------------------------------------------------------
var VULNERABILITY_PATTERN = ['None', 'NS', 'EW', 'All', 'NS', 'EW', 'All', 'None', 'EW', 'All', 'None', 'NS', 'All', 'None', 'NS', 'EW'];

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
    var text = 'Board ' + boardNumber + '. ';
    if (vul.ns && vul.ew) text += 'All vulnerable.';
    else if (!vul.ns && !vul.ew) text += 'No one vulnerable.';
    else if (vul.ns) text += 'North South vulnerable.';
    else text += 'East West vulnerable.';

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
            if (ourTricks || theirTricks) trickInfo = ' Tricks: us ' + (ourTricks || '0') + ', them ' + (theirTricks || '0') + '.';
        }
    }
    speak('Result: ' + text + '.' + trickInfo);
}

// ---------------------------------------------------------
// 4. CARD ACCESSIBILITY ATTRIBUTES
// ---------------------------------------------------------
function updateCardAccessibility() {
    document.querySelectorAll('div.handDiagramPanelClass').forEach(function(panel) {
        var suitPanels = panel.querySelectorAll('.suitPanelClass');
        for (var i = 0; i < suitPanels.length && i < 4; i++) {
            var suit = SUITS_IN_ORDER[i];
            suitPanels[i].querySelectorAll('div.handDiagramCardClass').forEach(function(card) {
                var value = card.innerText.replace(/\n| /g, '').trim();
                if (value) card.setAttribute('aria-label', suit + ' ' + value);
            });
            suitPanels[i].querySelectorAll('.suitSymbolClass').forEach(function(sym) { sym.setAttribute('aria-hidden', 'true'); });
        }
    });

    document.querySelectorAll('div.handDiagramCurrentTrickClass').forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var result = parsePlayedCard(el.innerText);
            if (result) el.setAttribute('aria-label', result.suit + ' ' + result.value);
        }
    });
}

// ---------------------------------------------------------
// 5. KEYBOARD SHORTCUTS
// ---------------------------------------------------------
var SUIT_PLURAL = { 'Spade': 'Spades', 'Heart': 'Hearts', 'Diamond': 'Diamonds', 'Club': 'Clubs' };

function readSuitCards(cards, targetSuit) {
    var suitCards = cards.filter(function(k) { return k.suit === targetSuit; }).map(function(k) { return k.value; });
    if (suitCards.length > 0) speakNow(suitCards.length + ' ' + (SUIT_PLURAL[targetSuit] || targetSuit) + ' ' + suitCards.join(' '));
    else speakNow('0 ' + (SUIT_PLURAL[targetSuit] || targetSuit));
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': no cards visible.'); return; }
    var parts = [];
    ['Spade', 'Heart', 'Diamond', 'Club'].forEach(function(suit) {
        var suitCards = cards.filter(function(k) { return k.suit === suit; }).map(function(k) { return k.value; });
        if (suitCards.length > 0) parts.push(suitCards.length + ' ' + (SUIT_PLURAL[suit] || suit) + ' ' + suitCards.join(' '));
    });
    speakNow(ownerName + ': ' + parts.join('. '));
}

function getTrumpSuit() {
    var tricksPanel = document.querySelector('.tricksPanelClass');
    if (tricksPanel && tricksPanel.style.display !== 'none') {
        var strainEl = tricksPanel.querySelector('.call-strain');
        if (strainEl) {
            if (strainEl.classList.contains('notrump') || strainEl.classList.contains('no-trump')) return null;
            if (strainEl.classList.contains('spades'))   return 'Spade';
            if (strainEl.classList.contains('hearts'))   return 'Heart';
            if (strainEl.classList.contains('diamonds')) return 'Diamond';
            if (strainEl.classList.contains('clubs'))    return 'Club';
            var sym = strainEl.innerText.trim();
            if (SYMBOL_TO_SUIT[sym]) return SYMBOL_TO_SUIT[sym];
        }
    }
    return null; 
}

function announceTrickWinner(trick) {
    if (!trick || trick.length < 4) return;
    var ledSuit  = trick[0].suit;
    var trump    = getTrumpSuit();
    var winner   = trick[0];

    for (var i = 1; i < trick.length; i++) {
        var card = trick[i];
        var currentIsTrump = (trump && card.suit === trump);
        var winnerIsTrump  = (trump && winner.suit === trump);

        if (currentIsTrump && !winnerIsTrump) {
            winner = card; 
        } else if (currentIsTrump && winnerIsTrump) {
            if (cardRank(card.value) > cardRank(winner.value)) winner = card;
        } else if (!winnerIsTrump && card.suit === ledSuit) {
            if (cardRank(card.value) > cardRank(winner.value)) winner = card;
        }
    }
    speak(winner.player + ' wins the trick.');
}

var gibistingMode = false;

function getPanelBySeat(seat) {
    var panels = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
    if (panels.length === 0) return null;
    var idx = SEAT_TO_PANEL_INDEX[seat];
    if (idx === undefined || idx >= panels.length) return null;
    return panels[idx];
}

function announceHelp() {
    var lines;
    if (gibistingMode) {
        lines = [
            'Gibitsing mode ON.',
            'F2: toggle gibitsing mode off.',
            'South hand by suit: Alt A spades, Alt S hearts, Alt D diamonds, Alt F clubs.',
            'Alt G: read all South.',
            'North hand by suit: Alt Q spades, Alt W hearts, Alt E diamonds, Alt R clubs.',
            'Alt T: read all North.',
            'West hand by suit: Alt 1 spades, Alt 2 hearts, Alt 3 diamonds, Alt 4 clubs.',
            'Alt 5: read all West.',
            'East hand by suit: Alt 6 spades, Alt 7 hearts, Alt 8 diamonds, Alt 9 clubs.',
            'Alt 0: read all East.',
            'Alt P: cards on table.',
            'Alt B: read bids.',
            'Alt V: vulnerability.',
            'Alt X: board, vulnerability and contract.',
            'Alt C: trick count.',
            'Alt H: this help.'
        ];
    } else {
        lines = [
            'Keyboard shortcuts.',
            'Own hand by suit: Alt A spades, Alt S hearts, Alt D diamonds, Alt F clubs.',
            'Dummy by suit: Alt Q spades, Alt W hearts, Alt E diamonds, Alt R clubs.',
            'Alt G: read all own hand.',
            'Alt T: read all dummy hand.',
            'Alt P: cards on table.',
            'Alt B: read bids.',
            'Alt V: vulnerability.',
            'Alt X: board, vulnerability and contract.',
            'Alt C: trick count.',
            'Alt Up Arrow: play highest card in led suit.',
            'Alt Down Arrow: play lowest card in led suit.',
            'Alt H: this help.',
            'F2: toggle gibitsing mode on.'
        ];
    }
    speechQueue = [];
    isSpeaking = false;
    lines.forEach(function(line) { speak(line); });
}

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
    var players = identifyPlayers();
    var activeHandElement = null;
    var activeHandName = '';

    if (currentTrickChronological.length === 0) { speakNow('No card has been led yet.'); return; }
    if (currentTrickChronological.length >= 4)  { speakNow('Trick is full.'); return; }

    var ledCard    = currentTrickChronological[0];
    var targetSuit = ledCard.suit;

    var ledIndex       = TRICK_DIRECTIONS.indexOf(ledCard.player);
    var nextIndex      = (ledIndex + currentTrickChronological.length) % 4;
    var nextPlayerName = TRICK_DIRECTIONS[nextIndex];
    var nextPlayerSeat = nextPlayerName.charAt(0);

    if (players.ownSeat && nextPlayerSeat === players.ownSeat) {
        activeHandElement = players.own; activeHandName = 'Your hand';
    } else if (players.dummySeat && nextPlayerSeat === players.dummySeat) {
        activeHandElement = players.dummy; activeHandName = 'Dummy';
    } else {
        speakNow("It is " + nextPlayerName + "'s turn.");
        return;
    }

    if (!activeHandElement) { speakNow(activeHandName + ' is not visible.'); return; }

    var handCards = readHandCards(activeHandElement);
    var matchingCards = handCards.filter(function(c) { return c.suit === targetSuit; });

    if (matchingCards.length === 0) { speakNow('No ' + (SUIT_PLURAL[targetSuit] || targetSuit) + ' in ' + activeHandName + '.'); return; }

    matchingCards.sort(function(a, b) { return cardRank(a.value) - cardRank(b.value); });

    var card = (mode === 'lowest') ? matchingCards[0] : matchingCards[matchingCards.length - 1];

    var suitChar = card.suit.charAt(0).toLowerCase();
    var valChar  = card.value.toLowerCase();
    if (valChar === '10') valChar = 't';

    dispatchBBOKey(suitChar);
    setTimeout(function() {
        dispatchBBOKey(valChar);
        setTimeout(function() { simulateRealClick(card.element); }, 50);
    }, 150);

    speakNow(activeHandName + ' played ' + card.suit + ' ' + card.value);
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();

    function blockBBO(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }

    if (e.key === 'F2' && !e.altKey && !e.ctrlKey && !e.shiftKey) {
        blockBBO(e);
        gibistingMode = !gibistingMode;
        speakNow(gibistingMode ? 'Gibitsing mode on.' : 'Gibitsing mode off.');
        return;
    }

    if (e.altKey) {
        if (gibistingMode) {
            if (key === 'a') { blockBBO(e); var p = getPanelBySeat('S'); if (!p) { speakNow('South hand not visible.'); return; } readSuitCards(readHandCards(p), 'Spade'); return; }
            if (key === 's') { blockBBO(e); var p = getPanelBySeat('S'); if (!p) { speakNow('South hand not visible.'); return; } readSuitCards(readHandCards(p), 'Heart'); return; }
            if (key === 'd') { blockBBO(e); var p = getPanelBySeat('S'); if (!p) { speakNow('South hand not visible.'); return; } readSuitCards(readHandCards(p), 'Diamond'); return; }
            if (key === 'f') { blockBBO(e); var p = getPanelBySeat('S'); if (!p) { speakNow('South hand not visible.'); return; } readSuitCards(readHandCards(p), 'Club'); return; }
            if (key === 'g') { blockBBO(e); var p = getPanelBySeat('S'); if (!p) { speakNow('South hand not visible.'); return; } readAllCards(readHandCards(p), 'South'); return; }

            if (key === 'q') { blockBBO(e); var p = getPanelBySeat('N'); if (!p) { speakNow('North hand not visible.'); return; } readSuitCards(readHandCards(p), 'Spade'); return; }
            if (key === 'w') { blockBBO(e); var p = getPanelBySeat('N'); if (!p) { speakNow('North hand not visible.'); return; } readSuitCards(readHandCards(p), 'Heart'); return; }
            if (key === 'e') { blockBBO(e); var p = getPanelBySeat('N'); if (!p) { speakNow('North hand not visible.'); return; } readSuitCards(readHandCards(p), 'Diamond'); return; }
            if (key === 'r') { blockBBO(e); var p = getPanelBySeat('N'); if (!p) { speakNow('North hand not visible.'); return; } readSuitCards(readHandCards(p), 'Club'); return; }
            if (key === 't') { blockBBO(e); var p = getPanelBySeat('N'); if (!p) { speakNow('North hand not visible.'); return; } readAllCards(readHandCards(p), 'North'); return; }

            if (key === '1') { blockBBO(e); var p = getPanelBySeat('W'); if (!p) { speakNow('West hand not visible.'); return; } readSuitCards(readHandCards(p), 'Spade'); return; }
            if (key === '2') { blockBBO(e); var p = getPanelBySeat('W'); if (!p) { speakNow('West hand not visible.'); return; } readSuitCards(readHandCards(p), 'Heart'); return; }
            if (key === '3') { blockBBO(e); var p = getPanelBySeat('W'); if (!p) { speakNow('West hand not visible.'); return; } readSuitCards(readHandCards(p), 'Diamond'); return; }
            if (key === '4') { blockBBO(e); var p = getPanelBySeat('W'); if (!p) { speakNow('West hand not visible.'); return; } readSuitCards(readHandCards(p), 'Club'); return; }
            if (key === '5') { blockBBO(e); var p = getPanelBySeat('W'); if (!p) { speakNow('West hand not visible.'); return; } readAllCards(readHandCards(p), 'West'); return; }

            if (key === '6') { blockBBO(e); var p = getPanelBySeat('E'); if (!p) { speakNow('East hand not visible.'); return; } readSuitCards(readHandCards(p), 'Spade'); return; }
            if (key === '7') { blockBBO(e); var p = getPanelBySeat('E'); if (!p) { speakNow('East hand not visible.'); return; } readSuitCards(readHandCards(p), 'Heart'); return; }
            if (key === '8') { blockBBO(e); var p = getPanelBySeat('E'); if (!p) { speakNow('East hand not visible.'); return; } readSuitCards(readHandCards(p), 'Diamond'); return; }
            if (key === '9') { blockBBO(e); var p = getPanelBySeat('E'); if (!p) { speakNow('East hand not visible.'); return; } readSuitCards(readHandCards(p), 'Club'); return; }
            if (key === '0') { blockBBO(e); var p = getPanelBySeat('E'); if (!p) { speakNow('East hand not visible.'); return; } readAllCards(readHandCards(p), 'East'); return; }

            if (key === 'p') {
                blockBBO(e);
                if (currentTrickChronological.length === 0) { speakNow('No cards on the table.'); }
                else { speakNow('Table: ' + currentTrickChronological.map(function(k) { return k.player + ' ' + k.suit + ' ' + k.value; }).join(', ')); }
                return;
            }
            if (key === 'b') {
                blockBBO(e);
                var bids = readCurrentBids();
                if (bids.length === 0) { speakNow('No bids.'); }
                else { speakNow('Bids: ' + bids.map(function(b) { return b.bidder + ' ' + b.translation; }).join(', ')); }
                return;
            }
            if (key === 'v') { blockBBO(e); announceVulnerability(); return; }
            if (key === 'x') {
                blockBBO(e);
                var parts = [];
                var bn = readBoardNumber();
                if (bn > 0) parts.push('Board ' + bn);
                var vul = bn > 0 ? getVulnerability(bn) : null;
                if (vul) {
                    if (vul.ns && vul.ew) parts.push('All vulnerable');
                    else if (!vul.ns && !vul.ew) parts.push('No one vulnerable');
                    else if (vul.ns) parts.push('North South vulnerable');
                    else parts.push('East West vulnerable');
                }
                var contract = readContract();
                if (contract) parts.push('Contract: ' + contract);
                else parts.push('No contract yet');
                speakNow(parts.join('. ') + '.');
                return;
            }
            if (key === 'c') {
                blockBBO(e);
                var tricksC = document.querySelector('.tricksPanelClass');
                if (!tricksC) { speakNow('No trick count available.'); return; }
                var cLabels = tricksC.querySelectorAll('.tricksPanelTricksLabelClass');
                if (cLabels.length >= 3) { speakNow('Us ' + (cLabels[1].innerText.trim() || '0') + ', them ' + (cLabels[2].innerText.trim() || '0')); }
                else { speakNow('No trick count available.'); }
                return;
            }
            if (key === 'h') { blockBBO(e); announceHelp(); return; }
            return; 
        }

        var players = identifyPlayers();

        if (key === 'a') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Spade');   return; }
        if (key === 's') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Heart');   return; }
        if (key === 'd') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Diamond'); return; }
        if (key === 'f') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Club');    return; }

        if (key === 'q') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Spade'); return; }
        if (key === 'w') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Heart'); return; }
        if (key === 'e') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Diamond'); return; }
        if (key === 'r') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Club'); return; }

        if (key === 'g') { blockBBO(e); readAllCards(readHandCards(players.own), 'My hand'); return; }
        if (key === 't') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readAllCards(readHandCards(players.dummy), 'Dummy'); return; }

        if (key === 'p') {
            blockBBO(e);
            if (currentTrickChronological.length === 0) { speakNow('No cards on the table.'); }
            else { speakNow('Table: ' + currentTrickChronological.map(function(k) { return k.player + ' ' + k.suit + ' ' + k.value; }).join(', ')); }
            return;
        }
        if (key === 'b') {
            blockBBO(e);
            var bids = readCurrentBids();
            if (bids.length === 0) { speakNow('No bids.'); }
            else { speakNow('Bids: ' + bids.map(function(b) { return b.bidder + ' ' + b.translation; }).join(', ')); }
            return;
        }

        if (key === 'v') { blockBBO(e); announceVulnerability(); return; }
        if (key === 'x') {
            blockBBO(e);
            var parts = [];
            var bn = readBoardNumber();
            if (bn > 0) parts.push('Board ' + bn);
            var vul = bn > 0 ? getVulnerability(bn) : null;
            if (vul) {
                if (vul.ns && vul.ew) parts.push('All vulnerable');
                else if (!vul.ns && !vul.ew) parts.push('No one vulnerable');
                else if (vul.ns) parts.push('North South vulnerable');
                else parts.push('East West vulnerable');
            }
            var contract = readContract();
            if (contract) parts.push('Contract: ' + contract);
            else parts.push('No contract yet');
            speakNow(parts.join('. ') + '.');
            return;
        }

        if (key === 'c') {
            blockBBO(e);
            var tricksC = document.querySelector('.tricksPanelClass');
            if (!tricksC) { speakNow('No trick count available.'); return; }
            var cLabels = tricksC.querySelectorAll('.tricksPanelTricksLabelClass');
            if (cLabels.length >= 3) { speakNow('Us ' + (cLabels[1].innerText.trim() || '0') + ', them ' + (cLabels[2].innerText.trim() || '0')); }
            else { speakNow('No trick count available.'); }
            return;
        }

        if (key === 'h') { blockBBO(e); announceHelp(); return; }
    }

    if (!e.altKey && !e.ctrlKey && !e.shiftKey && !e.metaKey) {
        if (key === 'arrowdown') { blockBBO(e); playCardFromLedSuit('lowest'); return; }
        if (key === 'arrowup')   { blockBBO(e); playCardFromLedSuit('highest'); return; }
    }
}, true);

// ---------------------------------------------------------
// 6. OBSERVER (MutationObserver)
// ---------------------------------------------------------
var updateTimer = null;
var previousPlayedCards = [];

var gameObserver = new MutationObserver(function(mutations) {
    var needsUpdate = false, checkPlayed = false, newGame = false, checkBids = false, boardNumberChanged = false;
    var boardEndDetected = false, endTextForCapture = '';

    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('handDiagramPanelClass')) { needsUpdate = true; newGame = true; }
                    if (node.classList && (node.classList.contains('handDiagramCardClass') || node.classList.contains('suitPanelClass'))) { needsUpdate = true; }
                    if ((node.tagName && node.tagName.toLowerCase() === 'auction-box-cell') || (node.classList && (node.classList.contains('auction-box-cell') || node.classList.contains('call-level')))) { checkBids = true; }
                    if (node.querySelector && (node.querySelector('auction-box-cell') || node.querySelector('.call-level'))) { checkBids = true; }
                    
                    if (node.classList && node.classList.contains('dealEndPanelClass')) { 
                        boardEndDetected = true; 
                    }
                }
            });
        }

        if (mutation.type === 'characterData') {
            var parent = mutation.target.parentElement;
            if (parent && parent.classList && parent.classList.contains('vulPanelInnerPanelClass')) { boardNumberChanged = true; }
        }
        
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('vulPanelInnerPanelClass')) { boardNumberChanged = true; }
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('handDiagramCurrentTrickClass')) { checkPlayed = true; }
        
        if (mutation.target && mutation.target.classList && mutation.target.classList.contains('dealEndPanelClass')) { 
            boardEndDetected = true; 
        }

        var target = mutation.target;
        while (target) {
            if (target.classList && target.classList.contains('handDiagramCurrentTrickClass')) { checkPlayed = true; break; }
            if ((target.tagName && target.tagName.toLowerCase() === 'auction-box-cell') || (target.classList && (target.classList.contains('auction-box-cell') || target.classList.contains('call-level')))) { checkBids = true; break; }
            if (target.classList && target.classList.contains('dealEndPanelClass')) { 
                boardEndDetected = true; 
                break; 
            }
            target = target.parentElement;
        }
    });

    if (needsUpdate) {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(updateCardAccessibility, 800);
    }

    if (newGame || boardNumberChanged) {
        dlog('newGame=' + newGame + ' boardNumberChanged=' + boardNumberChanged + ' boardInDOM=' + readBoardNumber() + ' lastAnnouncedBoard=' + lastAnnouncedBoard);
        previousPlayedCards = [];
        currentTrickChronological = [];
        spokenBidCount = 0; 
        setTimeout(announceVulnerability, 1000);
    }

    if (boardEndDetected) {
        setTimeout(checkBoardEndResult, 500);
    }

    if (checkBids) {
        if (bidCheckTimer) clearTimeout(bidCheckTimer);
        bidCheckTimer = setTimeout(checkNewBids, 300);
    }

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
                        speak(played[i].player + ': ' + played[i].suit + ' ' + played[i].value);
                        if (currentTrickChronological.length === 4) {
                            announceTrickWinner(currentTrickChronological);
                        }
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
                dlog('boardNumObs: bn=' + bn + ' lastAnnouncedBoard=' + lastAnnouncedBoard);
                previousPlayedCards = [];
                currentTrickChronological = [];
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
// 7. MODAL DIALOG AUTO-FOCUS
// ---------------------------------------------------------
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
            speak('Dialog: ' + announcement);
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