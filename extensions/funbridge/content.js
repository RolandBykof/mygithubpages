// =========================================================
// Funbridge Accessibility Extension (NVDA Screen Reader Support)
// Version 1.26 – Alt+V now says whose turn it is to bid or play instead of the
//               vulnerability, which is still read by Alt+X. During the
//               auction the answer comes from the bid box (clickable bids mean
//               the user is to call) or from the last bid in the auction box;
//               during play it comes from the active-card markers and the
//               extension's own trick tracking.
// Version 1.25 – Alt+R starts the replay while the results page is open. Like
//               Alt+N it is page-sensitive rather than newly bound: the key
//               reads the dummy's clubs, and there is no dummy on that page.
//               The Replay control is an unnamed div with a React handler, so
//               it is matched by its text and activated with simulateClick.
// Version 1.24 – Alt+N now moves to the next deal while the results page is
//               open. The key already read the player names, which say nothing
//               there because no table is on screen, so it is page-sensitive
//               rather than newly bound. On the last deal of a tournament the
//               button does not exist and the key does nothing.
// Version 1.23 – The results report now also reads the mistake lines from the
//               "Detailed analysis" box, and it is announced automatically as
//               soon as a deal's results render. The announcement uses an
//               assertive live region of its own, so it interrupts whatever the
//               screen reader is saying; the polite region is left for
//               everything else. F8 still repeats the report on demand.
// Version 1.22 – The deal results page can now be read with F8: the contract
//               and result from the page header, the Deal and Tournament
//               percentages, and the card play sentence comparing the user to
//               the other players. The page renders every box twice (wide and
//               narrow layouts), so each lookup skips hidden copies; the values
//               are anchored to the box titles rather than to class paths,
//               because the Deal and Tournament boxes nest them differently.
// Version 1.21 – Opening a deal now uses the deal's own Funbridge link, which
//               works regardless of whether its row happens to be rendered in
//               the virtualised list. Clicking the row remains as a fallback
//               for deals with no link.
// Version 1.20 – The deal details view now offers Funbridge's own deal link
//               (sharedUrl) for copying or opening in a new tab, so a deal can
//               be reached even when clicking its row does not work. Row search
//               also looks inside shadow roots and across the whole page, in
//               case the virtualised list renders outside the list container.
// Version 1.19 – Opening a deal now closes the accessible dialog immediately
//               and reports the outcome, instead of leaving the window open
//               with no sign of what happened. If the deal cannot be opened,
//               the list comes back with an explanation. Row search also got
//               two more strategies (the fibers of rendered elements, then the
//               deal name as text) and no longer matches the extension's own
//               live region, which briefly holds the deal name while speaking.
// Version 1.18 – Deals can now be opened from the accessible list. Clicking a
//               row could not be done reliably from the DOM, because the list
//               is virtualised and the click handler lives in React's props;
//               the page-world bridge now finds the row component in the Fiber
//               tree (the deepest one holding that deal, so the whole list is
//               never clicked) and dispatches a full pointer/mouse sequence on
//               it. Every row in the dialog also got its own "Open in
//               Funbridge" button, the DOM fallback search no longer matches
//               the extension's own dialog, and the route watcher no longer
//               closes a dialog opened right after page load.
// Version 1.17 – Library deal list now reads the page's React data through a
//               page-world bridge. A content script runs in an isolated world
//               and cannot see properties the page adds to DOM elements, so
//               React's __reactFiber$ hook was invisible to the extension even
//               though the same code worked in the console. The collector now
//               runs in the page's own world and returns the deals as JSON
//               through the shared DOM. See fb-library-bridge.js for the
//               manifest options.
// Version 1.16 – Library deal list hardened. The deal data is not always in
//               the same place in React's internals, so the reader now works
//               in three stages (hook state and effects, then props, then the
//               whole Fiber tree) and no longer loses long hook chains to the
//               depth limit. The DOM fallback ignores <style> and other
//               non-row elements, says out loud when it is being used, and
//               fbLibDebug() in the console reports what was found.
// Version 1.15 – Library deal list made screen reader accessible. The library
//               view renders its deals in a virtualised "infinite scroll"
//               container, so rows appear and vanish while scrolling and a
//               screen reader cannot browse them. Alt+L now opens a modal
//               dialog that lists every deal as a real HTML list, read from
//               the page's own React data: name, date, tags, comment and the
//               computed contract, plus a details view with the bidding and
//               all four hands. Includes filtering, "load more" for deals not
//               yet fetched, copy-as-text and opening a deal in Funbridge.
// Version 1.14 – Settings toggles are now accessible. The custom
//               .switch-checkbox controls exposed no on/off state to screen
//               readers; each is now a role="switch" with an accessible name,
//               a live aria-checked synced to the real state, keyboard support
//               (Space/Enter), and the hidden input suppressed to avoid
//               double-announcing.
// Version 1.13 – getHref hardened to read the SVG reference no matter how the
//               browser exposes it (plain attribute, namespaced xlink, or
//               SVGAnimatedString.baseVal). Confirmed against a live capture
//               that the card-advice icon stores its ref in xlink:href
//               (e.g. #card-us-gs-5h -> "5 of Hearts"); the V1.12 retry handles
//               the icon's late React render.
// Version 1.12 – "Get advice" card resolution hardened. The recommended card
//               icon's <use href> can render late or sit in a slightly
//               different place, which produced "unknown card". The handler now
//               searches several sources (advice icon, any <use>, Play button,
//               modal HTML) with a tolerant matcher and retries while the icon
//               loads, before falling back to "unknown card".
// Version 1.11 – "Get advice" CARD recommendations now read correctly. The
//               Argine modal handler treated the card href (#card-us-gs-kd)
//               as a bid, so the Play button announced the raw "#CARD-US-GS-KD".
//               It now distinguishes card vs bid recommendations and labels the
//               Play button + advice icon with the card name (e.g. "King of
//               Diamonds"). Bid recommendations are unchanged.
// Version 1.10 – Card suits now read in the per-trick analysis text
//               (e.g. "Theoretical optimization"). Those card tokens sit in
//               a .text-gray-600 block, so the suit-icon fixer's selector was
//               broadened to all .text-nowrap card tokens, and suit detection
//               gained a keyword fallback for unmapped sprite variants.
// Version 1.9 – Results-table contracts made readable: the contract icons
//               in "Most played contracts" / "View all contracts" (rendered
//               as SVG #bid-* sprites) now get an sr-only text label
//               (e.g. "3 Spades", "2 No Trump"), and the Maximum-contract
//               grid's suit headers are labelled via the existing suit fixer.
// Version 1.8 – Video-chat buttons labelled simply: each button is named from
//               its OWN icon (mic / video / sounds), so mic and camera can no
//               longer be assigned to each other. Removed the elimination logic.
// Version 1.7 – Video-chat camera button now always gets a name: identified
//               by elimination on the user's own seat and its on/off state read
//               from the panel toggles when the button icon isn't recognized.
// Version 1.6 – Alt+X reads HCP without a direction prefix; accessible
//               names added to the video-chat mic/camera buttons (and remote
//               mute buttons), updating live as the on/off state changes.
// Version 1.5 – Robust new-deal reset: per-deal state (contract, trumps,
//               tricks, bids, turn) is now cleared reliably on every new
//               deal via collision-proof signals (played-card count drop /
//               full-hand fingerprint change), not the vulnerability+HCP key.
// Version 1.4 – Dynamic seat orientation: positions derived from the user's
//               actual compass direction instead of assuming the user is South.
// =========================================================

console.log('Funbridge Accessibility Extension V1.3 Loaded');

// =========================================================
// 1. SCREEN READER SPEAKER
// =========================================================

var liveRegion = document.createElement('div');
liveRegion.id = 'fb-a11y-live';
liveRegion.setAttribute('data-fb-a11y', '1');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
document.body.appendChild(liveRegion);

var speechQueue = [];
var isSpeaking  = false;
var SPEECH_DELAY = 650;

function speak(text) {
    if (!text) return;
    speechQueue.push(text);
    if (!isSpeaking) processSpeechQueue();
}

function speakNow(text) {
    speechQueue    = [];
    isSpeaking     = false;
    liveRegion.textContent = '';
    setTimeout(function () { liveRegion.textContent = text; }, 50);
}

function processSpeechQueue() {
    if (speechQueue.length === 0) { isSpeaking = false; return; }
    isSpeaking = true;
    var text = speechQueue.shift();
    liveRegion.textContent = '';
    setTimeout(function () {
        liveRegion.textContent = text;
        setTimeout(processSpeechQueue, SPEECH_DELAY);
    }, 50);
}

// =========================================================
// 2. CONSTANTS
// =========================================================

// Funbridge card href format: #card-us-gs-{rank}{suit}
// rank: 2-9, t=10, j=J, q=Q, k=K, a=A
// suit: s=Spade, h=Heart, d=Diamond, c=Club

var FB_RANK_TO_EN = {
    '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
    't':'10','j':'J','q':'Q','k':'K','a':'A'
};
var EN_RANK_TO_FB = {
    '2':'2','3':'3','4':'4','5':'5','6':'6','7':'7','8':'8','9':'9',
    '10':'t','J':'j','Q':'q','K':'k','A':'a'
};
var FB_SUIT_TO_LETTER = { 's':'S', 'h':'H', 'd':'D', 'c':'C' };
var SUIT_LETTER_TO_EN = { 'S':'Spade','H':'Heart','D':'Diamond','C':'Club' };
var SUIT_EN_TO_PLURAL = { 'Spade':'Spades','Heart':'Hearts','Diamond':'Diamonds','Club':'Clubs' };
var SUIT_LETTER_ORDER = ['S','H','D','C'];
var SUIT_ORDER_EN     = ['Spade','Heart','Diamond','Club'];

var CARD_RANK = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    '10':10,'J':11,'Q':12,'K':13,'A':14
};

var RANK_TO_WORD = {
    'A':'Ace', 'K':'King', 'Q':'Queen', 'J':'Jack', '10':'10'
};

function rankWord(rank) {
    return RANK_TO_WORD[rank] || rank;
}

var KEY_TO_CARD_VALUE = {
    'a':'A','k':'K','q':'Q','j':'J','t':'10',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};
var KEY_TO_SUIT = { 's':'S','h':'H','d':'D','c':'C' };
var KEY_TO_BID_STRAIN = { 'c':'C','d':'D','h':'H','s':'S','n':'N' };
var BID_STRAIN_EN = { 'C':'Club','D':'Diamond','H':'Heart','S':'Spade','N':'NT' };

var DIRECTION_EN = { 'N':'North','E':'East','S':'South','W':'West' };

var gamePhase           = 'unknown';
var cachedContract      = null;
var activeTurnDirection = null;

// =========================================================
// 3. CARD PARSING
// =========================================================

// Parse a Funbridge card from its SVG use href
// e.g. "#card-us-gs-as" → { rank:'A', suit:'S', suitEn:'Spade', key:'SA' }
function parseFunbridgeHref(href) {
    if (!href) return null;
    var m = href.match(/#card-us-gs-([2-9tjqka])([shdc])$/i);
    if (!m) return null;
    var rankChar = m[1].toLowerCase();
    var suitChar = m[2].toLowerCase();
    var rank  = FB_RANK_TO_EN[rankChar];
    var suitL = FB_SUIT_TO_LETTER[suitChar];
    if (!rank || !suitL) return null;
    return {
        rank:   rank,
        suit:   SUIT_LETTER_TO_EN[suitL],
        suitLetter: suitL,
        key:    suitL + rank,
        fbRank: rankChar,
        fbSuit: suitChar
    };
}

function getHref(useEl) {
    if (!useEl) return null;
    var h = useEl.getAttribute('href') || useEl.getAttribute('xlink:href');
    if (h) return h;
    // Varatapaukset: nimiavaruudellinen xlink ja SVGAnimatedString.baseVal,
    // jotta viite löytyy selaimesta riippumatta.
    if (useEl.getAttributeNS) {
        h = useEl.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        if (h) return h;
    }
    if (useEl.href) {
        if (typeof useEl.href === 'string') return useEl.href;
        if (useEl.href.baseVal) return useEl.href.baseVal;
    }
    return null;
}

// =========================================================
// 4. HAND READING
// =========================================================

function sortCards(cards) {
    return cards.slice().sort(function (a, b) {
        var si = SUIT_LETTER_ORDER.indexOf(a.suitLetter);
        var sj = SUIT_LETTER_ORDER.indexOf(b.suitLetter);
        if (si !== sj) return si - sj;
        return (CARD_RANK[b.rank] || 0) - (CARD_RANK[a.rank] || 0);
    });
}

function getHandCards(handClass) {
    var cards = [];
    var container = document.querySelector('.' + handClass);
    if (!container) return cards;
    container.querySelectorAll('.bridge-card-svg use').forEach(function (use) {
        var cardEl = use.closest('.bridge-card');
        // Skip cards that have already been played
        if (cardEl && cardEl.classList.contains('bridge-card-played')) return;
        var card = parseFunbridgeHref(getHref(use));
        if (card) {
            card.element = cardEl;
            cards.push(card);
        }
    });
    return sortCards(cards);
}

function getUserHand()  { return getHandCards('cards-hand-BOTTOM'); }

function getDummyHand() {
    // Ensin etsitään cards-hand-dummy -luokalla merkitty käsi.
    // HUOM: BOTTOM jätetään tarkoituksella pois tästä listasta. Jos käyttäjä on
    // itse lepääjä (dummy on BOTTOM), Funbridge antaa käyttäjän silti pelata
    // pelinviejän (yleensä TOP) kortteja robotin puolesta - "dummy"-komentojen
    // (Alt+Q/W/E/R) pitää siis lukea se toinen ohjattava käsi, ei omaa kättä
    // uudelleen. Fallback TOP:iin hoitaa tämän tapauksen oikein.
    var dummyEl = document.querySelector('.cards-hand-dummy');
    if (dummyEl) {
        // Selvitä mikä positio tämä on
        var pos = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT'];
        for (var i = 0; i < pos.length; i++) {
            if (dummyEl.classList.contains(pos[i])) {
                var cards = getHandCards(pos[i]);
                if (cards.length > 0) return cards;
            }
        }
    }
    // Fallback: yritetään TOP suoraan
    return getHandCards('cards-hand-TOP');
}

function getDummyHandClass() {
    // Sama huomio kuin getDummyHand()issa: BOTTOM jätetään pois tarkoituksella.
    var dummyEl = document.querySelector('.cards-hand-dummy');
    if (dummyEl) {
        var pos = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT'];
        for (var i = 0; i < pos.length; i++) {
            if (dummyEl.classList.contains(pos[i])) return pos[i];
        }
    }
    return 'cards-hand-TOP'; // fallback
}

// =========================================================
// 5. DIRECTION DETECTION
// =========================================================

function getUserDirection() {
    var el = document.querySelector('.seat-bottom .seat-position span');
    if (el) {
        var t = el.textContent.trim().toUpperCase();
        if ('NESW'.indexOf(t) !== -1) return t;
    }
    return 'S'; // Funbridge default: user is always South
}

function getNextDirection(dir) {
    var dirs = ['N','E','S','W'];
    var idx  = dirs.indexOf(dir);
    return idx === -1 ? null : dirs[(idx + 1) % 4];
}

// Funbridge rotates the whole table so the user always sits at the BOTTOM,
// with partner at TOP and the opponents on the sides. The user's *actual*
// compass direction comes from getUserDirection(); the other three follow
// clockwise (bridge play order N→E→S→W):
//   BOTTOM = user, LEFT = LHO (plays next), TOP = partner, RIGHT = RHO.
function getTrickPositionToDirection() {
    var me    = getUserDirection();
    var lho   = getNextDirection(me);          // plays after me
    var partner = getNextDirection(lho);       // opposite me
    var rho   = getNextDirection(partner);     // plays before me
    return { bottom: me, left: lho, top: partner, right: rho };
}

// Position-class → actual compass direction, derived from the user's seat.
function getHandClassToDir() {
    var p = getTrickPositionToDirection();
    return {
        'cards-hand-BOTTOM': p.bottom,
        'cards-hand-LEFT':   p.left,
        'cards-hand-TOP':    p.top,
        'cards-hand-RIGHT':  p.right
    };
}

// =========================================================
// 6. CLICK SIMULATION
// =========================================================

function simulateClick(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;
    var down = { bubbles:true, cancelable:true, view:window,
                 clientX:cx, clientY:cy, screenX:cx, screenY:cy, button:0, buttons:1 };
    var up   = Object.assign({}, down, { buttons:0 });
    var noBtn = Object.assign({}, down, { button:0, buttons:0 });

    el.dispatchEvent(new PointerEvent('pointerover',  noBtn));
    el.dispatchEvent(new MouseEvent ('mouseover',     noBtn));
    el.dispatchEvent(new PointerEvent('pointerenter', noBtn));
    el.dispatchEvent(new PointerEvent('pointerdown',  down));
    el.dispatchEvent(new MouseEvent ('mousedown',     down));
    el.dispatchEvent(new PointerEvent('pointerup',    up));
    el.dispatchEvent(new MouseEvent ('mouseup',       up));
    el.dispatchEvent(new MouseEvent ('click',         up));
    el.focus();
    return true;
}

// =========================================================
// 7. TURN / ALLOWED HAND RESOLVER
// =========================================================

// Returns 'mine' | 'dummy' | 'both' | 'none'
//
// Funbridge marks individually playable cards with bridge-card-active.
// We check which hands have at least one bridge-card-active card.
// cards-hand-active on the container is NOT reliable (multiple hands active at once).

function handHasActiveCard(handClass) {
    var container = document.querySelector('.' + handClass);
    if (!container) return false;
    return !!container.querySelector('.bridge-card.bridge-card-active');
}

function resolveAllowedHand() {
    var dummyClass   = getDummyHandClass();
    var bottomActive = handHasActiveCard('cards-hand-BOTTOM');
    var dummyActive  = handHasActiveCard(dummyClass);

    // Trust Funbridge's own bridge-card-active markers.
    // Dummy may be TOP, LEFT or RIGHT depending on who is declarer.

    if (bottomActive && dummyActive) {
        var myDir = getUserDirection();
        if (activeTurnDirection && myDir) {
            var partnerDir = getNextDirection(getNextDirection(myDir));
            if (activeTurnDirection === myDir)      return 'mine';
            if (activeTurnDirection === partnerDir) return 'dummy';
        }
        return 'dummy';
    }

    if (dummyActive)  return 'dummy';
    if (bottomActive) return 'mine';
    return 'none';
}

// =========================================================
// 8. SUIT-FOLLOWING HELPERS
// =========================================================

function getTrickLeadSuit() {
    var trick = currentTrick.length > 0 ? currentTrick
              : sortTrickChronologically(readCurrentTrickCards());
    if (trick.length === 0 || trick.length === 4) return null;
    if (trick[0].unknown || !trick[0].suit) return null; // ei tiedossa
    var leadSuitEn = trick[0].suit;
    for (var sl in SUIT_LETTER_TO_EN) {
        if (SUIT_LETTER_TO_EN[sl] === leadSuitEn) return sl;
    }
    return null;
}

function handHasSuit(hand, suitLetter) {
    var suitEn = SUIT_LETTER_TO_EN[suitLetter];
    return hand.some(function (c) { return c.suit === suitEn; });
}

function mustFollowSuit(playingSuitLetter, allowedHand) {
    var leadSuit = getTrickLeadSuit();
    if (!leadSuit) return null;
    if (leadSuit === playingSuitLetter) return null;
    var hand = allowedHand === 'dummy' ? getDummyHand() : getUserHand();
    if (handHasSuit(hand, leadSuit)) return leadSuit;
    return null;
}

// =========================================================
// 9. TRICK WINNER EVALUATION
// =========================================================

function evaluateWinner(cards, trumpSuit) {
    if (!cards || cards.length === 0) return null;
    // Jos tikissä on "unknown"-merkitty paikkamerkki (laajennus käynnistyi
    // kesken tämän tikin eikä tiedä sen korttia), voittajaa ei voi päätellä
    // luotettavasti - älä arvaa.
    if (cards.some(function (c) { return c.unknown; })) return null;
    var winner = cards[0];
    for (var i = 1; i < cards.length; i++) {
        var c = cards[i];
        var isTrump      = trumpSuit && c.suit === SUIT_LETTER_TO_EN[trumpSuit];
        var winnerIsTrump = trumpSuit && winner.suit === SUIT_LETTER_TO_EN[trumpSuit];
        if (isTrump && !winnerIsTrump) {
            winner = c;
        } else if (c.suit === winner.suit) {
            if ((CARD_RANK[c.rank] || 0) > (CARD_RANK[winner.rank] || 0)) winner = c;
        }
    }
    return winner.direction;
}

// =========================================================
// 10. PLAYING A CARD
// =========================================================

function playExtreme(direction) {
    if (!isPlayPhase()) return;
    var trickNow = currentTrick.length > 0 ? currentTrick
                 : sortTrickChronologically(readCurrentTrickCards());

    if (trickNow.length === 0) { speakNow('No trick in progress. Use suit key to lead.'); return; }
    if (trickNow.length === 4) { speakNow('Trick complete. Use suit key to lead.'); return; }

    var allowedHand = resolveAllowedHand();
    if (allowedHand === 'none') { speakNow('Not your turn.'); return; }

    var leadSuit = getTrickLeadSuit();
    if (!leadSuit) {
        speakNow('Required suit unknown (extension restarted mid-trick). Use suit key, e.g. S then a value.');
        return;
    }
    var leadSuitEn = SUIT_LETTER_TO_EN[leadSuit];
    var hand       = allowedHand === 'dummy' ? getDummyHand() : getUserHand();

    var candidates = hand.filter(function (c) { return c.suit === leadSuitEn; });
    if (candidates.length === 0) {
        speakNow('No ' + leadSuitEn + ' in hand. Use suit key to discard.');
        return;
    }

    var sorted = candidates.slice().sort(function (a, b) {
        return (CARD_RANK[a.rank] || 0) - (CARD_RANK[b.rank] || 0);
    });
    var chosen = direction === 'low' ? sorted[0] : sorted[sorted.length - 1];
    playCard(chosen.suitLetter, chosen.rank);
}

function playCard(suitLetter, rank) {
    var suitEn = SUIT_LETTER_TO_EN[suitLetter] || suitLetter;

    var allowedHand = resolveAllowedHand();
    if (allowedHand === 'none') { speakNow('Not your turn.'); return; }

    var requiredSuit = mustFollowSuit(suitLetter, allowedHand);
    if (requiredSuit) {
        var reqEn = SUIT_LETTER_TO_EN[requiredSuit] || requiredSuit;
        var who   = allowedHand === 'dummy' ? 'Dummy has' : 'You have';
        speakNow('Must follow suit. ' + who + ' ' + reqEn + '.');
        return;
    }

    // Build target href
    var fbRank  = EN_RANK_TO_FB[rank] || rank.toLowerCase();
    var fbSuit  = suitLetter.toLowerCase();
    var targetHref = '#card-us-gs-' + fbRank + fbSuit;

    var clicked = false;

    // Try own hand
    if (allowedHand === 'mine' || allowedHand === 'both') {
        var bottomCont = document.querySelector('.cards-hand-BOTTOM');
        if (bottomCont) {
            var use = bottomCont.querySelector('use[href="' + targetHref + '"], use[xlink\\:href="' + targetHref + '"]');
            if (!use) {
                // Fallback: iterate
                bottomCont.querySelectorAll('use').forEach(function (u) {
                    if (!use && getHref(u) === targetHref) use = u;
                });
            }
            if (use) { simulateClick(use.closest('.bridge-card')); clicked = true; }
        }
    }

    // Try dummy hand
    if (!clicked && (allowedHand === 'dummy' || allowedHand === 'both')) {
        var dummyCont = document.querySelector('.' + getDummyHandClass());
        if (dummyCont) {
            var useD = null;
            dummyCont.querySelectorAll('use').forEach(function (u) {
                if (!useD && getHref(u) === targetHref) useD = u;
            });
            if (useD) { simulateClick(useD.closest('.bridge-card')); clicked = true; }
        }
    }

    if (clicked) {
        speakNow(suitEn + ' ' + rankWord(rank) + ' played.');
    } else {
        var where = allowedHand === 'dummy' ? 'dummy' : (allowedHand === 'mine' ? 'your hand' : 'hand or dummy');
        speakNow('No ' + suitEn + ' ' + rankWord(rank) + ' in ' + where + '.');
    }
}

// =========================================================
// 11. BIDDING
// =========================================================

// Bid button IDs: #BID-{LEVEL}{STRAIN}-TABLE-CENTER
// where STRAIN ∈ {C,D,H,S,N}
// Pass: #BID-PA-TABLE-CENTER (also PA0, PA1 variants)
// Double: #BID-X1-TABLE-CENTER
// Redouble: #BID-X2-TABLE-CENTER

function submitBid(level, strain) {
    var bidId = 'BID-' + level + strain.toUpperCase() + '-TABLE-CENTER';
    var btn   = document.getElementById(bidId);
    var strainEn = BID_STRAIN_EN[strain.toUpperCase()] || strain;
    if (!btn) { speakNow('Bid ' + level + ' ' + strainEn + ' not available.'); return; }
    simulateClick(btn);
    speakNow('Bid: ' + level + ' ' + strainEn + '.');
}

function submitPass() {
    var btn = document.getElementById('BID-PA-TABLE-CENTER')
           || document.getElementById('BID-PA0-TABLE-CENTER')
           || document.getElementById('BID-PA1-TABLE-CENTER');
    if (!btn) { speakNow('Pass not available.'); return; }
    simulateClick(btn);
    speakNow('Pass.');
}

function submitDouble() {
    var x1 = document.getElementById('BID-X1-TABLE-CENTER');
    var x2 = document.getElementById('BID-X2-TABLE-CENTER');
    
    // Funbridge merkitsee sallitut/aktiiviset tarjoukset 'bid-hover' -luokalla
    var isX1Active = x1 && x1.classList.contains('bid-hover');
    var isX2Active = x2 && x2.classList.contains('bid-hover');
    
    var btn = null;
    
    // Redouble (x2) on etusijalla vain, jos se on aidosti aktiivinen
    if (isX2Active) {
        btn = x2;
    } else if (isX1Active) {
        btn = x1;
    }
    
    if (!btn) { 
        speakNow('Double not available.'); 
        return; 
    }
    
    var label = (btn.id.indexOf('X2') !== -1) ? 'Redouble.' : 'Double.';
    simulateClick(btn);
    speakNow(label);
}

function isElementVisible(el) {
    if (!el) return false;
    var style = window.getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
}

// =========================================================
// 12. DOUBLE-KEY STATE MACHINE
// =========================================================

var pendingInput       = null;
var inputTimeoutHandle = null;
var INPUT_TIMEOUT_MS   = 5000;

function setInputTimeout() {
    clearInputTimeout();
    inputTimeoutHandle = setTimeout(function () {
        if (pendingInput !== null) { pendingInput = null; speakNow('Timeout, input cancelled.'); }
    }, INPUT_TIMEOUT_MS);
}

function clearInputTimeout() {
    if (inputTimeoutHandle) { clearTimeout(inputTimeoutHandle); inputTimeoutHandle = null; }
}

function cancelPendingInput() {
    clearInputTimeout();
    pendingInput = null;
    speakNow('Cancelled.');
}

function handleFirstKey(key, blockFn) {
    if (KEY_TO_SUIT[key] && isPlayPhase()) {
        blockFn();
        var chosenSuit = KEY_TO_SUIT[key];
        pendingInput = { type:'card', suit:chosenSuit };
        setInputTimeout();

        var leadSuit = getTrickLeadSuit();
        if (leadSuit && leadSuit !== chosenSuit) {
            var ah = resolveAllowedHand();
            var warnHand = ah === 'dummy' ? getDummyHand() : getUserHand();
            if (handHasSuit(warnHand, leadSuit)) {
                speakNow(SUIT_LETTER_TO_EN[chosenSuit] + '? Warning: must follow ' + SUIT_LETTER_TO_EN[leadSuit] + '.');
                return true;
            }
        }
        speakNow(SUIT_LETTER_TO_EN[chosenSuit] + '?');
        return true;
    }
    if (key >= '1' && key <= '7' && isBiddingPhase()) {
        blockFn();
        pendingInput = { type:'bid', level:key };
        setInputTimeout();
        speakNow('Level ' + key + '?');
        return true;
    }
    if (key === 'p' && isBiddingPhase()) { blockFn(); submitPass();   return true; }
    if (key === 'x' && isBiddingPhase()) { blockFn(); submitDouble(); return true; }
    return false;
}

function handleSecondKey(key) {
    clearInputTimeout();

    if (pendingInput.type === 'card') {
        if (KEY_TO_SUIT[key]) {
            pendingInput.suit = KEY_TO_SUIT[key];
            setInputTimeout();
            var leadSuit2 = getTrickLeadSuit();
            if (leadSuit2 && leadSuit2 !== pendingInput.suit) {
                var ah2 = resolveAllowedHand();
                var warnHand2 = ah2 === 'dummy' ? getDummyHand() : getUserHand();
                if (handHasSuit(warnHand2, leadSuit2)) {
                    speakNow(SUIT_LETTER_TO_EN[pendingInput.suit] + '? Warning: must follow ' + SUIT_LETTER_TO_EN[leadSuit2] + '.');
                    return;
                }
            }
            speakNow(SUIT_LETTER_TO_EN[pendingInput.suit] + '?');
            return;
        }
        var value = KEY_TO_CARD_VALUE[key];
        if (value) {
            var suit = pendingInput.suit;
            pendingInput = null;
            playCard(suit, value);
            return;
        }
        speakNow('Unknown value. ' + SUIT_LETTER_TO_EN[pendingInput.suit] + '?');
        setInputTimeout();
        return;
    }

    if (pendingInput.type === 'bid') {
        if (key >= '1' && key <= '7') {
            pendingInput.level = key;
            setInputTimeout();
            speakNow('Level ' + key + '?');
            return;
        }
        var strain = KEY_TO_BID_STRAIN[key];
        if (strain) {
            var level = pendingInput.level;
            pendingInput = null;
            submitBid(level, strain);
            return;
        }
        speakNow('Unknown suit. Level ' + pendingInput.level + '?');
        setInputTimeout();
        return;
    }
}

// =========================================================
// 13. CURRENT TRICK READING
// =========================================================
// During play phase, Funbridge animates played cards from hand to center.
// Cards played to the trick leave the .cards-hand-* containers.
// We detect trick cards as .bridge-card elements in .table-center
// that are NOT inside a .cards-hand-* container.

// Funbridge keeps played cards inside their original hand containers
// and marks them with class bridge-card-played.
// Direction is determined by which cards-hand-* container the card is in.
// NOTE: the mapping is built dynamically via getHandClassToDir() from the
// user's actual seat — the user is NOT always South.

// readCurrentTrickCards returns ALL bridge-card-played elements –
// including cards from previous tricks. We use element IDs to track
// exactly which cards belong to the current trick.

function readAllPlayedCards() {
    var result = [];
    var handClassToDir = getHandClassToDir();
    document.querySelectorAll('.bridge-card.bridge-card-played').forEach(function (cardEl) {
        var useEl = cardEl.querySelector('.bridge-card-svg use');
        var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
        if (!card) return;
        var dir = null;
        for (var cls in handClassToDir) {
            if (cardEl.closest('.' + cls)) { dir = handClassToDir[cls]; break; }
        }
        if (!dir) return;
        result.push({
            id: cardEl.id,
            direction: dir, directionEn: DIRECTION_EN[dir] || dir,
            suit: card.suit, rank: card.rank, key: card.key
        });
    });
    return result;
}

// readCurrentTrickCards: returns only the 4 (or fewer) cards of the current trick
// by tracking which element IDs we have already accounted for.
function readCurrentTrickCards() {
    var all = readAllPlayedCards();
    // Filter to only cards whose ID is in currentTrickIds
    return all.filter(function (c) { return currentTrickIds[c.id]; });
}

function trickSnapshot(cards) {
    return cards.map(function (c) { return c.direction + ':' + c.key; }).sort().join('|');
}

function sortTrickChronologically(cards) {
    if (cards.length <= 1) return cards.slice();
    var dirToIdx = { 'N':0,'E':1,'S':2,'W':3 };
    var idxToDir = ['N','E','S','W'];
    var present  = {};
    cards.forEach(function (c) { present[c.direction] = c; });

    var leaderDir = null;
    for (var i = 0; i < cards.length; i++) {
        var c    = cards[i];
        var myI  = dirToIdx[c.direction];
        var ccwI = (myI + 3) % 4;
        if (!present[idxToDir[ccwI]]) { leaderDir = c.direction; break; }
    }
    if (!leaderDir) return cards.slice();

    var sorted   = [];
    var startIdx = dirToIdx[leaderDir];
    for (var j = 0; j < 4; j++) {
        var dir = idxToDir[(startIdx + j) % 4];
        if (present[dir]) sorted.push(present[dir]);
    }
    return sorted;
}

var previousPlayedIds    = {};  // id → true, all ever-played card IDs seen
var currentTrickIds      = {};  // id → true, only current trick
var currentTrick         = [];
var previousTrickSnapshot = '';

// Alustaa tikin seuranta tilan DOMin nykyisestä tilanteesta ILMAN ilmoituksia.
// Kutsutaan init/reset-tilanteessa kun kortteja on jo pelattu.
// Logiikka: käsi jolla on eniten bridge-card-played -kortteja on aloittanut
// nykyisen tikin. Ne ylimääräiset kortit ovat nykyisessä tikissä.
// Alustaa tikin seuranta tilan DOMin nykyisestä tilanteesta ILMAN ilmoituksia.
// Kutsutaan init/reset-tilanteessa kun kortteja on jo pelattu.
//
// HUOM (tärkeä korjaus): Funbridge listaa käden kortit AINA maan/arvon mukaan
// järjestettynä (esim. pata, hertta, risti, ruutu), EI pelijärjestyksessä.
// Siksi "viimeisin kortti DOM-järjestyksessä per suunta" ei kerro mitään siitä,
// mikä kortti pelattiin viimeksi - se voi yhtä hyvin olla monta tikkiä sitten
// pelattu kortti, joka vain sattuu olemaan maansa vuoksi listan lopussa.
// Tästä seurasi, että esim. Alt+M-nollauksen jälkeen laajointa saattoi luulla
// vaadituksi maaksi jonkin aivan eri (jo pelatun) maan.
//
// Korjattu logiikka käyttää sen sijaan sivupalkin "Last trick" -laatikkoa:
// verrataan kunkin ylimäärää pelanneen suunnan (nykyiseen tikkiin osallistuneen)
// korttien maita viimeisimmän VALMIIN tikin maihin. Maa, jota ei enää löydy
// vastinetta valmiista tikistä, on todennäköisesti kesken olevan tikin kortti.
function initTrickStateFromDOM() {
    var allPlayed = readAllPlayedCards();

    // Merkitse KAIKKI jo pelatut kortit nähdyiksi. Tämä on kriittistä: ilman
    // tätä detectTrickChanges() luulisi seuraavalla live-päivityksellään koko
    // jaon tähänastista pelihistoriaa "juuri pelatuksi" ja kävisi sen läpi
    // DOM-järjestyksessä (joka ei ole pelijärjestys) - sekoittaen tikkiseurannan
    // täysin ja tuottaen vääriä "tikki voitolle X" -ilmoituksia.
    allPlayed.forEach(function (c) { previousPlayedIds[c.id] = true; });

    // Laske per suunta montako played-korttia
    var counts = { N:0, E:0, S:0, W:0 };
    allPlayed.forEach(function (c) { if (counts[c.direction] !== undefined) counts[c.direction]++; });

    var maxCount = Math.max(counts.N, counts.E, counts.S, counts.W);
    var minCount = Math.min(counts.N, counts.E, counts.S, counts.W);

    currentTrick    = [];
    currentTrickIds = {};

    if (maxCount === minCount) {
        // Kaikilla sama määrä: tikki juuri päättynyt tai ei aloitettu
        return;
    }

    var dirs  = ['N', 'E', 'S', 'W'];
    var byDir = { N: [], E: [], S: [], W: [] };
    allPlayed.forEach(function (c) { if (byDir[c.direction]) byDir[c.direction].push(c); });

    // HUOM (tärkeä periaate): Funbridge listaa käden kortit maan/arvon mukaan
    // järjestettynä, EI pelijärjestyksessä. Jos jollain suunnalla on useampi
    // kuin yksi pelattu kortti (minCount > 0, eli jaossa on jo pelattu
    // ainakin yksi kokonainen tikki), ei ole luotettavaa DOM-signaalia sen
    // selvittämiseen KUMPI noista korteista kuuluu juuri nyt kesken olevaan
    // tikkiin. Sitä EI arvata (aiemmat yritykset - DOM-järjestys, "Last
    // trick"-sivupalkin täsmäytys - osoittautuivat epäluotettaviksi).
    //
    // MUTTA: jokin kortti pitää silti merkitä currentTrickiin JOKAISELLE
    // suunnalle joka on jo pelannut tähän tikkiin (counts[d] > minCount),
    // jotta tikin PITUUS ja tikkirajan tunnistus (dirAlreadyInTrick)
    // pysyvät oikeina koko lopun jaon ajan. Jos näin ei tehtäisi, seuraava
    // oikeasti pelattava kortti tulkittaisiin virheellisesti UUDEN tikin
    // aluksi, vaikka se onkin tämän kesken olevan tikin jatko - ja virhe
    // kertautuisi jokaiseen sitä seuraavaan tikkiin.
    //
    // Siksi käytetään "unknown"-paikkamerkkiä: suunta ja oikea DOM-id ovat
    // tiedossa (jotta detectTrickChanges() tunnistaa direction-kohtaisen
    // kaksoiskappaleen oikein), mutta maa/arvo merkitään tuntemattomaksi.
    // getTrickLeadSuit() palauttaa tällöin null tälle YHDELLE tikille, eikä
    // laajennus arvaa vaadittua maata väärin - se kertoo sen olevan
    // tuntematon ja neuvoo käyttämään maa+arvo-näppäimiä.
    //
    // Ainoa tilanne jossa oikea kortti tiedetään varmasti on jaon
    // ENSIMMÄINEN tikki (minCount === 0): silloin jokaisella "ylimäärää"
    // pelanneella suunnalla on tasan yksi pelattu kortti, joten epäselvyyttä
    // ei voi olla.
    var filtered = [];
    dirs.forEach(function (d) {
        if (counts[d] <= minCount) return;
        if (minCount === 0) {
            filtered.push(byDir[d][byDir[d].length - 1]);
        } else {
            var realCard = byDir[d][byDir[d].length - 1];
            filtered.push({
                id: realCard.id, direction: d, directionEn: DIRECTION_EN[d] || d,
                suit: null, rank: null, key: null, unknown: true
            });
        }
    });

    currentTrick    = filtered;
    currentTrickIds = {};
    currentTrick.forEach(function (c) { currentTrickIds[c.id] = true; });
}

function detectTrickChanges() {
    var allPlayed = readAllPlayedCards();

    // Etsi vain uudet kortit (ei vielä rekisteröity)
    var newlyPlayed = allPlayed.filter(function (c) { return !previousPlayedIds[c.id]; });
    newlyPlayed.forEach(function (c) { previousPlayedIds[c.id] = true; });

    if (newlyPlayed.length === 0) return;

    // Jos kortteja on pelattu, olemme varmasti pelivaiheessa
    if (gamePhase !== 'play') {
        gamePhase = 'play';
        playPhaseConfirmCount = PLAY_PHASE_CONFIRM_NEEDED;
    }

    // TÄRKEÄÄ: prosessoi kortit DOM-järjestyksessä, mutta käytä bridgelogiikkaa
    // tikkirajan tunnistamiseen. Jokainen suunta (N/E/S/W) esiintyy tikissä
    // TASAN KERRAN. Jos tuleva kortti on suunnalta joka on jo tikissä,
    // se kuuluu SEURAAVAAN tikkiin – riippumatta DOM-järjestyksestä.
    // Tämä korjaa tilanteen jossa Argine pelaa välittömästi tikin jälkeen
    // ja uuden tikin ensimmäinen kortti tulee DOM:ssa ennen tikin viimeistä.

    newlyPlayed.forEach(function (c) {
        var dirAlreadyInTrick = currentTrick.some(function (t) {
            return t.direction === c.direction;
        });

        // Aloita uusi tikki jos:
        // a) nykyinen tikki on täynnä (4 korttia), TAI
        // b) tämä suunta on jo tikissä (bridge-logiikka)
        if (currentTrick.length >= 4 || dirAlreadyInTrick) {
            if (currentTrick.length === 4 || (dirAlreadyInTrick && currentTrick.length > 0)) {
                var trump = (cachedContract && cachedContract.strain !== 'N') ? cachedContract.strain : null;
                var winner = evaluateWinner(currentTrick, trump);
                if (winner) {
                    activeTurnDirection = winner;
                }
            }
            currentTrick    = [];
            currentTrickIds = {};
        }

        currentTrickIds[c.id] = true;
        currentTrick.push(c);
        speak((DIRECTION_EN[c.direction] || c.direction) + ': ' + c.suit + ' ' + rankWord(c.rank));
        activeTurnDirection = getNextDirection(c.direction);
        // Päivitä F2-painikkeet jos tila on päällä
        if (cardButtonMode) setTimeout(refreshCardButtons, 400);
    });

    // Jos tikki täyttyi tässä kierroksessa (ei ylivuotoa), ilmoita voittaja
    if (currentTrick.length === 4) {
        var ct     = getOrBuildCachedContract();
        var trump2 = (ct && ct.strain !== 'N') ? ct.strain : null;
        var w2     = evaluateWinner(currentTrick, trump2);
        if (w2) {
            activeTurnDirection = w2;
            speak('trick to ' + (DIRECTION_EN[w2] || w2));
        }
    }

    previousTrickSnapshot = trickSnapshot(readAllPlayedCards());
}

// =========================================================
// 14. TRICK COUNT
// =========================================================

function readTrickCount() {
    // Rakenne vaihtelee puolustajan ja pelinviejän välillä:
    //   Puolustaja: <div.flex-row-reverse.text-orange>
    //               <div.text-end><span>NS</span>"5"</div>
    //               <div.text-start><span>EW</span>"4"</div>
    //   Pelinviejä: <div.d-flex.flex-row.text-orange>
    //               <div.text-start><span>NS</span>"0 /13"</div>
    //               <div.text-end><span>EW</span>"0"</div>
    //
    // Ei luoteta flex-row/flex-row-reverse- eikä text-start/text-end-luokkiin.
    // Tunnistetaan NS- ja EW-elementit lukemalla span-teksti.
    var container = document.querySelector('.text-orange');
    if (container) {
        var nsEl = null, ewEl = null;
        container.querySelectorAll('div').forEach(function (div) {
            var span = div.querySelector('span');
            if (!span) return;
            var label = span.textContent.trim().toUpperCase();
            if (label === 'NS') nsEl = div;
            else if (label === 'EW') ewEl = div;
        });
        if (nsEl && ewEl) {
            function getNumberAfterSpan(el) {
                // Haetaan ensimmäinen ei-tyhjä tekstisolmu (span:n jälkeen)
                var nodes = el.childNodes;
                for (var i = 0; i < nodes.length; i++) {
                    if (nodes[i].nodeType === 3) {
                        var t = nodes[i].textContent.trim();
                        if (t) return t.split('/')[0].trim().replace(/[^0-9]/g, '');
                    }
                }
                // Fallback: poista span-teksti ja ota numerot
                return (el.textContent || '').replace(/NS|EW/gi, '')
                                             .replace(/[^0-9]/g, '') || '0';
            }
            var nsTricks = getNumberAfterSpan(nsEl) || '0';
            var ewTricks = getNumberAfterSpan(ewEl) || '0';
            var myDir    = getUserDirection();
            var iAmNS    = (myDir === 'N' || myDir === 'S');
            speakNow('We: ' + (iAmNS ? nsTricks : ewTricks) +
                     ', they: ' + (iAmNS ? ewTricks : nsTricks) + ' tricks.');
            return;
        }
    }
    // Fallback: laske jäljellä olevista korteista
    var remaining = getUserHand().length;
    speakNow((13 - remaining) + ' tricks played. ' + remaining + ' cards remaining.');
}

// =========================================================
// 15. PHASE DETECTION
// =========================================================

function isBiddingPhase() {
    // Tarjousvaihe: tarjouslaatikko on näkyvissä ja sisältää klikattavia nappeja.
    var bidsContainer = document.querySelector('.table-center-bids');
    if (!bidsContainer) return false;
    var style = window.getComputedStyle(bidsContainer);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return !!bidsContainer.querySelector('.bid.bid-hover');
}

function isPlayPhase() {
    if (isBiddingPhase()) return false;
    // Jos pelivaihe on jo todettu, palautetaan true heti ilman DOM-tarkistusta.
    // Tämä varmistaa, että näppäinkomennot toimivat välittömästi tarjouslaatikon
    // häviämisen jälkeen, ennen kuin lepääjän käsi ehtii ilmestyä näkyviin.
    if (gamePhase === 'play') return true;
    // Pelivaihe: jokin käsi (mikä tahansa, myös BOTTOM) saa cards-hand-dummy -luokan.
    // Lepääjä voi olla mikä tahansa ilmansuunta, myös käyttäjän oma paikka (BOTTOM).
    var dummyCls = ['cards-hand-TOP','cards-hand-LEFT','cards-hand-RIGHT','cards-hand-BOTTOM'];
    for (var i = 0; i < dummyCls.length; i++) {
        var el = document.querySelector('.' + dummyCls[i]);
        if (el && el.classList.contains('cards-hand-dummy')) return true;
    }
    // Lead-tilanne: tarjouslaatikko poissa, oma käsi fan-muodossa aktiivisena
    var bottomHand = document.querySelector('.cards-hand-BOTTOM');
    if (bottomHand && bottomHand.classList.contains('cards-hand-fan') &&
        bottomHand.classList.contains('cards-hand-active')) return true;
    return false;
}

// Vaaditaan N peräkkäistä isPlayPhase()-vahvistusta ennen siirtymäilmoitusta
var playPhaseConfirmCount = 0;
var PLAY_PHASE_CONFIRM_NEEDED = 1;

function updateGamePhase() {
    var isBidding = isBiddingPhase();
    var isPlay    = isPlayPhase();

    if (isBidding) {
        playPhaseConfirmCount = 0;
        if (gamePhase !== 'bidding') gamePhase = 'bidding';
        return;
    }

    if (isPlay) {
        playPhaseConfirmCount++;
        if (playPhaseConfirmCount >= PLAY_PHASE_CONFIRM_NEEDED && gamePhase !== 'play') {
            var wasUnknown = (gamePhase === 'unknown');
            gamePhase = 'play';
            var contractForLead = getOrBuildCachedContract();
            if (contractForLead && contractForLead.declarer) {
                activeTurnDirection = getNextDirection(contractForLead.declarer);
            }
            if (!wasUnknown) {
                var contractText = readContractDisplay();
                speak(contractText ? 'Bidding ended. Contract: ' + contractText + '.'
                                   : 'Bidding ended. Play phase starts.');
            }
            // Päivitä F2-painikkeet jos tila on päällä – lepääjän käsi tuli nyt näkyviin
            if (cardButtonMode) setTimeout(refreshCardButtons, 500);
        }
    } else {
        playPhaseConfirmCount = 0;
    }
}

// =========================================================
// 16. BID HISTORY READING
// =========================================================
// Auction box in sidebar: .auction-box
// Column headers: .auction-box-title span → S, W, N, E
// Bid rows: .overflow-auto .row (each row has 4 .col.d-grid)
// Bid element ID: BID-{CODE}-{INDEX}-AUCTION-BOX-GAME_SIDEBAR

function parseFunbridgeBidCode(code) {
    if (!code) return null;
    // ID-muoto: BID-{KOODI}{SARAKEINDEKSI}-{RIVIINDEKSI}-AUCTION-BOX
    // esim. PA0, PA1, 2S1, 1N3, X10, X21
    // Poistetaan loppunumero ennen tulkintaa
    var c = code.replace(/\d+$/, '').toUpperCase();
    if (c === 'PA')  return { raw:'Pass',  en:'Pass'      };
    if (c === 'X2')  return { raw:'XX',    en:'Redouble'  };
    if (c === 'X1')  return { raw:'X',     en:'Double'    };
    if (c === 'X')   return { raw:'X',     en:'Double'    };
    var m = c.match(/^([1-7])([NSHDC]{1,2})$/);
    if (m) {
        var strain = m[2] === 'NT' ? 'N' : m[2];
        return { raw: m[1] + strain, en: m[1] + ' ' + (BID_STRAIN_EN[strain] || strain) };
    }
    return null;
}

function readAllBids() {
    var box = document.querySelector('.auction-box');
    if (!box) return [];

    // Suuntajärjestys otsikoista (S W N E tms.)
    var dirs = [];
    box.querySelectorAll('.auction-box-title span').forEach(function (s) {
        var t = s.textContent.trim().toUpperCase();
        if (t === 'N' || t === 'E' || t === 'S' || t === 'W') dirs.push(t);
    });
    if (dirs.length !== 4) return [];

    var overflowEl = box.querySelector('.overflow-auto');
    if (!overflowEl) return [];

    // ID-rakenne: BID-{KOODI}{SEQNUM}-{OCCURRENCE}-AUCTION-BOX-GAME_SIDEBAR
    // esim. BID-PA2-0  → koodi=PA, seqNum=2, occurrence=0
    //       BID-4S5-1  → koodi=4S, seqNum=5, occurrence=1
    // SEQNUM on kronologinen järjestysnumero koko huutokaupassa.
    // Sarakeindeksi (colIdx) kertoo suunnan: dirs[colIdx].
    // Yhdessä sarakkeessa voi olla useita tarjouksia (useammalla rivillä).
    // Haetaan KAIKKI bid-elementit jokaisesta sarakkeesta ja järjestetään seqNum mukaan.

    var collected = [];

    overflowEl.querySelectorAll('.row').forEach(function (row) {
        var cols = row.querySelectorAll('.col.d-grid');
        if (cols.length === 0) return;
        cols.forEach(function (col, colIdx) {
            if (colIdx >= dirs.length) return;
            // querySelectorAll – kaikki tarjoukset tässä sarakkeessa
            col.querySelectorAll('[id*="AUCTION-BOX"]').forEach(function (bidEl) {
                var id = bidEl.id || '';
                var m  = id.match(/^BID-([A-Z0-9]+?)-(\d+)-AUCTION-BOX/i);
                if (!m) return;
                var codeWithSeq = m[1];   // esim. "PA0", "1C2", "X14", "X21"
                // Irrotetaan koodi ja seqNum. X1 (Double) ja X2 (Redouble) päättyvät
                // itse numeroon, joten ne täytyy tunnistaa ennen yleistä loppunumero-
                // logiikkaa – muuten "X14" tulkitaan koodiksi X + seqNum 14 eikä
                // koodiksi X1 + seqNum 4.
                var codeSeqMatch = codeWithSeq.match(/^(PA|X[12]|[1-7][A-Za-z]{1,2})(\d+)$/i);
                if (!codeSeqMatch) return;
                var seqNum = parseInt(codeSeqMatch[2], 10);
                var parsed = parseFunbridgeBidCode(codeSeqMatch[1]);
                if (!parsed) return;
                collected.push({
                    seqNum:      seqNum,
                    colIdx:      colIdx,
                    direction:   dirs[colIdx],
                    directionEn: DIRECTION_EN[dirs[colIdx]] || dirs[colIdx],
                    raw:         parsed.raw,
                    translation: parsed.en
                });
            });
        });
    });

    // Järjestä kronologisesti seqNum-numeron mukaan
    collected.sort(function (a, b) { return a.seqNum - b.seqNum; });
    return collected;
}

var spokenBidCount = 0;
var lastBidPollLen = 0;

function checkNewBids() {
    var bids = readAllBids();
    if (bids.length > spokenBidCount) {
        for (var i = spokenBidCount; i < bids.length; i++) {
            speak(bids[i].directionEn + ': ' + bids[i].translation);
        }
        spokenBidCount = bids.length;
    } else if (bids.length < spokenBidCount) {
        spokenBidCount = bids.length;
    }
    lastBidPollLen = bids.length;

    if (isBiddingPhase()) {
        var c = getContractFromBidHistory();
        if (c && c.strain) cachedContract = c;
    }
    // EI kutsuta updateGamePhase() täältä – se laukaisisi
    // vääriä "bidding ended" -ilmoituksia tarjouksen jälkeen.
}

// =========================================================
// 17. CONTRACT READING
// =========================================================

function getContractFromBidHistory() {
    var bids = readAllBids();
    if (bids.length === 0) return null;

    var finalBid = null;
    var finalIdx = -1;

    for (var i = bids.length - 1; i >= 0; i--) {
        var raw = (bids[i].raw || '').toUpperCase();
        if (raw === 'PASS' || raw === 'X' || raw === 'XX') continue;
        var m = raw.match(/^([1-7])([NSHDC])$/);
        if (m) { finalBid = { level:m[1], strain:m[2], lastDir:bids[i].direction }; finalIdx = i; break; }
    }
    if (!finalBid) return null;

    // Find first bid of same strain by same partnership
    var declarer = finalBid.lastDir;
    var sameSide = finalBid.lastDir === 'N' || finalBid.lastDir === 'S' ? ['N','S'] : ['E','W'];

    for (var j = 0; j <= finalIdx; j++) {
        var b = bids[j];
        if (sameSide.indexOf(b.direction) === -1) continue;
        var bRaw = (b.raw || '').toUpperCase();
        var bm   = bRaw.match(/^([1-7])([NSHDC])$/);
        if (bm && bm[2] === finalBid.strain) { declarer = b.direction; break; }
    }

    return { level:finalBid.level, strain:finalBid.strain, declarer:declarer };
}

function getOrBuildCachedContract() {
    if (cachedContract && cachedContract.strain && cachedContract.declarer) return cachedContract;
    var live = getContractFromBidHistory();
    if (live && live.strain && live.declarer) { cachedContract = live; return cachedContract; }
    return cachedContract;
}

function readContractDisplay() {
    var contract = getOrBuildCachedContract();
    if (!contract) return null;
    var strainEn   = BID_STRAIN_EN[contract.strain] || contract.strain;
    var declarerEn = DIRECTION_EN[contract.declarer] || contract.declarer;
    return declarerEn + ' ' + contract.level + ' ' + strainEn;
}

// =========================================================
// 18. VULNERABILITY AND BOARD INFO
// =========================================================

function readVulnerability() {
    // Funbridge shows: <span>Vulnerability:</span><span>None/NS/EW/All</span>
    var vulEl = document.querySelector('.vulnerability-hcp');
    if (!vulEl) {
        var spans = document.querySelectorAll('.sidebar-tabs span, .bridge-table span');
        for (var i = 0; i < spans.length; i++) {
            var t = spans[i].textContent.trim();
            if (t === 'None' || t === 'NS' || t === 'EW' || t === 'All') return t;
        }
        return null;
    }
    var spans2 = vulEl.querySelectorAll('span');
    for (var j = 0; j < spans2.length; j++) {
        var txt = spans2[j].textContent.trim();
        if (txt === 'None' || txt === 'NS' || txt === 'EW' || txt === 'All') return txt;
    }
    return null;
}

function vulnerabilityTextEn(vul) {
    if (!vul) return 'Vulnerability unknown';
    if (vul === 'None') return 'None vulnerable';
    if (vul === 'All')  return 'All vulnerable';
    if (vul === 'NS')   return 'North-South vulnerable';
    if (vul === 'EW')   return 'East-West vulnerable';
    return vul;
}

function readHcp() {
    var el = document.querySelector('.hand-hcp-bottom');
    if (!el) return null;
    var m = (el.textContent || '').match(/\d+/);
    return m ? m[0] : null;
}

var lastAnnouncedBoard = '';

function announceBoard() {
    var vul = readVulnerability();
    var hcp = readHcp();
    var boardKey = (vul || '') + '|' + (hcp || '');
    if (boardKey === lastAnnouncedBoard) return;
    lastAnnouncedBoard    = boardKey;
    spokenBidCount        = 0;
    currentTrick          = [];
    currentTrickIds       = {};
    previousPlayedIds     = {};
    previousTrickSnapshot = '';
    cachedContract        = null;
    activeTurnDirection   = null;
    // Ei kutsuta initTrickStateFromDOM() täällä – uusi lauta alkaa puhtaalta pöydältä.

    var msg = vulnerabilityTextEn(vul) + '.';
    if (hcp) msg += ' ' + hcp + ' HCP.';
    speak(msg);
}

// =========================================================
// 19. READING CARDS OUT LOUD
// =========================================================

function readSuitCards(cards, targetSuit) {
    var matching = cards.filter(function (c) { return c.suit === targetSuit; })
                        .map(function (c) { return rankWord(c.rank); });
    var plural = SUIT_EN_TO_PLURAL[targetSuit] || targetSuit;
    speakNow(matching.length > 0
        ? matching.length + ' ' + plural + ': ' + matching.join(' ')
        : '0 ' + plural);
}

function readAllCards(cards, ownerName) {
    if (cards.length === 0) { speakNow(ownerName + ': no cards visible.'); return; }
    var parts = [];
    SUIT_ORDER_EN.forEach(function (suit) {
        var vals = cards.filter(function (c) { return c.suit === suit; })
                        .map(function (c) { return rankWord(c.rank); });
        if (vals.length > 0) parts.push(vals.length + ' ' + suit + ': ' + vals.join(' '));
    });
    speakNow(ownerName + '. ' + parts.join('. '));
}

function readPlayerNames() {
    var names = [];
    var pos   = getTrickPositionToDirection();
    var seats = [
        { sel:'.seat-bottom .seat-name .text-truncate', dir:pos.bottom },
        { sel:'.seat-top    .seat-name .text-truncate', dir:pos.top    },
        { sel:'.seat-left   .seat-name .text-truncate', dir:pos.left   },
        { sel:'.seat-right  .seat-name .text-truncate', dir:pos.right  }
    ];
    seats.forEach(function (s) {
        var el = document.querySelector(s.sel);
        if (el) names.push((DIRECTION_EN[s.dir] || s.dir) + ': ' + el.textContent.trim());
    });
    speakNow(names.length > 0 ? names.join(', ') : 'Player names not found.');
}

// =========================================================
// 20. STATE RESET
// =========================================================

// Nollaa edellisen jaon kaikki muistitiedot uuden jaon alkaessa.
// Kutsutaan kun tarjouslaatikko ilmestyy uudelleen DOM:iin.
function resetDealState() {
    pendingInput          = null;
    clearInputTimeout();
    gamePhase             = 'bidding';
    playPhaseConfirmCount = 0;
    cachedContract        = null;
    activeTurnDirection   = null;
    previousPlayedIds     = {};
    currentTrickIds       = {};
    currentTrick          = [];
    previousTrickSnapshot = '';
    spokenBidCount        = 0;
    lastBidPollLen        = 0;
    // lastAnnouncedBoard nollataan myös, jotta announceBoard() ajetaan uudelleen
    lastAnnouncedBoard    = '';
}

function forceRefreshState() {
    try {
        pendingInput       = null;
        clearInputTimeout();
        gamePhase          = 'unknown';
        cachedContract     = null;
        activeTurnDirection = null;
        previousPlayedIds   = {};
        currentTrickIds     = {};

        var wasBidding = isBiddingPhase();
        var wasPlay    = isPlayPhase();
        if (wasPlay)    gamePhase = 'play';
        else if (wasBidding) gamePhase = 'bidding';

        var bids       = readAllBids();
        spokenBidCount = bids.length;
        lastBidPollLen = bids.length;

        var c = getContractFromBidHistory();
        if (c && c.strain) cachedContract = c;

        if (gamePhase === 'play') {
            initTrickStateFromDOM();
            previousTrickSnapshot = trickSnapshot(readAllPlayedCards());
            if (currentTrick.length > 0) {
                var last = currentTrick[currentTrick.length - 1];
                activeTurnDirection = getNextDirection(last.direction);
            }
        }
        prevPlayedCount = document.querySelectorAll('.bridge-card.bridge-card-played').length;
        lastDealHandFp  = handFingerprint();
        speakNow('Extension memory reset.');
    } catch (e) {
        speakNow('Error in reset.');
    }
}

// =========================================================
// 20b. NEW-DEAL DETECTION (robust, collision-proof)
// =========================================================
// Edellinen versio luotti siihen, että uusi jako tunnistetaan joko
// .table-center-bids -solmun ilmestymisestä TAI vulnerability+HCP
// -avaimen muutoksesta. Kumpikin voi pettää:
//   - SPA voi käyttää saman .table-center-bids -solmun uudelleen,
//     jolloin "added node" -tapahtumaa ei tule.
//   - Kaksi peräkkäistä jakoa voivat sattua samaan vulnerability+HCP
//     -arvoon, jolloin announceBoard() palaa heti eikä nollaa tilaa
//     → edellisen jaon sopimus jää muistiin.
//
// Tässä käytetään kahta determinististä signaalia, jotka eivät voi
// törmätä jakojen välillä:
//   (a) pelattujen korttien määrä PIENENEE – pelattu jako siivottiin pois.
//       Yhden jaon aikana määrä vain kasvaa, joten tämä ei laukea kesken.
//   (b) käyttäjän täysi 13 kortin käsi VAIHTUU tarjousvaiheessa – kattaa
//       myös pass-out-jaot ja tilanteet joissa edellisestä jaosta ei
//       jäänyt yhtään pelattua korttia näkyviin.
// Kumpikaan ei laukea tarjous→peli-siirtymässä saman jaon sisällä.

var prevPlayedCount = 0;
var lastDealHandFp  = '';

// Käyttäjän koko käden sormenjälki (lajitellut kortti­avaimet).
// Palauttaa '' jos kättä ei ole täytenä (esim. kesken pelin), jolloin
// siihen ei luoteta jaon tunnistuksessa.
function handFingerprint() {
    var cards = getUserHand();
    if (cards.length < 13) return '';
    return cards.map(function (c) { return c.key; }).sort().join(',');
}

function detectNewDeal() {
    var newDeal = false;

    // (a) pelatut kortit siivottiin pois
    var playedCount = document.querySelectorAll('.bridge-card.bridge-card-played').length;
    if (playedCount < prevPlayedCount) newDeal = true;
    prevPlayedCount = playedCount;

    // (b) uusi täysi käsi ilmestyi tarjousvaiheessa
    if (isBiddingPhase()) {
        var fp = handFingerprint();
        if (fp) {
            if (lastDealHandFp !== '' && fp !== lastDealHandFp) newDeal = true;
            lastDealHandFp = fp;
        }
    }

    if (newDeal) onNewDeal();
}

// Keskitetty uuden jaon käsittely: nollaa KAIKKI edellisen jaon tila
// (sopimus, valttipeli, tikit, tarjoukset, vuoro) ja ilmoittaa uuden
// laudan pienellä viiveellä kun HCP/vulnerability on ehtinyt latautua.
function onNewDeal() {
    resetDealState();
    // Uudelleenkalibroi seuranta heti, jottei sama jako laukea moneen kertaan.
    prevPlayedCount = document.querySelectorAll('.bridge-card.bridge-card-played').length;
    lastDealHandFp  = handFingerprint();
    if (boardTimer) clearTimeout(boardTimer);
    boardTimer = setTimeout(announceBoard, 800);
}

// =========================================================
// 21a. HELP DIALOG (Alt+H)
// =========================================================

var helpDialogEl   = null;
var helpDialogOpen = false;

function buildHelpDialog() {
    var dlg = document.createElement('div');
    dlg.id = 'fb-help-dialog';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'fb-help-title');
    dlg.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:rgba(0,0,0,0.92)', 'color:#FFE600',
        'font-family:Arial,sans-serif', 'font-size:16px',
        'overflow-y:auto', 'z-index:99999',
        'box-sizing:border-box', 'padding:24px 32px 40px'
    ].join(';');

    function h(level, text) {
        var el = document.createElement('h' + level);
        el.textContent = text;
        var sizes = { 1:'24px', 2:'19px', 3:'16px' };
        el.style.cssText = 'color:#FFE600;margin:1em 0 0.3em;font-size:' + (sizes[level] || '16px');
        return el;
    }
    function p(text) {
        var el = document.createElement('p');
        el.textContent = text;
        el.style.cssText = 'margin:0.15em 0 0.15em 1em;color:#FFFFFF;';
        return el;
    }
    function sep() {
        var el = document.createElement('hr');
        el.style.cssText = 'border:none;border-top:1px solid #555;margin:1em 0;';
        return el;
    }

    // Close button (top-right, also reachable by Tab)
    var closeBtn = document.createElement('button');
    closeBtn.id          = 'fb-help-close';
    closeBtn.textContent = 'Close help (Escape)';
    closeBtn.setAttribute('aria-label', 'Close help dialog');
    closeBtn.style.cssText = [
        'display:block', 'margin-bottom:16px',
        'background:#444', 'color:#FFE600',
        'border:2px solid #FFE600', 'border-radius:6px',
        'padding:6px 18px', 'font-size:15px', 'cursor:pointer'
    ].join(';');
    closeBtn.addEventListener('click', closeHelpDialog);
    dlg.appendChild(closeBtn);

    // Title (focus target)
    var title = h(1, 'Funbridge Accessibility Extension – Keyboard Commands');
    title.id = 'fb-help-title';
    title.setAttribute('tabindex', '-1');
    title.style.marginTop = '0';
    dlg.appendChild(title);

    dlg.appendChild(sep());

    // ---- Sections ----
    dlg.appendChild(h(2, 'Playing a Card (two keys)'));
    dlg.appendChild(p('1. Suit key: S = Spade, H = Heart, D = Diamond, C = Club'));
    dlg.appendChild(p('2. Rank key: A K Q J T 9 8 7 6 5 4 3 2'));
    dlg.appendChild(p('Example: S then A → plays Ace of Spades'));
    dlg.appendChild(p('Example: H then T → plays 10 of Hearts'));

    dlg.appendChild(sep());
    dlg.appendChild(h(2, 'Quick Play'));
    dlg.appendChild(p('Arrow Up or I = Play highest card of led suit'));
    dlg.appendChild(p('Arrow Down or O = Play lowest card of led suit'));

    dlg.appendChild(sep());
    dlg.appendChild(h(2, 'Bidding (two keys)'));
    dlg.appendChild(p('1. Level key: 1 2 3 4 5 6 7'));
    dlg.appendChild(p('2. Suit key: C = Clubs, D = Diamonds, H = Hearts, S = Spades, N = No Trump'));
    dlg.appendChild(p('P = Pass'));
    dlg.appendChild(p('X = Double or Redouble (automatically chosen)'));
    dlg.appendChild(p('Escape = Cancel pending input'));

    dlg.appendChild(sep());
    dlg.appendChild(h(2, 'Query Commands (Alt + key)'));
    dlg.appendChild(h(3, 'My hand'));
    dlg.appendChild(p('Alt+G = Entire hand'));
    dlg.appendChild(p('Alt+A = Spades'));
    dlg.appendChild(p('Alt+S = Hearts'));
    dlg.appendChild(p('Alt+D = Diamonds'));
    dlg.appendChild(p('Alt+F = Clubs'));
    dlg.appendChild(h(3, 'Dummy hand'));
    dlg.appendChild(p('Alt+T = Entire dummy hand'));
    dlg.appendChild(p('Alt+Q = Dummy Spades'));
    dlg.appendChild(p('Alt+W = Dummy Hearts'));
    dlg.appendChild(p('Alt+E = Dummy Diamonds'));
    dlg.appendChild(p('Alt+R = Dummy Clubs'));
    dlg.appendChild(p('        On the results page Alt+R starts the replay instead'));
    dlg.appendChild(h(3, 'Game info'));
    dlg.appendChild(p('Alt+P = Current trick on table'));
    dlg.appendChild(p('Alt+B = Bidding history'));
    dlg.appendChild(p('Alt+X = My direction, vulnerability, HCP, contract'));
    dlg.appendChild(p('Alt+V = Whose turn it is to bid or play'));
    dlg.appendChild(p('Alt+C = Trick count'));
    dlg.appendChild(p('Alt+N = Player names'));
    dlg.appendChild(p('        On the results page Alt+N goes to the next deal instead'));

    dlg.appendChild(sep());
    dlg.appendChild(h(2, 'Commented deals'));
    dlg.appendChild(p('Alt+Y = Read commentary text'));
    dlg.appendChild(p('Alt+Z = Read all hands from distribution diagram'));

    dlg.appendChild(sep());
    dlg.appendChild(h(2, 'Other'));
    dlg.appendChild(p('F2 = Toggle accessible card buttons (for low vision users)'));
    dlg.appendChild(p('    Arrow keys browse cards, Enter plays, F2 or Escape closes'));
    dlg.appendChild(p('F8 = Read the deal results (results page only)'));
    dlg.appendChild(p('    Contract and result, deal and tournament percentages,'));
    dlg.appendChild(p('    card play summary and the mistakes from the detailed analysis'));
    dlg.appendChild(p('    The same report is read automatically when the results appear'));
    dlg.appendChild(p('Alt+L = Library deal list (accessible, works with the infinite list)'));
    dlg.appendChild(p('    Arrow keys browse deals, Enter shows details, Escape closes'));
    dlg.appendChild(p('    Tab from a deal opens it in Funbridge via its own deal link'));
    dlg.appendChild(p('Alt+H = This help'));
    dlg.appendChild(p('Alt+M = Reset extension state'));

    // Focus trap: Tab from last focusable element wraps to first and vice versa
    dlg.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            e.preventDefault();
            e.stopPropagation();
            closeHelpDialog();
            return;
        }
        if (e.key === 'Tab') {
            var focusable = Array.prototype.slice.call(
                dlg.querySelectorAll('button, [tabindex="0"], [tabindex="-1"]')
            ).filter(function (el) {
                return el.tabIndex >= 0 || el === document.activeElement;
            });
            // Only the close button is truly tabbable (tabindex=0); wrap within it
            var tabbable = dlg.querySelectorAll('[tabindex="0"]');
            if (tabbable.length <= 1) { e.preventDefault(); return; }
            var first = tabbable[0];
            var last  = tabbable[tabbable.length - 1];
            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault(); last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault(); first.focus();
            }
        }
    });

    return dlg;
}

function openHelpDialog() {
    if (helpDialogOpen) { closeHelpDialog(); return; }
    if (!helpDialogEl) helpDialogEl = buildHelpDialog();
    document.body.appendChild(helpDialogEl);
    helpDialogOpen = true;
    // Focus the h1 so NVDA starts reading from the top of the dialog
    var title = document.getElementById('fb-help-title');
    if (title) setTimeout(function () { title.focus(); }, 50);
}

function closeHelpDialog() {
    if (!helpDialogOpen || !helpDialogEl) return;
    document.body.removeChild(helpDialogEl);
    helpDialogOpen = false;
}

// =========================================================
// 20B. WHOSE TURN IT IS (Alt+V)
// =========================================================
// Funbridge marks the player to act with a visual highlight only, which a
// screen reader cannot see. Two different sources are needed: during the
// bidding the auction box tells who bid last, and during play the extension's
// own trick tracking knows who is on lead.

// Three passes after a bid close the auction. Needed because the auction box
// stays on screen during play, so a last bid alone does not mean the bidding
// is still running.
function biddingIsOver() {
    var bids = readAllBids();
    if (bids.length < 4) return false;
    for (var i = bids.length - 3; i < bids.length; i++) {
        if (bids[i].translation !== 'Pass') return false;
    }
    return true;
}

function readWhoseTurn() {
    // The bid box only carries clickable bids while the user is the one to
    // call, so its presence is the turn indicator during the auction.
    if (isBiddingPhase()) { speakNow('Your turn to bid.'); return; }

    if (gamePhase === 'play' || isPlayPhase() || biddingIsOver()) {
        var allowed = resolveAllowedHand();
        if (allowed === 'mine')  { speakNow('Your turn to play.'); return; }
        if (allowed === 'dummy') { speakNow('Your turn to play from dummy.'); return; }

        if (activeTurnDirection) {
            speakNow((DIRECTION_EN[activeTurnDirection] || activeTurnDirection) + ' to play.');
            return;
        }
        speakNow('Waiting for the next card.');
        return;
    }

    var bids = readAllBids();
    if (bids.length) {
        var next = getNextDirection(bids[bids.length - 1].direction);
        if (next) { speakNow((DIRECTION_EN[next] || next) + ' to bid.'); return; }
    }

    if (document.querySelector('.auction-box')) { speakNow('Bidding has not started yet.'); return; }
    speakNow('No deal in progress.');
}

// =========================================================
// 21. KEYBOARD LISTENER
// =========================================================
// Tarjoukset ja kortit pelataan suoraan näppäimillä.
// Query-komennot vaativat Alt+näppäin.

function handleQueryKey(key, block) {
    if (key === 'h') { block(); openHelpDialog(); return true; }
    if (key === 'm') { block(); forceRefreshState(); return true; }

    // Kirjaston jakoluettelo (osio 29)
    if (key === 'l') { block(); fbLibToggleDialog(); return true; }

    // Own hand
    if (key === 'g') { block(); readAllCards(getUserHand(), 'My hand');       return true; }
    if (key === 'a') { block(); readSuitCards(getUserHand(), 'Spade');         return true; }
    if (key === 's') { block(); readSuitCards(getUserHand(), 'Heart');         return true; }
    if (key === 'd') { block(); readSuitCards(getUserHand(), 'Diamond');       return true; }
    if (key === 'f') { block(); readSuitCards(getUserHand(), 'Club');          return true; }

    // Dummy hand
    if (key === 't') {
        block();
        var dt = getDummyHand();
        dt.length === 0 ? speakNow('Dummy not visible.') : readAllCards(dt, 'Dummy');
        return true;
    }
    if (key === 'q') { block(); var dq = getDummyHand(); if (!dq.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(dq, 'Spade');   return true; }
    if (key === 'w') { block(); var dw = getDummyHand(); if (!dw.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(dw, 'Heart');   return true; }
    if (key === 'e') { block(); var de = getDummyHand(); if (!de.length) { speakNow('Dummy not visible.'); return true; } readSuitCards(de, 'Diamond'); return true; }
    if (key === 'r') {
        block();
        // No dummy on the results page, so Alt+R starts the replay there.
        if (fbResIsResultsPage()) { fbResReplay(); return true; }
        var dr = getDummyHand();
        if (!dr.length) { speakNow('Dummy not visible.'); return true; }
        readSuitCards(dr, 'Club');
        return true;
    }

    // Trick on table
    if (key === 'p') {
        block();
        var trick = currentTrick.length > 0 ? currentTrick : sortTrickChronologically(readCurrentTrickCards());
        speakNow(trick.length === 0
            ? 'No cards on table.'
            : 'Trick: ' + trick.map(function (c) {
                var who = DIRECTION_EN[c.direction] || c.direction;
                return c.unknown ? (who + ' unknown card') : (who + ' ' + c.suit + ' ' + rankWord(c.rank));
              }).join(', '));
        return true;
    }

    // Bid history
    if (key === 'b') {
        block();
        var bids = readAllBids();
        speakNow(bids.length === 0
            ? 'No bids.'
            : 'Bids: ' + bids.map(function (b) { return b.directionEn + ' ' + b.translation; }).join(', '));
        return true;
    }

    // Board / contract / direction info
    if (key === 'x') {
        block();
        var parts = [];
        var uDir  = getUserDirection();
        parts.push('My direction: ' + (DIRECTION_EN[uDir] || uDir));
        var vul = readVulnerability();
        parts.push(vulnerabilityTextEn(vul));
        var hcp = readHcp();
        if (hcp) parts.push(hcp + ' HCP');
        var contract = readContractDisplay();
        parts.push(contract ? 'Contract: ' + contract : 'No contract yet');
        speakNow(parts.join('. ') + '.');
        return true;
    }

    // Vulnerability
    if (key === 'v') { block(); readWhoseTurn(); return true; }

    // Trick count
    if (key === 'c') { block(); readTrickCount(); return true; }

    // Player names
    if (key === 'n') {
        block();
        // On the results page there is no table on screen, so player names are
        // meaningless there; Alt+N moves to the next deal instead. If the deal
        // was the last one, the button is absent and nothing happens.
        if (fbResIsResultsPage()) { fbResGoToNextDeal(); return true; }
        readPlayerNames();
        return true;
    }

    // Commented deals – commentary text (Alt+Y)
    if (key === 'y') { block(); readCommentaryText(); return true; }

    // Commented deals – distribution hand diagram (Alt+Z)
    if (key === 'z') { block(); readDistributionHands(); return true; }

    return false;
}

// =========================================================
// F2 – SAAVUTETTAVAT KORTIT (heikkonäköisille)
// =========================================================
// Asettelut tilanteen mukaan:
//   Lepääjä pohjoisessa  → kaksi vaakarivejä alareunassa
//   Lepääjä lännessä     → oma käsi alareunassa, lepääjä pystyrivissä vasemmalla
//   Lepääjä idässä       → oma käsi alareunassa, lepääjä pystyrivissä oikealla

var cardButtonMode   = false;
var cardButtonIndex  = 0;
var cardButtonList   = [];
var cardPanelEl      = null;   // alareunassa oleva paneeli (oma käsi + mahdollisesti lepääjä)
var cardSidePanelEl  = null;   // sivupaneeli (lepääjä lännessä/idässä)

// Neljän värin maakoodaus – erottuvat toisistaan heikolla näöllä
var SUIT_COLOR = {
    'Spade'  : '#E8E8E8',
    'Heart'  : '#FF4444',
    'Diamond': '#3BB0FF',
    'Club'   : '#44CC55'
};
var ACTIVE_BG   = '#1E2D1E';
var INACTIVE_BG = '#1A1A1A';
var PANEL_BG    = '#0D0D0D';

var SUIT_SYMBOL = { 'Spade':'♠', 'Heart':'♥', 'Diamond':'♦', 'Club':'♣' };

function buildAriaLabel(card, handName) {
    return card.suit + ' ' + rankWord(card.rank) + ', ' + handName;
}

function collectHandCards(handCls) {
    var container = document.querySelector('.' + handCls);
    if (!container) return [];
    var result = [];
    container.querySelectorAll('.bridge-card').forEach(function (cardEl) {
        if (cardEl.classList.contains('bridge-card-played')) return;
        var useEl = cardEl.querySelector('.bridge-card-svg use');
        var card  = useEl ? parseFunbridgeHref(getHref(useEl)) : null;
        if (!card) return;
        result.push({ card: card, active: cardEl.classList.contains('bridge-card-active') });
    });
    return result;
}

// Luo yksittäinen korttipainike. Lisätään cardButtonList-taulukkoon.
function buildCardButton(item, handName) {
    var card   = item.card;
    var active = item.active;
    var color  = SUIT_COLOR[card.suit] || '#FFFFFF';
    var sym    = SUIT_SYMBOL[card.suit] || card.suit;

    var btn = document.createElement('button');
    btn.setAttribute('type', 'button');
    btn.setAttribute('tabindex', '0');
    btn.setAttribute('aria-label', buildAriaLabel(card, handName));
    btn.setAttribute('data-fb-card-btn', '1');

    btn.innerHTML =
        '<span style="display:block;font-size:26px;line-height:1;pointer-events:none">' + sym + '</span>' +
        '<span style="display:block;font-size:22px;font-weight:900;line-height:1.1;pointer-events:none">' + rankWord(card.rank) + '</span>';

    btn.style.cssText = [
        'display:flex',
        'flex-direction:column',
        'align-items:center',
        'justify-content:center',
        'min-width:62px',
        'width:62px',
        'height:82px',
        'flex-shrink:0',
        'background:' + (active ? ACTIVE_BG : INACTIVE_BG),
        'color:' + color,
        'border:3px solid ' + (active ? color : '#444444'),
        'border-radius:8px',
        'cursor:' + (active ? 'pointer' : 'default'),
        'font-family:Arial,sans-serif',
        'padding:4px 2px',
        'box-sizing:border-box',
        'outline:none'
    ].join(';');

    if (active) {
        btn.addEventListener('mouseenter', function () {
            btn.style.borderColor = '#FFFFFF';
            btn.style.background  = '#263326';
        });
        btn.addEventListener('mouseleave', function () {
            if (document.activeElement !== btn) {
                btn.style.borderColor = color;
                btn.style.background  = ACTIVE_BG;
            }
        });
    }
    btn.addEventListener('focus', function () {
        btn.style.outline = '3px solid #FFFFFF';
        btn.style.outlineOffset = '2px';
    });
    btn.addEventListener('blur', function () {
        btn.style.outline = 'none';
        btn.style.outlineOffset = '0';
    });

    function doPlay(e) {
        if (!active) return;
        e.preventDefault();
        playCard(card.suitLetter, card.rank);
        setTimeout(refreshCardButtons, 400);
    }
    btn.addEventListener('click', doPlay);
    btn.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ')                { doPlay(e); }
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown')   { e.preventDefault(); moveCardFocus(1);  }
        if (e.key === 'ArrowLeft'  || e.key === 'ArrowUp')     { e.preventDefault(); moveCardFocus(-1); }
        if (e.key === 'F2' || e.key === 'Escape')              { e.preventDefault(); deactivateCardButtonMode(); }
    });

    cardButtonList.push(btn);
    return btn;
}

// Vaakarivi alareunaan (oma käsi tai pohjoinen lepääjä)
function buildHandRow(panel, cards, rowLabel, handName) {
    if (cards.length === 0) return;
    var rowWrap = document.createElement('div');
    rowWrap.style.cssText = [
        'display:flex', 'align-items:center',
        'gap:6px', 'padding:6px 8px',
        'flex-wrap:nowrap', 'overflow-x:auto'
    ].join(';');

    var label = document.createElement('div');
    label.textContent = rowLabel;
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = [
        'color:#777', 'font-size:13px', 'font-weight:700',
        'font-family:Arial,sans-serif',
        'writing-mode:vertical-rl', 'text-orientation:mixed',
        'white-space:nowrap', 'min-width:18px', 'flex-shrink:0'
    ].join(';');
    rowWrap.appendChild(label);

    cards.forEach(function (item) {
        rowWrap.appendChild(buildCardButton(item, handName));
    });
    panel.appendChild(rowWrap);
}

// Pystyrivi sivulle (länsi tai itä lepääjänä)
function buildSidePanel(cards, side) {
    var sp = document.createElement('div');
    sp.id = 'fb-card-side-panel';
    sp.setAttribute('role', 'region');
    sp.setAttribute('aria-label', 'Dummy hand');
    sp.style.cssText = [
        'position:fixed',
        'top:0',
        'bottom:0',
        side + ':0',
        'z-index:99990',
        'background:' + PANEL_BG,
        side === 'left' ? 'border-right:2px solid #333' : 'border-left:2px solid #333',
        'display:flex',
        'flex-direction:column',
        'align-items:stretch',
        'padding:4px',
        'gap:3px',
        'overflow:hidden',
        'user-select:none',
        'width:82px',
        'box-sizing:border-box',
        'box-shadow:' + (side === 'left' ? '4px' : '-4px') + ' 0 16px rgba(0,0,0,0.7)'
    ].join(';');

    var label = document.createElement('div');
    label.textContent = 'Dummy';
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText = [
        'color:#777', 'font-size:11px', 'font-weight:700',
        'font-family:Arial,sans-serif',
        'text-align:center', 'flex-shrink:0', 'padding-bottom:2px'
    ].join(';');
    sp.appendChild(label);

    cards.forEach(function (item) {
        var btn = buildCardButton(item, 'Dummy');
        btn.style.flex      = '1';
        btn.style.minHeight = '0';
        btn.style.maxHeight = '82px';
        btn.style.width     = '100%';
        sp.appendChild(btn);
    });

    return sp;
}

// Sulkunappi + otsikkopalkki alareunaiseen paneeliin
function buildTopBar() {
    var topBar = document.createElement('div');
    topBar.style.cssText = [
        'display:flex', 'align-items:center',
        'justify-content:space-between',
        'padding:4px 10px 2px',
        'border-bottom:1px solid #2a2a2a'
    ].join(';');

    var titleEl = document.createElement('span');
    titleEl.textContent = 'Cards – F2 to close';
    titleEl.setAttribute('aria-hidden', 'true');
    titleEl.style.cssText = 'color:#555;font-size:12px;font-family:Arial,sans-serif;';

    var closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ Close (F2)';
    closeBtn.setAttribute('aria-label', 'Close card panel');
    closeBtn.style.cssText = [
        'background:#222', 'color:#AAAAAA',
        'border:1px solid #444', 'border-radius:4px',
        'padding:2px 10px', 'font-size:12px',
        'cursor:pointer', 'font-family:Arial,sans-serif'
    ].join(';');
    closeBtn.addEventListener('click', function () { deactivateCardButtonMode(); });
    topBar.appendChild(titleEl);
    topBar.appendChild(closeBtn);
    return topBar;
}

function buildCardPanel() {
    var dummyCls   = getDummyHandClass();
    var ownCards   = collectHandCards('cards-hand-BOTTOM');
    var dummyCards = dummyCls ? collectHandCards(dummyCls) : [];

    var dummySide = null;   // 'left', 'right' tai null
    if (dummyCls === 'cards-hand-LEFT')  dummySide = 'left';
    if (dummyCls === 'cards-hand-RIGHT') dummySide = 'right';

    // --- Alareunassa oleva paneeli (aina) ---
    var panel = document.createElement('div');
    panel.id = 'fb-card-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'Card panel');

    // Sivupaneelin leveys täytyy huomioida alareunaisessa paneelissa
    var sidePad = dummySide ? '82px' : '0px';
    panel.style.cssText = [
        'position:fixed',
        'bottom:0',
        dummySide === 'left'  ? 'left:82px'  : 'left:0',
        dummySide === 'right' ? 'right:82px' : 'right:0',
        'z-index:99990',
        'background:' + PANEL_BG,
        'border-top:2px solid #333333',
        'box-shadow:0 -4px 16px rgba(0,0,0,0.7)',
        'user-select:none'
    ].join(';');

    panel.appendChild(buildTopBar());

    // Lepääjä pohjoisessa → toinen vaakavivi
    if (dummyCards.length > 0 && !dummySide) {
        buildHandRow(panel, dummyCards, 'Dummy', 'Dummy');
        var sep = document.createElement('div');
        sep.style.cssText = 'height:1px;background:#2a2a2a;margin:0 8px;';
        panel.appendChild(sep);
    }

    buildHandRow(panel, ownCards, 'Own', 'Own hand');

    // --- Sivupaneeli (länsi tai itä lepääjänä) ---
    if (dummyCards.length > 0 && dummySide) {
        cardSidePanelEl = buildSidePanel(dummyCards, dummySide);
        document.body.appendChild(cardSidePanelEl);

        // Aseta sivupaneelin bottom + säädä fonttikoko korttimäärän mukaan
        setTimeout(function () {
            if (!cardSidePanelEl || !cardPanelEl) return;
            var bottomH = cardPanelEl.offsetHeight;
            cardSidePanelEl.style.bottom = bottomH + 'px';

            // Laske käytettävissä oleva korkeus per kortti
            var panelH    = window.innerHeight - bottomH;
            var labelH    = 26;  // etiketti + padding
            var gaps      = 3 * (dummyCards.length - 1);
            var perCard   = Math.floor((panelH - labelH - 8 - gaps) / dummyCards.length);

            // Säädä fonttikoot kortin korkeuteen
            var symSize  = Math.min(26, Math.max(12, Math.floor(perCard * 0.42)));
            var rnkSize  = Math.min(22, Math.max(10, Math.floor(perCard * 0.36)));

            cardSidePanelEl.querySelectorAll('[data-fb-card-btn]').forEach(function (btn) {
                var spans = btn.querySelectorAll('span');
                if (spans[0]) spans[0].style.fontSize = symSize + 'px';
                if (spans[1]) spans[1].style.fontSize = rnkSize + 'px';
            });
        }, 0);
    }

    return panel;
}

function activateCardButtonMode() {
    if (cardPanelEl) deactivateCardButtonMode();
    cardButtonMode  = true;
    cardButtonList  = [];
    cardButtonIndex = 0;

    cardPanelEl = buildCardPanel();
    document.body.appendChild(cardPanelEl);

    if (cardButtonList.length === 0) {
        cardButtonMode = false;
        document.body.removeChild(cardPanelEl);
        cardPanelEl = null;
        speakNow('No cards available.');
        return;
    }

    var firstActive = cardButtonList.findIndex(function (btn) {
        return btn.style.cursor === 'pointer';
    });
    focusCardButton(firstActive >= 0 ? firstActive : 0);
    speakNow('Card panel open. ' + cardButtonList.length + ' cards. Arrow keys to browse, Enter to play, F2 to close.');
}

function refreshCardButtons() {
    if (!cardButtonMode) return;
    var prevIdx = cardButtonIndex;

    if (cardPanelEl && cardPanelEl.parentNode) cardPanelEl.parentNode.removeChild(cardPanelEl);
    if (cardSidePanelEl && cardSidePanelEl.parentNode) cardSidePanelEl.parentNode.removeChild(cardSidePanelEl);
    cardPanelEl     = null;
    cardSidePanelEl = null;
    cardButtonList  = [];
    cardButtonIndex = 0;

    cardPanelEl = buildCardPanel();
    document.body.appendChild(cardPanelEl);

    if (cardButtonList.length === 0) { setTimeout(refreshCardButtons, 600); return; }
    focusCardButton(Math.min(prevIdx, cardButtonList.length - 1));
}

function deactivateCardButtonMode() {
    cardButtonMode = false;
    if (cardPanelEl     && cardPanelEl.parentNode)     cardPanelEl.parentNode.removeChild(cardPanelEl);
    if (cardSidePanelEl && cardSidePanelEl.parentNode) cardSidePanelEl.parentNode.removeChild(cardSidePanelEl);
    cardPanelEl     = null;
    cardSidePanelEl = null;
    cardButtonList  = [];
    cardButtonIndex = 0;
    speakNow('Card panel closed.');
}

function focusCardButton(idx) {
    if (cardButtonList.length === 0) return;
    cardButtonIndex = Math.max(0, Math.min(idx, cardButtonList.length - 1));
    cardButtonList[cardButtonIndex].focus();
}

function moveCardFocus(delta) {
    focusCardButton(cardButtonIndex + delta);
}

document.addEventListener('keydown', function (e) {
    if (fbLibraryOpen) return;   // kirjaston jakoluettelo hoitaa omat näppäimensä
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var key = e.key.toLowerCase();
    if (e.key === 'F2') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (cardButtonMode) deactivateCardButtonMode();
        else                activateCardButtonMode();
    }
}, true);

document.addEventListener('keydown', function (e) {
    if (fbLibraryOpen) return;   // kirjaston jakoluettelo hoitaa omat näppäimensä
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    var key = e.key.toLowerCase();

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // Escape closes help dialog (takes priority)
    if (key === 'escape' && helpDialogOpen) {
        block(); closeHelpDialog(); return;
    }

    // Escape cancels pending two-key input
    if (key === 'escape' && pendingInput !== null) {
        block(); cancelPendingInput(); return;
    }

    // Second key of two-key sequence
    if (pendingInput !== null) {
        block(); handleSecondKey(key); return;
    }

    // Alt+key – query commands always work
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        handleQueryKey(key, block);
        return;
    }

    // Arrow Up/Down / i / o – play extreme card (play phase)
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || key === 'i' || key === 'o') &&
        !e.altKey && !e.ctrlKey && !e.metaKey && pendingInput === null) {
        block();
        playExtreme((e.key === 'ArrowDown' || key === 'o') ? 'low' : 'high');
        return;
    }

    if (!e.altKey && !e.ctrlKey && !e.metaKey) {
        handleFirstKey(key, block);
        return;
    }
}, true);

// =========================================================
// 22. MUTATIONOBSERVER
// =========================================================

var boardTimer = null;
var bidTimer   = null;
var trickTimer = null;

var gameObserver = new MutationObserver(function (mutations) {
    var checkTrick = false;
    var checkBids  = false;
    var checkBoard = false;

    mutations.forEach(function (mutation) {
        // -------------------------------------------------------
        // Tarjouslaatikon (table-center-bids) katoaminen DOM:sta
        // → siirrytään pelivaiheeseen VÄLITTÖMÄSTI ilman polling-viivettä.
        // -------------------------------------------------------
        mutation.removedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (node.classList && node.classList.contains('table-center-bids')) {
                if (gamePhase !== 'play') {
                    gamePhase = 'play';
                    playPhaseConfirmCount = PLAY_PHASE_CONFIRM_NEEDED;
                    var contractForLead = getOrBuildCachedContract();
                    if (contractForLead && contractForLead.declarer) {
                        activeTurnDirection = getNextDirection(contractForLead.declarer);
                    }
                    var contractText = readContractDisplay();
                    speak(contractText ? 'Bidding ended. Contract: ' + contractText + '.'
                                       : 'Bidding ended. Play phase starts.');
                    if (cardButtonMode) setTimeout(refreshCardButtons, 500);
                }
            }
        });

        mutation.addedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;

            // Trick changes: bridge-card appears/disappears outside hands
            if (node.classList && (node.classList.contains('bridge-card') ||
                node.querySelector && node.querySelector('.bridge-card'))) {
                checkTrick = true;
            }

            // Bid changes: new bid appears in auction box
            var id = (node.id || '');
            if (id.indexOf('AUCTION-BOX') !== -1) checkBids = true;
            if (node.classList && (node.classList.contains('auction-box-bid') ||
                node.classList.contains('auction-box'))) checkBids = true;
            if (node.querySelector && node.querySelector('[id*="AUCTION-BOX"]')) checkBids = true;

            // Board changes: vulnerability display
            if (node.classList && node.classList.contains('vulnerability-hcp')) checkBoard = true;
            if (node.closest && node.closest('.vulnerability-hcp')) checkBoard = true;

            // Table-center-bids change (bidding box appears) → uusi jako alkaa
            if (node.classList && node.classList.contains('table-center-bids')) {
                checkBids  = true;
                checkTrick = true;
                // Nollataan edellisen jaon tiedot heti kun tarjouslaatikko ilmestyy.
                // onNewDeal() hoitaa nollauksen + uudelleenkalibroinnin + ilmoituksen.
                onNewDeal();
            }
        });

        if (mutation.type === 'characterData') {
            var p = mutation.target.parentElement;
            if (p) {
                if (p.closest('.vulnerability-hcp'))  checkBoard = true;
                if (p.closest('.auction-box'))         checkBids  = true;
            }
        }

        if (mutation.type === 'attributes' || mutation.type === 'childList') {
            var tgt = mutation.target;
            if (tgt.classList && tgt.classList.contains('cards-hand-BOTTOM')) checkTrick = true;
            if (tgt.classList && tgt.classList.contains('table-center'))      checkTrick = true;
            // Key: watch for bridge-card-played class being added/removed
            if (tgt.classList && tgt.classList.contains('bridge-card-played')) checkTrick = true;
            if (tgt.classList && tgt.classList.contains('bridge-card'))        checkTrick = true;
            // Watch cards-hand-active changes (turn changes)
            if (tgt.classList && (
                tgt.classList.contains('cards-hand-TOP') ||
                tgt.classList.contains('cards-hand-BOTTOM') ||
                tgt.classList.contains('cards-hand-LEFT') ||
                tgt.classList.contains('cards-hand-RIGHT')
            )) checkTrick = true;
            // Lepääjän käsi tuli näkyviin → päivitä F2-painikkeet
            if (cardButtonMode && tgt.classList &&
                tgt.classList.contains('cards-hand-TOP') &&
                tgt.classList.contains('cards-hand-dummy')) {
                setTimeout(refreshCardButtons, 500);
            }
        }
    });

    if (checkTrick) { if (trickTimer) clearTimeout(trickTimer); trickTimer = setTimeout(detectTrickChanges, 150); }
    if (checkBids)  { if (bidTimer)   clearTimeout(bidTimer);   bidTimer   = setTimeout(checkNewBids, 350);       }
    if (checkBoard) { if (boardTimer) clearTimeout(boardTimer); boardTimer = setTimeout(announceBoard, 600);       }
});

gameObserver.observe(document.body, {
    childList: true, subtree: true, characterData: true, attributes: true,
    attributeFilter: ['class', 'style']
});

// =========================================================
// 23. POLLING (fallback for missed mutations)
// =========================================================

setInterval(function () {
    // Tarkista uusi jako ENNEN muuta tilankäsittelyä, jotta vanhentunut
    // sopimus ei pääse vaikuttamaan uuden jaon ensimmäisiin tapahtumiin.
    detectNewDeal();
    var bids = readAllBids().length;
    if (bids !== lastBidPollLen) checkNewBids();
    updateGamePhase();
}, 500);

setInterval(function () {
    var snap = trickSnapshot(readAllPlayedCards());
    if (snap !== previousTrickSnapshot) detectTrickChanges();
}, 300);

setInterval(function () {
    var vul = readVulnerability() || '';
    var hcp = readHcp() || '';
    var key = vul + '|' + hcp;
    if (key !== lastAnnouncedBoard && vul) announceBoard();
}, 2500);

// =========================================================
// 24. INITIALIZATION
// =========================================================

setTimeout(function () {
    announceBoard();
    updateGamePhase();
    var bids = readAllBids();
    spokenBidCount = bids.length;
    lastBidPollLen = bids.length;
    var c = getContractFromBidHistory();
    if (c && c.strain) cachedContract = c;

    // KRIITTINEN: jos laajennus käynnistyy/aktivoituu kesken jaon (esim. sivun
    // päivitys tai Funbridgen SPA-navigointi injektoi content scriptin
    // uudelleen), pelivaiheessa saattaa jo olla pelattuja kortteja pöydällä.
    // Ilman tätä previousPlayedIds ja currentTrick jäisivät tyhjiksi, ja
    // ensimmäinen live-tikkipäivitys (detectTrickChanges) luulisi KAIKKIA jo
    // pelattuja kortteja "juuri pelatuiksi" ja kävisi ne läpi DOM-järjestyksessä
    // - sama ongelma kuin Alt+M-nollauksessa, mutta ilman että käyttäjä painoi
    // mitään.
    if (gamePhase === 'play') {
        initTrickStateFromDOM();
        previousTrickSnapshot = trickSnapshot(readAllPlayedCards());
        if (currentTrick.length > 0) {
            var lastInit = currentTrick[currentTrick.length - 1];
            activeTurnDirection = getNextDirection(lastInit.direction);
        }
    }

    // Aseta uuden jaon tunnistuksen lähtötaso, jottei ensimmäinen jako
    // tulkitsisi itseään "uudeksi jaoksi" ja nollaisi turhaan.
    prevPlayedCount = document.querySelectorAll('.bridge-card.bridge-card-played').length;
    lastDealHandFp  = handFingerprint();
}, 2000);

// =========================================================
// CONSOLE HELP
// =========================================================
console.log([
    '=== Funbridge Accessibility Extension V1.1 ===',
    '',
    'F2          = Toggle accessible card buttons (high contrast, for low vision)',
    '              Arrow keys browse cards, Enter plays, F2/Escape cancels.',
    'F8          = Read the deal results (on the results page only)',
    '              Read automatically too, as soon as the results appear.',
    '',
    'QUERY COMMANDS (Alt+key, always work):',
    '  Alt+H           = Open/close this help',
    '  Alt+G           = My entire hand',
    '  Alt+A / S / D / F = My Spades / Hearts / Diamonds / Clubs',
    '  Alt+T           = Entire dummy hand',
    '  Alt+Q / W / E / R = Dummy Spades / Hearts / Diamonds / Clubs',
    '                    (on the results page Alt+R starts the replay)',
    '  Alt+P           = Current trick on table',
    '  Alt+B           = Bidding history',
    '  Alt+X           = Direction, vulnerability, HCP, contract',
    '  Alt+V           = Whose turn it is to bid or play',
    '  Alt+C           = Trick count',
    '  Alt+N           = Player names',
    '                    (on the results page: go to the next deal)',
    '  Alt+M           = Reset extension state',
    '',
    'PLAYING A CARD (two keys):',
    '  1. Suit:  s=Spade  h=Heart  d=Diamond  c=Club',
    '  2. Rank:  a k q j t 9 8 7 6 5 4 3 2',
    '  e.g.: s → "Spade?" → a → plays Ace of Spades',
    '',
    'QUICK PLAY:',
    '  Arrow Down / O = Play lowest card of led suit',
    '  Arrow Up   / I = Play highest card of led suit',
    '',
    'BIDDING (two keys):',
    '  1. Level: 1 2 3 4 5 6 7',
    '  2. Suit:  c d h s n',
    '  p = Pass   x = Double/Redouble   Escape = Cancel',
].join('\n'));

// =========================================================
// 15. ARGINE BID RECOMMENDATION ACCESSIBILITY (FINAL)
// =========================================================

function translateFunbridgeBid(hrefValue) {
    if (!hrefValue) return "unknown bid";
    var code = hrefValue.replace('#bid-', '').toUpperCase();

    if (code === 'PASS') return "Pass";
    if (code === 'X' || code === 'X1') return "Double";
    if (code === 'XX' || code === 'X2') return "Redouble";

    var level = code.charAt(0);
    var suitCode = code.substring(1);
    var suits = { 'C': 'Clubs', 'D': 'Diamonds', 'H': 'Hearts', 'S': 'Spades', 'N': 'No Trump', 'NT': 'No Trump' };

    if (level >= '1' && level <= '7' && suits[suitCode]) {
        return level + " " + suits[suitCode];
    }
    return code;
}

// Argine-neuvoikkuna kattaa SEKÄ tarjous- ETTÄ korttisuosituksen. Molemmilla
// on sama .modal-body-rakenne. Tyyppi pääätellään ikkunan tekstistä
// ("following card" / "following bid"), joka on staattista ja luettavissa heti.
//
// HUOM: korttineuvon SVG-ikonin <use href> renderöityy Reactissa joskus
// viiveellä. Siksi viite haetaan useasta lähteestä ja jos sitä ei vielä
// löydy, yritetään uudelleen muutaman kerran ennen luovuttamista.

// Muunna Funbridgen korttiviite luettavaksi nimeksi (tiukka muoto).
//   #card-us-gs-kd / #CARD-US-GS-KD -> "King of Diamonds"
function translateFunbridgeCard(hrefValue) {
    var card = parseFunbridgeHref(hrefValue || "");
    if (!card) return null;
    return cardName(card);
}

function cardName(card) {
    return rankWord(card.rank) + ' of ' + (SUIT_EN_TO_PLURAL[card.suit] || card.suit);
}

// Sietoisa korttiviitteen jäsennin: löytää "card-us-gs-XY" mistä tahansa
// merkkijonosta (myös ilman #-etuliitettä tai polun perästä), eikä vaadi
// osumaa merkkijonon lopusta. Palauttaa { rank, suit } tai null.
function parseCardRefLoose(s) {
    if (!s) return null;
    var m = String(s).match(/card-us-gs-([2-9tjqka])([shdc])(?![a-z0-9])/i);
    if (!m) return null;
    var rankChar = m[1].toLowerCase();
    var suitChar = m[2].toLowerCase();
    var rank  = FB_RANK_TO_EN[rankChar];
    var suitL = FB_SUIT_TO_LETTER[suitChar];
    if (!rank || !suitL) return null;
    return { rank: rank, suit: SUIT_LETTER_TO_EN[suitL] };
}

// Etsi suositeltu kortti neuvoikkunasta luotettavuusjärjestyksessä:
// 1) neuvoikoni .argine-advice, 2) mikä tahansa <use>, 3) Play-napin
// aria-label, 4) koko ikkunan HTML (neuvoikkunassa on vain yksi korttiviite).
function findArgineCard(modalBody) {
    var advUse = modalBody.querySelector('svg.argine-advice use');
    if (advUse) {
        var c = parseCardRefLoose(getHref(advUse));
        if (c) return c;
    }
    var found = null;
    modalBody.querySelectorAll('use').forEach(function (u) {
        if (!found) found = parseCardRefLoose(getHref(u));
    });
    if (found) return found;

    var pb = modalBody.querySelector('button.btn-green');
    if (pb) {
        var c2 = parseCardRefLoose(pb.getAttribute('aria-label') || '');
        if (c2) return c2;
    }
    return parseCardRefLoose(modalBody.innerHTML || '');
}

function finalizeArgineModal(modalBody, recommendation, adviceUse) {
    modalBody.setAttribute('data-fb-argine-announced', '1');

    var playButton = modalBody.querySelector('button.btn-green');
    if (playButton) {
        playButton.setAttribute('aria-label', recommendation);
        playButton.focus();
    }

    var use = adviceUse
           || modalBody.querySelector('svg.argine-advice use')
           || modalBody.querySelector('svg use');
    if (use) {
        var svgEl = use.closest('svg');
        if (svgEl && !svgEl.getAttribute('data-fb-a11y-advice-done')) {
            svgEl.setAttribute('data-fb-a11y-advice-done', '1');
            svgEl.setAttribute('aria-hidden', 'true');
            svgEl.setAttribute('focusable', 'false');
            var srSpan = document.createElement('span');
            srSpan.textContent = '\u00a0' + recommendation;
            srSpan.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;' +
                'margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
            svgEl.parentNode.insertBefore(srSpan, svgEl.nextSibling);
        }
    }

    if (typeof speakNow === "function") speakNow(recommendation);
}

function processArgineModal(modalBody) {
    if (!modalBody || modalBody.getAttribute('data-fb-argine-announced') === '1') return;

    var textContent = (modalBody.textContent || modalBody.innerText || "").toLowerCase();
    if (textContent.indexOf("argine recommends") === -1) return;

    var adviceUse  = modalBody.querySelector('svg.argine-advice use')
                  || modalBody.querySelector('svg use');
    var adviceHref = adviceUse ? (getHref(adviceUse) || "") : "";

    var saysCard = textContent.indexOf("following card") !== -1;
    var saysBid  = textContent.indexOf("following bid")  !== -1;
    var hrefIsBid = /bid-/i.test(adviceHref) && !/card-us-gs-/i.test(adviceHref);

    var recommendation = null;

    if (saysBid || (hrefIsBid && !saysCard)) {
        // Tarjousneuvo (entinen toiminta).
        if (adviceHref && /bid-/i.test(adviceHref)) {
            recommendation = translateFunbridgeBid(adviceHref);
        }
    } else {
        // Korttineuvo (oletus, kun teksti sanoo "card").
        var card = findArgineCard(modalBody);
        if (card) recommendation = cardName(card);
    }

    // Viitettä ei vielä saatu (esim. ikoni renderöityy viiveellä) -> yritä
    // uudelleen muutaman kerran ennen luovuttamista.
    if (!recommendation) {
        var tries = parseInt(modalBody.getAttribute('data-fb-argine-tries') || '0', 10);
        if (tries < 8) {
            modalBody.setAttribute('data-fb-argine-tries', String(tries + 1));
            setTimeout(function () { processArgineModal(modalBody); }, 300);
            return;
        }
        recommendation = saysBid ? 'unknown bid' : 'unknown card';
    }

    finalizeArgineModal(modalBody, recommendation, adviceUse);
}

var argineObserver = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
        if (mutation.addedNodes && mutation.addedNodes.length > 0) {
            for (var i = 0; i < mutation.addedNodes.length; i++) {
                var node = mutation.addedNodes[i];
                if (node.nodeType === 1) { 
                    var modalBody = null;
                    if (node.classList.contains('modal-body')) {
                        modalBody = node;
                    } else if (node.querySelector) {
                        modalBody = node.querySelector('.modal-body');
                    }

                    if (modalBody) {
                        // Annetaan Reactille 500ms aikaa ladata elementit
                        setTimeout(function() {
                            processArgineModal(modalBody);
                        }, 500);
                    }
                }
            }
        }
    });
});

argineObserver.observe(document.body, { childList: true, subtree: true });
// =========================================================
// 25. COMMENTED DEALS – SUIT ICON ACCESSIBILITY
// =========================================================
// Ongelma: Funbridge käyttää SVG-sprite-symboleja maa-merkkeinä
// kommenttiteksteissä ja jakautumaruuduissa. SVG:illä ei ole
// aria-label-attribuuttia, joten NVDA ohittaa ne.
//
// Ratkaisu:
//   1. Jokaisen suit-SVG:n jälkeen lisätään sr-only <span> maanimen
//      tekstillä. Välilyönti lisätään alkuun jotta NVDA erottaa
//      kortin arvon (esim. "A") maanimen tekstistä ("Diamonds"),
//      eikä lue niitä yhteen: "A Diamonds" eikä "ADiamonds".
//   2. SVG merkitään aria-hidden="true".
//   3. Selektorit rajattu tarkasti: vain .text-gray-700 ja
//      .distribution-seat-suit -kontekstit, ei koko sivua.
//
// Alt+Y  = lue kommenttiteksti puhutussa muodossa
// Alt+Z  = lue jakautumaruudun kaikki kädet suunnan mukaan
// =========================================================

var SUIT_ICON_HREF_MAP = {
    'icon-spade':             'Spades',
    'icon-spade_filled':      'Spades',
    'icon-spade_gradient':    'Spades',
    'icon-heart':             'Hearts',
    'icon-heart_filled':      'Hearts',
    'icon-heart_gradient':    'Hearts',
    'icon-diamond':           'Diamonds',
    'icon-diamond_filled':    'Diamonds',
    'icon-diamond_gradient':  'Diamonds',
    'icon-club':              'Clubs',
    'icon-club_filled':       'Clubs',
    'icon-club_gradient':     'Clubs',
    'icon-card_simple_s':     'Spades',
    'icon-card_simple_h':     'Hearts',
    'icon-card_simple_d':     'Diamonds',
    'icon-card_simple_c':     'Clubs'
};

function getSuitFromSvgEl(svgEl) {
    var use = svgEl.querySelector('use');
    if (!use) return null;
    var href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
    var id = href.replace(/^#/, '');
    if (SUIT_ICON_HREF_MAP[id]) return SUIT_ICON_HREF_MAP[id];
    // Varafallback: jos sprite-id on uusi muunnelma jota taulukossa ei vielä
    // ole (esim. "icon-spade_outline"), tunnista maa id:n avainsanasta.
    // spade/heart/diamond/club esiintyvät vain maa-spriteissä.
    var lid = id.toLowerCase();
    if (/spade/.test(lid))   return 'Spades';
    if (/heart/.test(lid))   return 'Hearts';
    if (/diamond/.test(lid)) return 'Diamonds';
    if (/club/.test(lid))    return 'Clubs';
    return null;
}

function fixSuitIconSvg(svgEl) {
    if (svgEl.getAttribute('data-fb-a11y-suit-done')) return;
    var suit = getSuitFromSvgEl(svgEl);
    if (!suit) return;

    svgEl.setAttribute('data-fb-a11y-suit-done', '1');
    svgEl.setAttribute('aria-hidden', 'true');
    svgEl.setAttribute('focusable', 'false');

    var span = document.createElement('span');
    span.className = 'fb-suit-label';
    // TÄRKEÄÄ: välilyönti ennen maanimeä estää NVDA:ta
    // konkatenoimasta edellisen tekstin maanimen kanssa:
    // "A" + " Diamonds" → "A Diamonds"  (ei "ADiamonds")
    span.textContent = '\u00a0' + suit;
    span.style.cssText = [
        'position:absolute',
        'width:1px',
        'height:1px',
        'padding:0',
        'margin:-1px',
        'overflow:hidden',
        'clip:rect(0,0,0,0)',
        'white-space:nowrap',
        'border:0'
    ].join(';');

    if (svgEl.nextSibling) {
        svgEl.parentNode.insertBefore(span, svgEl.nextSibling);
    } else {
        svgEl.parentNode.appendChild(span);
    }
}

// Korjaa suit-SVG:t VAIN tarkasti rajatuissa konteksteissa.
// HUOM: ei käytetä laajaa "svg.mt-n1" -selektoria koko sivulle,
// koska mt-n1 on yleinen Bootstrap-apuluokka jota käytetään
// muissakin koristeellisissa ikoneissa.
function fixCommentarySuitIcons() {
    // 1. Kommenttiteksti – suit-symbolit lauseiden sisällä
    document.querySelectorAll('.text-gray-700 svg').forEach(fixSuitIconSvg);

    // 2. Jakautumaruudun käsirivit
    document.querySelectorAll('.distribution-seat-suit svg').forEach(fixSuitIconSvg);

    // 3. Inline-korttitokenit (rank + suit) MISSÄ TAHANSA kommenttitekstissä,
    //    esim. "A♠" → "A Spades". Funbridge käärii korttitokenin aina
    //    .text-nowrap-spaniin (rank-teksti + suit-SVG), joten kohdistetaan
    //    suoraan siihen. Tämä kattaa myös analyysitekstit, jotka ovat
    //    .text-gray-600-kontekstissa (esim. "Theoretical optimization":
    //    "you could have taken 1 extra trick if you had played ... 4, 2").
    //    fixSuitIconSvg toimii vain tunnistetuille maa-spriteille, joten
    //    muut .text-nowrap-SVG:t jäävät rauhaan.
    document.querySelectorAll('.text-nowrap svg').forEach(fixSuitIconSvg);
}

// ---------------------------------------------------------
// Alt+Y: lue kommenttiteksti puhuttuna
// ---------------------------------------------------------
// Kävelee DOM:n rekursiivisesti:
//   - aria-hidden="true" (suit-SVG:t) ohitetaan
//   - <br> → välilyönti
//   - tekstisolmut kerätään
//   - fb-suit-label-spanit luetaan (\u00a0-merkki tulkitaan välilyönniksi)
function buildCommentaryReadableText(container) {
    var parts = [];

    function walk(node) {
        if (node.nodeType === 3) {
            // Tekstisolmu: korvaa &nbsp; tavallisella välilyönnillä
            var t = node.textContent.replace(/\u00a0/g, ' ');
            if (t) parts.push(t);
            return;
        }
        if (node.nodeType !== 1) return;

        var el = node;
        var tag = (el.tagName || '').toLowerCase();

        if (el.getAttribute('aria-hidden') === 'true') return;
        if (tag === 'br') { parts.push(' '); return; }

        for (var i = 0; i < el.childNodes.length; i++) {
            walk(el.childNodes[i]);
        }
        if (tag === 'div' || tag === 'p') parts.push(' ');
    }

    walk(container);
    return parts.join('').replace(/[ \t]+/g, ' ').trim();
}

function readCommentaryText() {
    fixCommentarySuitIcons();

    var commentDiv = document.querySelector('.text-gray-700.pb-3')
                  || document.querySelector('.text-gray-700');
    if (!commentDiv) {
        speakNow('No commentary found on this page.');
        return;
    }

    var text = buildCommentaryReadableText(commentDiv);
    if (!text) {
        speakNow('Commentary is empty.');
        return;
    }
    speakNow('Commentary: ' + text);
}

// ---------------------------------------------------------
// Alt+Z: lue jakautumaruudun kaikki kädet
// ---------------------------------------------------------
function readDistributionSeat(seatEl, dirName) {
    var suitEls = seatEl.querySelectorAll('.distribution-seat-suit');
    if (suitEls.length === 0) return null;

    var parts = [];
    suitEls.forEach(function (suitEl) {
        var svg = suitEl.querySelector('svg');
        var suitName = svg ? getSuitFromSvgEl(svg) : null;
        if (!suitName) suitName = '?';

        var ranks = [];
        suitEl.childNodes.forEach(function (child) {
            if (child.nodeType !== 1) return;
            var tag = (child.tagName || '').toLowerCase();
            if (tag === 'svg') return;
            if (child.classList && child.classList.contains('fb-suit-label')) return;
            var t = child.textContent.trim();
            if (t) ranks.push(t);
        });

        parts.push(suitName + ': ' + (ranks.length > 0 ? ranks.join(' ') : 'void'));
    });

    return dirName + ': ' + parts.join(', ');
}

function readDistributionHands() {
    fixCommentarySuitIcons();

    var dirs = [
        { cls: '.distribution-seat-N', name: 'North' },
        { cls: '.distribution-seat-S', name: 'South' },
        { cls: '.distribution-seat-W', name: 'West'  },
        { cls: '.distribution-seat-E', name: 'East'  }
    ];

    var found = false;
    dirs.forEach(function (d) {
        var el = document.querySelector(d.cls);
        if (!el) return;
        var text = readDistributionSeat(el, d.name);
        if (text) { found = true; speak(text); }
    });

    if (!found) speakNow('No distribution diagram found on this page.');
}

// ---------------------------------------------------------
// MutationObserver: korjaa uudet SVG:t dynaamisesti (SPA-navigaatio)
// ---------------------------------------------------------
var suitIconTimer = null;
var suitIconObserver = new MutationObserver(function (mutations) {
    var hasNew = false;
    for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) { hasNew = true; break; }
    }
    if (hasNew) {
        clearTimeout(suitIconTimer);
        suitIconTimer = setTimeout(fixCommentarySuitIcons, 400);
    }
});

// ---------------------------------------------------------
// Alustus
// ---------------------------------------------------------
setTimeout(fixCommentarySuitIcons, 900);
setTimeout(fixCommentarySuitIcons, 2600);  // toinen kierros hitaalle React-renderöinnille

suitIconObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// 26. VIDEO-CHAT BUTTONS – ACCESSIBLE NAMES
// =========================================================
// Funbridge sijoittaa jokaiselle istumapaikalle "video-chat" -ikkunan.
// Käyttäjän omalla paikalla (.video-chat-bottom) on kaksi nappia
// (.video-chat-button): oma mikrofoni ja oma kamera. Muilla paikoilla on
// yksi nappi (toisen pelaajan äänen mykistys). Yhdelläkään ei ole
// saavutettavaa nimeä – sisällä on vain koristeellinen <svg><use>.
//
// Periaate: JOKAINEN nappi nimetään suoraan OMAN <use href> -ikoninsa
// perusteella. Koska nimi tulee vain napin omasta ikonista, mikrofoni- ja
// kameranappi eivät voi mennä keskenään ristiin.
//   icon-mic*    → mikrofoni   (icon-mic_off* = pois päältä)
//   icon-video* / icon-camera* → kamera (icon-video_off* = pois)
//   icon-sounds* → toisen pelaajan äänen mykistys
// Tila päivittyy elävästi: ikoni vaihtuu kytkettäessä, ja MutationObserver
// rakentaa aria-labelin uudelleen heti.

var VIDEO_CARD_DIR_EN = {
    'video-chat-N': 'North',
    'video-chat-E': 'East',
    'video-chat-S': 'South',
    'video-chat-W': 'West'
};

function videoCardDirection(card) {
    if (!card) return null;
    for (var cls in VIDEO_CARD_DIR_EN) {
        if (card.classList.contains(cls)) return VIDEO_CARD_DIR_EN[cls];
    }
    return null;
}

// Napin sisällä olevan ikonin id (esim. "icon-video_off") pienaakkosin, tai ''.
function videoButtonIconId(button) {
    var use  = button.querySelector('svg use');
    var href = use ? (use.getAttribute('href') || use.getAttribute('xlink:href') || '') : '';
    return href.replace(/^#/, '').toLowerCase();
}

// Paneelin kytkimen (#toggleVideo) tila varatilanteeseen, jos kameranapin
// omaa ikonia ei tunnisteta. Palauttaa true=päällä / false=pois / null=ei löydy.
function panelToggleOn(id) {
    var input = document.getElementById(id);
    if (!input) return null;
    var label = input.closest('label');
    if (label && label.classList.contains('checked')) return true;
    if (label) return (typeof input.checked === 'boolean') ? input.checked : false;
    return (typeof input.checked === 'boolean') ? input.checked : null;
}

function applyVideoLabel(btn, label) {
    if (!label) return;
    if (btn.getAttribute('aria-label') !== label) {
        btn.setAttribute('aria-label', label);
    }
    // Ikoni on koristeellinen – piilota se ruudunlukijalta.
    var svg = btn.querySelector('svg');
    if (svg && svg.getAttribute('aria-hidden') !== 'true') {
        svg.setAttribute('aria-hidden', 'true');
        svg.setAttribute('focusable', 'false');
    }
}

// Nimeä JOKAINEN painike suoraan OMAN ikoninsa perusteella. Koska kunkin
// napin nimi tulee vain sen omasta ikonista, niitä ei voi mennä ristiin.
function fixVideoChatButtons() {
    document.querySelectorAll('button.video-chat-button').forEach(function (btn) {
        var icon   = videoButtonIconId(btn);
        var off    = /_off/.test(icon);
        var card   = btn.closest('.video-chat-card');
        var isSelf = !!(card && card.classList.contains('video-chat-bottom'));
        var dir    = videoCardDirection(card);
        var label  = null;

        if (/mic/.test(icon)) {
            label = isSelf ? (off ? 'Turn on microphone' : 'Turn off microphone')
                           : (off ? 'Microphone off'     : 'Microphone on');
        } else if (/video|camera|webcam|cam/.test(icon)) {
            label = isSelf ? (off ? 'Turn on camera' : 'Turn off camera')
                           : (off ? 'Camera off'     : 'Camera on');
        } else if (/sound/.test(icon)) {
            label = off ? ('Unmute ' + (dir || 'player'))
                        : ('Mute '   + (dir || 'player'));
        } else if (isSelf) {
            // Oman paikan ainoa muu nappi on kamera. Jos sen ikonia ei tunnisteta,
            // lue tila paneelin kamerakytkimestä (#toggleVideo).
            var camOn = panelToggleOn('toggleVideo');
            if (camOn === null) camOn = !off;
            label = camOn ? 'Turn off camera' : 'Turn on camera';
        } else {
            // Tunnistamaton vieras nappi = todennäköisesti äänen mykistys.
            label = off ? ('Unmute ' + (dir || 'player'))
                        : ('Mute '   + (dir || 'player'));
        }

        applyVideoLabel(btn, label);
    });
}

// ---------------------------------------------------------
// MutationObserver: päivitä nimet kun ikoni (tila) vaihtuu tai
// video-chat-ikkunat ilmestyvät/poistuvat. Tarkkailu rajataan
// video-chat-kontekstiin kuormituksen pitämiseksi pienenä.
// ---------------------------------------------------------
var videoChatTimer = null;
function scheduleVideoChatFix() {
    clearTimeout(videoChatTimer);
    videoChatTimer = setTimeout(fixVideoChatButtons, 250);
}

var videoChatObserver = new MutationObserver(function () {
    scheduleVideoChatFix();
});
var videoChatObserverStarted = false;

function ensureVideoChatObserver() {
    if (videoChatObserverStarted) return;
    var container = document.querySelector('.video-chat-container');
    if (!container) return;
    videoChatObserver.observe(container, {
        childList: true, subtree: true, attributes: true,
        attributeFilter: ['href', 'xlink:href', 'class']
    });
    videoChatObserverStarted = true;
    fixVideoChatButtons();
}

// ---------------------------------------------------------
// Alustus + varapollaus (video-chat latautuu usein viiveellä)
// ---------------------------------------------------------
setTimeout(function () { ensureVideoChatObserver(); fixVideoChatButtons(); }, 1000);
setTimeout(fixVideoChatButtons, 3000);
setInterval(function () { ensureVideoChatObserver(); fixVideoChatButtons(); }, 1500);

// =========================================================
// 27. RESULTS TABLES – CONTRACT ICON ACCESSIBILITY
// =========================================================
// Ongelma: Tulossivujen taulukoissa (esim. "Most played contracts"
// ja "View all contracts") sopimus näytetään pelkkänä SVG-ikonina:
//   <td> <div.bid> <div.img-bid-scale> <svg> <use href="#bid-3S"> ...
// SVG:llä ei ole tekstiä eikä aria-labelia, joten NVDA/JAWS lukee
// solun tyhjänä – sopimuksen maa (pata, hertta, ruutu, risti, NT)
// ja taso jäävät ruudunlukijalta kokonaan piiloon.
//
// Lisäksi "Maximum contract for N/S" -ruudukon sarakeotsikot ovat
// maa-SVG:itä (♠♥♦♣) ilman tekstiä.
//
// Ratkaisu (sama periaate kuin osio 25):
//   1. Sopimusikonin (.img-bid-scale svg) viereen lisätään sr-only
//      <span>, jonka teksti tulee olemassa olevasta
//      translateFunbridgeBid()-funktiosta (#bid-3S → "3 Spades",
//      #bid-2NT → "2 No Trump"). Alkuun \u00a0 jottei NVDA konkatenoi
//      edellisen solun tekstiin.
//   2. SVG merkitään aria-hidden="true" + focusable="false".
//   3. Maximum-contract-ruudukon maa-otsikot korjataan osion 25
//      olemassa olevalla fixSuitIconSvg()-funktiolla.
//   4. Selektorit on rajattu tarkasti tulostaulukoihin
//      (.img-bid-scale, .max-contract-table), EI elävään
//      tarjouslaatikkoon, jottei pelinaikaisiin painikkeisiin kosketa.
// =========================================================

var FB_CONTRACT_SR_CSS = [
    'position:absolute',
    'width:1px',
    'height:1px',
    'padding:0',
    'margin:-1px',
    'overflow:hidden',
    'clip:rect(0,0,0,0)',
    'white-space:nowrap',
    'border:0'
].join(';');

// Lue sopimus SVG-ikonista tekstiksi.
//   #bid-3S  → "3 Spades"   #bid-2NT → "2 No Trump"
// Varalla: jos kyseessä on pelkkä maa-sprite (#icon-spade), palauta maa.
function contractTextFromBidSvg(svgEl) {
    var use = svgEl.querySelector('use');
    if (!use) return null;
    var href = use.getAttribute('href') || use.getAttribute('xlink:href') || '';
    if (!href) return null;
    var id = href.replace(/^#/, '');

    // Funbridgen tarjous-/sopimusikoni: #bid-3S, #bid-2NT, ...
    if (/^bid-/i.test(id)) {
        var text = translateFunbridgeBid('#' + id);
        if (!text || text === 'unknown bid' || text === id.toUpperCase()) return null;
        return text;
    }

    // Varatapaus: sopimus esitettäisiin pelkkänä maa-spritenä.
    if (typeof SUIT_ICON_HREF_MAP !== 'undefined' && SUIT_ICON_HREF_MAP[id]) {
        return SUIT_ICON_HREF_MAP[id];
    }
    return null;
}

function fixContractIconSvg(svgEl) {
    if (svgEl.getAttribute('data-fb-a11y-contract-done')) return;
    var text = contractTextFromBidSvg(svgEl);
    if (!text) return;

    svgEl.setAttribute('data-fb-a11y-contract-done', '1');
    svgEl.setAttribute('aria-hidden', 'true');
    svgEl.setAttribute('focusable', 'false');

    var span = document.createElement('span');
    span.className = 'fb-contract-label';
    // \u00a0 alkuun: estää NVDA:ta liittämästä sopimusta edelliseen tekstiin.
    span.textContent = '\u00a0' + text;
    span.style.cssText = FB_CONTRACT_SR_CSS;

    if (svgEl.nextSibling) {
        svgEl.parentNode.insertBefore(span, svgEl.nextSibling);
    } else {
        svgEl.parentNode.appendChild(span);
    }
}

// Korjaa sopimusikonit VAIN tulostaulukoissa.
function fixContractIcons() {
    // 1. Most played contracts + View all contracts: skaalattu sopimusikoni.
    document.querySelectorAll('.img-bid-scale svg').forEach(fixContractIconSvg);

    // 2. Maximum contract -ruudukon maa-otsikot (♠♥♦♣) – käytä osion 25
    //    olemassa olevaa maa-ikonikorjausta. Tekee no-opin, jos hrefiä
    //    ei tunnisteta maaksi, joten muut SVG:t jäävät rauhaan.
    if (typeof fixSuitIconSvg === 'function') {
        document.querySelectorAll('.max-contract-table svg').forEach(fixSuitIconSvg);
    }
}

// ---------------------------------------------------------
// MutationObserver: korjaa uudet taulukot dynaamisesti.
// Tulossivu ja "View all contracts" -laajennus renderöidään
// React-puolella viiveellä, joten tarkkaillaan + pollataan kevyesti.
// ---------------------------------------------------------
var contractIconTimer = null;
var contractIconObserver = new MutationObserver(function (mutations) {
    var hasNew = false;
    for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length > 0) { hasNew = true; break; }
    }
    if (hasNew) {
        clearTimeout(contractIconTimer);
        contractIconTimer = setTimeout(fixContractIcons, 400);
    }
});

// ---------------------------------------------------------
// Alustus + varakierrokset hitaalle React-renderöinnille
// ---------------------------------------------------------
setTimeout(fixContractIcons, 900);
setTimeout(fixContractIcons, 2600);

contractIconObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// 28. SETTINGS TOGGLES – SWITCH STATE ACCESSIBILITY
// =========================================================
// Ongelma: Funbridgen asetussivujen kytkimet ovat custom-toggleja:
//   <label.switch-checkbox[.checked]>
//     <input type="checkbox">                 (visuaalisesti piilotettu)
//     <span><span>Selitysteksti</span></span>
//     <div.switch-checkbox-switch> ...kuvat... </div>
//   </label>
// Tila näkyy vain labelin "checked"-luokasta ja piilotetusta inputista,
// joten ruudunlukija lukee selitystekstin muttei kerro onko asetus
// päällä vai pois.
//
// Ratkaisu: tehdään labelista oikea kytkin (role="switch"), jolla on
//   - aria-label   = selitysteksti
//   - aria-checked = todellisen tilan mukaan (input.checked, varalla luokka)
//   - tabindex=0 ja näppäimistökäyttö (Väli/Enter)
// Piilotettu input piilotetaan myös ruudunlukijalta (aria-hidden,
// tabindex=-1), jottei synny kaksoisilmoitusta. aria-checked pidetään
// ajan tasalla inputin change-tapahtumalla JA labelin luokkamuutoksilla.

function fbToggleIsOn(label) {
    // input.checked on reaaliaikainen totuus heti klikkauksen jälkeen;
    // "checked"-luokka taas päivittyy Reactissa pienellä viiveellä.
    var input = label.querySelector('input[type="checkbox"]');
    if (input) return !!input.checked;
    return label.classList.contains('checked');
}

function fbSyncToggle(label) {
    label.setAttribute('aria-checked', fbToggleIsOn(label) ? 'true' : 'false');
}

function fbEnhanceToggle(label) {
    if (label.getAttribute('data-fb-a11y-switch') === '1') return;
    var input = label.querySelector('input[type="checkbox"]');
    if (!input) return;

    label.setAttribute('data-fb-a11y-switch', '1');
    label.setAttribute('role', 'switch');
    if (!label.hasAttribute('tabindex')) label.setAttribute('tabindex', '0');

    // Saavutettava nimi selitystekstistä (kuvat eivät tuota tekstiä).
    var name = (label.textContent || '').replace(/\s+/g, ' ').trim();
    if (name) label.setAttribute('aria-label', name);

    fbSyncToggle(label);

    // Estä kaksoisilmoitus piilotetusta inputista.
    input.setAttribute('aria-hidden', 'true');
    input.setAttribute('tabindex', '-1');

    // Näppäimistö: Väli/Enter vaihtaa tilan (sama polku kuin hiiriklikkaus).
    label.addEventListener('keydown', function (e) {
        if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'Enter') {
            e.preventDefault();
            input.click();
        }
    });

    // Pidä aria-checked ajan tasalla molemmista lähteistä.
    input.addEventListener('change', function () { fbSyncToggle(label); });
    var mo = new MutationObserver(function () { fbSyncToggle(label); });
    mo.observe(label, { attributes: true, attributeFilter: ['class'] });
}

function fbEnhanceSettings() {
    document.querySelectorAll('label.switch-checkbox').forEach(fbEnhanceToggle);
}

// ---------------------------------------------------------
// Alustus + observer (asetussivut renderöityvät Reactissa viiveellä)
// ---------------------------------------------------------
var settingsA11yTimer = null;
var settingsA11yObserver = new MutationObserver(function (mutations) {
    var added = false;
    for (var i = 0; i < mutations.length; i++) {
        if (mutations[i].addedNodes.length) { added = true; break; }
    }
    if (added) {
        clearTimeout(settingsA11yTimer);
        settingsA11yTimer = setTimeout(fbEnhanceSettings, 300);
    }
});

setTimeout(fbEnhanceSettings, 800);
setTimeout(fbEnhanceSettings, 2500);
settingsA11yObserver.observe(document.body, { childList: true, subtree: true });

// =========================================================
// 29. LIBRARY – ACCESSIBLE DEAL LIST (Alt+L)
// =========================================================
// Ongelma: Kirjastonäkymän jakoluettelo (#infinite-scroll-list-container)
// on virtualisoitu "infinite scroll" -lista. Rivit syntyvät ja katoavat
// vierityksen mukaan eikä niissä ole listasemantiikkaa, joten
// ruudunlukijalla jakoja ei voi selata luotettavasti: rivit katoavat
// virtuaalikohdistimen alta, määrä ei ole tiedossa eikä loppuun pääse.
//
// Ratkaisu: jakojen tiedot luetaan suoraan Reactin Fiber-puusta (sama
// tekniikka kuin erillisessä analyysiskriptissä) ja näytetään omassa
// modaalissa valintaikkunassa OIKEANA HTML-listana, jossa jokainen jako
// on tavallinen <button> <li>:n sisällä. Lista ei virtualisoidu, joten
// NVDA/JAWS voi selata sitä sekä selaus- että lomaketilassa.
//
// Fiber-datassa on paljon enemmän kuin rivillä näkyy: nimi, päiväys,
// tagit, kommentti, jakaja, vyöhykkeet, tarjoussarja ja kaikki neljä
// kättä. Siksi jaosta voi myös lukea koko sisällön avaamatta sitä.
//
// Näppäimet:
//   Alt+L            avaa/sulkee kirjaston jakoluettelon
//   Nuoli ylös/alas  liikkuu jakojen välillä (lomaketila)
//   Home / End       ensimmäinen / viimeinen jako
//   Enter            avaa jaon tiedot (kädet, tarjoukset, sopimus)
//   Escape           takaisin listaan / sulkee ikkunan

var fbLibraryOpen        = false;   // luetaan myös osiossa 21 (näppäinkuuntelijat)
var fbLibraryEl          = null;
var fbLibraryDeals       = [];
var fbLibraryFiltered    = [];
var fbLibraryView        = 'list';  // 'list' | 'details'
var fbLibraryIndex       = 0;
var fbLibraryLoading     = false;
var fbLibraryAutoLoaded  = false;
var fbLibraryLastFocus   = null;
var fbLibraryFilterText  = '';

// ---------------------------------------------------------
// 29a. React-datan silta sivun omaan JS-maailmaan
// ---------------------------------------------------------
// Laajennuksen content script ajetaan eristetyssä maailmassa
// (isolated world). Se näkee saman DOMin kuin sivu, mutta EI sivun
// skriptien DOM-elementteihin lisäämiä JS-ominaisuuksia. Reactin
// "__reactFiber$..." on juuri tällainen ominaisuus, joten se näkyy
// konsolista (sivun maailma) mutta ei laajennuksesta. Tästä syystä
// aiempi versio ei löytänyt yhtään jakoa, vaikka sama koodi toimi
// konsoliin liitettynä.
//
// Ratkaisu: jakojen keruu ajetaan sivun omassa maailmassa ja tulos
// välitetään takaisin jaetun DOMin kautta (JSON <script>-elementissä).
// Silta saadaan paikalleen kolmella tavalla, tässä järjestyksessä:
//   1. manifestin content script, jossa "world": "MAIN"  (suositeltavin)
//   2. inline-skriptin injektointi (toimii jos sivun CSP sallii)
//   3. web_accessible_resources -tiedosto fb-library-bridge.js
//
// fbLibBridgeMain sisältää koko sivun maailmassa ajettavan logiikan.
// Se on tarkoituksella itsenäinen funktio: se muunnetaan merkkijonoksi
// injektointia varten, joten se ei saa viitata ulkopuolisiin muuttujiin.

function fbLibBridgeMain(silent) {
    // Näitä avaimia ei seurata koskaan (DOM-solmut, React-sisäiset viitteet).
    var SKIP = {
        stateNode: 1, _owner: 1, _store: 1, _debugOwner: 1, _debugSource: 1,
        _debugHookTypes: 1, containerInfo: 1, ownerDocument: 1, _reactInternals: 1
    };

    // Fiber-puun rakenteelliset linkit: seurataan vasta viimeisessä
    // vaiheessa, muuten sama data käydään läpi kymmeniä kertoja.
    var LINKS = {
        'return': 1, child: 1, sibling: 1, alternate: 1,
        firstEffect: 1, nextEffect: 1, dependencies: 1
    };

    function findFiber(el) {
        if (!el) return null;

        var targets = [el];
        // Firefox: sivun ominaisuudet näkyvät wrappedJSObjectin kautta.
        try { if (el.wrappedJSObject) targets.push(el.wrappedJSObject); } catch (e) {}

        for (var t = 0; t < targets.length; t++) {
            var keys;
            try { keys = Object.getOwnPropertyNames(targets[t]); } catch (e2) { continue; }
            for (var i = 0; i < keys.length; i++) {
                if (keys[i].indexOf('__reactFiber$') === 0 ||
                    keys[i].indexOf('__reactInternalInstance$') === 0) {
                    return targets[t][keys[i]];
                }
            }
        }
        return null;
    }

    function isDeal(o) {
        return !!o && typeof o === 'object' && !Array.isArray(o) &&
               Object.prototype.hasOwnProperty.call(o, 'dealId') &&
               (o.playerHands || o.distribution || typeof o.name === 'string');
    }

    // Iteratiivinen läpikäynti: rajattu syvyys ja solmubudjetti, jotta
    // sivu ei jumitu. Palauttaa jäljelle jääneen budjetin.
    function scan(rootObj, out, seen, budget, maxDepth, followLinks) {
        if (!rootObj || typeof rootObj !== 'object') return budget;

        var stack = [{ v: rootObj, d: 0 }];

        while (stack.length) {
            if (budget-- <= 0) break;

            var item = stack.pop();
            var v = item.v;
            var d = item.d;

            if (!v || typeof v !== 'object' || d > maxDepth) continue;
            if (seen.has(v)) continue;
            seen.add(v);

            if (v === window || (typeof Node !== 'undefined' && v instanceof Node)) continue;

            if (Array.isArray(v)) {
                if (v.length && isDeal(v[0])) out.push(v);
                for (var i = 0; i < v.length && i < 500; i++) {
                    if (v[i] && typeof v[i] === 'object') stack.push({ v: v[i], d: d + 1 });
                }
                continue;
            }

            if (isDeal(v)) { out.push([v]); continue; }

            var keys;
            try { keys = Object.keys(v); } catch (e) { continue; }

            for (var k = 0; k < keys.length && k < 300; k++) {
                var key = keys[k];
                if (SKIP[key]) continue;
                if (!followLinks && LINKS[key]) continue;

                var child;
                try { child = v[key]; } catch (e2) { continue; }
                if (!child || typeof child !== 'object') continue;

                // Hook- ja efektiketjut kulkevat next-linkkiä pitkin ja voivat
                // olla kymmeniä alkioita pitkiä, joten ne eivät saa kuluttaa
                // syvyysbudjettia.
                stack.push({ v: child, d: (key === 'next') ? d : d + 1 });
            }
        }

        return budget;
    }

    function collect() {
        var container = document.getElementById('infinite-scroll-list-container');
        var fiber = findFiber(container) ||
                    findFiber(document.querySelector('.fb-table')) ||
                    findFiber(document.getElementById('root'));

        if (!fiber) return { source: 'no-fiber', deals: [] };

        var arrays = [];
        var source = 'none';

        // Vaihe 1: vanhempien hook-tila ja efektit (nopein, tavallisin).
        var seen1 = new WeakSet();
        var node = fiber;
        var levels = 0;
        while (node && levels < 40) {
            var alt = node.alternate;
            var roots = [node.memoizedState, node.updateQueue,
                         alt && alt.memoizedState, alt && alt.updateQueue];
            for (var r = 0; r < roots.length; r++) {
                if (roots[r] && typeof roots[r] === 'object') {
                    scan(roots[r], arrays, seen1, 20000, 14, false);
                }
            }
            node = node['return'];
            levels++;
        }
        if (arrays.length) source = 'react-state';

        // Vaihe 2: vanhempien propsit.
        if (!arrays.length) {
            var seen2 = new WeakSet();
            var node2 = fiber;
            var lev2 = 0;
            while (node2 && lev2 < 40) {
                var alt2 = node2.alternate;
                var roots2 = [node2.memoizedProps, node2.pendingProps,
                              alt2 && alt2.memoizedProps];
                for (var r2 = 0; r2 < roots2.length; r2++) {
                    if (roots2[r2] && typeof roots2[r2] === 'object') {
                        scan(roots2[r2], arrays, seen2, 20000, 12, false);
                    }
                }
                node2 = node2['return'];
                lev2++;
            }
            if (arrays.length) source = 'react-props';
        }

        // Vaihe 3: koko Fiber-puu (raskain, mutta varmin).
        if (!arrays.length) {
            scan(fiber, arrays, new WeakSet(), 250000, 20, true);
            if (arrays.length) source = 'react-tree';
        }

        // Pisin taulukko ensin: se on todennäköisimmin koko lista.
        arrays.sort(function (a, b) { return b.length - a.length; });

        var byId = {};
        var list = [];

        arrays.forEach(function (arr) {
            arr.forEach(function (deal) {
                if (!isDeal(deal)) return;
                var id = String(deal.dealId);
                if (byId[id]) return;
                byId[id] = deal;
                list.push(deal);
            });
        });

        return { source: source, deals: list };
    }

    // Vain tarvittavat kentät ja vain yksinkertaisia arvoja: tulos
    // siirtyy JSONina maailmasta toiseen.
    function pick(d) {
        function str(v) { return typeof v === 'string' ? v : (v == null ? '' : String(v)); }
        function num(v) { return typeof v === 'number' ? v : 0; }

        var hands = d.playerHands || {};

        return {
            dealId       : (typeof d.dealId === 'number' || typeof d.dealId === 'string') ? d.dealId : String(d.dealId),
            name         : str(d.name),
            description  : str(d.description),
            tags         : Array.isArray(d.tags) ? d.tags.map(str).slice(0, 30) : [],
            creationDate : num(d.creationDate),
            lastPlayedDate: num(d.lastPlayedDate),
            gameMode     : num(d.gameMode),
            dealer       : str(d.dealer),
            vulnerability: str(d.vulnerability),
            bids         : str(d.bids),
            sharedUrl    : str(d.sharedUrl),
            distribution : str(d.distribution),
            playerHands  : {
                north: str(hands.north), east: str(hands.east),
                south: str(hands.south), west: str(hands.west)
            }
        };
    }

    // -----------------------------------------------------
    // Jaon aktivointi (rivin klikkaus sivun omassa maailmassa)
    // -----------------------------------------------------
    // Virtualisoidussa listassa rivin DOM-elementti ei aina ole
    // löydettävissä tekstin perusteella, ja klikkauksen käsittelijä on
    // Reactin propseissa. Siksi rivi etsitään Fiber-puusta: haetaan
    // syvin komponentti, jonka propseissa on juuri tämä jako, ja
    // klikataan sen host-elementtiä oikealla tapahtumasarjalla.

    function objHasDeal(o, id, depth) {
        if (!o || typeof o !== 'object' || depth > 3) return false;

        if (Array.isArray(o)) {
            // Koko listan sisältävä taulukko ei ole yksittäinen rivi.
            if (o.length > 1 && isDeal(o[0])) return false;
            for (var i = 0; i < o.length && i < 40; i++) {
                if (objHasDeal(o[i], id, depth + 1)) return true;
            }
            return false;
        }

        if (isDeal(o)) return String(o.dealId) === id;

        var keys;
        try { keys = Object.keys(o); } catch (e) { return false; }

        for (var k = 0; k < keys.length && k < 60; k++) {
            var key = keys[k];
            if (SKIP[key] || LINKS[key]) continue;
            var v;
            try { v = o[key]; } catch (e2) { continue; }
            if (v && typeof v === 'object' && objHasDeal(v, id, depth + 1)) return true;
        }
        return false;
    }

    function hostElementOf(fiber) {
        if (fiber.stateNode && fiber.stateNode.nodeType === 1) return fiber.stateNode;

        var queue = [fiber.child];
        var guard = 0;
        while (queue.length && guard++ < 800) {
            var f = queue.shift();
            if (!f) continue;
            if (f.stateNode && f.stateNode.nodeType === 1) return f.stateNode;
            if (f.child) queue.push(f.child);
            if (f.sibling) queue.push(f.sibling);
        }
        return null;
    }

    // Etsii SYVIMMÄN komponentin, jonka propseissa on kyseinen jako.
    function findRowElement(dealId) {
        var startEl = document.getElementById('infinite-scroll-list-container') ||
                      document.getElementById('root');
        var fiber = findFiber(startEl);
        if (!fiber) return null;

        var root = fiber;
        var up = 0;
        while (root['return'] && up++ < 300) root = root['return'];

        var id = String(dealId);
        var best = null;
        var bestDepth = -1;

        var stack = [{ f: root, d: 0 }];
        var visited = 0;

        while (stack.length && visited++ < 40000) {
            var item = stack.pop();
            var f = item.f;
            if (!f) continue;

            var match = false;
            try { match = objHasDeal(f.memoizedProps, id, 0); } catch (e) { match = false; }

            if (match && item.d > bestDepth) {
                var el = hostElementOf(f);
                if (el) { best = el; bestDepth = item.d; }
            }

            if (f.child)   stack.push({ f: f.child,   d: item.d + 1 });
            if (f.sibling) stack.push({ f: f.sibling, d: item.d });
        }

        return best;
    }

    function clickElement(el) {
        try { el.scrollIntoView({ block: 'center' }); } catch (e) {}

        var rect = el.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        var base = {
            bubbles: true, cancelable: true, view: window,
            clientX: cx, clientY: cy, button: 0, buttons: 1,
            pointerId: 1, isPrimary: true, pointerType: 'mouse'
        };

        var sequence = [
            ['pointerover', base], ['pointerenter', base],
            ['mouseover', base], ['pointerdown', base], ['mousedown', base],
            ['pointerup', Object.assign({}, base, { buttons: 0 })],
            ['mouseup',   Object.assign({}, base, { buttons: 0 })],
            ['click',     Object.assign({}, base, { buttons: 0 })]
        ];

        for (var i = 0; i < sequence.length; i++) {
            var type = sequence[i][0];
            var opts = sequence[i][1];
            var Ctor = (type.indexOf('pointer') === 0 && typeof PointerEvent !== 'undefined')
                ? PointerEvent : MouseEvent;
            try { el.dispatchEvent(new Ctor(type, opts)); } catch (e2) {}
        }
    }

    // Rivi voi löytyä kolmella tavalla. Ensimmäinen on tarkin, mutta jos
    // rivikomponentti ei kanna koko jako-oliota propseissaan, käytetään
    // renderöityjen elementtien omia fibereitä tai lopuksi nimen tekstiä.
    // Kerää elementit myös shadow DOMin sisältä: virtualisoitu lista voi
    // renderöityä varjojuureen, jolloin tavallinen querySelectorAll ei
    // näe rivejä lainkaan.
    function allElements(root, out, cap) {
        var els;
        try { els = root.querySelectorAll('*'); } catch (e) { return out; }
        for (var i = 0; i < els.length; i++) {
            if (out.length >= cap) return out;
            var el = els[i];
            out.push(el);
            if (el.shadowRoot) allElements(el.shadowRoot, out, cap);
        }
        return out;
    }

    function rowSearchElements(cap) {
        var scope = document.getElementById('infinite-scroll-list-container');
        var out = [];
        if (scope) allElements(scope, out, cap);
        // Rivit voivat olla myös listan ulkopuolella (portaali, varjojuuri).
        if (out.length < cap) allElements(document.body, out, cap);
        return out;
    }

    function findRowByRenderedFibers(id) {
        var els = rowSearchElements(6000);
        var limit = els.length;

        for (var i = 0; i < limit; i++) {
            var el = els[i];
            if (el.closest('#fb-library-dialog, #fb-help-dialog, #fb-a11y-live, [data-fb-a11y]')) continue;

            var f = findFiber(el);
            var up = 0;

            while (f && up++ < 8) {
                var hit = false;
                try {
                    hit = objHasDeal(f.memoizedProps, id, 0) ||
                          objHasDeal(f.memoizedState, id, 0);
                } catch (e) { hit = false; }
                if (hit) return el;
                f = f['return'];
            }
        }
        return null;
    }

    function findRowByText(id) {
        var deal = lastDealsById[String(id)];
        var name = deal && deal.name ? String(deal.name).replace(/\s+/g, ' ').trim() : '';
        if (!name) return null;

        var els = rowSearchElements(6000);
        var limit = els.length;

        for (var i = 0; i < limit; i++) {
            var el = els[i];
            if (el.children.length) continue;
            if (el.closest('#fb-library-dialog, #fb-help-dialog, #fb-a11y-live, [data-fb-a11y]')) continue;
            var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (text === name) return el;
        }
        return null;
    }

    function rowAncestor(el) {
        try {
            var row = el.closest('[class*="row"], [class*="line"], [class*="item"], tr, li, a, button');
            if (row) return row;
        } catch (e) {}
        return el;
    }

    function locateRow(dealId) {
        var id = String(dealId);
        var el = null;

        try { el = findRowElement(id); } catch (e) {}
        if (el) return { el: el, how: 'fiber-props' };

        try { el = findRowByRenderedFibers(id); } catch (e2) {}
        if (el) return { el: el, how: 'rendered-fiber' };

        try { el = findRowByText(id); } catch (e3) {}
        if (el) return { el: el, how: 'text' };

        return null;
    }

    function activateDeal(dealId) {
        var found = locateRow(dealId);
        if (!found) return 'not-found';

        clickElement(rowAncestor(found.el));
        return 'clicked:' + found.how;
    }

    var lastDealsById = {};

    function payload() {
        var res;
        try {
            res = collect();
        } catch (e) {
            res = { source: 'error', deals: [], error: String(e && e.message ? e.message : e) };
        }
        return {
            source: res.source,
            error : res.error || null,
            deals : res.deals.map(function (d) {
                try {
                    var picked = pick(d);
                    lastDealsById[String(picked.dealId)] = picked;
                    return picked;
                } catch (e2) { return null; }
            }).filter(Boolean)
        };
    }

    // Hiljainen tila: palautetaan rajapinta ilman kuuntelijoita.
    // Tätä käyttää content script siltä varalta, että se sattuu jo
    // ajautumaan sivun omassa maailmassa (tai Firefoxin wrappedJSObject
    // riittää).
    if (silent) return { collect: payload, activate: activateDeal };

    function publish() {
        var data = payload();
        var node = document.getElementById('fb-a11y-library-data');
        if (!node) {
            node = document.createElement('script');
            node.type = 'application/json';
            node.id   = 'fb-a11y-library-data';
            document.documentElement.appendChild(node);
        }
        node.textContent = JSON.stringify(data);
        return data;
    }

    document.addEventListener('fb-a11y-collect-deals', function () { publish(); });

    // Content script pyytää jaon avaamista: haluttu dealId luetaan
    // jaetusta DOM-attribuutista ja tulos kirjoitetaan takaisin.
    document.addEventListener('fb-a11y-activate-deal', function () {
        var node = document.getElementById('fb-a11y-library-data');
        var id   = node ? node.getAttribute('data-fb-request-deal') : null;
        var result = 'not-found';
        if (id) {
            try { result = activateDeal(id); }
            catch (e) { result = 'error'; }
        }
        document.documentElement.setAttribute('data-fb-activate-result', result);
    });
    document.documentElement.setAttribute('data-fb-a11y-bridge', '1');

    // Kertoo, löytyykö tietty jako sivulta ja millä keinolla.
    window.fbLibDebugOpen = function (dealId) {
        payload();   // varmistetaan että nimet ovat välimuistissa
        var found = null;
        try { found = locateRow(dealId); } catch (e) {}
        var info = {
            dealId: String(dealId),
            found: !!found,
            how: found ? found.how : null,
            element: found ? found.el : null,
            renderedRowCandidates: (document.getElementById('infinite-scroll-list-container') ||
                                    document.body).querySelectorAll('*').length
        };
        console.log('Funbridge a11y open debug:', info);
        return info;
    };

    window.fbLibDebug = function () {
        var data = publish();
        var info = {
            containerFound: !!document.getElementById('infinite-scroll-list-container'),
            source: data.source,
            error: data.error,
            deals: data.deals.length,
            firstDeal: data.deals[0] || null
        };
        console.log('Funbridge a11y library bridge:', info);
        return info;
    };

    publish();
}

var fbLibDataSource   = 'none';   // diagnostiikkaa varten
var fbLibBridgeState  = 'idle';   // idle | ready | inline-blocked | file-pending | unavailable
var fbLibLocalApi     = null;

function fbLibBridgeReady() {
    return document.documentElement.getAttribute('data-fb-a11y-bridge') === '1';
}

// Yrittää saada sillan paikalleen. Palauttaa true, jos silta on valmis.
function fbLibEnsureBridge() {
    if (fbLibBridgeReady()) { fbLibBridgeState = 'ready'; return true; }
    if (fbLibBridgeState === 'file-pending' || fbLibBridgeState === 'unavailable') return false;

    // 1) Inline-injektio: toimii, jos sivun CSP sallii.
    if (fbLibBridgeState === 'idle') {
        try {
            var s = document.createElement('script');
            s.textContent = '(' + fbLibBridgeMain.toString() + ')();';
            (document.head || document.documentElement).appendChild(s);
            if (s.parentNode) s.parentNode.removeChild(s);
        } catch (e) {
            console.warn('Funbridge a11y: inline bridge injection failed', e);
        }

        if (fbLibBridgeReady()) { fbLibBridgeState = 'ready'; return true; }
        fbLibBridgeState = 'inline-blocked';
    }

    // 2) Erillinen tiedosto (vaatii manifestiin web_accessible_resources).
    if (fbLibBridgeState === 'inline-blocked') {
        var url = null;
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getURL) {
                url = chrome.runtime.getURL('fb-library-bridge.js');
            } else if (typeof browser !== 'undefined' && browser.runtime && browser.runtime.getURL) {
                url = browser.runtime.getURL('fb-library-bridge.js');
            }
        } catch (e2) { url = null; }

        if (!url) { fbLibBridgeState = 'unavailable'; return false; }

        var tag = document.createElement('script');
        tag.src = url;
        tag.addEventListener('load', function () {
            fbLibBridgeState = fbLibBridgeReady() ? 'ready' : 'unavailable';
            if (tag.parentNode) tag.parentNode.removeChild(tag);
        });
        tag.addEventListener('error', function () {
            fbLibBridgeState = 'unavailable';
            console.warn('Funbridge a11y: fb-library-bridge.js could not be loaded. ' +
                         'Add it to the extension folder and to web_accessible_resources, ' +
                         'or load it as a content script with "world": "MAIN".');
        });
        (document.head || document.documentElement).appendChild(tag);

        fbLibBridgeState = 'file-pending';
    }

    return fbLibBridgeReady();
}

function fbLibReadBridgePayload() {
    var node = document.getElementById('fb-a11y-library-data');
    if (!node) return null;
    try { return JSON.parse(node.textContent || 'null'); } catch (e) { return null; }
}

// Kerää jaot: ensisijaisesti sillan kautta, toissijaisesti suoraan
// (jos koodi sattuu ajautumaan sivun maailmassa).
function fbLibCollectDeals() {
    fbLibDataSource = 'none';

    if (fbLibEnsureBridge()) {
        try {
            document.dispatchEvent(new CustomEvent('fb-a11y-collect-deals'));
        } catch (e) {
            console.warn('Funbridge a11y: bridge request failed', e);
        }

        var payload = fbLibReadBridgePayload();
        if (payload && payload.deals && payload.deals.length) {
            fbLibDataSource = payload.source || 'react';
            return payload.deals;
        }
        if (payload && payload.error) {
            console.warn('Funbridge a11y: bridge reported an error', payload.error);
        }
    }

    // Suora yritys (sivun maailma / Firefoxin wrappedJSObject).
    try {
        if (!fbLibLocalApi) fbLibLocalApi = fbLibBridgeMain(true);
        var direct = fbLibLocalApi.collect();
        if (direct && direct.deals.length) {
            fbLibDataSource = direct.source || 'react';
            return direct.deals;
        }
    } catch (e2) {
        console.warn('Funbridge a11y: direct React read failed', e2);
    }

    return [];
}

// Varasuunnitelma: jos React-dataa ei saada, luetaan näkyvien rivien
// tekstit. Lista sisältää myös <style>-elementtejä ja tyhjiä
// apu-divejä, joten rivit seulotaan.
function fbLibLooksLikeRow(el) {
    if (!el || el.nodeType !== 1) return false;
    var tag = el.tagName;
    if (tag === 'STYLE' || tag === 'SCRIPT' || tag === 'LINK' ||
        tag === 'NOSCRIPT' || tag === 'TEMPLATE') return false;

    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text) return false;

    // CSS-katkelmat pois (esim. containerin @keyframes-tyyli).
    if (/[{}]/.test(text) && /(@keyframes|opacity|transform|px|%)/.test(text)) return false;

    return true;
}

function fbLibRowsIn(parent) {
    if (!parent) return [];
    var kids = Array.prototype.slice.call(parent.children).filter(fbLibLooksLikeRow);
    // Rivit voivat olla yhden kääre-elementin sisällä.
    if (kids.length === 1 && kids[0].children.length > 1) {
        var inner = Array.prototype.slice.call(kids[0].children).filter(fbLibLooksLikeRow);
        if (inner.length > 1) return inner;
    }
    return kids;
}

function fbLibDealsFromDom() {
    var cont = document.getElementById('infinite-scroll-list-container');
    if (!cont) return [];

    // Virtualisoitu lista voi renderöidä rivit myös sisar- tai
    // vanhempielementtiin, joten kokeillaan useaa vaihtoehtoa.
    var candidates = [cont, cont.nextElementSibling, cont.parentElement];
    var rows = [];

    for (var c = 0; c < candidates.length; c++) {
        var found = fbLibRowsIn(candidates[c]);
        if (found.length > rows.length) rows = found;
    }

    var out = [];
    rows.forEach(function (row, i) {
        var text = (row.textContent || '').replace(/\s+/g, ' ').trim();
        if (!text) return;
        out.push({
            dealId: 'dom-' + i,
            name: text,
            tags: [],
            description: '',
            __domRow: row,
            __fromDom: true
        });
    });

    if (out.length) fbLibDataSource = 'dom';
    return out;
}

// Silta asennetaan jo sivun latauksessa, jotta data on valmiina
// ensimmäisellä Alt+L:llä.
setTimeout(fbLibEnsureBridge, 1200);

// ---------------------------------------------------------
// 29b. Jakodatan muotoilu tekstiksi
// ---------------------------------------------------------

// Funbridgen tallennusmuodossa esiintyneet koodit: N, A, E ja L.
// N ja A ovat varmoja (ei ketään / kaikki). E ja L tarkoittavat toista
// linjaa kumpikin, mutta kumpi on kumpi ei ole varmistettu, joten ne
// näytetään koodina eikä arvata väärin. Kun merkitys varmistuu esim.
// vertaamalla yhteen tunnettuun jakoon, riittää lisätä rivi tähän
// taulukkoon (esim. 'E': 'East-West vulnerable').
var FB_LIB_VULNERABILITY = {
    'N' : 'None vulnerable',
    '0' : 'None vulnerable',
    'A' : 'All vulnerable',
    'NS': 'North-South vulnerable',
    'EW': 'East-West vulnerable'
};

function fbLibVulnerabilityText(raw) {
    if (!raw) return '';
    var code = String(raw).toUpperCase();
    return FB_LIB_VULNERABILITY[code] ||
           ('Vulnerability code ' + code + ' (one side vulnerable)');
}

var FB_LIB_HCP_VALUE = { 'A': 4, 'K': 3, 'Q': 2, 'J': 1 };

function fbLibHandCards(handStr) {
    if (!handStr || typeof handStr !== 'string') return [];

    var cards = [];
    handStr.split('-').forEach(function (tok) {
        tok = tok.trim().toUpperCase();
        if (tok.length < 2) return;

        var suitLetter = tok.charAt(tok.length - 1);
        var rank       = tok.slice(0, tok.length - 1);
        if (rank === 'T') rank = '10';

        var suitEn = SUIT_LETTER_TO_EN[suitLetter];
        if (!suitEn || !CARD_RANK[rank]) return;

        cards.push({ suit: suitEn, rank: rank });
    });
    return cards;
}

function fbLibFormatHand(handStr) {
    var cards = fbLibHandCards(handStr);
    if (!cards.length) return '';

    var parts = [];
    SUIT_ORDER_EN.forEach(function (suit) {
        var vals = cards
            .filter(function (c) { return c.suit === suit; })
            .sort(function (a, b) { return CARD_RANK[b.rank] - CARD_RANK[a.rank]; })
            .map(function (c) { return rankWord(c.rank); });

        parts.push(SUIT_EN_TO_PLURAL[suit] + ': ' + (vals.length ? vals.join(' ') : 'void'));
    });
    return parts.join('. ');
}

function fbLibHcp(handStr) {
    return fbLibHandCards(handStr).reduce(function (sum, c) {
        return sum + (FB_LIB_HCP_VALUE[c.rank] || 0);
    }, 0);
}

// Tarjoussarja on muotoa "PAN-PAE-2NS-PAW-3CN-...":
// tarjous + tarjoajan ilmansuunta (+ mahdollinen lisäkirjain).
function fbLibParseBids(bidStr) {
    if (!bidStr || typeof bidStr !== 'string') return [];

    var out = [];
    bidStr.split('-').forEach(function (tok) {
        var m = tok.trim().toUpperCase().match(/^(PA|X1|X2|([1-7])([CDHSN]))([NESW])/);
        if (!m) return;

        var dir = m[4];

        if (m[2]) {
            var strainText = (m[3] === 'N')
                ? 'No Trump'
                : SUIT_EN_TO_PLURAL[SUIT_LETTER_TO_EN[m[3]]];
            out.push({ type: 'bid', level: m[2], strain: m[3], dir: dir,
                       text: m[2] + ' ' + strainText });
            return;
        }

        if (m[1] === 'PA') { out.push({ type: 'pass',     dir: dir, text: 'Pass' });     return; }
        if (m[1] === 'X1') { out.push({ type: 'double',   dir: dir, text: 'Double' });   return; }
        if (m[1] === 'X2') { out.push({ type: 'redouble', dir: dir, text: 'Redouble' }); }
    });
    return out;
}

function fbLibContract(bidStr) {
    var toks = fbLibParseBids(bidStr);
    if (!toks.length) return null;

    var last = null;
    var dbl  = 0;

    toks.forEach(function (t) {
        if (t.type === 'bid')           { last = t; dbl = 0; }
        else if (t.type === 'double')   { dbl = 1; }
        else if (t.type === 'redouble') { dbl = 2; }
    });

    if (!last) return { text: 'Passed out', declarer: null };

    var side     = (last.dir === 'N' || last.dir === 'S') ? ['N', 'S'] : ['E', 'W'];
    var declarer = last.dir;

    for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (t.type === 'bid' && t.strain === last.strain && side.indexOf(t.dir) !== -1) {
            declarer = t.dir;
            break;
        }
    }

    var suffix = dbl === 1 ? ' doubled' : (dbl === 2 ? ' redoubled' : '');

    return {
        text: last.text + suffix + ' by ' + (DIRECTION_EN[declarer] || declarer),
        declarer: declarer
    };
}

function fbLibDate(ms) {
    if (!ms || typeof ms !== 'number') return '';
    try { return new Date(ms).toLocaleDateString(); } catch (e) { return ''; }
}

function fbLibItemLabel(deal, index, total) {
    var parts = [];

    parts.push(deal.name ? deal.name : 'Untitled deal');

    var date = fbLibDate(deal.creationDate);
    if (date) parts.push(date);

    var contract = deal.bids ? fbLibContract(deal.bids) : null;
    if (contract) parts.push(contract.text);

    if (deal.tags && deal.tags.length) parts.push('Tags: ' + deal.tags.join(', '));
    if (deal.description) parts.push('Comment: ' + deal.description);

    return (index + 1) + ' of ' + total + '. ' + parts.join('. ');
}

function fbLibDealAsText(deal) {
    var lines = [];

    lines.push(deal.name || 'Untitled deal');

    var date = fbLibDate(deal.creationDate);
    if (date) lines.push('Saved: ' + date);
    if (deal.tags && deal.tags.length) lines.push('Tags: ' + deal.tags.join(', '));
    if (deal.description) lines.push('Comment: ' + deal.description);

    if (deal.dealer) lines.push('Dealer: ' + (DIRECTION_EN[deal.dealer] || deal.dealer));
    if (deal.vulnerability) lines.push(fbLibVulnerabilityText(deal.vulnerability));

    var contract = deal.bids ? fbLibContract(deal.bids) : null;
    if (contract) lines.push('Contract: ' + contract.text);

    var dealLink = fbLibDealLink(deal);
    if (dealLink) lines.push('Link: ' + dealLink);

    var bids = fbLibParseBids(deal.bids);
    if (bids.length) {
        lines.push('Bidding: ' + bids.map(function (b) {
            return (DIRECTION_EN[b.dir] || b.dir) + ' ' + b.text;
        }).join(', '));
    }

    var hands = deal.playerHands;
    if (hands) {
        ['north', 'east', 'south', 'west'].forEach(function (seat) {
            var txt = fbLibFormatHand(hands[seat]);
            if (!txt) return;
            var name = seat.charAt(0).toUpperCase() + seat.slice(1);
            lines.push(name + ' (' + fbLibHcp(hands[seat]) + ' HCP). ' + txt);
        });
    }

    return lines.join('\n');
}

// ---------------------------------------------------------
// 29c. Valintaikkunan rakentaminen
// ---------------------------------------------------------

var FB_LIB_BTN_CSS = [
    'background:#222', 'color:#FFE600', 'border:2px solid #FFE600',
    'border-radius:6px', 'padding:6px 14px', 'font-size:15px',
    'cursor:pointer', 'margin:0 8px 8px 0', 'font-family:inherit'
].join(';');

var FB_LIB_ITEM_CSS = [
    'display:block', 'width:100%', 'text-align:left',
    'background:#141414', 'color:#FFFFFF',
    'border:2px solid #666', 'border-radius:6px',
    'padding:10px 14px', 'font-size:17px', 'line-height:1.4',
    'cursor:pointer', 'font-family:inherit'
].join(';');

function fbLibMakeButton(text, onClick) {
    var b = document.createElement('button');
    b.type        = 'button';
    b.textContent = text;
    b.style.cssText = FB_LIB_BTN_CSS;
    b.addEventListener('click', onClick);
    return b;
}

function fbLibStatus(text) {
    var el = document.getElementById('fb-lib-status');
    if (el) el.textContent = text;
}

function fbLibBuildDialog() {
    var dlg = document.createElement('div');
    dlg.id = 'fb-library-dialog';
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', 'fb-lib-title');
    dlg.style.cssText = [
        'position:fixed', 'top:0', 'left:0', 'width:100%', 'height:100%',
        'background:rgba(0,0,0,0.95)', 'color:#FFE600',
        'font-family:Arial,sans-serif', 'font-size:16px',
        'overflow-y:auto', 'z-index:100000',
        'box-sizing:border-box', 'padding:20px 28px 40px'
    ].join(';');

    // Sulkupainike ensimmäisenä, jotta Tab löytää sen heti.
    var closeBtn = fbLibMakeButton('Close deal list (Escape)', fbLibCloseDialog);
    closeBtn.id = 'fb-lib-close';
    closeBtn.setAttribute('aria-label', 'Close the library deal list');
    dlg.appendChild(closeBtn);

    var title = document.createElement('h1');
    title.id = 'fb-lib-title';
    title.setAttribute('tabindex', '-1');
    title.textContent = 'Library – deals';
    title.style.cssText = 'color:#FFE600;font-size:24px;margin:8px 0 6px;';
    dlg.appendChild(title);

    var info = document.createElement('p');
    info.textContent =
        'Arrow keys move between deals. Enter shows the deal details ' +
        '(hands, bidding, contract). Tab from a deal reaches its ' +
        '"Open in Funbridge" button, which opens the deal in a new tab using ' +
        'its own Funbridge link. ' +
        'Escape closes. This list is read from the page data, so it is complete ' +
        'and does not disappear while you scroll.';
    info.style.cssText = 'color:#FFFFFF;margin:0 0 10px;max-width:60em;';
    dlg.appendChild(info);

    // Haku
    var searchWrap = document.createElement('div');
    searchWrap.style.cssText = 'margin:0 0 10px;';

    var searchLabel = document.createElement('label');
    searchLabel.setAttribute('for', 'fb-lib-search');
    searchLabel.textContent = 'Filter deals by name, tag or comment: ';
    searchLabel.style.cssText = 'color:#FFE600;margin-right:8px;';

    var search = document.createElement('input');
    search.type = 'text';
    search.id   = 'fb-lib-search';
    search.style.cssText =
        'background:#111;color:#FFF;border:2px solid #FFE600;border-radius:6px;' +
        'padding:6px 10px;font-size:16px;min-width:18em;font-family:inherit;';
    search.addEventListener('input', function () {
        fbLibraryFilterText = search.value;
        fbLibApplyFilter(false);
    });

    searchWrap.appendChild(searchLabel);
    searchWrap.appendChild(search);
    dlg.appendChild(searchWrap);

    // Työkalupainikkeet
    var tools = document.createElement('div');
    tools.style.cssText = 'margin:0 0 10px;';
    tools.appendChild(fbLibMakeButton('Load more deals', fbLibLoadMore));
    tools.appendChild(fbLibMakeButton('Refresh list', function () {
        fbLibRefreshDeals();
        fbLibStatus(fbLibraryDeals.length + ' deals in the list.');
    }));
    dlg.appendChild(tools);

    var status = document.createElement('div');
    status.id = 'fb-lib-status';
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.style.cssText = 'color:#FFFFFF;margin:0 0 12px;min-height:1.2em;';
    dlg.appendChild(status);

    var content = document.createElement('div');
    content.id = 'fb-lib-content';
    dlg.appendChild(content);

    return dlg;
}

// ---------------------------------------------------------
// 29d. Lista- ja tietonäkymä
// ---------------------------------------------------------

function fbLibMatchesFilter(deal, needle) {
    if (!needle) return true;
    var hay = [
        deal.name || '',
        deal.description || '',
        (deal.tags || []).join(' ')
    ].join(' ').toLowerCase();
    return hay.indexOf(needle) !== -1;
}

// keepFocus = true: yritetään palauttaa kohdistus samaan kohtaan listassa.
function fbLibApplyFilter(keepFocus) {
    var needle = (fbLibraryFilterText || '').trim().toLowerCase();

    fbLibraryFiltered = fbLibraryDeals.filter(function (d) {
        return fbLibMatchesFilter(d, needle);
    });

    var focusIndex = null;
    var active = document.activeElement;
    if (keepFocus && active && active.classList &&
        active.classList.contains('fb-lib-item')) {
        focusIndex = parseInt(active.getAttribute('data-index'), 10);
    }

    if (fbLibraryView === 'list') {
        fbLibRenderList();
        if (focusIndex !== null && !isNaN(focusIndex)) fbLibFocusItem(focusIndex);
    }

    var titleEl = document.getElementById('fb-lib-title');
    if (titleEl) {
        titleEl.textContent = needle
            ? 'Library – ' + fbLibraryFiltered.length + ' of ' +
              fbLibraryDeals.length + ' deals match'
            : 'Library – ' + fbLibraryDeals.length + ' deals';
    }
}

// Kertoo käyttäjälle, jos jouduttiin turvautumaan pelkkiin näkyviin riveihin.
function fbLibSourceNote() {
    if (fbLibDataSource === 'dom') {
        return ' Read from the visible rows only – the page deal data was not ' +
               'found, so deals further down the list may be missing.';
    }
    if (!fbLibraryDeals.length && fbLibBridgeState === 'unavailable') {
        return ' The page data could not be read. Add fb-library-bridge.js to the ' +
               'extension, either as a content script with world MAIN or in ' +
               'web_accessible_resources.';
    }
    if (!fbLibraryDeals.length && fbLibBridgeState === 'file-pending') {
        return ' Still loading the page data…';
    }
    return '';
}

// Silta voi valmistua vasta hetken kuluttua (erillinen tiedosto ladataan
// verkosta), joten tyhjä lista yritetään täyttää muutaman kerran.
function fbLibRetryUntilData(tries) {
    if (!fbLibraryOpen || fbLibraryDeals.length || tries <= 0) return;

    setTimeout(function () {
        if (!fbLibraryOpen || fbLibraryDeals.length) return;
        fbLibRefreshDeals();
        if (fbLibraryDeals.length) {
            fbLibStatus(fbLibraryDeals.length + ' deals in the list.' + fbLibSourceNote());
        } else {
            fbLibRetryUntilData(tries - 1);
        }
    }, 500);
}

function fbLibRefreshDeals() {
    var deals = [];
    try {
        deals = fbLibCollectDeals();
    } catch (e) {
        console.warn('Funbridge a11y: reading the React deal data failed', e);
    }
    if (!deals.length) deals = fbLibDealsFromDom();
    fbLibraryDeals = deals;
    fbLibApplyFilter(true);
}

function fbLibRenderList() {
    fbLibraryView = 'list';

    var content = document.getElementById('fb-lib-content');
    if (!content) return;
    content.innerHTML = '';

    if (!fbLibraryFiltered.length) {
        var empty = document.createElement('p');
        empty.style.cssText = 'color:#FFFFFF;';
        empty.textContent = fbLibraryDeals.length
            ? 'No deals match the filter.'
            : 'No deals found. Open the Library page and try again, or use ' +
              'the Load more deals button. For diagnostics, run fbLibDebug() ' +
              'in the browser console (it is provided by the page-world bridge).';
        content.appendChild(empty);
        return;
    }

    var ul = document.createElement('ul');
    ul.id = 'fb-lib-list';
    ul.style.cssText = 'list-style:none;margin:0;padding:0;';

    fbLibraryFiltered.forEach(function (deal, i) {
        var li = document.createElement('li');
        li.style.cssText = 'margin:0 0 8px;';

        var btn = document.createElement('button');
        btn.type      = 'button';
        btn.className = 'fb-lib-item';
        btn.setAttribute('data-index', String(i));
        btn.textContent = fbLibItemLabel(deal, i, fbLibraryFiltered.length);
        btn.style.cssText = FB_LIB_ITEM_CSS;

        btn.addEventListener('focus', function () {
            btn.style.borderColor = '#FFE600';
            fbLibraryIndex = i;
        });
        btn.addEventListener('blur', function () {
            btn.style.borderColor = '#666';
        });
        btn.addEventListener('click', function () { fbLibRenderDetails(i); });

        // Toinen painike avaa jaon suoraan Funbridgessä ilman
        // välivaihetta – ruudunlukijalla se on Tab-näppäimen päässä.
        var openBtn = document.createElement('button');
        openBtn.type      = 'button';
        openBtn.className = 'fb-lib-open';
        openBtn.textContent = 'Open in Funbridge';
        openBtn.setAttribute('aria-label',
            'Open in Funbridge: ' + (deal.name || 'untitled deal'));
        openBtn.style.cssText = FB_LIB_BTN_CSS + ';margin:4px 0 0 0;font-size:14px';
        openBtn.addEventListener('click', function () { fbLibOpenDealInApp(deal); });

        li.appendChild(btn);
        li.appendChild(openBtn);
        ul.appendChild(li);
    });

    content.appendChild(ul);
}

function fbLibItems() {
    return Array.prototype.slice.call(document.querySelectorAll('.fb-lib-item'));
}

function fbLibFocusItem(index) {
    var items = fbLibItems();
    if (!items.length) return;
    var i = Math.max(0, Math.min(index, items.length - 1));
    fbLibraryIndex = i;
    items[i].focus();
}

function fbLibRenderDetails(index) {
    var deal = fbLibraryFiltered[index];
    if (!deal) return;

    fbLibraryView  = 'details';
    fbLibraryIndex = index;

    var content = document.getElementById('fb-lib-content');
    if (!content) return;
    content.innerHTML = '';

    function h2(text) {
        var el = document.createElement('h2');
        el.textContent = text;
        el.style.cssText = 'color:#FFE600;font-size:20px;margin:14px 0 4px;';
        return el;
    }
    function p(text) {
        var el = document.createElement('p');
        el.textContent = text;
        el.style.cssText = 'color:#FFFFFF;margin:2px 0 2px 1em;';
        return el;
    }

    var heading = h2(deal.name || 'Untitled deal');
    heading.id = 'fb-lib-details-title';
    heading.setAttribute('tabindex', '-1');
    heading.style.marginTop = '0';
    content.appendChild(heading);

    var date = fbLibDate(deal.creationDate);
    if (date) content.appendChild(p('Saved: ' + date));
    if (deal.tags && deal.tags.length) content.appendChild(p('Tags: ' + deal.tags.join(', ')));
    if (deal.description) content.appendChild(p('Comment: ' + deal.description));

    if (!deal.__fromDom) {
        content.appendChild(h2('Deal information'));
        if (deal.dealer) content.appendChild(p('Dealer: ' + (DIRECTION_EN[deal.dealer] || deal.dealer)));
        if (deal.vulnerability) content.appendChild(p(fbLibVulnerabilityText(deal.vulnerability)));

        var contract = deal.bids ? fbLibContract(deal.bids) : null;
        if (contract) content.appendChild(p('Contract: ' + contract.text));

        var bids = fbLibParseBids(deal.bids);
        if (bids.length) {
            content.appendChild(h2('Bidding'));
            bids.forEach(function (b) {
                content.appendChild(p((DIRECTION_EN[b.dir] || b.dir) + ': ' + b.text));
            });
        }

        var hands = deal.playerHands;
        if (hands) {
            content.appendChild(h2('Hands'));
            ['north', 'east', 'south', 'west'].forEach(function (seat) {
                var txt = fbLibFormatHand(hands[seat]);
                if (!txt) return;
                var name = seat.charAt(0).toUpperCase() + seat.slice(1);
                content.appendChild(p(name + ', ' + fbLibHcp(hands[seat]) + ' HCP. ' + txt));
            });
        }
    }

    var actions = document.createElement('div');
    actions.style.cssText = 'margin:18px 0 0;';

    actions.appendChild(fbLibMakeButton('Back to the deal list (Escape)', function () {
        fbLibRenderList();
        fbLibFocusItem(index);
    }));

    actions.appendChild(fbLibMakeButton('Open this deal in Funbridge', function () {
        fbLibOpenDealInApp(deal);
    }));

    actions.appendChild(fbLibMakeButton('Copy deal as text', function () {
        fbLibCopyText(fbLibDealAsText(deal));
    }));

    var link = fbLibDealLink(deal);
    if (link) {
        actions.appendChild(fbLibMakeButton('Copy the deal link', function () {
            fbLibCopyText(link);
        }));
    }

    content.appendChild(actions);

    setTimeout(function () { heading.focus(); }, 50);
}

// Funbridge tallentaa jokaiselle jaolle jakolinkin (onelink), jossa on
// mukana turnauskategoria ja jaon tunnus. Linkkiä ei ole varmistettu
// toimivaksi selaimessa, mutta se on ainoa sivun itsensä tarjoama
// suora osoite jakoon, joten se annetaan käyttäjän kopioitavaksi.
function fbLibDealLink(deal) {
    return deal && deal.sharedUrl ? String(deal.sharedUrl) : '';
}

function fbLibCopyText(text) {
    function done(ok) {
        fbLibStatus(ok ? 'Deal copied to the clipboard.' : 'Copying failed.');
    }
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () { done(true); },
                                                     function () { done(false); });
            return;
        }
    } catch (e) { /* fallback alla */ }

    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        done(ok);
    } catch (e2) { done(false); }
}

// ---------------------------------------------------------
// 29e. Lisäjakojen lataus (infinite scroll -listan herättely)
// ---------------------------------------------------------

function fbLibScroller() {
    var cont = document.getElementById('infinite-scroll-list-container');
    if (!cont) return null;

    var fallback = null;   // vieritettäväksi merkitty, vaikkei juuri nyt vieritä
    var el = cont;
    var guard = 0;

    while (el && el !== document.body && guard++ < 15) {
        var style;
        try { style = window.getComputedStyle(el); } catch (e) { style = null; }

        var scrollable = style &&
            (style.overflowY === 'auto' || style.overflowY === 'scroll');

        if (scrollable) {
            if (el.scrollHeight > el.clientHeight + 8) return el;
            if (!fallback) fallback = el;
        }
        el = el.parentElement;
    }

    if (cont.scrollHeight > cont.clientHeight + 8) return cont;
    return fallback;
}

function fbLibLoadMore() {
    if (fbLibraryLoading) return;

    var scroller = fbLibScroller();
    if (!scroller) {
        fbLibStatus('The deal list is not on screen. Open the Library page first.');
        return;
    }

    fbLibraryLoading = true;
    var before        = fbLibraryDeals.length;
    var rounds        = 0;
    var stagnant      = 0;
    var originalScroll = scroller.scrollTop;

    fbLibStatus('Loading more deals…');

    (function step() {
        if (!fbLibraryOpen || !fbLibraryLoading) { fbLibraryLoading = false; return; }

        scroller.scrollTop = scroller.scrollHeight;

        setTimeout(function () {
            if (!fbLibraryOpen || !fbLibraryLoading) { fbLibraryLoading = false; return; }

            var deals = fbLibCollectDeals();
            if (deals.length > fbLibraryDeals.length) {
                fbLibraryDeals = deals;
                stagnant = 0;
                fbLibApplyFilter(true);
            } else {
                stagnant++;
            }

            rounds++;

            if (stagnant < 3 && rounds < 30) {
                fbLibStatus('Loading… ' + fbLibraryDeals.length + ' deals so far.');
                step();
                return;
            }

            fbLibraryLoading = false;
            scroller.scrollTop = originalScroll;   // palautetaan näkymä
            fbLibApplyFilter(true);
            fbLibStatus(fbLibraryDeals.length + ' deals in the list' +
                (fbLibraryDeals.length > before
                    ? ', ' + (fbLibraryDeals.length - before) + ' new.'
                    : '.') + fbLibSourceNote());
        }, 700);
    })();
}

// ---------------------------------------------------------
// 29f. Jaon avaaminen Funbridgessä
// ---------------------------------------------------------

function fbLibSearchRoots() {
    var roots = [];
    var cont = document.getElementById('infinite-scroll-list-container');
    if (cont) {
        roots.push(cont);
        if (cont.nextElementSibling) roots.push(cont.nextElementSibling);
        if (cont.parentElement) roots.push(cont.parentElement);
    }
    var table = document.querySelector('.fb-table');
    if (table) roots.push(table);
    roots.push(document.body);
    return roots;
}

// Oma valintaikkuna sisältää samat jakojen nimet, joten se on
// rajattava haun ulkopuolelle – muuten laajennus klikkaisi itseään.
function fbLibIsOwnUi(el) {
    // Myös puhealue (liveRegion) sisältää jakojen nimiä: "Opening deal X".
    return !!(el && el.closest(
        '#fb-library-dialog, #fb-help-dialog, #fb-a11y-live, [data-fb-a11y]'
    ));
}

function fbLibFindRow(deal) {
    if (deal.__domRow && document.contains(deal.__domRow)) return deal.__domRow;

    var roots = fbLibSearchRoots();
    var id = (deal.dealId !== undefined && !deal.__fromDom) ? String(deal.dealId) : null;
    var name = (deal.name || '').replace(/\s+/g, ' ').trim();

    for (var r = 0; r < roots.length; r++) {
        var root = roots[r];

        // 1) Mahdollinen id/data-attribuutti
        if (id) {
            var byAttr = root.querySelector(
                '[data-deal-id="' + id + '"], [data-id="' + id + '"], [id*="' + id + '"]'
            );
            if (byAttr && !fbLibIsOwnUi(byAttr)) return byAttr;
        }

        // 2) Nimen perusteella: ensin tarkka osuma, sitten sisältyvyys.
        if (!name) continue;

        var candidates = root.querySelectorAll('div, span, a, button, td, li, p');
        var partial = null;

        for (var i = 0; i < candidates.length; i++) {
            var el = candidates[i];
            if (el.children.length) continue;
            if (fbLibIsOwnUi(el)) continue;
            var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
            if (!text) continue;
            if (text === name) return el;
            if (!partial && text.length < name.length + 40 && text.indexOf(name) !== -1) {
                partial = el;
            }
        }
        if (partial) return partial;
    }
    return null;
}

function fbLibClickableRow(el) {
    if (!el) return null;
    var clickable = el.closest(
        'a, button, [role="button"], [class*="row"], [class*="line"], [class*="item"]'
    );
    return clickable || el;
}

// Pyytää siltaa avaamaan jaon sivun omassa maailmassa. Silta etsii rivin
// Fiber-puusta, joten se löytää sen silloinkin kun rivin teksti ei ole
// haettavissa DOMista. Palauttaa 'clicked', 'not-found', 'error' tai
// 'no-bridge'.
function fbLibRequestActivation(deal) {
    if (deal.__fromDom || deal.dealId === undefined) return 'no-bridge';
    if (!fbLibEnsureBridge()) return 'no-bridge';

    var node = document.getElementById('fb-a11y-library-data');
    if (!node) return 'no-bridge';

    node.setAttribute('data-fb-request-deal', String(deal.dealId));
    document.documentElement.removeAttribute('data-fb-activate-result');

    try {
        document.dispatchEvent(new CustomEvent('fb-a11y-activate-deal'));
    } catch (e) {
        return 'no-bridge';
    }

    return document.documentElement.getAttribute('data-fb-activate-result') || 'not-found';
}

function fbLibOpenDealInApp(deal) {
    var name = deal.name || 'the deal';
    var attempts = 0;
    var reopenOnFailure = fbLibraryOpen;

    // 0) Ensisijaisesti jaon oma linkki. Se on varmin tapa, koska se ei
    //    riipu siitä, onko rivi juuri nyt renderöitynä virtualisoituun
    //    listaan. window.open kutsutaan suoraan klikkauksen käsittelystä,
    //    jotta selain ei tulkitse sitä ponnahdusikkunaksi.
    var directLink = fbLibDealLink(deal);
    if (directLink) {
        fbLibCloseDialog();
        speakNow('Opening deal ' + name + ' in a new tab.');
        // Huom: noopener-avauksessa window.open palauttaa aina null, joten
        // paluuarvosta ei voi päätellä onnistumista – vain poikkeus kertoo
        // ettei uutta välilehteä saatu auki.
        try {
            window.open(directLink, '_blank', 'noopener');
        } catch (e) {
            window.location.href = directLink;
        }
        return;
    }

    // Suljetaan saavutettava ikkuna heti: käyttäjän pitää kuulla ja nähdä,
    // että ollaan siirtymässä itse peliin. Jos avaaminen epäonnistuu,
    // ikkuna palautetaan ja siitä kerrotaan.
    fbLibCloseDialog();
    speakNow('Opening deal ' + name);

    function succeeded(how) {
        speak('Deal opened.');
        console.log('Funbridge a11y: deal opened via ' + how, deal.dealId);
    }

    function failed() {
        speakNow('Could not open ' + name + '. Back in the deal list.');
        if (reopenOnFailure) {
            fbLibOpenDialog();
            fbLibStatus('Could not open "' + name + '" automatically. Its full ' +
                        'contents are in the deal details. For diagnostics, run ' +
                        'fbLibDebugOpen(' + deal.dealId + ') in the browser console.');
        }
    }

    (function tryOpen() {
        // 1) Silta: rivi haetaan Reactin puusta sivun omassa maailmassa.
        var result = fbLibRequestActivation(deal);
        if (result && result.indexOf('clicked') === 0) { succeeded(result); return; }

        // 2) Varalla suora DOM-haku.
        var row = fbLibFindRow(deal);
        if (row) {
            simulateClick(fbLibClickableRow(row));
            succeeded('dom');
            return;
        }

        attempts++;

        if (attempts > 15) { failed(); return; }

        // Rivi ei ole vielä renderöity: vieritetään listaa ja yritetään
        // uudelleen.
        var scroller = fbLibScroller();
        if (scroller) {
            var step = Math.max(200, scroller.clientHeight - 40);
            scroller.scrollTop = Math.min(scroller.scrollTop + step, scroller.scrollHeight);
        } else {
            window.scrollBy(0, 300);
        }

        setTimeout(tryOpen, 300);
    })();
}

// ---------------------------------------------------------
// 29g. Avaus, sulkeminen ja näppäimistö
// ---------------------------------------------------------

function fbLibOpenDialog() {
    if (fbLibraryOpen) return;

    fbLibraryLastFocus = document.activeElement;

    if (!fbLibraryEl) fbLibraryEl = fbLibBuildDialog();
    document.body.appendChild(fbLibraryEl);
    fbLibraryOpen  = true;
    fbLibraryView  = 'list';

    // Taustan sisältö pois ruudunlukijalta, jotta selaustila pysyy dialogissa.
    var root = document.getElementById('root');
    if (root) root.setAttribute('aria-hidden', 'true');

    fbLibRefreshDeals();
    fbLibRenderList();

    var title = document.getElementById('fb-lib-title');
    if (title) setTimeout(function () { title.focus(); }, 50);

    if (!fbLibraryDeals.length) {
        fbLibStatus('No deals found yet. Make sure the Library page is open.' + fbLibSourceNote());
        fbLibRetryUntilData(6);
    } else {
        fbLibStatus(fbLibraryDeals.length + ' deals in the list.' + fbLibSourceNote());
    }

    // Ensimmäisellä avauksella haetaan koko lista, koska infinite scroll
    // on ladannut muistiin vain näkyvillä olleet jaot.
    if (!fbLibraryAutoLoaded && fbLibScroller()) {
        fbLibraryAutoLoaded = true;
        setTimeout(fbLibLoadMore, 400);
    }
}

function fbLibCloseDialog() {
    if (!fbLibraryOpen) return;

    fbLibraryLoading = false;

    if (fbLibraryEl && fbLibraryEl.parentNode) {
        fbLibraryEl.parentNode.removeChild(fbLibraryEl);
    }
    fbLibraryOpen = false;

    var root = document.getElementById('root');
    if (root) root.removeAttribute('aria-hidden');

    if (fbLibraryLastFocus && document.contains(fbLibraryLastFocus)) {
        try { fbLibraryLastFocus.focus(); } catch (e) { /* ohitetaan */ }
    }
    fbLibraryLastFocus = null;
}

function fbLibToggleDialog() {
    if (fbLibraryOpen) fbLibCloseDialog();
    else               fbLibOpenDialog();
}

// Oma näppäinkuuntelija. Osion 21 kuuntelijat väistävät, kun
// fbLibraryOpen on tosi, joten kirjaimet eivät pelaa kortteja täällä.
document.addEventListener('keydown', function (e) {
    if (!fbLibraryOpen) return;

    var inSearch = e.target && e.target.id === 'fb-lib-search';

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // Alt+L sulkee myös
    if (e.altKey && (e.key === 'l' || e.key === 'L')) { block(); fbLibCloseDialog(); return; }

    if (e.key === 'Escape') {
        block();
        if (fbLibraryView === 'details') {
            var back = fbLibraryIndex;
            fbLibRenderList();
            fbLibFocusItem(back);
        } else {
            fbLibCloseDialog();
        }
        return;
    }

    // Tab pysyy valintaikkunan sisällä
    if (e.key === 'Tab') {
        var focusables = fbLibraryEl.querySelectorAll('button, input, [tabindex="0"]');
        if (!focusables.length) return;
        var first = focusables[0];
        var last  = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault(); last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault(); first.focus();
        }
        return;
    }

    if (inSearch) {
        // Enter hakukentästä siirtää listan ensimmäiseen osumaan
        if (e.key === 'Enter') { block(); fbLibFocusItem(0); }
        return;
    }

    if (fbLibraryView !== 'list') return;

    var onItem = document.activeElement &&
                 document.activeElement.classList &&
                 document.activeElement.classList.contains('fb-lib-item');

    if (e.key === 'ArrowDown') { block(); onItem ? fbLibFocusItem(fbLibraryIndex + 1) : fbLibFocusItem(0); return; }
    if (e.key === 'ArrowUp')   { block(); onItem ? fbLibFocusItem(fbLibraryIndex - 1) : fbLibFocusItem(0); return; }
    if (e.key === 'Home' && onItem) { block(); fbLibFocusItem(0); return; }
    if (e.key === 'End'  && onItem) { block(); fbLibFocusItem(fbLibItems().length - 1); return; }
}, true);

// ---------------------------------------------------------
// 29h. Vihje kirjastosivulla + siirtymien seuranta
// ---------------------------------------------------------

// Alustetaan nykyiseen polkuun: muuten ensimmäinen ajastimen tikki
// tulkitsisi sivun juuri vaihtuneeksi ja sulkisi juuri avatun ikkunan.
var fbLibLastPath = location.pathname;

setInterval(function () {
    var path = location.pathname;
    if (path === fbLibLastPath) return;

    fbLibLastPath = path;

    // Sivun vaihtuessa valintaikkuna suljetaan ja lista haetaan uudelleen.
    if (fbLibraryOpen) fbLibCloseDialog();
    fbLibraryAutoLoaded = false;

    if (/^\/library\/?$/.test(path)) {
        setTimeout(function () {
            speak('Library. Press Alt plus L for the accessible deal list.');
        }, 1500);
    }
}, 1000);

console.log('Funbridge Accessibility: library deal list ready (Alt+L)');

// =========================================================
// 16. DEAL RESULTS PAGE (F8 + automatic announcement)
// =========================================================
// Funbridge renders the results page twice: the wide-screen columns
// (.d-none.d-xl-block) and a narrow-screen copy (.col.d-xl-none). Both are in
// the DOM at all times, so every lookup below skips hidden copies with
// fbResVisible(); otherwise the same figures would be read twice, or the
// invisible copy would be read instead of the one on screen.

// The main live region is polite, so it waits for the screen reader to finish
// whatever it is saying. The results report is meant to cut in the moment the
// page appears, which needs an assertive region of its own.
var fbResLive = document.createElement('div');
fbResLive.id = 'fb-a11y-results-live';
fbResLive.setAttribute('data-fb-a11y', '1');
fbResLive.setAttribute('aria-live', 'assertive');
fbResLive.setAttribute('aria-atomic', 'true');
fbResLive.style.cssText =
    'position:absolute;width:1px;height:1px;margin:-1px;padding:0;' +
    'overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0;';
document.body.appendChild(fbResLive);

function fbResSpeak(text) {
    // Drop anything the extension itself was about to say, so the report is
    // not followed by a stale announcement from the play phase.
    speechQueue = [];
    isSpeaking  = false;
    liveRegion.textContent = '';

    fbResLive.textContent = '';
    setTimeout(function () { fbResLive.textContent = text; }, 50);
}

function fbResIsResultsPage() {
    return /^\/results\/deal\/?$/.test(location.pathname);
}

function fbResVisible(el) {
    return !!(el && el.offsetParent !== null);
}

// Collects text nodes in document order and normalises whitespace. Needed
// because the page splits sentences across spans with no spaces between them,
// so plain textContent would glue words together ("South played4 Hearts").
function fbResPieces(root) {
    var out = [];
    if (!root) return out;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var node;
    while ((node = walker.nextNode())) {
        var t = (node.nodeValue || '').replace(/\s+/g, ' ').trim();
        if (t) out.push(t);
    }
    return out;
}

// Joins the pieces with spaces, then pulls punctuation back against the word
// before it: the suit name and the full stop that follows it are separate
// nodes, which would otherwise come out as "the A Spades ."
function fbResJoin(root) {
    return fbResPieces(root).join(' ').replace(/\s+([.,;:!?])/g, '$1').trim();
}

function fbResText(el) {
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
}

// Finds a visible .layout-box by the text of its title bar.
function fbResBox(titleText) {
    var titles = document.querySelectorAll('.layout-box-title');
    for (var i = 0; i < titles.length; i++) {
        if (fbResText(titles[i]) !== titleText) continue;
        var box = titles[i].closest('.layout-box');
        if (box && fbResVisible(box)) return box;
    }
    return null;
}

// "South played 4 Hearts. Result -2."
// Lives in the page header (section.top-section) and exists only once, so no
// visibility filtering is needed here.
function fbResContractLine() {
    var top = document.querySelector('section.top-section');
    if (!top) return '';

    var label = top.querySelector('.fb-contract-label');
    if (!label) return '';

    var container = label.closest('div.d-flex.align-items-center');
    if (!container) return '';

    var line = fbResJoin(container);
    if (!line) return '';

    // The contract and the result sit in sibling spans with no punctuation
    // between them; add a full stop so the screen reader pauses.
    line = line.replace(/\s+(Result\b)/, '. $1');
    return line.replace(/\.?$/, '.');
}

// Reads the percentage from the "Deal" or "Tournament" box. The two boxes hold
// the value at different depths (.text-success.fs-3 > span vs .fs-3 >
// span.text-success > span), so the box title and the "Result" label are used
// as anchors instead of a class path.
function fbResBoxValue(titleText) {
    var box = fbResBox(titleText);
    if (!box) return '';

    var cols = box.querySelectorAll('.col');
    for (var i = 0; i < cols.length; i++) {
        var small = cols[i].querySelector('small');
        if (!small || fbResText(small) !== 'Result') continue;

        var value = fbResText(cols[i].querySelector('.fs-3'));
        if (value) return value;
    }
    return '';
}

// "264 players played in a Hearts contract like you. 81% of them took more
// tricks than you and 5% took fewer tricks."
// The suit name is a separate span between two text nodes, so the sentence is
// rebuilt from the deepest element that still holds the whole thing.
function fbResCardPlaySentence() {
    var divs = document.querySelectorAll('.layout-box div');
    var deepest = null;

    for (var i = 0; i < divs.length; i++) {
        if (!/players played in a/i.test(divs[i].textContent || '')) continue;
        if (!fbResVisible(divs[i])) continue;
        deepest = divs[i];   // descendants follow ancestors in document order
    }

    return deepest ? fbResJoin(deepest) : '';
}

// The mistake lines from the "Detailed analysis" box, e.g. "At Trick 1, you
// lost 1 potential trick by playing the 2 Spades. It was preferable to win the
// trick with the A Spades."
// The same box also holds the mistake counts ("1 Minor mistake"), which sit in
// plain .mb-2 divs; only the rows carrying a .badge-error marker are wanted.
function fbResMistakeLines() {
    var box = fbResBox('Detailed analysis');
    if (!box) return [];

    var lines = [];
    var groups = box.querySelectorAll('.text-start');

    for (var g = 0; g < groups.length; g++) {
        var rows = groups[g].children;
        for (var r = 0; r < rows.length; r++) {
            if (!rows[r].querySelector('.badge-error')) continue;
            var line = fbResJoin(rows[r]);
            if (line) lines.push(line);
        }
    }
    return lines;
}

// Builds the whole report. Returns an empty string when nothing has rendered
// yet, which is also how the automatic announcement knows to keep waiting.
function fbResSummaryText() {
    var parts = [];

    var contract = fbResContractLine();
    if (contract) parts.push(contract);

    var results = [];
    var deal = fbResBoxValue('Deal');
    var tour = fbResBoxValue('Tournament');
    if (deal) results.push('Deal result ' + deal);
    if (tour) results.push('Tournament result ' + tour);
    if (results.length) parts.push(results.join('. ') + '.');

    var cardPlay = fbResCardPlaySentence();
    if (cardPlay) parts.push(cardPlay);

    var mistakes = fbResMistakeLines();
    for (var i = 0; i < mistakes.length; i++) parts.push(mistakes[i]);

    return parts.join(' ');
}

// ---------------------------------------------------------
// Next deal (Alt+N on the results page)
// ---------------------------------------------------------
// The button is a plain link in the page header. On the last deal of a
// tournament it is not rendered at all, and Alt+N then does nothing.

function fbResNextDealLink() {
    var top = document.querySelector('section.top-section');
    if (!top) return null;

    var links = top.querySelectorAll('a');
    for (var i = 0; i < links.length; i++) {
        if (fbResText(links[i]) !== 'Next deal') continue;
        if (!fbResVisible(links[i])) continue;
        return links[i];
    }
    return null;
}

// The action boxes at the bottom of the results page ("Replay", "Watch again",
// "Save in my deal library") are plain divs with a React click handler and no
// accessible name, so they are found by their exact text. React listens for a
// full pointer sequence, which is what simulateClick sends.

function fbResActionBox(labelText) {
    var els = document.querySelectorAll('.cursor-pointer, button, a');
    for (var i = 0; i < els.length; i++) {
        if (fbResText(els[i]) !== labelText) continue;
        if (!fbResVisible(els[i])) continue;
        return els[i];
    }
    return null;
}

function fbResReplay() {
    var box = fbResActionBox('Replay');
    if (!box) return;   // not offered for this deal: do nothing
    simulateClick(box);
}

function fbResGoToNextDeal() {
    var link = fbResNextDealLink();
    if (!link) return;   // no next deal: stay put, say nothing
    link.click();
}

function fbResSpeakSummary() {
    var text = fbResSummaryText();
    fbResSpeak(text || 'No deal results found on this page yet.');
}

document.addEventListener('keydown', function (e) {
    if (e.key !== 'F8') return;
    if (fbLibraryOpen) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (!fbResIsResultsPage()) return;   // elsewhere F8 stays the browser's own

    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();

    fbResSpeakSummary();
}, true);

// ---------------------------------------------------------
// Automatic announcement when the results appear
// ---------------------------------------------------------
// The page is a single-page app, so a new deal's results arrive without a page
// load and render piecemeal. The watcher waits until the header line and at
// least one percentage are in place, then gives the rest of the boxes a moment
// to catch up before reading, so the card play and mistake lines are included.
// The deal is identified by the full URL, which carries the deal ID, so each
// deal is announced once even if the user navigates back to it later.

var fbResAnnouncedUrl = null;
var fbResPendingUrl   = null;
var FB_RES_SETTLE_MS  = 900;

setInterval(function () {
    if (!fbResIsResultsPage()) {
        fbResAnnouncedUrl = null;
        fbResPendingUrl   = null;
        return;
    }

    var url = location.pathname + location.search;
    if (url === fbResAnnouncedUrl || url === fbResPendingUrl) return;

    // Wait for the two parts that appear first; the rest follows within a few
    // hundred milliseconds.
    if (!fbResContractLine()) return;
    if (!fbResBoxValue('Deal') && !fbResBoxValue('Tournament')) return;

    fbResPendingUrl = url;

    setTimeout(function () {
        // The user may have moved on during the settle delay.
        if (!fbResIsResultsPage()) { fbResPendingUrl = null; return; }
        if ((location.pathname + location.search) !== url) { fbResPendingUrl = null; return; }

        var text = fbResSummaryText();
        if (!text) { fbResPendingUrl = null; return; }

        fbResAnnouncedUrl = url;
        fbResPendingUrl   = null;
        fbResSpeak(text);
    }, FB_RES_SETTLE_MS);
}, 400);

console.log('Funbridge Accessibility: deal results reader ready (F8 on /results/deal, also automatic)');
