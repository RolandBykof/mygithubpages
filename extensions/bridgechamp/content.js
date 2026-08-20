// =========================================================
// Bridge Champ Accessibility Extension (NVDA / JAWS)
// Version 1.6 – Pelikorttien DOM-käsittely poistettu kokonaan. Laajennus ei
//               enää nimeä, roolita tai muokkaa pelikortteja, eikä lisää
//               maamerkkejä korttikääreille. F2-korttipaneeli poistettu.
//               Kortit luetaan ja pelataan yksinomaan näppäinkomennoilla ja
//               puheilmoituksilla. cleanupCardAttributes() siivoaa aiempien
//               versioiden jättämät aria-labelit. Tarjouslaatikon
//               painikeroolit SÄILYVÄT – niitä tarvitaan Enter-vahvistukseen.
//               Lisäksi: nuoli/i/o toimivat vain pelivaiheessa.
// Version 1.5 – Tarjoaminen korjattu: se on KAKSIVAIHEINEN. Tarjouskortin
//               klikkaus siirtää tarjouksen esikatseluun
//               (.preview-wrapper.transform-adjust-{KOODI}.active) ja vaatii
//               vahvistusklikkauksen. Samalla laatikon luokka vaihtuu
//               selector-container-fade-IN -> fade-OUT, mihin V1.1-V1.4:n
//               valitsin kaatui: getBidSelector() palautti nullin ja
//               vahvistus jäi kokonaan tekemättä, joten tarjous jumittui
//               esikatseluun eikä mitään näyttänyt tapahtuvan. Laatikko
//               tunnistetaan nyt sisällön eikä fade-luokan perusteella,
//               vahvistus tehdään automaattisesti, esikatselu on oikea
//               painike ("Confirm bid: Pass") ja Enter vahvistaa manuaalisesti.
// Version 1.4 – Pelivaihe korjattu. Pelatut kortit EIVÄT ole
//               .play-gather-location -laatikoissa (ne ovat aina tyhjiä
//               animaatiokohteita) vaan .trick-cards -alueella, jossa jokainen
//               kortti on .trick-card-wrapper.w-N -kääreessä. Tämän vuoksi
//               automaattinen kortti-ilmoitus ja Alt+P eivät toimineet lainkaan.
//               Lisäksi: sopimus luetaan nyt .contract-container -elementistä
//               ("1 Hearts by South"), tikin aloittaja pidetään muistissa koko
//               tikin ajan, ja istumaindeksin tulkinta kalibroituu itse
//               .mark-kääreen ja has-turn-lipun perusteella.
// Version 1.3 – Minibridgen KAKSI vaihetta tuettu. Valtin valinnan jälkeen
//               tulee tasovaihe (data-testid="minibridge-level-1..7", otsikko
//               "Bid Level for Suit (NT)"). Valittu valtti luetaan otsikon
//               suluista, joten taso ilmoitetaan muodossa "4 No Trump" eikä
//               pelkkänä numerona. Back-painike nimetty ja sidottu
//               Backspaceen. Otsikkoteksti ei enää sisällä Back-painiketta.
// Version 1.2 – Minibridge tuettu. Minibridgessä ei ole tarjoussarjaa:
//               järjestelmä päättää pelinviejän pisteiden perusteella, kääntää
//               lepääjän kortit näkyviin ja pyytää pelinviejää valitsemaan vain
//               valttivärin. Värinäppäin (S/H/D/C/N) on nyt ehdottomasti
//               ensisijainen kun valitsin on näkyvissä, valitsin luetaan
//               geneerisesti .selector-title + .selector-box -rakenteesta
//               (mahdolliset lisävaiheet toimivat automaattisesti), ja uusi
//               Alt+I kertoo yhteiskäden pisteet ja värijakauman.
// Version 1.1 – Tarjouslaatikko tuettu oikeasti.
//               Laatikko on .bidding-selector-container (v1.5 korjasi
//               fade-luokkaan sidotun valitsimen)
//               ja kortit div.bidding-card.selector-card.bidding-card-{KOODI}
//               (esim. bidding-card-4H, -3NT, -P, -X, -XX). Laatikko sisältää
//               VAIN lailliset tarjoukset, joten "ei saatavilla" -tilanteessa
//               kerrotaan nyt matalin mahdollinen tarjous. Lisäksi:
//               tarjouskortit muutettu oikeiksi painikkeiksi, tarjoushistoria
//               luettavissa (Alt+B) ja vastustajien tarjoukset ilmoitetaan
//               automaattisesti.
// Version 1.0 – Ensimmäinen versio.
//
// Rakenne noudattaa Funbridge-laajennuksen arkkitehtuuria, jotta
// näppäinkomennot ja puheilmoitukset ovat identtiset molemmilla alustoilla.
//
// Bridge Champ (React + MUI) eroaa Funbridgesta seuraavasti:
//   - Kortit ovat oikeita <button>-elementtejä, mutta ILMAN mitään tekstiä.
//     Kortin arvo on pelkissä luokissa: button.card.rank1.spades
//     → laajennus lisää niihin aria-labelin, jolloin ne luetaan sellaisenaan.
//   - Pelaajan vuoro näkyy luokassa .bc-game-video-frame.has-turn
//   - Ilmansuunnat luetaan kompassista (.compass-container .seat-label.*)
//     ja/tai pelaajaruuduista (.player-video .side-symbol) – käyttäjä ei siis
//     ole aina etelässä.
//   - Yläpalkin drawerissa on suoraan luettavat kentät:
//     "Table ID :", "Game Stage :", "Seat :", "Status :"
//   - Valikot ovat <div title="...">-elementtejä ilman rolea ja tabindexia
//     → laajennus tekee niistä oikeita painikkeita.
//
// EPÄVARMAT VALITSIMET on merkitty kommentilla "TARKISTA:". Ne on johdettu
// tarjousvaiheen DOM-analyysistä; pelivaiheen ja tarjouslaatikon rakenne
// kannattaa varmistaa uudella DOM-dumpilla ja säätää vakiot kohdasta BC_SEL.
// =========================================================

console.log('Bridge Champ Accessibility Extension V1.0 loaded');

// =========================================================
// 1. RUUDUNLUKIJAN PUHEKANAVA
// =========================================================

var liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
liveRegion.style.cssText =
    'position:absolute;width:1px;height:1px;padding:0;margin:-1px;' +
    'overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';

function attachLiveRegion() {
    if (document.body && !liveRegion.parentNode) document.body.appendChild(liveRegion);
}
attachLiveRegion();

var speechQueue  = [];
var isSpeaking   = false;
var SPEECH_DELAY = 650;

function speak(text) {
    if (!text) return;
    speechQueue.push(text);
    if (!isSpeaking) processSpeechQueue();
}

function speakNow(text) {
    speechQueue = [];
    isSpeaking  = false;
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
// 2. VAKIOT JA VALITSIMET
// =========================================================

// Kaikki alustakohtaiset valitsimet yhdessä paikassa – helppo korjata,
// jos Bridge Champ muuttaa DOM:iaan.
var BC_SEL = {
    root:            '.gamescreen-layout',
    drawer:          '.MuiDrawer-root',
    scoreBoard:      '.bc-score-board',
    compass:         '.bc-compass-v2 .compass-container',
    ownHandWrapper:  '[class*="cards-wrapper"]',      // .realistic-cards-wrapper / .cards-wrapper
    dummyWrapper:    '.dummy-cards-wrapper',
    cardButton:      'button.card, [class*="card"][class*="rank"]',
    gather:          '.play-gather-location',
    playerVideo:     '.player-video',
    turnFlag:        '.bc-game-video-frame.has-turn',

    // --- Pelivaihe (vahvistettu DOM-dumpista 27.7.2026 klo 12.05) --------
    // HUOM: .play-gather-location.* -laatikot ovat AINA tyhjiä; ne ovat
    // pelkkiä animaatiokohteita. Oikeat pelatut kortit ovat .trick-cards
    // -alueella, jossa jokainen kortti on .trick-card-wrapper.w-N -kääreessä.
    // N on istumapaikan indeksi (ks. trickIndexToDirection).
    trickArea:       '.trick-cards',
    trickWrapper:    '.trick-card-wrapper',
    trickMark:       '.trick-card-wrapper.mark',
    // Sopimusnäyttö kompassin alla:
    //   .contract-container > .bid-symbol-container > span "1" + .stripe-symbol "♥"
    //                       > .declarer-container "S"
    contract:        '.contract-container',
    leaderArrow:     '.compass-leader-arrow',
    menuItem:        '.bc-menu-item',
    rightMenuItem:   '.game-right-menu-container .menu-item-wrapper',
    claimUndo:       '.claim-undo-buttons > div',
    notification:    '.gameplay-notification-content',

    // --- Tarjoaminen (vahvistettu DOM-dumpista 27.7.2026 klo 11.22) -------
    // Näkyvä tarjouslaatikko. HUOM: .bidding-selector-widget sisältää KAKSI
    // .bidding-selector-container -elementtiä; vain se, jolla on luokka
    // .preview-wrapper on esikatselusäiliö, toisessa ovat tarjouskortit.
    // Ne erotetaan SISÄLLÖN perusteella, ei fade-luokan – ks. getBidSelector().
    bidWidget:       '.bidding-selector-widget',
    // HUOM: fade-in/fade-out vaihtuu vaiheen mukana, joten laatikkoa EI saa
    // etsiä fade-luokalla – ks. getBidSelector().
    bidSelector:     '.bidding-selector-container',
    bidSelectorCard: '.bidding-card.selector-card',
    bidPreview:      '.bidding-selector-container .preview-wrapper',
    // Pelaajakohtaiset viimeisimmät tarjoukset pöydän ympärillä.
    // Järjestys DOM:ssa: bottom, left, top, right (sama kuin pelijärjestys).
    bidHistoryBox:   '.bidding-cards-container',
    bidHistoryCard:  '.bc-bidding-card',
    // Koko tarjoushistoria (näkyy kun Bidding-valikkopaneeli on auki)
    bidTable:        '.bidding-widget .bidding-table-grid',
    bidTableHeader:  '.bidding-widget .bidding-table-header',

    // Minibridge
    biddingBox:      '[data-testid="minibridge-bidding-selector"], .bidding-selector-container',
    miniSuitBox:     '[data-testid^="minibridge-suit-"]'
};

// Bridge Champ koodaa kortin arvon luokkaan rankN: 1 = ässä, 13 = kuningas.
var BC_RANK_TO_EN = {
    1:'A', 2:'2', 3:'3', 4:'4', 5:'5', 6:'6', 7:'7',
    8:'8', 9:'9', 10:'10', 11:'J', 12:'Q', 13:'K'
};
var EN_RANK_TO_BC = {
    'A':1, '2':2, '3':3, '4':4, '5':5, '6':6, '7':7,
    '8':8, '9':9, '10':10, 'J':11, 'Q':12, 'K':13
};

var BC_SUIT_CLASS_TO_LETTER = { 'spades':'S', 'hearts':'H', 'diamonds':'D', 'clubs':'C' };
var SUIT_LETTER_TO_CLASS    = { 'S':'spades', 'H':'hearts', 'D':'diamonds', 'C':'clubs' };
var SUIT_LETTER_TO_EN       = { 'S':'Spade', 'H':'Heart', 'D':'Diamond', 'C':'Club' };
var SUIT_EN_TO_PLURAL       = { 'Spade':'Spades', 'Heart':'Hearts', 'Diamond':'Diamonds', 'Club':'Clubs' };
var SUIT_LETTER_ORDER       = ['S','H','D','C'];
var SUIT_ORDER_EN           = ['Spade','Heart','Diamond','Club'];
var SUIT_SYMBOL             = { 'Spade':'\u2660', 'Heart':'\u2665', 'Diamond':'\u2666', 'Club':'\u2663' };

var CARD_RANK = {
    '2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
    '10':10,'J':11,'Q':12,'K':13,'A':14
};

var RANK_TO_WORD = { 'A':'Ace', 'K':'King', 'Q':'Queen', 'J':'Jack', '10':'10' };
function rankWord(rank) { return RANK_TO_WORD[rank] || rank; }

var KEY_TO_CARD_VALUE = {
    'a':'A','k':'K','q':'Q','j':'J','t':'10',
    '9':'9','8':'8','7':'7','6':'6','5':'5','4':'4','3':'3','2':'2'
};
var KEY_TO_SUIT       = { 's':'S','h':'H','d':'D','c':'C' };
var KEY_TO_BID_STRAIN = { 'c':'C','d':'D','h':'H','s':'S','n':'N' };
var BID_STRAIN_EN     = { 'C':'Club','D':'Diamond','H':'Heart','S':'Spade','N':'NT' };
var BID_STRAIN_TO_TESTID = { 'C':'C','D':'D','H':'H','S':'S','N':'NT' };

var DIRECTION_EN = { 'N':'North','E':'East','S':'South','W':'West' };
var SCREEN_POSITIONS = ['bottom','left','top','right'];
var VIDEO_POS_CLASS  = { bottom:'south', left:'west', top:'north', right:'east' };

// Jaon aikainen tila
var gamePhase           = 'unknown';
var activeTurnDirection = null;
var cachedContract      = null;
var currentTrick        = [];
var lastTrickSignature  = '';
var lastBoardSignature  = '';
var lastNotification    = '';
var announcedTrickCards = {};

// =========================================================
// 3. KORTIN JÄSENNYS
// =========================================================

// button.card.rank1.spades → { rank:'A', suit:'Spade', suitLetter:'S', key:'SA' }
function parseCardElement(el) {
    if (!el || !el.classList) return null;
    var rankNum = null, suitLetter = null;
    for (var i = 0; i < el.classList.length; i++) {
        var cls = el.classList[i];
        var m = cls.match(/^rank(\d{1,2})$/);
        if (m) { rankNum = parseInt(m[1], 10); continue; }
        if (BC_SUIT_CLASS_TO_LETTER[cls]) suitLetter = BC_SUIT_CLASS_TO_LETTER[cls];
    }
    if (rankNum === null || !suitLetter) return null;
    var rank = BC_RANK_TO_EN[rankNum];
    if (!rank) return null;
    return {
        rank:       rank,
        suit:       SUIT_LETTER_TO_EN[suitLetter],
        suitLetter: suitLetter,
        key:        suitLetter + rank,
        element:    el
    };
}

function sortCards(cards) {
    return cards.slice().sort(function (a, b) {
        var si = SUIT_LETTER_ORDER.indexOf(a.suitLetter);
        var sj = SUIT_LETTER_ORDER.indexOf(b.suitLetter);
        if (si !== sj) return si - sj;
        return (CARD_RANK[b.rank] || 0) - (CARD_RANK[a.rank] || 0);
    });
}

// =========================================================
// 4. KÄSIEN LUKU
// =========================================================

function isVisible(el) {
    if (!el) return false;
    var st = window.getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') return false;
    return true;
}

// Löytää oman käden kääreen (alareunassa). Realistic mode → .realistic-cards-wrapper.bottom
function getOwnHandWrapper() {
    var els = document.querySelectorAll(BC_SEL.ownHandWrapper + '.bottom');
    for (var i = 0; i < els.length; i++) {
        if (els[i].classList.contains('dummy-cards-wrapper')) continue;
        if (els[i].querySelector('[class*="rank"]')) return els[i];
    }
    // Fallback: mikä tahansa korttikääre, jossa on 13 korttia ja joka ei ole dummy
    var any = document.querySelectorAll(BC_SEL.ownHandWrapper);
    for (var j = 0; j < any.length; j++) {
        if (any[j].classList.contains('dummy-cards-wrapper')) continue;
        if (any[j].classList.contains('bottom')) return any[j];
    }
    return null;
}

function getDummyWrapper() {
    var els = document.querySelectorAll(BC_SEL.dummyWrapper);
    for (var i = 0; i < els.length; i++) {
        if (els[i].querySelector('[class*="rank"]')) return els[i];
    }
    return els.length ? els[0] : null;
}

// Ruutupositio ('top'/'left'/'right'/'bottom') annetusta kääreestä
function wrapperScreenPos(wrapper) {
    if (!wrapper) return null;
    for (var i = 0; i < SCREEN_POSITIONS.length; i++) {
        if (wrapper.classList.contains(SCREEN_POSITIONS[i])) return SCREEN_POSITIONS[i];
    }
    return null;
}

function cardsInContainer(container) {
    var out = [];
    if (!container) return out;
    container.querySelectorAll('[class*="rank"]').forEach(function (el) {
        // Otetaan mukaan vain varsinaiset korttielementit
        if (!el.classList.contains('card') && el.tagName !== 'BUTTON') return;
        if (el.classList.contains('played') || el.classList.contains('card-played')) return;
        var card = parseCardElement(el);
        if (card) out.push(card);
    });
    return sortCards(out);
}

function getUserHand()  { return cardsInContainer(getOwnHandWrapper()); }
function getDummyHand() { return cardsInContainer(getDummyWrapper()); }

// =========================================================
// 5. SUUNTIEN TUNNISTUS
// =========================================================

// Kompassin ruutupositio → todellinen ilmansuunta.
// .compass-container > .seat-label.bottom "S" / .left "W" / .top "N" / .right "E"
function getSeatMap() {
    var map = {};
    var compass = document.querySelector(BC_SEL.compass);
    if (compass) {
        SCREEN_POSITIONS.forEach(function (pos) {
            var el = compass.querySelector('.seat-label.' + pos);
            if (el) {
                var t = el.textContent.trim().toUpperCase().charAt(0);
                if ('NESW'.indexOf(t) !== -1) map[pos] = t;
            }
        });
    }
    // Fallback: pelaajaruutujen .side-symbol
    SCREEN_POSITIONS.forEach(function (pos) {
        if (map[pos]) return;
        var pv = document.querySelector(BC_SEL.playerVideo + '.' + VIDEO_POS_CLASS[pos] + ' .side-symbol');
        if (pv) {
            var t2 = pv.textContent.trim().toUpperCase().charAt(0);
            if ('NESW'.indexOf(t2) !== -1) map[pos] = t2;
        }
    });
    // Viimeinen fallback: käyttäjä etelässä
    if (!map.bottom) map = { bottom:'S', left:'W', top:'N', right:'E' };
    return map;
}

function getUserDirection() {
    // Ensisijaisesti yläpalkin "Seat :" -kenttä
    var seat = readDrawerField('Seat');
    if (seat) {
        var s = seat.trim().toUpperCase().charAt(0);
        if ('NESW'.indexOf(s) !== -1) return s;
    }
    return getSeatMap().bottom || 'S';
}

function getNextDirection(dir) {
    var dirs = ['N','E','S','W'];
    var idx  = dirs.indexOf(dir);
    return idx === -1 ? null : dirs[(idx + 1) % 4];
}

function getPartnerDirection(dir) {
    return getNextDirection(getNextDirection(dir));
}

function screenPosToDirection(pos) {
    return getSeatMap()[pos] || null;
}

function directionToScreenPos(dir) {
    var map = getSeatMap();
    for (var pos in map) { if (map[pos] === dir) return pos; }
    return null;
}

// Kenen vuoro: .player-video.<pos> .bc-game-video-frame.has-turn
function getTurnDirection() {
    var frames = document.querySelectorAll(BC_SEL.playerVideo);
    for (var i = 0; i < frames.length; i++) {
        if (!frames[i].querySelector(BC_SEL.turnFlag)) continue;
        var sym = frames[i].querySelector('.side-symbol');
        if (sym) {
            var t = sym.textContent.trim().toUpperCase().charAt(0);
            if ('NESW'.indexOf(t) !== -1) return t;
        }
        // Fallback: positioluokka
        for (var pos in VIDEO_POS_CLASS) {
            if (frames[i].classList.contains(VIDEO_POS_CLASS[pos])) return screenPosToDirection(pos);
        }
    }
    // Varatapaus: kompassin nuoli osoittaa vuorossa olevaa ruutupositiota
    var arrow = document.querySelector(BC_SEL.leaderArrow);
    if (arrow) {
        for (var j = 0; j < SCREEN_POSITIONS.length; j++) {
            if (arrow.classList.contains(SCREEN_POSITIONS[j])) {
                return screenPosToDirection(SCREEN_POSITIONS[j]);
            }
        }
    }
    return null;
}

function getDummyDirection() {
    var w = getDummyWrapper();
    if (!w) return null;
    var pos = wrapperScreenPos(w);
    return pos ? screenPosToDirection(pos) : null;
}

// =========================================================
// 6. KLIKKAUKSEN SIMULOINTI
// =========================================================

function simulateClick(el) {
    if (!el) return false;
    var rect = el.getBoundingClientRect();
    var cx   = rect.left + rect.width  / 2;
    var cy   = rect.top  + rect.height / 2;
    var down = { bubbles:true, cancelable:true, view:window,
                 clientX:cx, clientY:cy, screenX:cx, screenY:cy, button:0, buttons:1 };
    var up    = Object.assign({}, down, { buttons:0 });
    var noBtn = Object.assign({}, down, { button:0, buttons:0 });

    el.dispatchEvent(new PointerEvent('pointerover',  noBtn));
    el.dispatchEvent(new MouseEvent ('mouseover',     noBtn));
    el.dispatchEvent(new PointerEvent('pointerenter', noBtn));
    el.dispatchEvent(new PointerEvent('pointerdown',  down));
    el.dispatchEvent(new MouseEvent ('mousedown',     down));
    el.dispatchEvent(new PointerEvent('pointerup',    up));
    el.dispatchEvent(new MouseEvent ('mouseup',       up));
    el.dispatchEvent(new MouseEvent ('click',         up));
    if (el.focus) el.focus();
    return true;
}

// =========================================================
// 7. VUORON RATKAISU
// =========================================================

// Palauttaa 'mine' | 'dummy' | 'none'
function resolveAllowedHand() {
    var me       = getUserDirection();
    var turn     = getTurnDirection();
    var dummyDir = getDummyDirection();

    // Suora vihje DOM:sta: aktiivinen käsi merkitään .active-player -luokalla
    var own = getOwnHandWrapper();
    var dum = getDummyWrapper();
    var ownActive = own && own.classList.contains('active-player');
    var dumActive = dum && dum.classList.contains('active-player');

    if (turn) {
        if (turn === me) return 'mine';
        if (dummyDir && turn === dummyDir && getPartnerDirection(dummyDir) === me) return 'dummy';
        return 'none';
    }
    if (ownActive) return 'mine';
    if (dumActive) return 'dummy';
    return 'none';
}

function handHasSuit(hand, suitLetter) {
    return hand.some(function (c) { return c.suitLetter === suitLetter; });
}

// Aloitusväri kierroksella: tikin aloittajan pelaama kortti
function getTrickLeadSuit() {
    var trick = readCurrentTrickCards();
    if (trick.length === 0) return null;
    var lead = resolveTrickLeader(trick);
    if (lead) {
        for (var i = 0; i < trick.length; i++) {
            if (trick[i].direction === lead) return trick[i].suitLetter;
        }
    }
    var chrono = sortTrickChronologically(trick);
    return chrono.length ? chrono[0].suitLetter : null;
}

// =========================================================
// 8. KORTIN PELAAMINEN
// =========================================================

function findCardElement(container, suitLetter, rank) {
    if (!container) return null;
    var bcRank  = EN_RANK_TO_BC[rank];
    var suitCls = SUIT_LETTER_TO_CLASS[suitLetter];
    if (!bcRank || !suitCls) return null;
    var sel = '.rank' + bcRank + '.' + suitCls;
    var el  = container.querySelector(sel);
    if (!el) return null;
    // Napataan klikattava elementti (button jos sellainen löytyy)
    if (el.tagName === 'BUTTON') return el;
    return el.closest('button') || el.querySelector('button') || el;
}

function playCard(suitLetter, rank) {
    var allowed = resolveAllowedHand();
    if (allowed === 'none') {
        speakNow('Not your turn.');
        return;
    }
    var container = allowed === 'dummy' ? getDummyWrapper() : getOwnHandWrapper();
    var hand      = allowed === 'dummy' ? getDummyHand()    : getUserHand();
    var handName  = allowed === 'dummy' ? 'dummy' : 'my hand';

    // Pakkoväri-tarkistus
    var lead = getTrickLeadSuit();
    if (lead && lead !== suitLetter && handHasSuit(hand, lead)) {
        speakNow('Must follow ' + SUIT_LETTER_TO_EN[lead] + '. Card not played.');
        return;
    }

    var el = findCardElement(container, suitLetter, rank);
    if (!el) {
        speakNow(SUIT_LETTER_TO_EN[suitLetter] + ' ' + rankWord(rank) + ' not in ' + handName + '.');
        return;
    }
    simulateClick(el);
    speakNow('Playing ' + SUIT_LETTER_TO_EN[suitLetter] + ' ' + rankWord(rank) + '.');
}

// Nuoli ylös / alas (tai i / o): korkein tai matalin sallittu kortti
function playExtreme(mode) {
    var allowed = resolveAllowedHand();
    if (allowed === 'none') { speakNow('Not your turn.'); return; }
    var hand = allowed === 'dummy' ? getDummyHand() : getUserHand();
    if (hand.length === 0) { speakNow('No cards.'); return; }

    var lead = getTrickLeadSuit();
    var pool = hand;
    if (lead && handHasSuit(hand, lead)) {
        pool = hand.filter(function (c) { return c.suitLetter === lead; });
    }
    pool = pool.slice().sort(function (a, b) {
        return (CARD_RANK[b.rank] || 0) - (CARD_RANK[a.rank] || 0);
    });
    var chosen = mode === 'low' ? pool[pool.length - 1] : pool[0];
    if (!chosen) { speakNow('No playable card.'); return; }
    playCard(chosen.suitLetter, chosen.rank);
}

// =========================================================
// 9. TARJOAMINEN
// =========================================================

// --- 9.1 Tarjouskoodien käsittely -------------------------------------
// Bridge Champ koodaa tarjouksen luokan loppuosaan:
//   valittavat kortit : .bidding-card-3NT  .bidding-card-4H  .bidding-card-P
//                       .bidding-card-X    .bidding-card-XX
//   historiakortit    : .bc-bidding-card.C3S  (C-etuliite)  .CP
//   taulukkokortit    : .bid-card.3S  .bid-card.P

// 'S'|'H'|'D'|'C'|'N' → luokassa käytetty maakoodi
function strainToCode(strain) { return strain === 'N' ? 'NT' : strain; }

// "3S" → "3 Spades", "3NT" → "3 No Trump", "P" → "Pass", "X" → "Double"
function decodeBidCode(code) {
    if (!code) return null;
    code = code.toUpperCase();
    if (code === 'P' || code === 'PASS')      return 'Pass';
    if (code === 'X'  || code === 'DBL')      return 'Double';
    if (code === 'XX' || code === 'RDBL')     return 'Redouble';
    var m = code.match(/^([1-7])(NT|C|D|H|S)$/);
    if (!m) return null;
    if (m[2] === 'NT') return m[1] + ' No Trump';
    var en = SUIT_LETTER_TO_EN[m[2]];
    return m[1] + ' ' + (m[1] === '1' ? en : SUIT_EN_TO_PLURAL[en]);
}

// Etsii tarjouskortin luokasta koodin (esim. "bidding-card-4H" → "4H")
function bidCodeFromClassList(el, prefix) {
    if (!el || !el.classList) return null;
    for (var i = 0; i < el.classList.length; i++) {
        var c = el.classList[i];
        if (prefix) {
            if (c.indexOf(prefix) === 0) {
                var rest = c.slice(prefix.length);
                if (/^([1-7](NT|C|D|H|S)|P|XX|X)$/.test(rest.toUpperCase())) return rest.toUpperCase();
            }
        } else {
            if (/^([1-7](NT|C|D|H|S)|P|XX|X)$/.test(c.toUpperCase())) return c.toUpperCase();
        }
    }
    return null;
}

// --- 9.2 Tarjouslaatikon luku -----------------------------------------
//
// Tarjoaminen on KAKSIVAIHEINEN:
//   1. Klikkaa tarjouskorttia → kortti siirtyy esikatseluun
//      (.preview-wrapper.transform-adjust-{KOODI}.active), ruudulle ilmestyy
//      "Click to bid" -vihje, ja itse laatikko saa luokan
//      selector-container-fade-OUT (aiemmin fade-IN).
//   2. Klikkaa esikatselua → tarjous lähtee.
//
// HUOM: .bidding-selector-widget sisältää KAKSI .bidding-selector-container
// -elementtiä: toisessa ovat tarjouskortit, toisessa esikatselu. Ne erotetaan
// sisällön perusteella, EI fade-luokan – fade-luokka vaihtuu vaiheen mukana.

function getBidSelector() {
    var conts = document.querySelectorAll('.bidding-selector-container');
    for (var i = 0; i < conts.length; i++) {
        if (conts[i].querySelector('.preview-wrapper')) continue;      // esikatselusäiliö
        if (!conts[i].querySelector('.bidding-card.selector-card')) continue;
        return conts[i];
    }
    return null;
}

// Onko laatikko valintatilassa (vaihe 1) vai esikatselussa (vaihe 2)
function isBidSelectorChoosing() {
    var sel = getBidSelector();
    if (!sel) return false;
    return !sel.classList.contains('selector-container-fade-out');
}

// Vahvistusta odottava tarjous, jos sellainen on
function getPendingBidPreview() {
    var pv = document.querySelector('.bidding-selector-container .preview-wrapper');
    if (!pv || !pv.classList.contains('active')) return null;
    var code = bidCodeFromClassList(pv, 'transform-adjust-');
    if (!code) {
        var img = pv.querySelector('.bidding-card-image');
        if (img) code = bidCodeFromClassList(img, 'bidding-card-');
    }
    if (!code) return null;                        // transform-adjust-undefined
    var name = decodeBidCode(code);
    if (!name) return null;
    return { el: pv, code: code, name: name };
}

// Klikkaa esikatselua. Jos se ei mene läpi, kokeillaan sisäkuvaa ja
// lopuksi "Click to bid" -vihjettä.
function confirmPendingBid(expectedCode, onDone) {
    var p = getPendingBidPreview();
    if (!p) { if (onDone) onDone(false); return false; }
    if (expectedCode && p.code !== expectedCode) { if (onDone) onDone(false); return false; }

    var targets = [
        p.el,
        p.el.querySelector('.bidding-card-image'),
        p.el.querySelector('.preview-highlight-animation-wrapper'),
        document.querySelector('.click-to-bid-tooltip')
    ].filter(function (t) { return !!t; });

    var i = 0;
    function tryNext() {
        var still = getPendingBidPreview();
        if (!still || still.code !== p.code) { if (onDone) onDone(true); return; }
        if (i >= targets.length) { if (onDone) onDone(false); return; }
        simulateClick(targets[i++]);
        setTimeout(tryNext, 260);
    }
    tryNext();
    return true;
}

// Kaikki laillisiksi tarjotut kortit { code, el, disabled }
function listAvailableBids() {
    var sel = getBidSelector();
    if (!sel) return [];
    var out = [];
    sel.querySelectorAll(BC_SEL.bidSelectorCard).forEach(function (el) {
        if (el.classList.contains('preview-wrapper')) return;
        var code = bidCodeFromClassList(el, 'bidding-card-');
        if (!code) return;
        out.push({ code: code, el: el, disabled: el.classList.contains('disabled') });
    });
    return out;
}

function findBidCard(code) {
    var bids = listAvailableBids();
    for (var i = 0; i < bids.length; i++) {
        if (bids[i].code === code) return bids[i];
    }
    return null;
}

// Matalin numeerinen tarjous laatikossa (laatikko näyttää vain lailliset)
function lowestAvailableBid() {
    var bids = listAvailableBids().filter(function (b) {
        return !b.disabled && /^[1-7]/.test(b.code);
    });
    return bids.length ? bids[0].code : null;
}

// --- 9.3 Tarjouksen tekeminen -----------------------------------------
// Näppäinkomento hoitaa MOLEMMAT vaiheet: valitsee kortin ja vahvistaa
// esikatselun. Jos vahvistus ei jostain syystä mene läpi, tila kerrotaan
// ääneen ja Enter yrittää uudelleen.

function clickBidCard(entry, spokenName) {
    if (entry.disabled) {
        speakNow(spokenName + ' is not allowed.');
        return false;
    }
    simulateClick(entry.el);
    speakNow(spokenName + '.');

    // Vaihe 2: odota esikatselun ilmestymistä ja vahvista
    var tries = 0;
    (function waitForPreview() {
        var p = getPendingBidPreview();
        if (p && p.code === entry.code) {
            confirmPendingBid(entry.code, function (ok) {
                if (!ok) {
                    speak(spokenName + ' is waiting for confirmation. Press Enter to confirm.');
                }
            });
            return;
        }
        if (++tries > 8) return;      // ei esikatselua → tarjous meni suoraan läpi
        setTimeout(waitForPreview, 120);
    })();
    return true;
}

// --- 9.3b Minibridge ---------------------------------------------------
// Minibridgessä ei ole tarjoussarjaa: pisteet ratkaisevat kumpi puoli pelaa,
// korkeampi käsi on pelinviejä, ja partnerin kortit käännetään pöytään ennen
// kuin pelinviejä valitsee valttivärin. Ainoa "tarjous" on siis värin valinta.
//
// Valitsin on geneerinen, jotta mahdolliset lisävaiheet (esim. tavoitetikkien
// valinta) toimivat automaattisesti: otsikko luetaan .selector-title -tekstistä
// ja vaihtoehdot .selector-box -laatikoista riippumatta siitä, mitä ne ovat.

function getMiniSelector() {
    var el = document.querySelector('[data-testid="minibridge-bidding-selector"], .mini-bridge-bidding-selector');
    return (el && isVisible(el)) ? el : null;
}

function isMiniBridge() { return !!getMiniSelector(); }

function getMiniTitle() {
    var sel = getMiniSelector();
    if (!sel) return null;
    var t = sel.querySelector('.selector-title');
    if (!t) return null;
    // Otsikossa on myös Back-painike ("Back"), jota ei saa ottaa mukaan
    // otsikkotekstiin – muuten otsikoksi tulisi "Back Bid Level for Suit (NT)".
    var parts = [];
    t.childNodes.forEach(function (n) {
        if (n.nodeType === 1 && (n.tagName === 'BUTTON' || n.querySelector('button'))) return;
        var txt = (n.textContent || '').replace(/\s+/g, ' ').trim();
        if (txt) parts.push(txt);
    });
    var out = parts.join(' ').trim();
    return out || null;
}

// Valittu valtti luetaan otsikosta: "Bid Level for Suit (NT)" → "NT"
function getMiniChosenStrain() {
    var title = getMiniTitle();
    if (!title) return null;
    var m = title.match(/\(([^)]+)\)/);
    if (!m) return null;
    var raw = m[1].trim().toUpperCase();
    if (raw === 'NT' || raw === 'NOTRUMP' || raw === 'NO TRUMP') return 'NT';
    var symToCode = { '\u2660':'S', '\u2665':'H', '\u2666':'D', '\u2663':'C' };
    if (symToCode[raw]) return symToCode[raw];
    if (SUIT_LETTER_TO_EN[raw]) return raw;
    // Kokonainen sana, esim. "SPADES"
    for (var l in SUIT_LETTER_TO_EN) {
        if (SUIT_EN_TO_PLURAL[SUIT_LETTER_TO_EN[l]].toUpperCase() === raw) return l;
    }
    return null;
}

function strainNameEn(code) {
    if (!code) return null;
    if (code === 'NT' || code === 'N') return 'No Trump';
    return SUIT_EN_TO_PLURAL[SUIT_LETTER_TO_EN[code]] || code;
}

// Onko valitsin tasovaiheessa (data-testid="minibridge-level-*")
function isMiniLevelStep() {
    var sel = getMiniSelector();
    return !!(sel && sel.querySelector('[data-testid^="minibridge-level-"]'));
}

// Kaikki valittavat laatikot { code, name, el, disabled }
function listMiniOptions() {
    var sel = getMiniSelector();
    if (!sel) return [];
    var out = [];
    sel.querySelectorAll('.selector-box, [data-testid^="minibridge-"]').forEach(function (el) {
        if (el === sel) return;
        var testid = el.getAttribute('data-testid') || '';
        var code = null;
        var m = testid.match(/^minibridge-(?:suit|level|contract|trick)?-?(.+)$/);
        if (m) code = m[1].toUpperCase();
        if (!code) {
            // Varatapaus: luetaan symbolista tai tekstistä
            var txt = (el.textContent || '').trim();
            var symToCode = { '\u2660':'S', '\u2665':'H', '\u2666':'D', '\u2663':'C', 'NT':'NT' };
            code = symToCode[txt] || txt.toUpperCase();
        }
        if (!code) return;
        out.push({
            code: code,
            name: miniOptionName(code),
            el: el,
            disabled: el.classList.contains('disabled')
        });
    });
    return out;
}

// Vaihtoehdon nimi. Tasovaiheessa taso yhdistetään jo valittuun valttiin,
// jolloin "4" luetaan muodossa "4 No Trump" eikä pelkkänä numerona.
function miniOptionName(code) {
    if (code === 'NT' || code === 'N') return 'No Trump';
    if (SUIT_LETTER_TO_EN[code]) return SUIT_EN_TO_PLURAL[SUIT_LETTER_TO_EN[code]];
    if (/^[1-7]$/.test(code)) {
        var strain = getMiniChosenStrain();
        // Minibridgessä taso tarkoittaa samaa kuin bridgessä: 6 + taso tikkiä
        return strain ? code + ' ' + strainNameEn(strain) : 'Level ' + code;
    }
    return code;
}

// Palaa edelliseen vaiheeseen (valtin valintaan)
function miniGoBack() {
    var sel = getMiniSelector();
    var btn = sel && sel.querySelector('.back-button');
    if (!btn) { speakNow('No back button here.'); return false; }
    simulateClick(btn);
    speakNow('Going back.');
    return true;
}

// Valitsee vaihtoehdon koodilla ('S','H','D','C','NT' tai muu vaiheen koodi)
function submitMiniOption(code) {
    var opts = listMiniOptions();
    for (var i = 0; i < opts.length; i++) {
        if (opts[i].code !== code) continue;
        if (opts[i].disabled) { speakNow(opts[i].name + ' is not allowed.'); return true; }
        simulateClick(opts[i].el);
        speakNow('Selected ' + opts[i].name + '.');
        return true;
    }
    return false;
}

// Yhteensopivuus vanhaan nimeen: 'N' → 'NT'
function submitMiniBridgeSuit(strain) {
    return submitMiniOption(strain === 'N' ? 'NT' : strain);
}

// --- 9.3c Yhteiskäden analyysi (valttivärin valinnan tueksi) ------------
// Minibridgessä lepääjän kortit ovat näkyvissä jo ennen valintaa, joten
// yhteiset värijakaumat ja pisteet ovat juuri se tieto, jota valinta vaatii.
function readCombinedFit(quiet) {
    var mine  = getUserHand();
    var dummy = getDummyHand();
    if (!dummy.length) {
        if (!quiet) speakNow('Dummy not visible, cannot compute the combined fit.');
        return null;
    }
    var lengths = SUIT_ORDER_EN.map(function (suit) {
        var a = mine.filter(function (c) { return c.suit === suit; }).length;
        var b = dummy.filter(function (c) { return c.suit === suit; }).length;
        return { suit: suit, total: a + b, mine: a, dummy: b };
    }).sort(function (x, y) { return y.total - x.total; });

    var hcp = calcHcp(mine) + calcHcp(dummy);
    var text = 'Combined ' + hcp + ' HCP. ' +
        lengths.map(function (l) {
            return SUIT_EN_TO_PLURAL[l.suit] + ' ' + l.total +
                   ' (' + l.mine + ' plus ' + l.dummy + ')';
        }).join(', ') + '.';
    if (!quiet) speakNow(text);
    return { text: text, lengths: lengths, hcp: hcp };
}

// Ilmoitus kun minibridge-valitsin ilmestyy tai vaihe vaihtuu
var lastMiniTitle = null;

function checkMiniBridgeStep() {
    var title = getMiniTitle();
    if (title === lastMiniTitle) return;
    lastMiniTitle = title;
    if (!title) return;

    var opts   = listMiniOptions().filter(function (o) { return !o.disabled; });
    var parts  = [];
    var levelStep = isMiniLevelStep();

    if (levelStep) {
        // Valtti on jo valittu; nyt tarvitaan taso. Ratkaiseva tieto on
        // yhteispistemäärä, ei enää värijakauma.
        var strain = getMiniChosenStrain();
        parts.push('Trump chosen: ' + (strainNameEn(strain) || 'unknown') + '. ' + title + '.');
        var fitL = readCombinedFit(true);
        if (fitL) parts.push('Combined ' + fitL.hcp + ' HCP.');
        parts.push('Press 1 to 7 for the level. Backspace goes back to the trump suit.');
    } else {
        parts.push('Minibridge. You are declarer. ' + title + '.');
        var fit = readCombinedFit(true);
        if (fit) parts.push(fit.text);
        if (opts.length) {
            parts.push('Options: ' + opts.map(function (o) { return o.name; }).join(', ') +
                       '. Press the first letter, N for No Trump.');
        }
    }
    speak(parts.join(' '));
}

function submitBid(level, strain) {
    if (isMiniBridge()) {
        if (submitMiniBridgeSuit(strain)) return;
    }
    var code = level + strainToCode(strain);
    var name = decodeBidCode(code) || (level + ' ' + BID_STRAIN_EN[strain]);

    var pend = getPendingBidPreview();
    if (pend && pend.code !== code) {
        speakNow(pend.name + ' is still waiting for confirmation. ' +
                 'Press Enter to send it first.');
        return;
    }
    if (pend && pend.code === code) {
        speakNow('Confirming ' + name + '.');
        confirmPendingBid(code);
        return;
    }
    if (!getBidSelector()) {
        speakNow('Bidding box not open. ' + (getTurnDirection() === getUserDirection()
            ? 'Try again in a moment.' : 'Not your turn.'));
        return;
    }
    var entry = findBidCard(code);
    if (entry) { clickBidCard(entry, 'Bid ' + name); return; }

    // Laatikko sisältää vain lailliset tarjoukset → kerrotaan matalin mahdollinen
    var low = lowestAvailableBid();
    speakNow(name + ' is not available.' +
             (low ? ' Lowest bid is ' + decodeBidCode(low) + '.' : ''));
}

function submitPass() {
    var pend = getPendingBidPreview();
    if (pend) {
        if (pend.code === 'P') { speakNow('Confirming Pass.'); confirmPendingBid('P'); return; }
        speakNow(pend.name + ' is still waiting for confirmation. Press Enter to send it first.');
        return;
    }
    if (!getBidSelector()) { speakNow('Bidding box not open.'); return; }
    var entry = findBidCard('P');
    if (entry) { clickBidCard(entry, 'Pass'); return; }
    speakNow('Pass not available.');
}

// X = double, jos double ei ole tarjolla kokeillaan redoublea
function submitDouble() {
    var pendD = getPendingBidPreview();
    if (pendD) {
        if (pendD.code === 'X' || pendD.code === 'XX') {
            speakNow('Confirming ' + pendD.name + '.');
            confirmPendingBid(pendD.code);
            return;
        }
        speakNow(pendD.name + ' is still waiting for confirmation. Press Enter to send it first.');
        return;
    }
    if (!getBidSelector()) { speakNow('Bidding box not open.'); return; }
    var dbl = findBidCard('X');
    if (dbl && !dbl.disabled) { clickBidCard(dbl, 'Double'); return; }
    var rdbl = findBidCard('XX');
    if (rdbl && !rdbl.disabled) { clickBidCard(rdbl, 'Redouble'); return; }
    speakNow('Double not available.');
}

// Alt+O: luettele kaikki tarjolla olevat tarjoukset
function readAvailableBids() {
    // Minibridgessä "tarjolla olevat tarjoukset" = valittavat vaihtoehdot
    if (isMiniBridge()) {
        var opts = listMiniOptions().filter(function (o) { return !o.disabled; });
        var head = getMiniTitle() || 'Minibridge';
        if (isMiniLevelStep()) {
            var fitL = readCombinedFit(true);
            speakNow('Trump chosen: ' + (strainNameEn(getMiniChosenStrain()) || 'unknown') + '. ' +
                     head + '. ' + (fitL ? 'Combined ' + fitL.hcp + ' HCP. ' : '') +
                     'Levels: ' + opts.map(function (o) { return o.name; }).join(', ') + '.');
            return;
        }
        var fit = readCombinedFit(true);
        speakNow(head + '. ' + (fit ? fit.text + ' ' : '') +
                 'Options: ' + opts.map(function (o) { return o.name; }).join(', ') + '.');
        return;
    }
    var bids = listAvailableBids().filter(function (b) { return !b.disabled; });
    if (!bids.length) { speakNow('Bidding box not open.'); return; }
    var names = bids.map(function (b) { return decodeBidCode(b.code); })
                    .filter(function (n) { return !!n; });
    speakNow(names.length + ' bids available: ' + names.join(', ') + '.');
}

// --- 9.4 Tarjoushistorian luku ----------------------------------------

// A) Täysi historia Bidding-valikkopaneelin taulukosta.
// Otsikkorivi antaa sarakejärjestyksen (esim. WEST NORTH EAST SOUTH) ja
// .empty-bid-card -solut täyttävät jakajaa edeltävät paikat.
function readBidsFromTable() {
    var grid   = document.querySelector(BC_SEL.bidTable);
    var header = document.querySelector(BC_SEL.bidTableHeader);
    if (!grid || !header) return null;

    var cols = [];
    header.querySelectorAll(':scope > div').forEach(function (d) {
        var t = (d.textContent || '').trim().toUpperCase().charAt(0);
        cols.push('NESW'.indexOf(t) !== -1 ? t : null);
    });
    if (!cols.length) return null;

    var bids = [];
    var idx  = 0;
    grid.querySelectorAll(':scope > div').forEach(function (cell) {
        var dir = cols[idx % cols.length];
        idx++;
        if (cell.classList.contains('empty-bid-card')) return;
        var card = cell.querySelector('.bid-card') || cell;
        var code = bidCodeFromClassList(card);
        if (!code) {
            var img = cell.querySelector('img[alt]');
            if (img) code = (img.getAttribute('alt') || '').toUpperCase();
        }
        var name = decodeBidCode(code);
        if (name) bids.push({ direction: dir, code: code, name: name });
    });
    return bids;
}

// B) Pelaajakohtaiset viimeisimmät tarjoukset pöydän ympärillä.
// DOM-järjestys: bottom, left, top, right.
function readLastBidsAroundTable() {
    var boxes = document.querySelectorAll(BC_SEL.bidHistoryBox);
    if (!boxes.length) return [];
    var out = [];
    for (var i = 0; i < boxes.length && i < 4; i++) {
        var card = boxes[i].querySelector(BC_SEL.bidHistoryCard);
        if (!card) continue;
        var code = bidCodeFromClassList(card, 'C');
        var name = decodeBidCode(code);
        if (!name) continue;
        var dir = screenPosToDirection(SCREEN_POSITIONS[i]);
        out.push({ direction: dir, code: code, name: name, screenPos: SCREEN_POSITIONS[i] });
    }
    return out;
}

function readAllBids() {
    var table = readBidsFromTable();
    if (table && table.length) {
        speakNow('Bidding: ' + table.map(function (b) {
            return (DIRECTION_EN[b.direction] || b.direction || '') + ' ' + b.name;
        }).join(', ') + '.');
        return;
    }
    var around = readLastBidsAroundTable();
    if (around.length) {
        speakNow('Last bids: ' + around.map(function (b) {
            return (DIRECTION_EN[b.direction] || b.direction || '') + ' ' + b.name;
        }).join(', ') + '. Open the Bidding menu for the full auction.');
        return;
    }
    speakNow('No bids yet.');
}

// Uusien tarjousten automaattinen ilmoitus
var announcedBids = {};

function checkNewBids() {
    var around = readLastBidsAroundTable();
    var me = getUserDirection();
    around.forEach(function (b) {
        var id = b.screenPos + ':' + b.code;
        if (announcedBids[id]) return;
        announcedBids[id] = true;
        if (b.direction === me) return;   // oma tarjous ilmoitettiin jo tehtäessä
        speak((DIRECTION_EN[b.direction] || b.direction || '') + ' bids ' + b.name + '.');
    });
}

// =========================================================
// 10. PELIVAIHEEN TUNNISTUS
// =========================================================

// Yläpalkin drawer: <span><span>"Game Stage :"</span><span>ARVO</span>…</span>
function readDrawerField(labelWord) {
    var drawer = document.querySelector(BC_SEL.drawer);
    if (!drawer) return null;
    var spans = drawer.querySelectorAll('span > span');
    for (var i = 0; i < spans.length; i++) {
        var txt = (spans[i].textContent || '').trim();
        if (txt.replace(/\s*:\s*$/, '').toLowerCase() === labelWord.toLowerCase()) {
            var next = spans[i].nextElementSibling;
            if (next) return (next.textContent || '').trim();
        }
    }
    return null;
}

function getGameStage() {
    var stage = readDrawerField('Game Stage');
    return stage ? stage.toUpperCase() : null;
}

function isBiddingPhase() {
    // Näkyvä tarjouslaatikko on vahvin signaali – se on auki vain omalla vuorolla
    if (getBidSelector()) return true;
    if (isMiniBridge())   return true;
    var st = getGameStage();
    return st ? (st.indexOf('BID') !== -1 || st.indexOf('MINI') !== -1) : false;
}

function isPlayPhase() {
    if (getBidSelector()) return false;
    var st = getGameStage();
    if (st) return st.indexOf('PLAY') !== -1 || st.indexOf('CARD') !== -1;
    return getUserHand().length > 0 && !document.querySelector(BC_SEL.biddingBox);
}

// =========================================================
// 11. KAKSOISNÄPPÄINAUTOMAATTI
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

function announceSuitPrompt(suitLetter) {
    var lead = getTrickLeadSuit();
    if (lead && lead !== suitLetter) {
        var ah   = resolveAllowedHand();
        var hand = ah === 'dummy' ? getDummyHand() : getUserHand();
        if (handHasSuit(hand, lead)) {
            speakNow(SUIT_LETTER_TO_EN[suitLetter] + '? Warning: must follow ' + SUIT_LETTER_TO_EN[lead] + '.');
            return;
        }
    }
    speakNow(SUIT_LETTER_TO_EN[suitLetter] + '?');
}

function handleFirstKey(key, blockFn) {
    // Vahvistusta odottava tarjous: Enter lähettää sen. Tämä on ennen kaikkea
    // muuta, koska tässä tilassa mikään muu tarjouskomento ei ole mielekäs.
    var pendingBid = getPendingBidPreview();
    if (pendingBid) {
        if (key === 'enter') {
            blockFn();
            speakNow('Confirming ' + pendingBid.name + '.');
            confirmPendingBid(pendingBid.code, function (ok) {
                if (!ok) speak('Confirmation failed. Try clicking, or press Alt M to refresh.');
            });
            return true;
        }
        if (key === 'escape') {
            blockFn();
            speakNow(pendingBid.name + ' is waiting for confirmation. Press Enter to send it.');
            return true;
        }
    }

    // Minibridge ENSIN. Jos valitsin on näkyvissä, yksittäinen värinäppäin
    // tarkoittaa yksiselitteisesti valttivärin valintaa – ei kortin pelaamista.
    // Tämä tarkistus on ennen isPlayPhase()-haaraa, koska Game Stage voi
    // minibridgessä olla mitä tahansa eikä siihen voi luottaa.
    if (isMiniBridge()) {
        var levelStep = isMiniLevelStep();

        // Tasonäppäimet 1-7
        if (key >= '1' && key <= '7') {
            blockFn();
            if (submitMiniOption(key)) return true;
            speakNow('Level ' + key + ' is not available here. ' +
                     (getMiniTitle() || '') + '. Press Alt O to list the options.');
            return true;
        }

        // Värinäppäimet
        if (KEY_TO_BID_STRAIN[key]) {
            blockFn();
            var code = KEY_TO_BID_STRAIN[key] === 'N' ? 'NT' : KEY_TO_BID_STRAIN[key];
            if (submitMiniOption(code)) return true;
            if (levelStep) {
                // Valtti on jo lukittu – kerrotaan mikä, ja miten sen vaihtaa
                speakNow('Trump is already ' + (strainNameEn(getMiniChosenStrain()) || 'chosen') +
                         '. Press 1 to 7 for the level, or Backspace to change the trump.');
            } else {
                speakNow(strainNameEn(code) + ' is not available. ' +
                         (getMiniTitle() || '') + '. Press Alt O to list the options.');
            }
            return true;
        }

        // Takaisin edelliseen vaiheeseen
        if (key === 'backspace') { blockFn(); miniGoBack(); return true; }

        if (key === 'p' || key === 'x') {
            blockFn();
            speakNow('Minibridge has no pass or double. ' + (getMiniTitle() || '') + '.');
            return true;
        }
    }

    if (KEY_TO_SUIT[key] && isPlayPhase()) {
        blockFn();
        pendingInput = { type:'card', suit:KEY_TO_SUIT[key] };
        setInputTimeout();
        announceSuitPrompt(pendingInput.suit);
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
            announceSuitPrompt(pendingInput.suit);
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
// 12. TIKIN LUKU
// =========================================================

// Pelatut kortit ovat .trick-cards -alueella, EIVÄT .play-gather-location
// -laatikoissa (ne ovat aina tyhjiä animaatiokohteita).
//
//   .trick-cards
//     .trick-card-wrapper.w-3   → button.card.rank1.spades   (lännen ♠A)
//     .card > .card.back                                      (koriste, ohitetaan)
//     .trick-card-wrapper.w-0.mark → .mark-decoration          (vuorossa oleva)
//
// w-N on istumapaikan indeksi. Luonteva tulkinta on absoluuttinen kompassi
// N,E,S,W = 0,1,2,3. Käyttäjän istuessa etelässä tämä ei kuitenkaan erotu
// ruutupohjaisesta tulkinnasta (top,right,bottom,left), joten tulkinta
// VARMISTETAAN ajon aikana: .mark osoittaa vuorossa olevaa pelaajaa, joten
// sitä verrataan has-turn-lippuun. Jos tulkinnat ovat ristiriidassa,
// vaihdetaan toiseen.

var TRICK_IDX_COMPASS = ['N','E','S','W'];
var TRICK_IDX_SCREEN  = ['top','right','bottom','left'];
var trickIndexBase    = 'compass';   // 'compass' | 'screen'

function trickWrapperIndex(el) {
    if (!el || !el.classList) return null;
    for (var i = 0; i < el.classList.length; i++) {
        var m = el.classList[i].match(/^w-(\d)$/);
        if (m) return parseInt(m[1], 10);
    }
    return null;
}

function trickIndexToDirection(idx) {
    if (idx === null || idx < 0 || idx > 3) return null;
    if (trickIndexBase === 'screen') return screenPosToDirection(TRICK_IDX_SCREEN[idx]);
    return TRICK_IDX_COMPASS[idx];
}

// Itsekorjaus: .mark on vuorossa olevan pelaajan kohdalla
function calibrateTrickIndexBase() {
    var area = document.querySelector(BC_SEL.trickArea);
    if (!area) return;
    var mark = area.querySelector(BC_SEL.trickMark);
    if (!mark) return;
    var idx = trickWrapperIndex(mark);
    if (idx === null) return;
    var turn = getTurnDirection();
    if (!turn) return;

    if (TRICK_IDX_COMPASS[idx] === turn) { trickIndexBase = 'compass'; return; }
    if (screenPosToDirection(TRICK_IDX_SCREEN[idx]) === turn) { trickIndexBase = 'screen'; return; }
    // Kumpikaan ei täsmää – jätetään nykyinen tulkinta voimaan
}

// Vuorossa oleva .mark-kääreestä (varmin lähde kesken tikin)
function getTrickMarkDirection() {
    var area = document.querySelector(BC_SEL.trickArea);
    if (!area) return null;
    var mark = area.querySelector(BC_SEL.trickMark);
    if (!mark) return null;
    return trickIndexToDirection(trickWrapperIndex(mark));
}

function readCurrentTrickCards() {
    var out  = [];
    var area = document.querySelector(BC_SEL.trickArea);

    if (area) {
        area.querySelectorAll(BC_SEL.trickWrapper).forEach(function (w) {
            var cardEl = w.querySelector('[class*="rank"]');
            if (!cardEl) return;                     // .mark-kääreessä ei ole korttia
            var card = parseCardElement(cardEl);     // .card.back ei tuota tulosta
            if (!card) return;
            var idx = trickWrapperIndex(w);
            card.seatIndex = idx;
            card.direction = trickIndexToDirection(idx);
            card.screenPos = card.direction ? directionToScreenPos(card.direction) : null;
            out.push(card);
        });
        if (out.length) return out;
    }

    // Varatapaus: vanha .play-gather-location -tulkinta
    SCREEN_POSITIONS.forEach(function (pos) {
        var box = document.querySelector(BC_SEL.gather + '.' + pos);
        if (!box) return;
        box.querySelectorAll('[class*="rank"]').forEach(function (el) {
            var card = parseCardElement(el);
            if (!card) return;
            card.screenPos = pos;
            card.direction = screenPosToDirection(pos);
            out.push(card);
        });
    });
    return out;
}

// Tikin aloittaja. Pidetään muistissa koko tikin ajan, koska .mark siirtyy
// kortti kortilta eteenpäin. Sivun latautuessa kesken tikin aloittaja
// päätellään .mark-suunnasta askeltamalla taaksepäin korttien määrän verran.
var currentTrickLeader = null;

function previousDirection(dir) {
    return getNextDirection(getNextDirection(getNextDirection(dir)));
}

function resolveTrickLeader(cards) {
    if (currentTrickLeader) return currentTrickLeader;
    if (!cards.length) return null;

    if (cards.length === 1 && cards[0].direction) {
        currentTrickLeader = cards[0].direction;
        return currentTrickLeader;
    }
    var next = getTrickMarkDirection() || getTurnDirection();
    if (next && cards.length < 4) {
        var d = next;
        for (var i = 0; i < cards.length; i++) d = previousDirection(d);
        currentTrickLeader = d;
        return currentTrickLeader;
    }
    // Neljän kortin tikki ilman muistia: käytetään ensimmäistä löydettyä
    currentTrickLeader = cards[0].direction || null;
    return currentTrickLeader;
}

function sortTrickChronologically(cards) {
    if (cards.length <= 1) return cards.slice();
    var lead = resolveTrickLeader(cards);
    var order = ['N','E','S','W'];
    var li = order.indexOf(lead);
    if (li === -1) return cards.slice();
    return cards.slice().sort(function (a, b) {
        var ia = (order.indexOf(a.direction) - li + 8) % 4;
        var ib = (order.indexOf(b.direction) - li + 8) % 4;
        return ia - ib;
    });
}

function trickSignature(cards) {
    return cards.map(function (c) { return (c.direction || c.screenPos) + ':' + c.key; })
                .sort().join('|');
}

function detectTrickChanges() {
    calibrateTrickIndexBase();

    var cards = readCurrentTrickCards();
    var sig   = trickSignature(cards);
    if (sig === lastTrickSignature) return;

    var prevCount = currentTrick.length;

    // Pöytä tyhjeni tai korttimäärä putosi → uusi tikki alkoi
    if (cards.length < prevCount) {
        announcedTrickCards = {};
        currentTrickLeader  = null;
        currentTrick        = cards;
        lastTrickSignature  = sig;
        readTrickCount(true);
        if (cards.length > 0) announceNewCards(cards);
        return;
    }

    announceNewCards(cards);
    currentTrick       = cards;
    lastTrickSignature = sig;

    if (cards.length === 4) {
        setTimeout(function () { readTrickCount(true); }, 900);
    }
}

function announceNewCards(cards) {
    var chrono = sortTrickChronologically(cards);
    var me = getUserDirection();
    chrono.forEach(function (c) {
        var id = (c.direction || c.screenPos) + ':' + c.key;
        if (announcedTrickCards[id]) return;
        announcedTrickCards[id] = true;
        if (c.direction === me) return;   // oma kortti ilmoitettiin jo pelattaessa
        var who = DIRECTION_EN[c.direction] || c.direction || '';
        speak(who + ' plays ' + c.suit + ' ' + rankWord(c.rank) + '.');
    });
}

// .taken-score-box: ensimmäinen = N-S, toinen = E-W
function readTrickCount(quiet) {
    var boxes = document.querySelectorAll(BC_SEL.scoreBoard + ' .taken-score-box');
    if (boxes.length < 2) { if (!quiet) speakNow('Trick count not available.'); return; }
    var ns = (boxes[0].textContent || '').trim();
    var ew = (boxes[1].textContent || '').trim();
    var text = 'North South ' + ns + ' tricks, East West ' + ew + ' tricks.';
    if (quiet) speak(text); else speakNow(text);
}

// =========================================================
// 13. JAON TIEDOT
// =========================================================

function readBoardNumber() {
    var r = document.querySelector(BC_SEL.scoreBoard + ' .round');
    if (r) return (r.textContent || '').trim();
    var b = document.querySelector('.board-number');
    return b ? 'Board ' + (b.textContent || '').trim() : null;
}

function readVulnerability() {
    // 1) .game-score.has-vulnerability.NONE / .NS / .EW / .ALL
    var gs = document.querySelector(BC_SEL.scoreBoard + ' .game-score');
    if (gs) {
        var cl = gs.className.toUpperCase();
        if (/\bALL\b|\bBOTH\b/.test(cl)) return 'ALL';
        if (/\bNS\b|\bN-S\b/.test(cl))   return 'NS';
        if (/\bEW\b|\bE-W\b/.test(cl))   return 'EW';
        if (/\bNONE\b/.test(cl))         return 'NONE';
    }
    // 2) kompassin luokka v-none / v-ns / v-ew / v-all
    var comp = document.querySelector(BC_SEL.compass);
    if (comp) {
        var c2 = comp.className.toLowerCase();
        if (/v-all|v-both/.test(c2)) return 'ALL';
        if (/v-ns/.test(c2))         return 'NS';
        if (/v-ew/.test(c2))         return 'EW';
        if (/v-none/.test(c2))       return 'NONE';
    }
    return null;
}

function vulnerabilityTextEn(v) {
    if (v === 'ALL')  return 'Both vulnerable';
    if (v === 'NS')   return 'North South vulnerable';
    if (v === 'EW')   return 'East West vulnerable';
    if (v === 'NONE') return 'None vulnerable';
    return 'Vulnerability unknown';
}

function readDealer() {
    var comp = document.querySelector(BC_SEL.compass);
    if (!comp) return null;
    for (var i = 0; i < SCREEN_POSITIONS.length; i++) {
        if (comp.querySelector('.dealer.' + SCREEN_POSITIONS[i])) {
            return screenPosToDirection(SCREEN_POSITIONS[i]);
        }
    }
    return null;
}

function readScoringMethod() {
    var el = document.querySelector('.scoring-method');
    return el ? (el.textContent || '').trim() : null;
}

function readTableScore() {
    var ns = document.querySelector('.table-score.ns');
    var ew = document.querySelector('.table-score.ew');
    if (!ns && !ew) return null;
    var m = readScoringMethod() || '';
    return 'Score ' + m + ': North South ' + (ns ? ns.textContent.trim() : '?') +
           ', East West ' + (ew ? ew.textContent.trim() : '?');
}

// Sopimus kompassin alta:
//   .contract-container > .bid-symbol-container > span "1" + .stripe-symbol "♥"
//                       > .declarer-container "S"
function readContractDisplay() {
    var el = document.querySelector(BC_SEL.contract);
    if (el && isVisible(el)) {
        var levelEl  = el.querySelector('.bid-symbol-container span:not(.stripe-symbol)');
        var symEl    = el.querySelector('.stripe-symbol');
        var declEl   = el.querySelector('.declarer-container');
        var level    = levelEl ? (levelEl.textContent || '').trim() : '';
        var strain   = symEl ? strainFromSymbolEl(symEl) : null;
        var declarer = declEl ? (declEl.textContent || '').trim().toUpperCase().charAt(0) : '';

        if (level && strain) {
            var txt = level + ' ' + strainNameEn(strain);
            if ('NESW'.indexOf(declarer) !== -1) txt += ' by ' + DIRECTION_EN[declarer];
            cachedContract = txt;
            return txt;
        }
        // Varatapaus: koko teksti sellaisenaan
        var raw = (el.textContent || '').trim();
        if (raw) { cachedContract = normalizeContractText(raw); return cachedContract; }
    }
    if (cachedContract) return cachedContract;
    return null;
}

// .stripe-symbol.♥ – väri on sekä luokassa että tekstisisällössä
function strainFromSymbolEl(el) {
    var symToCode = { '\u2660':'S', '\u2665':'H', '\u2666':'D', '\u2663':'C' };
    var txt = (el.textContent || '').trim();
    if (symToCode[txt]) return symToCode[txt];
    if (/^NT$/i.test(txt)) return 'NT';
    for (var i = 0; i < el.classList.length; i++) {
        var c = el.classList[i];
        if (symToCode[c]) return symToCode[c];
        if (c.toUpperCase() === 'NT') return 'NT';
    }
    return null;
}

// Sopimuksen valttiväri (tikin voittajan päättelyyn ja pakkoväri-ilmoituksiin)
function getTrumpSuitLetter() {
    var c = readContractDisplay();
    if (!c) return null;
    if (/No Trump/i.test(c)) return null;
    for (var l in SUIT_LETTER_TO_EN) {
        if (new RegExp('\\b' + SUIT_EN_TO_PLURAL[SUIT_LETTER_TO_EN[l]] + '\\b', 'i').test(c)) return l;
    }
    return null;
}

function normalizeContractText(t) {
    return t.replace(/\u2660/g, ' Spades')
            .replace(/\u2665/g, ' Hearts')
            .replace(/\u2666/g, ' Diamonds')
            .replace(/\u2663/g, ' Clubs')
            .replace(/\bNT\b/g, ' No Trump')
            .replace(/\s+/g, ' ')
            .trim();
}

function readPlayerNames() {
    var names = [];
    SCREEN_POSITIONS.forEach(function (pos) {
        var pv = document.querySelector(BC_SEL.playerVideo + '.' + VIDEO_POS_CLASS[pos]);
        if (!pv) return;
        var nameEl = pv.querySelector('.user-full-name');
        var dir    = screenPosToDirection(pos);
        if (nameEl) names.push((DIRECTION_EN[dir] || dir || pos) + ': ' + nameEl.textContent.trim());
    });
    speakNow(names.length ? names.join(', ') : 'Player names not found.');
}

function announceBoard() {
    var parts = [];
    var b = readBoardNumber();
    if (b) parts.push(b);
    var v = readVulnerability();
    if (v) parts.push(vulnerabilityTextEn(v));
    var d = readDealer();
    if (d) parts.push('Dealer ' + (DIRECTION_EN[d] || d));
    var sig = parts.join('|');
    if (sig === lastBoardSignature) return;
    lastBoardSignature = sig;
    if (parts.length) speak(parts.join('. ') + '.');
}

// =========================================================
// 14. KÄDEN LUKUKOMENNOT
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

function calcHcp(cards) {
    var pts = { 'A':4, 'K':3, 'Q':2, 'J':1 };
    return cards.reduce(function (s, c) { return s + (pts[c.rank] || 0); }, 0);
}

// =========================================================
// 15. TILAN NOLLAUS / UUSI JAKO
// =========================================================

function handFingerprint() {
    return getUserHand().map(function (c) { return c.key; }).join(',');
}

var lastHandFingerprint = '';

function resetDealState() {
    pendingInput        = null;
    clearInputTimeout();
    cachedContract      = null;
    activeTurnDirection = null;
    currentTrick        = [];
    currentTrickLeader  = null;
    lastTrickSignature  = '';
    announcedTrickCards = {};
    announcedBids       = {};
    lastBoardSignature  = '';
    lastBidSelectorOpen = false;
    lastPendingBidCode  = null;
    lastMiniTitle       = null;
}

function onNewDeal() {
    resetDealState();
    setTimeout(function () {
        var parts = [];
        var b = readBoardNumber();
        if (b) parts.push('New deal. ' + b);
        else   parts.push('New deal.');
        var v = readVulnerability();
        if (v) parts.push(vulnerabilityTextEn(v));
        var d = readDealer();
        if (d) parts.push('Dealer ' + (DIRECTION_EN[d] || d));
        var hcp = calcHcp(getUserHand());
        parts.push(hcp + ' HCP');
        speak(parts.join('. ') + '.');
    }, 600);
}

function forceRefreshState() {
    resetDealState();
    lastHandFingerprint = handFingerprint();
    calibrateTrickIndexBase();
    currentTrick        = readCurrentTrickCards();
    currentTrickLeader  = null;
    resolveTrickLeader(currentTrick);
    lastTrickSignature  = trickSignature(currentTrick);
    announcedTrickCards = {};
    currentTrick.forEach(function (c) {
        announcedTrickCards[(c.direction || c.screenPos) + ':' + c.key] = true;
    });
    var contract = readContractDisplay();
    speakNow('State refreshed. ' + (getGameStage() || 'Unknown stage') + '. ' +
             (contract ? contract + '. ' : '') +
             getUserHand().length + ' cards in hand, ' +
             currentTrick.length + ' on the table.');
}

// =========================================================
// 16. STAATTISET SAAVUTETTAVUUSKORJAUKSET
// =========================================================

// --- 16.1 Pelikortit: EI DOM-KÄSITTELYÄ -------------------------------
// Laajennus ei nimeä, roolita eikä muokkaa pelikortteja millään tavalla.
// Kortit luetaan ja pelataan yksinomaan näppäinkomennoilla (väri + arvo,
// Alt+G/A/S/D/F, Alt+T/Q/W/E/R, Alt+P) ja puheilmoituksilla.
//
// Aiemmat versiot lisäsivät korttipainikkeisiin aria-labelit. Se poistettiin
// tarpeettomana; alla oleva funktio siivoaa vanhat merkinnät pois, jos
// sivu on ollut auki edellisen version aikana.

function cleanupCardAttributes() {
    // BridgeChamp ei aseta korteille aria-labelia itse, joten kaikki
    // löytyvät ovat laajennuksen aiemmin lisäämiä.
    document.querySelectorAll('button.card[aria-label], .card[role="button"][aria-label]')
        .forEach(function (el) {
            el.removeAttribute('aria-label');
        });
    [[BC_SEL.trickArea, 'Cards on the table'],
     [BC_SEL.ownHandWrapper + '.bottom', 'My hand'],
     [BC_SEL.dummyWrapper, 'Dummy hand']].forEach(function (pair) {
        document.querySelectorAll(pair[0]).forEach(function (el) {
            if (el.getAttribute('aria-label') !== pair[1]) return;
            el.removeAttribute('role');
            el.removeAttribute('aria-label');
        });
    });
}

// --- 16.1b Tarjouskortit painikkeiksi ---------------------------------
// .bidding-card.selector-card on tekstitön <div> ilman rolea ja tabindexiä.
// Tehdään niistä oikeita painikkeita, jolloin tarjouslaatikkoa voi käyttää
// myös pelkällä Tabilla ilman näppäinkomentoja.
function labelBiddingCards() {
    var sel = document.querySelector(BC_SEL.bidSelector);
    if (sel) {
        if (!sel.hasAttribute('role')) {
            sel.setAttribute('role', 'group');
            sel.setAttribute('aria-label', 'Bidding box');
        }
        sel.querySelectorAll(BC_SEL.bidSelectorCard).forEach(function (el) {
            if (el.classList.contains('preview-wrapper')) return;
            var code = bidCodeFromClassList(el, 'bidding-card-');
            if (!code) return;
            var name = decodeBidCode(code);
            if (!name) return;
            var disabled = el.classList.contains('disabled');
            if (el.getAttribute('aria-label') !== name) el.setAttribute('aria-label', name);
            el.setAttribute('role', 'button');
            el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
            el.setAttribute('tabindex', disabled ? '-1' : '0');
            if (el.dataset.bcBid !== 'done') {
                el.dataset.bcBid = 'done';
                el.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                        if (el.classList.contains('disabled')) { speakNow(name + ' is not allowed.'); return; }
                        clickBidCard({ code: code, el: el, disabled: false }, name);
                    }
                });
            }
        });
    }

    // Esikatselukortti on VAHVISTUSPAINIKE, ei koriste. Aiemmin se
    // piilotettiin aria-hiddenillä, jolloin vahvistusvaihe oli ruudunlukijalle
    // näkymätön ja tarjous jäi jumiin esikatseluun.
    var pending = getPendingBidPreview();
    var previewEl = document.querySelector(BC_SEL.bidPreview);
    if (previewEl) {
        if (pending) {
            previewEl.removeAttribute('aria-hidden');
            previewEl.setAttribute('role', 'button');
            previewEl.setAttribute('tabindex', '0');
            previewEl.setAttribute('aria-label', 'Confirm bid: ' + pending.name);
            if (previewEl.dataset.bcConfirm !== 'done') {
                previewEl.dataset.bcConfirm = 'done';
                previewEl.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
                        e.preventDefault();
                        var p = getPendingBidPreview();
                        if (p) confirmPendingBid(p.code);
                    }
                });
            }
        } else {
            // Ei vahvistettavaa → koriste
            previewEl.setAttribute('aria-hidden', 'true');
            previewEl.removeAttribute('role');
            previewEl.removeAttribute('tabindex');
            previewEl.removeAttribute('aria-label');
        }
    }
    // "Click to bid" -vihje on visuaalinen; sisältö kerrotaan puheena
    var tip = document.querySelector('.click-to-bid-tooltip');
    if (tip) tip.setAttribute('aria-hidden', 'true');

    // Pöydän ympärillä olevat historiakortit
    document.querySelectorAll(BC_SEL.bidHistoryBox).forEach(function (box, i) {
        var card = box.querySelector(BC_SEL.bidHistoryCard);
        if (!card) return;
        var code = bidCodeFromClassList(card, 'C');
        var name = decodeBidCode(code);
        if (!name) return;
        var dir = screenPosToDirection(SCREEN_POSITIONS[i]);
        var lbl = (DIRECTION_EN[dir] || dir || '') + ' bid ' + name;
        if (card.getAttribute('aria-label') !== lbl) card.setAttribute('aria-label', lbl);
        // "ALERT"-teksti on piilotettu visuaalisesti mutta luetaan – piilotetaan
        var alertMsg = card.querySelector('.bidding-card-alert-message');
        var alertIcon = card.querySelector('.bid-alert-icon');
        if (alertMsg && alertIcon && alertIcon.classList.contains('hidden')) {
            alertMsg.setAttribute('aria-hidden', 'true');
        } else if (alertMsg) {
            alertMsg.removeAttribute('aria-hidden');
        }
    });

    // Tarjoushistoriataulukon kuvat: alt="3S" → "3 Spades"
    document.querySelectorAll(BC_SEL.bidTable + ' img[alt]').forEach(function (img) {
        var name = decodeBidCode(img.getAttribute('alt'));
        if (name && img.getAttribute('alt') !== name) img.setAttribute('alt', name);
    });
}

// --- 16.2 Valikot painikkeiksi ---------------------------------------
function makeButton(el, label) {
    if (!el || el.dataset.bcA11y === 'done') return;
    el.dataset.bcA11y = 'done';
    el.setAttribute('role', 'button');
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '0');
    if (label) el.setAttribute('aria-label', label);
    el.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            simulateClick(el);
        }
    });
}

function fixMenus() {
    // Vasen päävalikko: .bc-menu-item[title] + .item-label
    document.querySelectorAll(BC_SEL.menuItem).forEach(function (el) {
        if (el.classList.contains('bottom-button-splitter')) {
            el.setAttribute('aria-hidden', 'true');
            return;
        }
        var labelEl = el.querySelector('.item-label');
        var label   = el.getAttribute('title') || (labelEl ? labelEl.textContent.trim() : '');
        makeButton(el, label);
        var icon = el.querySelector('.menu-icon-wrapper');
        if (icon) icon.setAttribute('aria-hidden', 'true');
    });

    // Oikea työkaluvalikko: .menu-item-wrapper[title] – ei tekstiä lainkaan
    document.querySelectorAll(BC_SEL.rightMenuItem).forEach(function (el) {
        makeButton(el, el.getAttribute('title') || 'Menu item');
    });

    // Claim / Undo
    document.querySelectorAll(BC_SEL.claimUndo).forEach(function (el) {
        var t = el.querySelector('.hover-title');
        var label = t ? t.textContent.trim() : (el.getAttribute('data-testid') || 'Button');
        makeButton(el, label);
        var disabled = el.classList.contains('disabled');
        el.setAttribute('aria-disabled', disabled ? 'true' : 'false');
        el.setAttribute('tabindex', disabled ? '-1' : '0');
    });
}

// --- 16.3 Yläpalkin kentät ja kopiopainikkeet -------------------------
function fixDrawer() {
    var drawer = document.querySelector(BC_SEL.drawer);
    if (!drawer) return;

    drawer.querySelectorAll('span > span').forEach(function (sp) {
        var txt = (sp.textContent || '').trim();
        if (!/:\s*$/.test(txt)) return;
        var name = txt.replace(/\s*:\s*$/, '');
        var val  = sp.nextElementSibling;
        var btn  = sp.parentElement ? sp.parentElement.querySelector('button[aria-label="copy"]') : null;
        if (btn) btn.setAttribute('aria-label', 'Copy ' + name);
        if (val) {
            // Vain oikeasti muuttuvat kentät live-alueiksi. Table ID ja Seat
            // eivät muutu kesken jaon, joten role="status" olisi niissä turhaa
            // hälyä; ne saavat sen sijaan selkeän nimen.
            var isLive = /game stage|status/i.test(name);
            if (isLive) {
                if (val.getAttribute('role') !== 'status') val.setAttribute('role', 'status');
                val.setAttribute('aria-label', name + ': ' + (val.textContent || '').trim());
            } else {
                if (val.getAttribute('role') === 'status') val.removeAttribute('role');
                val.setAttribute('aria-label', name + ': ' + (val.textContent || '').trim());
            }
        }
    });

    // MUI-kytkimet: input ilman saavutettavaa nimeä
    drawer.querySelectorAll('label.MuiFormControlLabel-root').forEach(function (label) {
        var input = label.querySelector('input[type="checkbox"]');
        var text  = label.querySelector('.MuiFormControlLabel-label');
        if (input && text && !input.getAttribute('aria-label')) {
            input.setAttribute('aria-label', text.textContent.trim());
        }
    });
}

// --- 16.4 Pelin ilmoitukset -------------------------------------------
function checkNotification() {
    var el = document.querySelector(BC_SEL.notification);
    if (!el) return;
    var txt = (el.textContent || '').trim();
    if (!txt || txt === lastNotification) return;
    lastNotification = txt;
    speak(txt);
}

// --- 16.5 Maamerkit ja otsikot ----------------------------------------
function addLandmarks() {
    var sb = document.querySelector(BC_SEL.scoreBoard);
    if (sb && !sb.hasAttribute('role')) {
        sb.setAttribute('role', 'region');
        sb.setAttribute('aria-label', 'Score board');
    }
    var menu = document.querySelector('.game-menu-wrapper');
    if (menu && !menu.hasAttribute('role')) {
        menu.setAttribute('role', 'navigation');
        menu.setAttribute('aria-label', 'Game menu');
    }
    var right = document.querySelector('.game-right-menu-container');
    if (right && !right.hasAttribute('role')) {
        right.setAttribute('role', 'navigation');
        right.setAttribute('aria-label', 'Game tools');
    }
    // Korttikääreille ei aseteta maamerkkejä: kädet luetaan
    // näppäinkomennoilla, ei DOM:ia selaamalla.
    // Minibridge-valitsin
    var mb = getMiniSelector();
    if (mb) {
        mb.setAttribute('role', 'group');
        mb.setAttribute('aria-label', getMiniTitle() || 'Minibridge selection');
        listMiniOptions().forEach(function (o) {
            makeButton(o.el, o.name);
            o.el.setAttribute('aria-disabled', o.disabled ? 'true' : 'false');
            // Symboli ♠/♥/♦/♣ luetaan epäjohdonmukaisesti eri ruudunlukijoilla,
            // ja aria-label kattaa nimen jo – piilotetaan koristeena.
            o.el.querySelectorAll('.stripe-symbol').forEach(function (s) {
                s.setAttribute('aria-hidden', 'true');
            });
        });
        // Back-painikkeen nimi on pelkkä "Back" – kerrotaan mihin se palaa
        var back = mb.querySelector('.back-button');
        if (back) {
            back.setAttribute('aria-label',
                isMiniLevelStep() ? 'Back, change the trump suit' : 'Back');
        }
    }
}

function applyStaticFixes() {
    attachLiveRegion();
    cleanupCardAttributes();
    fixDrawer();
    fixMenus();
    addLandmarks();
    labelBiddingCards();
}

// =========================================================
// 17. OHJEIKKUNA (Alt+H)
// =========================================================

var helpDialogEl   = null;
var helpDialogOpen = false;
var helpLastFocus  = null;

var HELP_ROWS = [
    ['Alt+H', 'This help'],
    ['Alt+M', 'Refresh state / recalibrate'],
    ['Alt+G', 'Read my whole hand'],
    ['Alt+A / S / D / F', 'My Spades / Hearts / Diamonds / Clubs'],
    ['Alt+T', 'Read dummy hand'],
    ['Alt+Q / W / E / R', 'Dummy Spades / Hearts / Diamonds / Clubs'],
    ['Alt+P', 'Cards on the table'],
    ['Alt+B', 'Bidding so far'],
    ['Alt+O', 'Bids available now (minibridge: the options)'],
    ['Alt+I', 'Combined fit: my hand plus dummy'],
    ['Alt+C', 'Tricks taken'],
    ['Alt+X', 'Board, seat, vulnerability, HCP, contract'],
    ['Alt+V', 'Vulnerability'],
    ['Alt+N', 'Player names'],
    ['Alt+K', 'Whose turn'],
    ['Alt+L', 'Table score'],
    ['Suit + value', 'Play a card, e.g. S then A = Spade Ace'],
    ['Up / Down (or I / O)', 'Play highest / lowest allowed card'],
    ['Level + strain', 'Bid, e.g. 4 then H = 4 Hearts (N = No Trump)'],
    ['P', 'Pass'],
    ['X', 'Double (or Redouble if double is not offered)'],
    ['Enter', 'Confirm a bid that is waiting in the preview'],
    ['S / H / D / C / N', 'Minibridge: choose the trump suit'],
    ['Esc', 'Cancel pending input']
];

function buildHelpDialog() {
    var dlg = document.createElement('div');
    dlg.setAttribute('role', 'dialog');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-label', 'Bridge Champ accessibility – keyboard commands');
    dlg.style.cssText =
        'position:fixed;inset:5% 10%;z-index:999999;background:#101010;color:#f0f0f0;' +
        'border:2px solid #888;border-radius:8px;padding:20px;overflow:auto;' +
        'font-family:sans-serif;font-size:16px;line-height:1.5;';

    var h = document.createElement('h1');
    h.textContent = 'Keyboard commands';
    h.style.cssText = 'font-size:22px;margin:0 0 12px;';
    dlg.appendChild(h);

    var table = document.createElement('table');
    table.style.cssText = 'border-collapse:collapse;width:100%;';
    var caption = document.createElement('caption');
    caption.textContent = 'Bridge Champ accessibility commands';
    caption.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
    table.appendChild(caption);
    var thead = document.createElement('tr');
    ['Key', 'Action'].forEach(function (t) {
        var th = document.createElement('th');
        th.textContent = t;
        th.scope = 'col';
        th.style.cssText = 'text-align:left;border-bottom:1px solid #666;padding:6px 10px;';
        thead.appendChild(th);
    });
    table.appendChild(thead);
    HELP_ROWS.forEach(function (row) {
        var tr = document.createElement('tr');
        var td1 = document.createElement('th');
        td1.scope = 'row';
        td1.textContent = row[0];
        td1.style.cssText = 'text-align:left;padding:5px 10px;border-bottom:1px solid #2a2a2a;white-space:nowrap;';
        var td2 = document.createElement('td');
        td2.textContent = row[1];
        td2.style.cssText = 'padding:5px 10px;border-bottom:1px solid #2a2a2a;';
        tr.appendChild(td1); tr.appendChild(td2);
        table.appendChild(tr);
    });
    dlg.appendChild(table);

    var closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'margin-top:16px;padding:8px 18px;font-size:16px;cursor:pointer;';
    closeBtn.addEventListener('click', closeHelpDialog);
    dlg.appendChild(closeBtn);

    // Fokusansa
    dlg.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { e.preventDefault(); closeHelpDialog(); return; }
        if (e.key !== 'Tab') return;
        var focusables = dlg.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    return dlg;
}

function openHelpDialog() {
    if (helpDialogOpen) return;
    helpLastFocus = document.activeElement;
    if (!helpDialogEl) helpDialogEl = buildHelpDialog();
    document.body.appendChild(helpDialogEl);
    helpDialogOpen = true;
    var btn = helpDialogEl.querySelector('button');
    if (btn) btn.focus();
}

function closeHelpDialog() {
    if (!helpDialogOpen || !helpDialogEl) return;
    helpDialogEl.remove();
    helpDialogOpen = false;
    if (helpLastFocus && helpLastFocus.focus) helpLastFocus.focus();
}

// =========================================================
// 18. KYSELYKOMENNOT (Alt + kirjain)
// =========================================================

function handleQueryKey(key, block) {
    if (key === 'h') { block(); openHelpDialog();   return true; }
    if (key === 'm') { block(); forceRefreshState(); return true; }

    // Oma käsi
    if (key === 'g') { block(); readAllCards(getUserHand(), 'My hand');   return true; }
    if (key === 'a') { block(); readSuitCards(getUserHand(), 'Spade');    return true; }
    if (key === 's') { block(); readSuitCards(getUserHand(), 'Heart');    return true; }
    if (key === 'd') { block(); readSuitCards(getUserHand(), 'Diamond');  return true; }
    if (key === 'f') { block(); readSuitCards(getUserHand(), 'Club');     return true; }

    // Lepääjä
    if (key === 't') {
        block();
        var dt = getDummyHand();
        dt.length === 0 ? speakNow('Dummy not visible.') : readAllCards(dt, 'Dummy');
        return true;
    }
    if (key === 'q' || key === 'w' || key === 'e' || key === 'r') {
        block();
        var dh = getDummyHand();
        if (!dh.length) { speakNow('Dummy not visible.'); return true; }
        var suitMap = { q:'Spade', w:'Heart', e:'Diamond', r:'Club' };
        readSuitCards(dh, suitMap[key]);
        return true;
    }

    // Pöydässä olevat kortit
    if (key === 'p') {
        block();
        var trick = sortTrickChronologically(readCurrentTrickCards());
        speakNow(trick.length === 0
            ? 'No cards on table.'
            : 'Trick: ' + trick.map(function (c) {
                  var who = DIRECTION_EN[c.direction] || c.direction || '';
                  return who + ' ' + c.suit + ' ' + rankWord(c.rank);
              }).join(', '));
        return true;
    }

    // Tarjoushistoria
    if (key === 'b') { block(); readAllBids(); return true; }

    // Tarjolla olevat tarjoukset / minibridgen vaihtoehdot
    if (key === 'o') { block(); readAvailableBids(); return true; }

    // Yhteiskäsi: oma käsi + lepääjä (valttivärin valinta, pelinviejän peli)
    if (key === 'i') { block(); readCombinedFit(false); return true; }

    // Tikit
    if (key === 'c') { block(); readTrickCount(false); return true; }

    // Yleistilanne
    if (key === 'x') {
        block();
        var parts = [];
        var b = readBoardNumber();
        if (b) parts.push(b);
        var uDir = getUserDirection();
        parts.push('My seat: ' + (DIRECTION_EN[uDir] || uDir));
        parts.push(vulnerabilityTextEn(readVulnerability()));
        var dl = readDealer();
        if (dl) parts.push('Dealer ' + (DIRECTION_EN[dl] || dl));
        parts.push(calcHcp(getUserHand()) + ' HCP');
        var contract = readContractDisplay();
        parts.push(contract ? 'Contract: ' + contract : 'No contract yet');
        speakNow(parts.join('. ') + '.');
        return true;
    }

    if (key === 'v') { block(); speakNow(vulnerabilityTextEn(readVulnerability()) + '.'); return true; }
    if (key === 'n') { block(); readPlayerNames(); return true; }

    // Kenen vuoro
    if (key === 'k') {
        block();
        var t = getTurnDirection();
        if (!t) { speakNow('Turn not known.'); return true; }
        var me = getUserDirection();
        speakNow(t === me ? 'Your turn.' : (DIRECTION_EN[t] || t) + ' to play.');
        return true;
    }

    // Pöytäpisteet
    if (key === 'l') {
        block();
        var sc = readTableScore();
        speakNow(sc || 'Score not available.');
        return true;
    }

    return false;
}

// =========================================================
// 19. NÄPPÄINKÄSITTELIJÄT
// =========================================================

document.addEventListener('keydown', function (e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;

    var key = e.key.toLowerCase();

    function block() {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    if (key === 'escape' && helpDialogOpen)   { block(); closeHelpDialog();   return; }
    if (key === 'escape' && pendingInput)     { block(); cancelPendingInput(); return; }

    // Kaksoisnäppäimen toinen näppäin
    if (pendingInput !== null) { block(); handleSecondKey(key); return; }

    // Alt + kirjain: kyselyt toimivat aina
    if (e.altKey && !e.ctrlKey && !e.metaKey) {
        handleQueryKey(key, block);
        return;
    }

    // Nuoli ylös/alas tai i/o: korkein / matalin kortti.
    // Vain pelivaiheessa – muuten tarjousvaiheessa nämä yrittäisivät
    // pelata kortin omalla tarjousvuorolla.
    if ((e.key === 'ArrowUp' || e.key === 'ArrowDown' || key === 'i' || key === 'o') &&
        !e.altKey && !e.ctrlKey && !e.metaKey && isPlayPhase()) {
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
// 20. MUTATIONOBSERVER
// =========================================================

var trickTimer = null;
var boardTimer = null;
var fixTimer   = null;
var turnTimer  = null;
var bidTimer   = null;
var lastTurnDirection = null;
var lastBidSelectorOpen = false;
var lastPendingBidCode  = null;

function scheduleTrickCheck() {
    if (trickTimer) clearTimeout(trickTimer);
    trickTimer = setTimeout(detectTrickChanges, 180);
}

function scheduleBidCheck() {
    if (bidTimer) clearTimeout(bidTimer);
    bidTimer = setTimeout(function () {
        checkMiniBridgeStep();
        checkNewBids();
        labelBiddingCards();

        // Vahvistusta odottava tarjous – tämä tila oli aiemmin täysin mykkä
        var pending = getPendingBidPreview();
        var pendingCode = pending ? pending.code : null;
        if (pendingCode && pendingCode !== lastPendingBidCode) {
            speak(pending.name + ' selected. Press Enter to confirm.');
        }
        lastPendingBidCode = pendingCode;

        // Laatikon avautuminen valintatilaan = oma vuoro tarjota
        var open = isBidSelectorChoosing();
        if (open && !lastBidSelectorOpen && !pendingCode) {
            var turn = getTurnDirection();
            if (!turn || turn === getUserDirection()) {
                var low = lowestAvailableBid();
                speak('Your bid.' + (low ? ' Lowest available ' + decodeBidCode(low) + '.' : ''));
            }
        }
        lastBidSelectorOpen = open;
    }, 300);
}
function scheduleBoardCheck() {
    if (boardTimer) clearTimeout(boardTimer);
    boardTimer = setTimeout(announceBoard, 700);
}
function scheduleFixes() {
    if (fixTimer) clearTimeout(fixTimer);
    fixTimer = setTimeout(applyStaticFixes, 250);
}
function scheduleTurnCheck() {
    if (turnTimer) clearTimeout(turnTimer);
    turnTimer = setTimeout(function () {
        var t = getTurnDirection();
        if (!t || t === lastTurnDirection) return;
        lastTurnDirection = t;
        var me = getUserDirection();
        var allowed = resolveAllowedHand();
        if (t === me)                speak('Your turn.');
        else if (allowed === 'dummy') speak('Dummy to play.');
    }, 300);
}

var gameObserver = new MutationObserver(function (mutations) {
    var checkTrick = false, checkBoard = false, checkFix = false,
        checkTurn = false, checkBid = false;

    mutations.forEach(function (m) {
        var tgt = m.target;

        if (m.type === 'attributes') {
            if (m.attributeName === 'class') {
                var cn = (tgt.className && tgt.className.baseVal !== undefined)
                       ? tgt.className.baseVal : (tgt.className || '');
                if (typeof cn !== 'string') cn = '';
                if (cn.indexOf('has-turn') !== -1 || cn.indexOf('active-player') !== -1) checkTurn = true;
                if (cn.indexOf('game-score') !== -1 || cn.indexOf('compass') !== -1)     checkBoard = true;
                if (cn.indexOf('rank') !== -1) checkFix = true;
                if (cn.indexOf('bidding-') !== -1 || cn.indexOf('bid-card') !== -1 ||
                    cn.indexOf('selector-container') !== -1) checkBid = true;
            }
        }

        if (m.type === 'characterData') {
            var p = tgt.parentElement;
            if (p) {
                if (p.closest('.bc-score-board'))                  checkBoard = true;
                if (p.closest('.gameplay-notification-container')) checkNotification();
            }
        }

        var handleNode = function (node) {
            if (node.nodeType !== 1) return;
            var cls = node.classList || { contains: function () { return false; } };
            if (cls.contains('trick-cards') || cls.contains('trick-card-wrapper') ||
                (node.querySelector && node.querySelector('.trick-card-wrapper'))) {
                checkTrick = true;
                checkFix   = true;
            }
            if (cls.contains('play-gather-location') ||
                (node.className && String(node.className).indexOf('rank') !== -1) ||
                (node.querySelector && node.querySelector('[class*="rank"]'))) {
                checkTrick = true;
                checkFix   = true;
            }
            if (cls.contains('contract-container') ||
                (node.querySelector && node.querySelector('.contract-container'))) {
                checkBoard = true;
            }
            if (cls.contains('dummy-cards-wrapper') ||
                (node.querySelector && node.querySelector('.dummy-cards-wrapper'))) {
                checkFix = true;
            }
            if (cls.contains('bc-menu-item') || cls.contains('menu-item-wrapper') ||
                (node.querySelector && node.querySelector('.bc-menu-item'))) {
                checkFix = true;
            }
            // Tarjouslaatikko, historiakortit tai tarjoustaulukko muuttui
            var ncn = String(node.className || '');
            if (cls.contains('bidding-selector-container') ||
                cls.contains('bidding-cards-container') ||
                cls.contains('bc-bidding-card') ||
                cls.contains('bidding-card') ||
                cls.contains('bid-card-slot') ||
                cls.contains('mini-bridge-bidding-selector') ||
                cls.contains('selector-box') ||
                cls.contains('selector-title') ||
                ncn.indexOf('bidding-table') !== -1 ||
                (node.querySelector && (node.querySelector('.bc-bidding-card') ||
                                        node.querySelector('.bidding-selector-container') ||
                                        node.querySelector('.mini-bridge-bidding-selector') ||
                                        node.querySelector('.bidding-table-grid')))) {
                checkBid = true;
            }
            if (node.closest && node.closest('.gameplay-notification-container')) checkNotification();
        };

        m.addedNodes.forEach(handleNode);
        m.removedNodes.forEach(function (node) {
            if (node.nodeType !== 1) return;
            if (!node.classList) return;
            if (node.classList.contains('play-gather-location') ||
                node.classList.contains('trick-card-wrapper') ||
                node.classList.contains('trick-cards') ||
                String(node.className).indexOf('rank') !== -1) checkTrick = true;
            // Tarjouslaatikon katoaminen: tarjous meni läpi / tarjoaminen loppui
            if (node.classList.contains('bidding-selector-container') ||
                node.classList.contains('bidding-selector-widget')) checkBid = true;
        });
    });

    if (checkTrick) scheduleTrickCheck();
    if (checkBoard) scheduleBoardCheck();
    if (checkFix)   scheduleFixes();
    if (checkTurn)  scheduleTurnCheck();
    if (checkBid)   scheduleBidCheck();
});

function startObserver() {
    if (!document.body) { setTimeout(startObserver, 300); return; }
    gameObserver.observe(document.body, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['class', 'title', 'data-testid']
    });
}

// =========================================================
// 21. UUDEN JAON TUNNISTUS (varmistus polling-tarkistuksella)
// =========================================================

setInterval(function () {
    var fp = handFingerprint();
    if (fp && fp !== lastHandFingerprint) {
        var wasEmpty = !lastHandFingerprint;
        lastHandFingerprint = fp;
        // Uusi jako: käsi vaihtuu kokonaan ja kortteja on 13
        if (!wasEmpty && getUserHand().length >= 12) onNewDeal();
        }
    checkNotification();
    // Varmistus: MutationObserver voi ohittaa React-uudelleenrenderöinnin
    checkNewBids();
    labelBiddingCards();
}, 1500);

// =========================================================
// 22. KÄYNNISTYS
// =========================================================

function init() {
    attachLiveRegion();
    applyStaticFixes();
    startObserver();
    lastHandFingerprint = handFingerprint();
    calibrateTrickIndexBase();
    currentTrick        = readCurrentTrickCards();
    resolveTrickLeader(currentTrick);
    lastTrickSignature  = trickSignature(currentTrick);
    currentTrick.forEach(function (c) {
        announcedTrickCards[(c.direction || c.screenPos) + ':' + c.key] = true;
    });
    lastTurnDirection   = getTurnDirection();
    // Merkitään jo pöydässä olevat tarjoukset ilmoitetuiksi, jottei
    // laajennuksen lataus lue koko tarjoussarjaa uudelleen
    readLastBidsAroundTable().forEach(function (b) {
        announcedBids[b.screenPos + ':' + b.code] = true;
    });
    lastBidSelectorOpen = isBidSelectorChoosing();
    var initPending = getPendingBidPreview();
    lastPendingBidCode = initPending ? initPending.code : null;
    setTimeout(function () {
        speak('Bridge Champ accessibility active. Press Alt H for help.');
    }, 1200);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
