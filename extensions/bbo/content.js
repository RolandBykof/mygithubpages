// =========================================================
// BBO Accessibility Extension (Screen Reader Support) - V7.3
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
// V7.4: Fixed first bids of new game not being announced. Race condition
// where newGame detection and first bid mutations arrived in the same
// MutationObserver batch caused staleBidCount to incorrectly include
// new-game bids. Fixed: on newGame, only reset spokenBidCount and keep
// staleBidCount pointing at the previous game's bids. readCurrentBids()
// already auto-resets staleBidCount when old bids are cleared from DOM.
// =========================================================
console.log("BBO Accessibility Extension loaded (V7.4 - First Bids Fix)");

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
// 3b. BID READING
// ---------------------------------------------------------
var SEAT_NAME = { 'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West', 'North': 'North', 'South': 'South', 'East': 'East', 'West': 'West' };
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

// Returns only bids belonging to the current game,
// skipping stale bids left in the DOM from the previous game.
function readCurrentBids() {
    var allBids = readBids();
    // If total bids dropped below staleBidCount, the old auction
    // was cleared from the DOM — reset the skip counter.
    if (allBids.length < staleBidCount) {
        staleBidCount = 0;
    }
    return allBids.slice(staleBidCount);
}

var bidRetryCounter = 0;
function checkNewBids() {
    var currentBids = readCurrentBids();
    if (currentBids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < currentBids.length; i++) speak((currentBids[i].bidder ? currentBids[i].bidder + ': ' : '') + currentBids[i].translation);
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
var SEAT_FULL_NAME = { 'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West' };

function readContract() {
    var tricksPanel = document.querySelector('.tricksPanelClass');
    if (tricksPanel && tricksPanel.style.display !== 'none') {
        // Declarer is in the first tricksPanelTricksLabelClass
        var labels = tricksPanel.querySelectorAll('.tricksPanelTricksLabelClass');
        var declarerText = (labels.length > 0) ? labels[0].innerText.trim() : '';

        // Resolve declarer name
        var seatName = null;
        var directions = ['North', 'South', 'East', 'West'];
        for (var di = 0; di < directions.length; di++) {
            if (declarerText === directions[di] || declarerText === directions[di].charAt(0)) {
                seatName = directions[di];
                break;
            }
        }

        // Level is in a separate element with class call-level
        var levelEl = tricksPanel.querySelector('.call-level');
        var level = levelEl ? levelEl.innerText.trim() : '';

        // Suit is in a separate element with class call-strain
        // The class also tells us the suit: hearts, spades, diamonds, clubs
        var strainEl = tricksPanel.querySelector('.call-strain');
        var suitName = '';
        if (strainEl) {
            if (strainEl.classList.contains('hearts')) suitName = 'Heart';
            else if (strainEl.classList.contains('spades')) suitName = 'Spade';
            else if (strainEl.classList.contains('diamonds')) suitName = 'Diamond';
            else if (strainEl.classList.contains('clubs')) suitName = 'Club';
            else if (strainEl.classList.contains('notrump') || strainEl.classList.contains('no-trump')) suitName = 'No Trump';
            else {
                // Fallback: read the text/symbol
                var strainText = strainEl.innerText.trim();
                if (SYMBOL_TO_SUIT[strainText]) suitName = SYMBOL_TO_SUIT[strainText];
                else if (strainText === 'NT' || strainText === 'N') suitName = 'No Trump';
                else suitName = strainText;
            }
        }

        // Check for doubled/redoubled markers
        var doubled = '';
        var dblEl = tricksPanel.querySelector('.call-dbl, .doubled');
        var rdblEl = tricksPanel.querySelector('.call-rdbl, .redoubled');
        if (rdblEl) doubled = ' Redoubled';
        else if (dblEl) doubled = ' Doubled';

        if (seatName && level && suitName) {
            return seatName + ' ' + level + ' ' + suitName + doubled;
        }
    }

    // Fallback: derive contract from the auction bids
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
        // It's a real bid (level + suit)
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
// 5. KEYBOARD SHORTCUTS AND TRICK PLAY LOGIC
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
    speakNow(parts.join('. '));
}

// Paranneltu näppäinsimulaattori, joka erottaa kirjaimet ja numerot toisistaan (Key vs Digit)
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

// Fallback: Aito hiiren klikkauksen simulointi varmuuden vuoksi
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
    if (currentTrickChronological.length === 0) { speakNow('No card has been led yet.'); return; }
    if (currentTrickChronological.length >= 4) { speakNow('Trick is full.'); return; }

    var ledCard = currentTrickChronological[0];
    var ledSuit = ledCard.suit;

    var ledIndex = TRICK_DIRECTIONS.indexOf(ledCard.player);
    var nextIndex = (ledIndex + currentTrickChronological.length) % 4;
    var nextPlayerName = TRICK_DIRECTIONS[nextIndex];
    var nextPlayerSeat = nextPlayerName.charAt(0);

    var players = identifyPlayers();
    var activeHandElement = null;
    var activeHandName = '';

    if (players.ownSeat && nextPlayerSeat === players.ownSeat) {
        activeHandElement = players.own;
        activeHandName = 'Your hand';
    } else if (players.dummySeat && nextPlayerSeat === players.dummySeat) {
        activeHandElement = players.dummy;
        activeHandName = 'Dummy';
    } else {
        speakNow("It is " + nextPlayerName + "'s turn.");
        return;
    }

    if (!activeHandElement) { speakNow(activeHandName + ' is not visible.'); return; }

    var handCards = readHandCards(activeHandElement);
    var matchingCards = handCards.filter(function(c) { return c.suit === ledSuit; });
    
    if (matchingCards.length === 0) { speakNow('No ' + (SUIT_PLURAL[ledSuit] || ledSuit) + ' in ' + activeHandName + '.'); return; }

    matchingCards.sort(function(a, b) { return cardRank(a.value) - cardRank(b.value); });

    var card = (mode === 'lowest') ? matchingCards[0] : matchingCards[matchingCards.length - 1];

    var suitChar = card.suit.charAt(0).toLowerCase();
    var valChar = card.value.toLowerCase();
    if (valChar === '10') valChar = 't';

    // 1. Pelaa käyttäen näppäimistösimulaatiota (paremmat Key/Digit koodit)
    dispatchBBOKey(suitChar);
    setTimeout(function() {
        dispatchBBOKey(valChar);
        
        // 2. FALLBACK: Simuloi lisäksi klikkaus suoraan kortin DOM-elementtiin
        setTimeout(function() {
            simulateRealClick(card.element);
        }, 50);
        
    }, 150); // Kasvatettu viive 150ms

    speakNow(activeHandName + ' played ' + card.suit + ' ' + card.value);
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();

    function blockBBO(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); }

    if (e.altKey) {
        var players = identifyPlayers();

        if (key === 'a') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Spade'); return; }
        if (key === 's') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Heart'); return; }
        if (key === 'd') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Diamond'); return; }
        if (key === 'f') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Club'); return; }

        if (key === 'q') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Spade'); return; }
        if (key === 'w') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Heart'); return; }
        if (key === 'e') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Diamond'); return; }
        if (key === 'r') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readSuitCards(readHandCards(players.dummy), 'Club'); return; }

        if (key === 'p') {
            blockBBO(e);
            if (currentTrickChronological.length === 0) { speakNow('No cards on the table.'); }
            else { speakNow('Table: ' + currentTrickChronological.map(function(k) { return k.player + ' ' + k.suit + ' ' + k.value; }).join(', ')); }
            return;
        }

        if (key === 'b') { blockBBO(e); var bids = readCurrentBids(); if (bids.length === 0) { speakNow('No bids.'); } else { speakNow('Bids: ' + bids.map(function(b) { return (b.bidder ? b.bidder + ' ' : '') + b.translation; }).join(', ')); } return; }
        if (key === 'o') { blockBBO(e); readAllCards(readHandCards(players.own), 'My hand'); return; }
        if (key === 'l') { blockBBO(e); if (!players.dummy) { speakNow('Dummy cards not visible.'); return; } readAllCards(readHandCards(players.dummy), 'Dummy'); return; }
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
        if (key === 't') { blockBBO(e); var tricksP = document.querySelector('.tricksPanelClass'); if (!tricksP) { speakNow('No trick count available.'); return; } var tLabels = tricksP.querySelectorAll('.tricksPanelTricksLabelClass'); var info = ''; if (tLabels.length >= 3) { info = 'Tricks: us ' + (tLabels[1].innerText.trim() || '0') + ', them ' + (tLabels[2].innerText.trim() || '0'); } var endP = document.querySelector('.dealEndPanelClass'); if (endP && endP.innerText.trim()) { info += '. Result: ' + endP.innerText.trim(); } speakNow(info || 'No trick information.'); return; }
        if (key === 'c') { blockBBO(e); var tricksC = document.querySelector('.tricksPanelClass'); if (!tricksC) { speakNow('No trick count available.'); return; } var cLabels = tricksC.querySelectorAll('.tricksPanelTricksLabelClass'); if (cLabels.length >= 3) { speakNow('Us ' + (cLabels[1].innerText.trim() || '0') + ', them ' + (cLabels[2].innerText.trim() || '0')); } else { speakNow('No trick count available.'); } return; }

        if (key === 'arrowdown') { blockBBO(e); playCardFromLedSuit('lowest'); return; }
        if (key === 'arrowup') { blockBBO(e); playCardFromLedSuit('highest'); return; }
    }
}, true);

// ---------------------------------------------------------
// 6. OBSERVER (MutationObserver)
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
        previousPlayedCards = [];
        currentTrickChronological = [];
        // FIX V7.4: The first new-game bids often arrive in the same
        // MutationObserver batch as the newGame signal. Setting
        // staleBidCount = readBids().length here would mark those first
        // bids as stale so they'd never be announced.
        // Fix: keep staleBidCount pointing at the previous game's bids
        // (its current value) and only reset spokenBidCount. This way
        // readCurrentBids() correctly slices off the old bids while
        // exposing the new ones for checkNewBids to speak. When BBO
        // eventually clears the old auction from DOM, readCurrentBids()
        // auto-resets staleBidCount via its own guard.
        spokenBidCount = 0;
        // lastBoardEndText is NOT reset — this prevents the setInterval
        // from re-announcing the old result still visible in the DOM.
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
                        speak(played[i].player + ': ' + played[i].suit + ' ' + played[i].value);
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
                previousPlayedCards = [];
                currentTrickChronological = [];
                // Same fix: leave staleBidCount as-is, only reset spokenBidCount.
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
// BBO uses Angular Material dialogs (mat-dialog-container)
// that NVDA does not automatically focus. This observer
// detects when a modal dialog appears and moves focus into it.

function focusModalDialog(dialogElement) {
    if (!dialogElement) return;

    // Ensure the dialog has proper ARIA attributes for NVDA
    if (!dialogElement.getAttribute('tabindex')) {
        dialogElement.setAttribute('tabindex', '-1');
    }
    if (!dialogElement.getAttribute('role')) {
        dialogElement.setAttribute('role', 'dialog');
    }
    if (!dialogElement.getAttribute('aria-modal')) {
        dialogElement.setAttribute('aria-modal', 'true');
    }

    // Longer delay — Angular Material needs time to fully render content
    setTimeout(function() {
        // Find the best focus target inside the dialog
        var focusTarget = dialogElement.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusTarget) focusTarget = dialogElement;

        // Ensure focusable
        if (!focusTarget.getAttribute('tabindex') && focusTarget === dialogElement) {
            focusTarget.setAttribute('tabindex', '-1');
        }

        // Step 1: Simulate a real mouse click — this is what forces
        // NVDA's virtual cursor to jump to the element
        var clickOpts = { bubbles: true, cancelable: true, view: window };
        focusTarget.dispatchEvent(new PointerEvent('pointerdown', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('mousedown', clickOpts));
        focusTarget.dispatchEvent(new PointerEvent('pointerup', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('mouseup', clickOpts));
        focusTarget.dispatchEvent(new MouseEvent('click', clickOpts));

        // Step 2: Also call .focus() for good measure
        focusTarget.focus();

        // Step 3: Announce dialog content
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

                // Check if the added node itself is a dialog
                var tag = node.tagName ? node.tagName.toLowerCase() : '';
                var role = node.getAttribute ? node.getAttribute('role') : '';
                if (tag === 'mat-dialog-container' || role === 'dialog') {
                    focusModalDialog(node);
                    return;
                }
                // Also check descendants — CDK adds overlay wrapper
                // containing the actual dialog element
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