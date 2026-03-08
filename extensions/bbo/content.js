// =========================================================
// BBO Accessibility Extension (Screen Reader Support) - V6.1
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
// Panels are always S(0),W(1),N(2),E(3) in DOM order.
// Declarer read from first tricksPanelTricksLabelClass element.
// Dummy = declarer's partner (S-N, W-E pairs).
// =========================================================
console.log("BBO Accessibility Extension loaded (V6.1 - Declarer-based dummy)");

// ---------------------------------------------------------
// 1. SCREEN READER SPEAKER
// ---------------------------------------------------------
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
// Visually hidden but accessible to screen readers.
// Uses clip technique so the element does not overlap other elements.
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

// Speech queue: ensures all messages are spoken in order
var speechQueue = [];
var isSpeaking = false;
var SPEECH_DELAY = 600; // ms delay between messages

function speak(text) {
    speechQueue.push(text);
    if (!isSpeaking) {
        processSpeechQueue();
    }
}

// Speak immediately and clear queue (for keyboard commands)
function speakNow(text) {
    speechQueue = [];
    isSpeaking = false;
    liveRegion.textContent = '';
    setTimeout(function() {
        liveRegion.textContent = text;
    }, 50);
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

// suitPanelClass elements inside the hand in order:
// index 0 = Club, 1 = Diamond, 2 = Heart, 3 = Spade
const SUITS_IN_ORDER = ['Club', 'Diamond', 'Heart', 'Spade'];

// Suit symbols to English names
const SYMBOL_TO_SUIT = {
    '\u2663': 'Club',
    '\u2666': 'Diamond',
    '\u2665': 'Heart',
    '\u2660': 'Spade'
};

// Bid translations
const BID_TRANSLATION = {
    'Pass': 'Pass',
    'Dbl': 'Double',
    'Rdbl': 'Redouble'
};

/**
 * Translates a bid to spoken English.
 * E.g. "1♠" -> "1 Spade", "Pass" -> "Pass", "3NT" -> "3 No Trump"
 */
function translateBid(text) {
    if (!text) return '';
    text = text.replace(/\n| /g, '').trim();
    if (!text) return '';

    if (BID_TRANSLATION[text]) return BID_TRANSLATION[text];

    var level = text.charAt(0);
    if (level >= '1' && level <= '7') {
        var rest = text.substring(1).trim();
        if (rest === 'NT' || rest === 'N') return level + ' No Trump';
        if (rest.length >= 1 && SYMBOL_TO_SUIT[rest.charAt(0)]) {
            return level + ' ' + SYMBOL_TO_SUIT[rest.charAt(0)];
        }
        return level + ' ' + rest;
    }

    return text;
}

/**
 * Parses a played card text into suit and value.
 */
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
// 3. HAND IDENTIFICATION (DOM structure)
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
            if (value) {
                cards.push({ suit: suit, value: value, element: handCards[j] });
            }
        }
    }
    return cards;
}

// Panel indices are always: S=0, W=1, N=2, E=3
var SEAT_TO_PANEL_INDEX = { 'S': 0, 'W': 1, 'N': 2, 'E': 3 };
var PANEL_INDEX_TO_SEAT = ['S', 'W', 'N', 'E'];

// Declarer -> Dummy mapping (dummy is always declarer's partner)
var DUMMY_BY_DECLARER = { 'S': 'N', 'N': 'S', 'W': 'E', 'E': 'W' };

/**
 * Finds the declarer's seat letter from BBO's tricks panel.
 * The tricksPanelClass contains the contract info, and the first
 * tricksPanelTricksLabelClass element shows the declarer's seat.
 * Returns seat letter ('N','S','E','W') or null if not found.
 */
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

/**
 * Identifies the player's own hand and dummy's hand.
 * Own hand = bottom panel on screen (always the player's seat).
 * Dummy = declarer's partner, determined from the contract display.
 * Panels are always in DOM order: S(0), W(1), N(2), E(3).
 */
function identifyPlayers() {
    var panels = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
    if (panels.length === 0) return { own: null, dummy: null };

    // Find own hand = bottom panel (highest top value on screen)
    var ownIdx = 0;
    var highestTop = -1;
    for (var i = 0; i < panels.length; i++) {
        var top = panels[i].getBoundingClientRect().top;
        if (top > highestTop) {
            highestTop = top;
            ownIdx = i;
        }
    }
    var ownPanel = panels[ownIdx];

    // Find dummy from declarer
    var dummyPanel = null;
    var declarer = findDeclarer();
    if (declarer) {
        var dummySeat = DUMMY_BY_DECLARER[declarer];
        var dummyIdx = SEAT_TO_PANEL_INDEX[dummySeat];
        if (dummyIdx !== undefined && dummyIdx < panels.length) {
            dummyPanel = panels[dummyIdx];
        }
    }

    console.log("identifyPlayers: panels=" + panels.length +
        ", own idx=" + ownIdx + " seat=" + PANEL_INDEX_TO_SEAT[ownIdx] +
        ", declarer=" + (declarer || "null") +
        ", dummy seat=" + (declarer ? DUMMY_BY_DECLARER[declarer] : "null") +
        ", dummy panel=" + (dummyPanel ? "found" : "null"));

    return {
        own: ownPanel,
        dummy: dummyPanel
    };
}

/**
 * Reads played cards on the table (current trick).
 * DOM order: index 0 = South, 1 = West, 2 = North, 3 = East.
 */
var TRICK_DIRECTIONS = ['South', 'West', 'North', 'East'];

function readPlayedCards() {
    var played = [];
    var elements = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    for (var i = 0; i < elements.length && i < 4; i++) {
        var el = elements[i];
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var result = parsePlayedCard(el.innerText);
            if (result) {
                result.player = TRICK_DIRECTIONS[i];
                played.push(result);
            }
        }
    }
    return played;
}

// ---------------------------------------------------------
// 3b. BID READING (Auction)
// ---------------------------------------------------------

var SEAT_NAME = {
    'N': 'North', 'S': 'South', 'E': 'East', 'W': 'West',
    'North': 'North', 'South': 'South', 'East': 'East', 'West': 'West'
};

var spokenBidCount = 0;
var bidCheckTimer = null;

/**
 * Determines the bidder's seat by comparing x-coordinate
 * to auction-box-header-cell headers.
 */
function identifyBidder(bidElement) {
    var auctionBox = bidElement.closest('.auctionBoxClass') ||
                     document.querySelector('.auctionBoxClass') ||
                     document.querySelector('[class*="auctionBox"]');
    if (!auctionBox) {
        var headers = document.querySelectorAll('.auction-box-header-cell');
        if (headers.length === 0) return null;
        var bidX = bidElement.getBoundingClientRect().x;
        for (var i = 0; i < headers.length; i++) {
            if (Math.abs(headers[i].getBoundingClientRect().x - bidX) < 5) {
                var seat = headers[i].innerText.trim();
                return SEAT_NAME[seat] || seat;
            }
        }
        return null;
    }
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

/**
 * Reads all bids and returns a list.
 */
function readBids() {
    var bids = [];
    var elements = document.querySelectorAll('auction-box-cell');
    if (elements.length === 0) {
        elements = document.querySelectorAll('div.auction-box-cell');
    }
    for (var i = 0; i < elements.length; i++) {
        var el = elements[i];
        var text = el.innerText.replace(/\n| /g, '').trim();
        if (text) {
            var bidder = identifyBidder(el);
            bids.push({
                text: text,
                translation: translateBid(text),
                bidder: bidder,
                index: i
            });
        }
    }
    return bids;
}

/**
 * Checks for new bids and speaks them.
 * Retries if text not yet filled.
 */
var bidRetryCounter = 0;

function checkNewBids() {
    var bids = readBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            var b = bids[i];
            var message = (b.bidder ? b.bidder + ': ' : '') + b.translation;
            speak(message);
        }
        spokenBidCount = bids.length;
        bidRetryCounter = 0;
    } else if (bids.length < spokenBidCount) {
        spokenBidCount = bids.length;
        bidRetryCounter = 0;
    } else if (bidRetryCounter < 3) {
        bidRetryCounter++;
        setTimeout(checkNewBids, 500);
    } else {
        bidRetryCounter = 0;
    }
}

// ---------------------------------------------------------
// 4. CARD ACCESSIBILITY ATTRIBUTES
// ---------------------------------------------------------

function updateCardAccessibility() {
    var panels = document.querySelectorAll('div.handDiagramPanelClass');
    panels.forEach(function(panel) {
        var suitPanels = panel.querySelectorAll('.suitPanelClass');
        for (var i = 0; i < suitPanels.length && i < 4; i++) {
            var suit = SUITS_IN_ORDER[i];
            var cards = suitPanels[i].querySelectorAll('div.handDiagramCardClass');
            cards.forEach(function(card) {
                var value = card.innerText.replace(/\n| /g, '').trim();
                if (value) {
                    card.setAttribute('aria-label', suit + ' ' + value);
                }
            });
            suitPanels[i].querySelectorAll('.suitSymbolClass').forEach(function(sym) {
                sym.setAttribute('aria-hidden', 'true');
            });
        }
    });

    var playedElements = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    playedElements.forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var result = parsePlayedCard(el.innerText);
            if (result) {
                el.setAttribute('aria-label', result.suit + ' ' + result.value);
            }
        }
    });
}

// ---------------------------------------------------------
// 5. KEYBOARD SHORTCUTS AND READING
// ---------------------------------------------------------

var SUIT_PLURAL = {
    'Spade': 'Spades',
    'Heart': 'Hearts',
    'Diamond': 'Diamonds',
    'Club': 'Clubs'
};

function readSuitCards(cards, targetSuit, ownerName) {
    var suitCards = cards
        .filter(function(k) { return k.suit === targetSuit; })
        .map(function(k) { return k.value; });
    if (suitCards.length > 0) {
        var plural = SUIT_PLURAL[targetSuit] || targetSuit;
        speakNow(suitCards.length + ' ' + plural + ' ' + suitCards.join(' '));
    } else {
        speakNow('0 ' + (SUIT_PLURAL[targetSuit] || targetSuit));
    }
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) {
        speakNow(ownerName + ': no cards visible.');
        return;
    }
    var order = ['Spade', 'Heart', 'Diamond', 'Club'];
    var parts = [];
    order.forEach(function(suit) {
        var suitCards = cards
            .filter(function(k) { return k.suit === suit; })
            .map(function(k) { return k.value; });
        if (suitCards.length > 0) {
            var plural = SUIT_PLURAL[suit] || suit;
            parts.push(suitCards.length + ' ' + plural + ' ' + suitCards.join(' '));
        }
    });
    speakNow(parts.join('. '));
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();

    function blockBBO(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (e.altKey) {
        var players = identifyPlayers();

        // OWN CARDS (Alt + A=Spades, S=Hearts, D=Diamonds, F=Clubs)
        if (key === 'a') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Spade', 'Own'); return; }
        if (key === 's') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Heart', 'Own'); return; }
        if (key === 'd') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Diamond', 'Own'); return; }
        if (key === 'f') { blockBBO(e); readSuitCards(readHandCards(players.own), 'Club', 'Own'); return; }

        // DEBUG (Alt + I)
        if (key === 'i') {
            blockBBO(e);
            var panels2 = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
            var info = 'Panels: ' + panels2.length + '. ';
            panels2.forEach(function(p, idx) {
                var sp = p.querySelectorAll('.suitPanelClass');
                var ce = p.querySelectorAll('div.handDiagramCardClass');
                var wt = 0;
                ce.forEach(function(k) {
                    if (k.innerText.replace(/\n| /g, '').trim()) wt++;
                });
                info += 'Panel ' + idx + ' (' + PANEL_INDEX_TO_SEAT[idx] + '): top=' + Math.round(p.getBoundingClientRect().top) +
                    ', cards=' + wt + '. ';
            });
            var declarer = findDeclarer();
            info += 'Declarer: ' + (declarer || 'none') + '. ';
            info += 'Dummy seat: ' + (declarer ? DUMMY_BY_DECLARER[declarer] : 'none') + '. ';
            info += 'Own: ' + (players.own ? 'found' : 'null') + '. ';
            info += 'Dummy: ' + (players.dummy ? 'found' : 'null') + '. ';
            if (players.dummy) {
                var dc = readHandCards(players.dummy);
                info += 'Dummy cards: ' + dc.length;
            }
            speakNow(info);
            console.log(info);
            return;
        }

        // DUMMY'S CARDS (Alt + Q=Spades, W=Hearts, E=Diamonds, R=Clubs)
        if (key === 'q') {
            blockBBO(e);
            if (!players.dummy) { speakNow('Dummy cards not visible.'); return; }
            readSuitCards(readHandCards(players.dummy), 'Spade', 'Dummy');
            return;
        }
        if (key === 'w') {
            blockBBO(e);
            if (!players.dummy) { speakNow('Dummy cards not visible.'); return; }
            readSuitCards(readHandCards(players.dummy), 'Heart', 'Dummy');
            return;
        }
        if (key === 'e') {
            blockBBO(e);
            if (!players.dummy) { speakNow('Dummy cards not visible.'); return; }
            readSuitCards(readHandCards(players.dummy), 'Diamond', 'Dummy');
            return;
        }
        if (key === 'r') {
            blockBBO(e);
            if (!players.dummy) { speakNow('Dummy cards not visible.'); return; }
            readSuitCards(readHandCards(players.dummy), 'Club', 'Dummy');
            return;
        }

        // ALT+P: PLAYED CARDS ON TABLE (current trick)
        if (key === 'p') {
            blockBBO(e);
            var played = readPlayedCards();
            if (played.length === 0) {
                speakNow('No cards on the table.');
            } else {
                var text = played.map(function(k) { return k.player + ' ' + k.suit + ' ' + k.value; }).join(', ');
                speakNow('Table: ' + text);
            }
            return;
        }

        // ALT+B: ALL BIDS (auction)
        if (key === 'b') {
            blockBBO(e);
            var bids = readBids();
            if (bids.length === 0) {
                speakNow('No bids.');
            } else {
                var text = bids.map(function(b) {
                    return (b.bidder ? b.bidder + ' ' : '') + b.translation;
                }).join(', ');
                speakNow('Bids: ' + text);
            }
            return;
        }

        // ALT+O: ALL OWN CARDS
        if (key === 'o') {
            blockBBO(e);
            var playersO = identifyPlayers();
            readAllCards(readHandCards(playersO.own), 'My hand');
            return;
        }

        // ALT+L: ALL DUMMY'S CARDS
        if (key === 'l') {
            blockBBO(e);
            var playersL = identifyPlayers();
            if (!playersL.dummy) {
                speakNow('Dummy cards not visible.');
                return;
            }
            readAllCards(readHandCards(playersL.dummy), 'Dummy');
            return;
        }
    }
}, true); // capture phase

// ---------------------------------------------------------
// 6. OBSERVER (MutationObserver)
// ---------------------------------------------------------
var updateTimer = null;
var previousPlayedCards = [];

var gameObserver = new MutationObserver(function(mutations) {
    var needsUpdate = false;
    var checkPlayed = false;
    var newGame = false;
    var checkBids = false;

    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('handDiagramPanelClass')) {
                        needsUpdate = true;
                        newGame = true;
                    }
                    if (node.classList && (
                        node.classList.contains('handDiagramCardClass') ||
                        node.classList.contains('suitPanelClass')
                    )) {
                        needsUpdate = true;
                    }
                    // Bid element added
                    if ((node.tagName && node.tagName.toLowerCase() === 'auction-box-cell') ||
                        (node.classList && (
                            node.classList.contains('auction-box-cell') ||
                            node.classList.contains('call-level')
                        ))) {
                        checkBids = true;
                    }
                    if (node.querySelector && (
                        node.querySelector('auction-box-cell') ||
                        node.querySelector('.call-level'))) {
                        checkBids = true;
                    }
                }
            });
        }

        // Played card changes
        if (mutation.target && mutation.target.classList &&
            mutation.target.classList.contains('handDiagramCurrentTrickClass')) {
            checkPlayed = true;
        }
        // Subtree changes in played cards and bids
        var target = mutation.target;
        while (target) {
            if (target.classList && target.classList.contains('handDiagramCurrentTrickClass')) {
                checkPlayed = true;
                break;
            }
            if ((target.tagName && target.tagName.toLowerCase() === 'auction-box-cell') ||
                (target.classList && (
                    target.classList.contains('auction-box-cell') ||
                    target.classList.contains('call-level')
                ))) {
                checkBids = true;
                break;
            }
            target = target.parentElement;
        }
    });

    if (needsUpdate) {
        if (updateTimer) clearTimeout(updateTimer);
        updateTimer = setTimeout(updateCardAccessibility, 800);
    }

    // New game detected - reset tracking
    if (newGame) {
        previousPlayedCards = [];
        spokenBidCount = 0;
        console.log("New game detected, tracking reset.");
    }

    // Check new bids with delay
    if (checkBids) {
        if (bidCheckTimer) clearTimeout(bidCheckTimer);
        bidCheckTimer = setTimeout(checkNewBids, 300);
    }

    if (checkPlayed) {
        setTimeout(function() {
            var played = readPlayedCards();

            // If card count decreases, new trick started - reset
            if (played.length < previousPlayedCards.length) {
                previousPlayedCards = [];
            }

            if (played.length > 0 && played.length > previousPlayedCards.length) {
                var previousKeys = previousPlayedCards.map(function(k) { return k.player + k.suit + k.value; });
                var newCard = null;
                for (var i = 0; i < played.length; i++) {
                    var cardKey = played[i].player + played[i].suit + played[i].value;
                    if (previousKeys.indexOf(cardKey) === -1) {
                        newCard = played[i];
                        break;
                    }
                }
                if (newCard) {
                    speak(newCard.player + ': ' + newCard.suit + ' ' + newCard.value);
                }
                previousPlayedCards = played.map(function(k) { return { player: k.player, suit: k.suit, value: k.value }; });
            }
            if (played.length === 0) {
                previousPlayedCards = [];
            }
        }, 200);
    }
});

gameObserver.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// Initial update when page is loaded
setTimeout(updateCardAccessibility, 2000);

// Periodic bid check as backup
setInterval(function() {
    var bids = readBids();
    if (bids.length !== spokenBidCount) {
        checkNewBids();
    }
}, 500);