// =========================================================
// BBO:n Saavutettavuuslaajennus (Ruudunlukijatuki) - V5.1
// =========================================================
// Korjattu versio: Maat tunnistetaan suitPanelClass-rakenteesta,
// pelatut kortit handDiagramCurrentTrickClass-elementeista.
// V4.1: tabindex muutettu -1:ksi ja fokus palautetaan kortin
// pelaamisen jalkeen, jotta BBO:n omat nappainkomennot toimivat.
// V4.2: Poistettu korttien painike-rooli ja Enter/Space-kasittely
// kokonaan. Kortit pelataan BBO:n omilla nappaimilla.
// V4.3: Korjattu pelatun kortin tunnistus - vertaillaan edellisiin
// kortteihin DOM-jarjestyksen sijaan, jotta oikea kortti ilmoitetaan.
// V4.4: Lisatty pelaajan ilmansuunta (Pohjoinen/Etela/Lansi/Ita)
// pelatun kortin ilmoitukseen ja P-napin tikkiraporttiin.
// V4.5: Ilmansuunta tunnistetaan DOM-jarjestyksesta (S,W,N,E)
// ruutuposition sijaan, koska BBO kiertaa nakymaa pelaajan mukaan.
// V4.6: Korjattu aria-live-alueen CSS kayyttamaan clip-tekniikkaa
// left:-9999px:n sijaan, jotta se ei peita BBO:n elementteja.
// V4.7: Korjattu tikki-siirtyman tunnistus. Kun korttien maara
// vahenee (uusi tikki alkaa), edelliset nollataan ennen vertailua.
// V4.8: Lisatty uuden pelin tunnistus. Kun handDiagramPanelClass
// lisataan DOM:iin, pelattujen korttien seuranta nollataan.
// V4.9: Lisatty tarjousten automaattinen puhe huutokauppavaiheessa.
// Tarjoaja tunnistetaan auction-box-header-cell -otsikkojen avulla.
// Tarjoukset kaannetaan suomeksi (Passi, Tupla, SA, maat).
// B-nappain lukee kaikki tehdyt tarjoukset.
// V5.0: Korjattu tarjousten DOM-tunnistus. BBO:n rakenne on
// auction-box-cell > div.auction-box-cell > div.call-level.
// Teksti luetaan ensisijaisesti .call-level-elementista.
// Observer tunnistaa nyt myos call-level ja auction-box-cell-luokat.
// Lisatty retry-logiikka jos teksti ei ole viela tayttynyt.
// V5.1: Korjattu maatarjousten luku. call-level sisaltaa vain tason,
// joten luetaan koko elementin innerText joka yhdistaa tason ja maan.
// =========================================================
console.log("BBO Accessibility Extension ladattu (V5.1 - Maatarjousten luku korjattu)!");

// ---------------------------------------------------------
// 1. RUUDUNLUKUOHJELMAN PUHUJA
// ---------------------------------------------------------
const liveRegion = document.createElement('div');
liveRegion.setAttribute('aria-live', 'polite');
liveRegion.setAttribute('aria-atomic', 'true');
// Visuaalisesti piilotettu mutta ruudunlukijan saavutettavissa.
// Kaytetaan clip-tekniikkaa, jotta elementti ei ulotu peittamaan muita elementteja.
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

// Puhejono: varmistaa, etta kaikki viestit puhutaan jarjestyksessa
var puheJono = [];
var puhutaanParhaillaan = false;
var PUHEEN_VIIVE = 600; // ms viive viestien valilla, jotta ruudunlukija ehtii lukea

function puhu(teksti) {
    puheJono.push(teksti);
    if (!puhutaanParhaillaan) {
        kasittelePuheJono();
    }
}

// Puhu heti ja tyhjenna jono (nappainkomennoille)
function puhuHeti(teksti) {
    puheJono = [];
    puhutaanParhaillaan = false;
    liveRegion.textContent = '';
    setTimeout(function() {
        liveRegion.textContent = teksti;
    }, 50);
}

function kasittelePuheJono() {
    if (puheJono.length === 0) {
        puhutaanParhaillaan = false;
        return;
    }
    puhutaanParhaillaan = true;
    var teksti = puheJono.shift();
    liveRegion.textContent = '';
    setTimeout(function() {
        liveRegion.textContent = teksti;
        // Odotetaan ennen seuraavaa viestia
        setTimeout(kasittelePuheJono, PUHEEN_VIIVE);
    }, 50);
}

// ---------------------------------------------------------
// 2. VAKIOT JA APUFUNKTIOT
// ---------------------------------------------------------

// suitPanelClass-elementit ovat kaden sisalla jarjestyksessa:
// indeksi 0 = Risti, 1 = Ruutu, 2 = Hertta, 3 = Pata
const MAAT_JARJESTYKSESSA = ['Risti', 'Ruutu', 'Hertta', 'Pata'];

// Maasymboleista suomenkieliseen nimeen (pelatuille korteille)
const SYMBOLI_MAAKSI = {
    '\u2663': 'Risti',   // club
    '\u2666': 'Ruutu',   // diamond
    '\u2665': 'Hertta',  // heart
    '\u2660': 'Pata'     // spade
};

// Tarjousten kaannokset suomeksi
const TARJOUS_KAANNOS = {
    'Pass': 'Passi',
    'Dbl': 'Tupla',
    'Rdbl': 'Retupla'
};

/**
 * Kaantaa tarjouksen suomeksi.
 * Esim. "1♠" -> "1 Pata", "Pass" -> "Passi", "3NT" -> "3 SA"
 */
function kaannaTarjous(teksti) {
    if (!teksti) return '';
    teksti = teksti.replace(/\n| /g, '').trim();
    if (!teksti) return '';

    // Suorat kaannokset (Pass, Dbl, Rdbl)
    if (TARJOUS_KAANNOS[teksti]) return TARJOUS_KAANNOS[teksti];

    // Taso + maa/SA (esim. "1♠", "3NT", "2♣")
    var taso = teksti.charAt(0);
    if (taso >= '1' && taso <= '7') {
        var loppu = teksti.substring(1).trim();
        // NT / No Trump
        if (loppu === 'NT' || loppu === 'N') return taso + ' SA';
        // Maasymboli
        if (loppu.length >= 1 && SYMBOLI_MAAKSI[loppu.charAt(0)]) {
            return taso + ' ' + SYMBOLI_MAAKSI[loppu.charAt(0)];
        }
        return taso + ' ' + loppu;
    }

    return teksti;
}

/**
 * Jasentaa pelatun kortin tekstista maan ja arvon.
 * handDiagramCurrentTrickClass-elementtien innerText sisaltaa
 * maasymbolin ja arvon (esim. symboli + "A" tai symboli + "10").
 */
function jasennaPelattuKortti(teksti) {
    if (!teksti) return null;
    teksti = teksti.replace(/\n/g, '').trim();
    if (teksti.length === 0) return null;
    var symboli = teksti.charAt(0);
    var maa = SYMBOLI_MAAKSI[symboli];
    if (!maa) return null;
    var arvo = teksti.substring(1).trim();
    if (!arvo) return null;
    return { maa: maa, arvo: arvo };
}

// ---------------------------------------------------------
// 3. KASIEN TUNNISTUS (DOM-rakenteen perusteella)
// ---------------------------------------------------------

// BBO:n DOM-rakenne:
//   handDiagramPanelClass (kasi)
//     suitPanelClass [0] = Risti
//       handDiagramCardClass (arvo: "A")
//       handDiagramCardClass (arvo: "K")
//     suitPanelClass [1] = Ruutu
//     suitPanelClass [2] = Hertta
//     suitPanelClass [3] = Pata

function lueKadenKortit(kasiElementti) {
    var kortit = [];
    if (!kasiElementti) return kortit;
    var maaPaneelit = kasiElementti.querySelectorAll('.suitPanelClass');
    for (var i = 0; i < maaPaneelit.length && i < 4; i++) {
        var maa = MAAT_JARJESTYKSESSA[i];
        var kadenKortit = maaPaneelit[i].querySelectorAll('div.handDiagramCardClass');
        for (var j = 0; j < kadenKortit.length; j++) {
            var arvo = kadenKortit[j].innerText.replace(/\n| /g, '').trim();
            if (arvo) {
                kortit.push({ maa: maa, arvo: arvo, elementti: kadenKortit[j] });
            }
        }
    }
    return kortit;
}

/**
 * Tunnistaa pelaajan oman kaden ja lepaajan kaden.
 * BBO nayttaa pelaajan kaden ruudun alalaidassa (suurin offsetTop)
 * ja parin kaden ylalaidassa (pienin offsetTop).
 */
function tunnistaPelaajat() {
    var paneelit = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
    if (paneelit.length === 0) return { oma: null, lepaaja: null };

    // Kerataan jokaisesta paneelista tiedot
    var paneelitiedot = paneelit.map(function(paneeli, idx) {
        return {
            el: paneeli,
            idx: idx,
            top: paneeli.getBoundingClientRect().top,
            kortit: lueKadenKortit(paneeli)
        };
    });

    // Lajitellaan getBoundingClientRect().top mukaan (luotettavampi kuin offsetTop)
    paneelitiedot.sort(function(a, b) { return a.top - b.top; });

    // Oma kasi = alin paneeli jossa on kortteja
    var oma = null;
    for (var i = paneelitiedot.length - 1; i >= 0; i--) {
        if (paneelitiedot[i].kortit.length > 0) {
            oma = paneelitiedot[i];
            break;
        }
    }

    // Lepaaja = muu paneeli jossa on kortteja (ei oma)
    var lepaaja = null;
    if (oma) {
        for (var j = 0; j < paneelitiedot.length; j++) {
            if (paneelitiedot[j] === oma) continue;
            if (paneelitiedot[j].kortit.length > 0) {
                lepaaja = paneelitiedot[j];
                break;
            }
        }
    }

    console.log("tunnistaPelaajat: paneeleja=" + paneelit.length +
        ", oma idx=" + (oma ? oma.idx : "null") + " top=" + (oma ? oma.top : "null") + " kortteja=" + (oma ? oma.kortit.length : 0) +
        ", lepaaja idx=" + (lepaaja ? lepaaja.idx : "null") + " top=" + (lepaaja ? lepaaja.top : "null") + " kortteja=" + (lepaaja ? lepaaja.kortit.length : 0));

    return {
        oma: oma ? oma.el : null,
        lepaaja: lepaaja ? lepaaja.el : null
    };
}

/**
 * Lukee poydassa olevat pelatut kortit (nykyinen tikki).
 * handDiagramCurrentTrickClass-elementteja on 4 (S, W, N, E).
 * Ilmansuunta tunnistetaan DOM-jarjestyksen perusteella:
 * indeksi 0 = Etela, 1 = Lansi, 2 = Pohjoinen, 3 = Ita.
 * Tama jarjestys pysyy samana riippumatta siita, mika ilmansuunta
 * on ruudun alalaidassa.
 */
var TIKKI_ILMANSUUNNAT = ['Etelä', 'Länsi', 'Pohjoinen', 'Itä'];

function luePelatutKortit() {
    var pelatut = [];
    var elementit = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    for (var i = 0; i < elementit.length && i < 4; i++) {
        var el = elementit[i];
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var tulos = jasennaPelattuKortti(el.innerText);
            if (tulos) {
                tulos.pelaaja = TIKKI_ILMANSUUNNAT[i];
                pelatut.push(tulos);
            }
        }
    }
    return pelatut;
}

// ---------------------------------------------------------
// 3b. TARJOUSTEN LUKEMINEN (Huutokauppa)
// ---------------------------------------------------------

// Ilmansuuntien kaannokset
var ISTUMAPAIKKA_SUOMEKSI = {
    'N': 'Pohjoinen', 'S': 'Etelä', 'E': 'Itä', 'W': 'Länsi',
    'North': 'Pohjoinen', 'South': 'Etelä', 'East': 'Itä', 'West': 'Länsi'
};

var puhututTarjouksetMaara = 0; // Montako tarjousta on jo puhuttu
var tarjousTarkistusAjastin = null;

/**
 * Selvittaa tarjoajan istumapaikan vertaamalla tarjouksen
 * x-koordinaattia auction-box-header-cell -otsikkoihin.
 */
function selvitaTarjoaja(tarjousEl) {
    var auctionBox = tarjousEl.closest('.auctionBoxClass') ||
                     document.querySelector('.auctionBoxClass') ||
                     document.querySelector('[class*="auctionBox"]');
    if (!auctionBox) {
        // Yritetaan loyytaa otsikot suoraan dokumentista
        var otsikot = document.querySelectorAll('.auction-box-header-cell');
        if (otsikot.length === 0) return null;
        var tarjousX = tarjousEl.getBoundingClientRect().x;
        for (var i = 0; i < otsikot.length; i++) {
            if (Math.abs(otsikot[i].getBoundingClientRect().x - tarjousX) < 5) {
                var paikka = otsikot[i].innerText.trim();
                return ISTUMAPAIKKA_SUOMEKSI[paikka] || paikka;
            }
        }
        return null;
    }
    var otsikot = auctionBox.querySelectorAll('.auction-box-header-cell');
    var tarjousX = tarjousEl.getBoundingClientRect().x;
    for (var i = 0; i < otsikot.length; i++) {
        if (Math.abs(otsikot[i].getBoundingClientRect().x - tarjousX) < 5) {
            var paikka = otsikot[i].innerText.trim();
            return ISTUMAPAIKKA_SUOMEKSI[paikka] || paikka;
        }
    }
    return null;
}

/**
 * Lukee kaikki tarjoukset ja palauttaa listan.
 * BBO:n DOM-rakenne tarjouksille:
 *   auction-box-cell (custom tag)
 *     div.auction-box-cell (sisainen div)
 *       div.call-level (sisaltaa tarjoustekstin, esim. "Pass")
 */
function lueTarjoukset() {
    var tarjoukset = [];
    // Etsitaan tarjoukset usealla selektorilla varmuuden vuoksi
    var elementit = document.querySelectorAll('auction-box-cell');
    if (elementit.length === 0) {
        // Vaihtoehtoinen selektori: sisainen div
        elementit = document.querySelectorAll('div.auction-box-cell');
    }
    for (var i = 0; i < elementit.length; i++) {
        var el = elementit[i];
        // Luetaan koko elementin innerText, joka sisaltaa seka tason etta maan
        // BBO:n rakenne: call-level sisaltaa vain tason ("1"),
        // maasymboli on erillisessa elementissa. innerText yhdistaa molemmat.
        var teksti = el.innerText.replace(/\n| /g, '').trim();
        if (teksti) {
            var tarjoaja = selvitaTarjoaja(el);
            tarjoukset.push({
                teksti: teksti,
                kaannos: kaannaTarjous(teksti),
                tarjoaja: tarjoaja,
                indeksi: i
            });
        }
    }
    return tarjoukset;
}

/**
 * Tarkistaa uudet tarjoukset ja puhuu ne.
 * Kutsutaan viiveella, koska BBO tayttaa elementin sisallon
 * vasta hetken kuluttua lisayksesta.
 * Yrittaa uudelleen pidemmalla viiveella, jos tarjouksia ei loydy.
 */
var tarjousYritysLaskuri = 0;

function tarkistaUudetTarjoukset() {
    var tarjoukset = lueTarjoukset();
    if (tarjoukset.length > puhututTarjouksetMaara) {
        // Puhutaan vain uudet tarjoukset
        for (var i = puhututTarjouksetMaara; i < tarjoukset.length; i++) {
            var t = tarjoukset[i];
            var viesti = (t.tarjoaja ? t.tarjoaja + ': ' : '') + t.kaannos;
            puhu(viesti);
        }
        puhututTarjouksetMaara = tarjoukset.length;
        tarjousYritysLaskuri = 0;
    } else if (tarjoukset.length < puhututTarjouksetMaara) {
        // Tarjousten maara vaheni (undo tai uusi jako) - nollataan
        puhututTarjouksetMaara = tarjoukset.length;
        tarjousYritysLaskuri = 0;
    } else if (tarjousYritysLaskuri < 3) {
        // Teksti ei ehka viela tayttynyt - yritetaan uudelleen
        tarjousYritysLaskuri++;
        setTimeout(tarkistaUudetTarjoukset, 500);
    } else {
        tarjousYritysLaskuri = 0;
    }
}

// ---------------------------------------------------------
// 4. KORTTIEN SAAVUTETTAVUUSATTRIBUUTIT
// ---------------------------------------------------------

function paivitaKorttienSaavutettavuus() {
    var paneelit = document.querySelectorAll('div.handDiagramPanelClass');
    paneelit.forEach(function(paneeli) {
        var maaPaneelit = paneeli.querySelectorAll('.suitPanelClass');
        for (var i = 0; i < maaPaneelit.length && i < 4; i++) {
            var maa = MAAT_JARJESTYKSESSA[i];
            var kortit = maaPaneelit[i].querySelectorAll('div.handDiagramCardClass');
            kortit.forEach(function(kortti) {
                var arvo = kortti.innerText.replace(/\n| /g, '').trim();
                if (arvo) {
                    kortti.setAttribute('aria-label', maa + ' ' + arvo);
                }
            });
            // Piilotetaan maasymboli-elementit ruudunlukijalta
            maaPaneelit[i].querySelectorAll('.suitSymbolClass').forEach(function(sym) {
                sym.setAttribute('aria-hidden', 'true');
            });
        }
    });

    // Paivitetaan pelattujen korttien saavutettavuus
    var pelatutElementit = document.querySelectorAll('div.handDiagramCurrentTrickClass');
    pelatutElementit.forEach(function(el) {
        if (el.style.display !== 'none' && el.innerText.trim()) {
            var tulos = jasennaPelattuKortti(el.innerText);
            if (tulos) {
                el.setAttribute('aria-label', tulos.maa + ' ' + tulos.arvo);
            }
        }
    });
}

// ---------------------------------------------------------
// 5. PIKANAPPAIMET JA LUKU
// ---------------------------------------------------------

function lueKorttilistaMaasta(kortit, haettavaMaa, kenenNimi) {
    var maanKortit = kortit
        .filter(function(k) { return k.maa === haettavaMaa; })
        .map(function(k) { return k.arvo; });
    if (maanKortit.length > 0) {
        puhuHeti(kenenNimi + ' ' + haettavaMaa + ': ' + maanKortit.join(', '));
    } else {
        puhuHeti(kenenNimi + ', ei kortteja maassa ' + haettavaMaa + '.');
    }
}

function lueKaikkiKortit(kortit, kenenNimi) {
    if (kortit.length === 0) {
        puhuHeti(kenenNimi + ': kortteja ei ole nakyvissa.');
        return;
    }
    // Bridgen perinteinen jarjestys: Pata, Hertta, Ruutu, Risti
    var jarjestys = ['Pata', 'Hertta', 'Ruutu', 'Risti'];
    var osat = [];
    jarjestys.forEach(function(maa) {
        var maanKortit = kortit
            .filter(function(k) { return k.maa === maa; })
            .map(function(k) { return k.arvo; });
        if (maanKortit.length > 0) {
            osat.push(maa + ': ' + maanKortit.join(', '));
        }
    });
    puhuHeti(kenenNimi + ': ' + osat.join('. '));
}

document.addEventListener('keydown', function(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    var avain = e.key.toLowerCase();

    // Apufunktio: estetaan tapahtuman kulku BBO:lle
    function estaBBO(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    // ALT-KOMENNOT: Yksittaisten maiden luku
    if (e.altKey) {
        var pelaajat = tunnistaPelaajat();

        // OMAT KORTIT (Alt + A=Pata, S=Hertta, D=Ruutu, F=Risti)
        if (avain === 'a') { estaBBO(e); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Pata', 'Oma'); return; }
        if (avain === 's') { estaBBO(e); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Hertta', 'Oma'); return; }
        if (avain === 'd') { estaBBO(e); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Ruutu', 'Oma'); return; }
        if (avain === 'f') { estaBBO(e); lueKorttilistaMaasta(lueKadenKortit(pelaajat.oma), 'Risti', 'Oma'); return; }

        // DEBUG (Alt + I): Puhuu paneelien tunnistustiedot
        if (avain === 'i') {
            estaBBO(e);
            var paneelit2 = Array.from(document.querySelectorAll('div.handDiagramPanelClass'));
            var info = 'Paneeleja: ' + paneelit2.length + '. ';
            paneelit2.forEach(function(p, idx) {
                var maaPaneelit = p.querySelectorAll('.suitPanelClass');
                var kortteja = p.querySelectorAll('div.handDiagramCardClass');
                var tekstilla = 0;
                kortteja.forEach(function(k) {
                    if (k.innerText.replace(/\n| /g, '').trim()) tekstilla++;
                });
                info += 'Paneeli ' + idx + ': top=' + Math.round(p.getBoundingClientRect().top) +
                    ', suitPanels=' + maaPaneelit.length +
                    ', kortteja=' + kortteja.length +
                    ', tekstilla=' + tekstilla + '. ';
            });
            info += 'Oma: ' + (pelaajat.oma ? 'loydetty' : 'null') + '. ';
            info += 'Lepaaja: ' + (pelaajat.lepaaja ? 'loydetty' : 'null') + '. ';
            if (pelaajat.lepaaja) {
                var lepKortit = lueKadenKortit(pelaajat.lepaaja);
                info += 'Lepaajan kortteja: ' + lepKortit.length;
            }
            puhuHeti(info);
            console.log(info);
            return;
        }

        // LEPAAJAN KORTIT (Alt + Q=Pata, W=Hertta, E=Ruutu, R=Risti)
        if (avain === 'q') {
            estaBBO(e);
            if (!pelaajat.lepaaja) { puhuHeti('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Pata', 'Lepaaja');
            return;
        }
        if (avain === 'w') {
            estaBBO(e);
            if (!pelaajat.lepaaja) { puhuHeti('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Hertta', 'Lepaaja');
            return;
        }
        if (avain === 'e') {
            estaBBO(e);
            if (!pelaajat.lepaaja) { puhuHeti('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Ruutu', 'Lepaaja');
            return;
        }
        if (avain === 'r') {
            estaBBO(e);
            if (!pelaajat.lepaaja) { puhuHeti('Lepaajan kortteja ei ole nakyvissa.'); return; }
            lueKorttilistaMaasta(lueKadenKortit(pelaajat.lepaaja), 'Risti', 'Lepaaja');
            return;
        }

        // ALT+P: POYDASSA PELATUT KORTIT (nykyinen tikki)
        if (avain === 'p') {
            estaBBO(e);
            var pelatut = luePelatutKortit();
            if (pelatut.length === 0) {
                puhuHeti('Poydassa ei ole kortteja.');
            } else {
                var teksti = pelatut.map(function(k) { return k.pelaaja + ' ' + k.maa + ' ' + k.arvo; }).join(', ');
                puhuHeti('Poydassa: ' + teksti);
            }
            return;
        }

        // ALT+B: KAIKKI TARJOUKSET (huutokauppa)
        if (avain === 'b') {
            estaBBO(e);
            var tarjoukset = lueTarjoukset();
            if (tarjoukset.length === 0) {
                puhuHeti('Ei tarjouksia.');
            } else {
                var teksti = tarjoukset.map(function(t) {
                    return (t.tarjoaja ? t.tarjoaja + ' ' : '') + t.kaannos;
                }).join(', ');
                puhuHeti('Tarjoukset: ' + teksti);
            }
            return;
        }

        // ALT+O: KAIKKI OMAT KORTIT
        if (avain === 'o') {
            estaBBO(e);
            var pelaajatO = tunnistaPelaajat();
            lueKaikkiKortit(lueKadenKortit(pelaajatO.oma), 'Omat kortit');
            return;
        }

        // ALT+L: KAIKKI LEPAAJAN KORTIT
        if (avain === 'l') {
            estaBBO(e);
            var pelaajatL = tunnistaPelaajat();
            if (!pelaajatL.lepaaja) {
                puhuHeti('Lepaajan kortteja ei ole nakyvissa.');
                return;
            }
            lueKaikkiKortit(lueKadenKortit(pelaajatL.lepaaja), 'Lepaajan kortit');
            return;
        }
    }
}, true); // true = capture-vaihe, jotta kuuntelija suoritetaan ennen BBO:n kuuntelijaa

// ---------------------------------------------------------
// 6. TARKKAILIJA (MutationObserver)
// ---------------------------------------------------------
var paivitysAjastin = null;
var edellisetPelatutKortit = []; // Tallennetaan edellisten korttien tiedot

var peliTarkkailija = new MutationObserver(function(mutations) {
    var tarvitseePaivityksen = false;
    var tarkistaPelatut = false;
    var uusiPeli = false;
    var tarkistaTarjoukset = false;

    mutations.forEach(function(mutation) {
        if (mutation.addedNodes.length > 0) {
            mutation.addedNodes.forEach(function(node) {
                if (node.nodeType === 1) {
                    if (node.classList && node.classList.contains('handDiagramPanelClass')) {
                        tarvitseePaivityksen = true;
                        uusiPeli = true;
                    }
                    if (node.classList && (
                        node.classList.contains('handDiagramCardClass') ||
                        node.classList.contains('suitPanelClass')
                    )) {
                        tarvitseePaivityksen = true;
                    }
                    // Tarjouselementin lisays - BBO:n rakenne:
                    // auction-box-cell (tag) > div.auction-box-cell > div.call-level
                    if ((node.tagName && node.tagName.toLowerCase() === 'auction-box-cell') ||
                        (node.classList && (
                            node.classList.contains('auction-box-cell') ||
                            node.classList.contains('call-level')
                        ))) {
                        tarkistaTarjoukset = true;
                    }
                    // Tarkista myos lapsisolmuista tarjouselementit
                    if (node.querySelector && (
                        node.querySelector('auction-box-cell') ||
                        node.querySelector('.call-level'))) {
                        tarkistaTarjoukset = true;
                    }
                }
            });
        }

        // Pelattujen korttien muutokset
        if (mutation.target && mutation.target.classList &&
            mutation.target.classList.contains('handDiagramCurrentTrickClass')) {
            tarkistaPelatut = true;
        }
        // Subtree-muutokset pelatuissa korteissa ja tarjouksissa
        var kohde = mutation.target;
        while (kohde) {
            if (kohde.classList && kohde.classList.contains('handDiagramCurrentTrickClass')) {
                tarkistaPelatut = true;
                break;
            }
            // Tarjouselementin sisallon muutos (characterData tai subtree)
            if ((kohde.tagName && kohde.tagName.toLowerCase() === 'auction-box-cell') ||
                (kohde.classList && (
                    kohde.classList.contains('auction-box-cell') ||
                    kohde.classList.contains('call-level')
                ))) {
                tarkistaTarjoukset = true;
                break;
            }
            kohde = kohde.parentElement;
        }
    });

    if (tarvitseePaivityksen) {
        if (paivitysAjastin) clearTimeout(paivitysAjastin);
        paivitysAjastin = setTimeout(paivitaKorttienSaavutettavuus, 800);
    }

    // Uusi peli havaittu - nollataan pelattujen korttien ja tarjousten seuranta
    if (uusiPeli) {
        edellisetPelatutKortit = [];
        puhututTarjouksetMaara = 0;
        console.log("Uusi peli havaittu, seuranta nollattu.");
    }

    // Tarkistetaan uudet tarjoukset viiveella (BBO tayttaa sisallon asynkronisesti)
    if (tarkistaTarjoukset) {
        if (tarjousTarkistusAjastin) clearTimeout(tarjousTarkistusAjastin);
        tarjousTarkistusAjastin = setTimeout(tarkistaUudetTarjoukset, 300);
    }

    if (tarkistaPelatut) {
        setTimeout(function() {
            var pelatut = luePelatutKortit();

            // Jos korttien maara vahenee, uusi tikki on alkanut - nollataan edellliset
            if (pelatut.length < edellisetPelatutKortit.length) {
                edellisetPelatutKortit = [];
            }

            if (pelatut.length > 0 && pelatut.length > edellisetPelatutKortit.length) {
                // Etsitaan uusi kortti vertaamalla edellisiin
                var edellisetAvaimet = edellisetPelatutKortit.map(function(k) { return k.pelaaja + k.maa + k.arvo; });
                var uusi = null;
                for (var i = 0; i < pelatut.length; i++) {
                    var avain = pelatut[i].pelaaja + pelatut[i].maa + pelatut[i].arvo;
                    if (edellisetAvaimet.indexOf(avain) === -1) {
                        uusi = pelatut[i];
                        break;
                    }
                }
                if (uusi) {
                    puhu(uusi.pelaaja + ': ' + uusi.maa + ' ' + uusi.arvo);
                }
                edellisetPelatutKortit = pelatut.map(function(k) { return { pelaaja: k.pelaaja, maa: k.maa, arvo: k.arvo }; });
            }
            if (pelatut.length === 0) {
                edellisetPelatutKortit = [];
            }
        }, 200);
    }
});

peliTarkkailija.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
});

// Alkupaivitys kun sivu on ladattu
setTimeout(paivitaKorttienSaavutettavuus, 2000);

// Jaksoittainen tarjousten tarkistus varmuuskopiona,
// koska BBO:n tarjous-DOM-muutoksia on vaikea havaita luotettavasti.
// Tarkistaa 500ms valein onko uusia tarjouksia.
setInterval(function() {
    var tarjoukset = lueTarjoukset();
    if (tarjoukset.length !== puhututTarjouksetMaara) {
        tarkistaUudetTarjoukset();
    }
}, 500);
