# Bridge Champ -saavutettavuuslaajennus (v1.4)

Ruudunlukijatuki (NVDA / JAWS) Bridge Champ -pelialustalle. Rakenne ja
näppäinkomennot on tehty tarkoituksella identtisiksi Funbridge-laajennuksen
kanssa, jotta lihasmuisti siirtyy suoraan alustalta toiselle.

## Asennus

1. Chrome → `chrome://extensions`
2. Kehittäjätila päälle
3. "Lataa pakkaamaton laajennus" → valitse tämä kansio
4. Avaa `https://beta.bridgechamp.com/#/game`

## Näppäinkomennot

### Kyselyt (toimivat aina)

| Näppäin | Toiminto |
|---|---|
| Alt+H | Ohjeikkuna |
| Alt+M | Tilan uudelleenluku / kalibrointi |
| Alt+G | Lue koko oma käsi |
| Alt+A / S / D / F | Oma pata / hertta / ruutu / risti |
| Alt+T | Lue lepääjän käsi |
| Alt+Q / W / E / R | Lepääjän pata / hertta / ruutu / risti |
| Alt+P | Pöydässä olevat kortit |
| Alt+B | Tarjoussarja |
| Alt+O | Juuri nyt tarjolla olevat tarjoukset |
| Alt+I | Yhteiskäsi: oma käsi + lepääjä |
| Alt+C | Otetut tikit |
| Alt+X | Jako, oma suunta, vaaravyöhyke, HCP, sopimus |
| Alt+V | Vaaravyöhyke |
| Alt+N | Pelaajien nimet |
| Alt+K | Kenen vuoro |
| Alt+L | Pöytäpisteet |

### Pelaaminen

| Näppäin | Toiminto |
|---|---|
| väri + arvo | Pelaa kortti, esim. `S` sitten `A` = pataässä |
| Nuoli ylös / `I` | Korkein sallittu kortti |
| Nuoli alas / `O` | Matalin sallittu kortti |
| taso + väri | Tarjous, esim. `4` sitten `H` = 4 hertta |
| `P` | Pass |
| `X` | Double (tai Redouble jos double ei ole tarjolla) |
| Esc | Peruuta kesken oleva syöttö |
| F2 | Suurennettu korttipaneeli (heikkonäköisille) |

Värinäppäimet: `S` pata, `H` hertta, `D` ruutu, `C` risti, `N` NT (tarjouksessa).
Arvot: `A K Q J T 9 8 … 2`.

### Minibridge

Minibridgessä **ei ole tarjoussarjaa lainkaan**. Järjestelmä laskee pisteet,
päättää kumpi puoli pelaa, valitsee korkeamman käden pelinviejäksi ja kääntää
partnerin kortit pöytään. Pelinviejä ilmoittaa sopimuksen **kahdessa
vaiheessa**:

**Vaihe 1 – valtti.** Otsikko "Select Trump Suit", viisi laatikkoa
(`minibridge-suit-NT|S|H|D|C`).

**Vaihe 2 – taso.** Otsikko "Bid Level for Suit (NT)", seitsemän laatikkoa
(`minibridge-level-1` … `-7`). Taso tarkoittaa samaa kuin bridgessä:
6 + taso tikkiä.

| Näppäin | Toiminto |
|---|---|
| `S` / `H` / `D` / `C` / `N` | Vaihe 1: valitse valtti (N = NT) |
| `1`–`7` | Vaihe 2: valitse taso |
| Backspace | Palaa vaiheeseen 1 vaihtamaan valtti |
| Alt+I | Yhteiskäden pisteet ja värijakauma |
| Alt+O | Kerro vaihe, valittu valtti ja vaihtoehdot |

Laajennus lukee valitun valtin otsikon suluista, joten tasovaiheessa
vaihtoehdot ilmoitetaan muodossa "4 No Trump" eikä pelkkinä numeroina.
`P` ja `X` eivät kuulu minibridgeen; laajennus sanoo sen sen sijaan että
tekisi jotain arvaamatonta.

Vaiheen vaihtuessa kuulet automaattisesti:

> Vaihe 1: "Minibridge. You are declarer. Select Trump Suit. Combined 21 HCP.
> Clubs 11 (7 plus 4), Hearts 6 (2 plus 4), Spades 5 (4 plus 1),
> Diamonds 4 (0 plus 4). Options: No Trump, Spades, Hearts, Diamonds, Clubs."
>
> Vaihe 2: "Trump chosen: No Trump. Bid Level for Suit (NT). Combined 21 HCP.
> Press 1 to 7 for the level. Backspace goes back to the trump suit."

Alt+I toimii myös normaalibridgessä heti kun olet pelinviejä ja lepääjä on
näkyvissä.

### Tarjoamisesta (normaali bridge)

Bridge Champin tarjouslaatikko näyttää **vain lailliset tarjoukset**. Jos
tarjoussarja on esimerkiksi 3♠ – pass, laatikossa on vain 3NT ja siitä ylöspäin.
Siksi laajennus ei vain totea "ei saatavilla", vaan kertoo myös matalimman
mahdollisen tarjouksen:

> "1 Heart is not available. Lowest bid is 3 No Trump."

Kun tarjousvuoro tulee sinulle, laajennus ilmoittaa:

> "Your bid. Lowest available 3 No Trump."

Alt+O luettelee kaikki juuri sillä hetkellä tarjolla olevat vaihtoehdot.

## Mitä laajennus korjaa DOM:ssa

- **Korttipainikkeet.** `button.card.rank1.spades` ei sisällä yhtään tekstiä –
  kortin arvo on pelkissä luokissa. Laajennus lisää jokaiselle `aria-labelin`
  ("Spade Ace, my hand"), joten kortit ovat luettavissa myös ilman
  näppäinkomentoja, pelkällä Tabilla ja selaustilalla.
- **Vasen päävalikko.** `.bc-menu-item` on `<div title="…">` ilman rolea ja
  tabindexiä → `role="button"`, `tabindex="0"`, Enter/Väli toimivat.
- **Oikea työkalupalkki.** `.menu-item-wrapper[title]` on pelkkä SVG ilman
  tekstiä → nimi otetaan `title`-attribuutista.
- **Claim / Undo.** Nimi `.hover-title`-elementistä, `aria-disabled`
  seuraa `.disabled`-luokkaa.
- **Yläpalkin kytkimet.** `input[name="video_switch"]` ja
  `realistic_mode_switch` saavat `aria-labelin` viereisestä tekstistä.
- **Kopiopainikkeet.** `aria-label="copy"` → "Copy Table ID", "Copy Seat" jne.
- **Tarjouskortit.** `div.bidding-card.selector-card.bidding-card-4H` on
  tekstitön div ilman rolea → `role="button"`, `aria-label="4 Hearts"`,
  `tabindex`, Enter/Väli, ja `aria-disabled` seuraa `.disabled`-luokkaa.
  Tarjouslaatikkoa voi siis käyttää myös pelkällä Tabilla.
- **Esikatselukortti.** `.preview-wrapper` piilotetaan ruudunlukijalta —
  se ei ole toimintopainike vaan visuaalinen esikatselu.
- **Tarjoushistoria.** Pöydän ympärillä olevat `.bc-bidding-card.C3S` saavat
  nimen "North bid 3 Spades". Historiataulukon kuvien `alt="3S"` → "3 Spades".
- **ALERT-teksti.** `.bidding-card-alert-message` piilotetaan kun
  alert-ikoni on `.hidden` — muuten jokainen tarjous luettaisiin
  turhaan sanalla "ALERT".
- **Maamerkit.** Tulostaulu, pelivalikko ja työkalupalkki saavat
  `role`- ja `aria-label`-määreet.
- **Pelin ilmoitukset.** `.gameplay-notification-content` peilataan
  live-alueeseen.

## Automaattiset ilmoitukset

- Vastustajan / lepääjän pelaama kortti ("East plays Heart King")
- Vuoron vaihtuminen omalle kohdalle ("Your turn", "Dummy to play")
- Tikin päättyminen → tikkitilanne
- Uusi jako → jaon numero, vaaravyöhyke, jakaja, oma HCP

## Vielä varmistettavat valitsimet

DOM-analyysi oli tarjousvaiheesta (minibridge), joten osa pelivaiheen
rakenteista on päätelty. Kaikki alustakohtaiset valitsimet ovat yhdessä
paikassa tiedoston alussa (`BC_SEL`), ja epävarmat kohdat on merkitty
kommentilla `TARKISTA:`.

✅ **Ratkaistu v1.1:ssä:** tarjouslaatikko, Pass, Double ja tarjoushistoria.
✅ **Ratkaistu v1.3:ssa:** minibridgen kaksivaiheinen sopimuksen ilmoitus.
✅ **Ratkaistu v1.4:ssä:** pelatut kortit ja sopimusnäyttö.

### Pelivaiheen rakenne (vahvistettu 27.7.2026 klo 12.05)

Pelatut kortit **eivät** ole `.play-gather-location`-laatikoissa — ne ovat
aina tyhjiä animaatiokohteita. Oikea paikka on:

```
.trick-cards
  .trick-card-wrapper.w-3 > … > button.card.rank1.spades   ← lännen ♠A
  .card > .card.back                                        ← koriste
  .trick-card-wrapper.w-0.mark > .mark-decoration           ← vuorossa oleva
```

`w-N` on istumapaikan indeksi (N,E,S,W = 0,1,2,3). Koska käyttäjä istuu aina
alareunassa, absoluuttinen ja ruutupohjainen tulkinta eivät erotu toisistaan
etelässä istuttaessa. Siksi tulkinta **kalibroituu itse**: `.mark` osoittaa
vuorossa olevaa pelaajaa, ja sitä verrataan `has-turn`-lippuun
(`calibrateTrickIndexBase()`). Jos tulkinnat ovat ristiriidassa, koodi vaihtaa
toiseen automaattisesti.

Sopimus luetaan kompassin alta:

```
.contract-container
  .bid-symbol-container > span "1" + span.stripe-symbol.♥ "♥"
  .declarer-container "S"
```
→ "1 Hearts by South"

### Vielä avoinna

1. **Istumaindeksin varmistus muualla kuin etelässä.** Itsekalibrointi hoitaa
   tämän ajon aikana, mutta jos istut joskus muualla kuin etelässä, kannattaa
   tarkistaa Alt+P:n ilmoittamat suunnat kerran.
2. **Tikin voittajan ilmoitus.** Valttiväri on nyt saatavilla
   (`getTrumpSuitLetter()`), joten voittajan päättely on mahdollista lisätä.
3. **Robotti pelinviejänä minibridgessä.** Jos ChampBot valitsee sopimuksen,
   valitsinta ei näy — silloin olisi hyvä kuulla mikä sopimus valittiin.

## Ero Funbridge-laajennukseen

| | Funbridge | Bridge Champ |
|---|---|---|
| Kortin tunniste | SVG `<use href="#card-us-gs-as">` | luokat `rank1 spades` |
| Ässä | `a` | `rank1` (kuningas = `rank13`) |
| Vuoro | `.bridge-card-active` | `.bc-game-video-frame.has-turn` |
| Oma suunta | aina etelä (oletus) | `Seat :` -kenttä / kompassi |
| Kädet | `.cards-hand-BOTTOM` ym. | `.realistic-cards-wrapper.bottom`, `.dummy-cards-wrapper.top` |
| Pöydän kortit | jäävät käteen, `.bridge-card-played` | `.play-gather-location.*` |

Puheilmoitukset ovat englanniksi kuten Funbridge-laajennuksessakin, jotta
komennot ja ilmoitukset vastaavat toisiaan alustojen välillä.
