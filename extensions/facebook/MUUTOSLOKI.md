# Muutosloki - Versio 1.2

## 🔥 KRIITTINEN KORJAUS - Vain yksi otsikko per julkaisu!

### Ongelma versiossa 1.1:

Kun painoit **5**-näppäintä, sait 3 otsikkoa per julkaisu:
1. "Jaana Argillander" (tekijän nimi)
2. "2 pv jaettu seuraaville Jaanan kaverit" (aikaleima ja jako-info)
3. "Jolin hammassyöpymäsairaus rajusti edennyt..." (varsinainen teksti)

→ Jouduit painamaan 5:ttä kolme kertaa per julkaisu = Turhauttavaa!

### Ratkaisu versiossa 1.2:

Kun painat **5**-näppäintä, saat vain YHDEN otsikon per julkaisu:
1. "Jolin hammassyöpymäsairaus rajusti edennyt ja nyt jouduttiin poistamaan..."

→ Painat 5:ttä kerran → Siirtyy suoraan seuraavaan julkaisuun!

## Mitä muuttui teknisesti?

### 1. Lisätty tekstin vähimmäispituusvaatimus
```javascript
// Tekstin pitää olla vähintään 20 merkkiä
if (text.length < 20) {
  return false;
}
```
→ Suodattaa pois tekijänimet (yleensä 5-20 merkkiä)

### 2. Estetty otsikot otsikkoelementtien sisältä
```javascript
// Ei otsikoita h1-h6 elementtien sisältä
const isInHeading = element.closest('h1, h2, h3, h4, h5, h6') !== null;
```
→ Tekijän nimi on usein h3-elementissä

### 3. Suodatettu pois ajantiedot ja jako-info
```javascript
// Hylkää jos sisältää aikamerkintöjä
const hasTimeInfo = text.match(/\d+\s*(min|h|pv|viikko|kuukausi|vuosi)/i);

// Hylkää jos sisältää jako-infoa
const hasShareInfo = text.match(/(jaettu|seuraaville|julkinen|kaverit)/i);
```
→ "2 pv jaettu seuraaville..." tunnistetaan ja ohitetaan

### 4. Vain yksi otsikko per article-elementti
```javascript
const processedArticles = new WeakSet();

// Tarkista että ei ole jo käsitelty
if (processedArticles.has(article)) {
  return; // Tähän julkaisuun on jo lisätty otsikko
}

processedArticles.add(article);
```
→ Vaikka löytyisi useita tekstielementtejä, lisätään vain yksi otsikko

## Vertailu: v1.1 vs v1.2

### VERSIO 1.1 (Huono):
```
[Painat 5] → "Jaana Argillander"
[Painat 5] → "2 pv jaettu seuraaville Jaanan kaverit"
[Painat 5] → "Jolin hammassyöpymäsairaus rajusti..."
[Painat 5] → "Matti Virtanen"
[Painat 5] → "15 min julkinen"
[Painat 5] → "Brittisarjojen parhaimmisto on täällä..."
```
**Tulokset:** 6 otsikkoa, 2 julkaisua
**Tehokkuus:** 33% (vain joka kolmas otsikko on hyödyllinen)

### VERSIO 1.2 (Hyvä):
```
[Painat 5] → "Jolin hammassyöpymäsairaus rajusti..."
[Painat 5] → "Brittisarjojen parhaimmisto on täällä..."
[Painat 5] → "Tapasin tänään EU:n ulko- ja turvallisuus..."
```
**Tulokset:** 3 otsikkoa, 3 julkaisua
**Tehokkuus:** 100% (kaikki otsikot hyödyllisiä!)

## Päivitysohje

### Jos sinulla on v1.1 asennettuna:

**Chrome/Edge/Brave:**
1. Mene `chrome://extensions/`
2. Poista "Facebook Accessibility Headers"
3. Pura uusi ZIP (v1.2)
4. "Lataa paketoitu laajennus" → Valitse uusi kansio

**Firefox:**
1. Mene `about:debugging#/runtime/this-firefox`
2. Poista laajennus
3. Pura uusi ZIP (v1.2)
4. "Lataa väliaikainen lisäosa" → Valitse manifest.json

**TÄRKEÄÄ:** Poista vanha versio ennen uuden asentamista!

## Testaa v1.2:

1. Mene Facebookiin
2. Paina **5** muutaman kerran
3. Jokainen painallus siirtää suoraan seuraavaan julkaisuun
4. Ei enää väli-otsikoita!

## Tunnetut rajoitukset (edelleen)

- Jos julkaisuteksti on alle 20 merkkiä, sitä ei tunnisteta
  - Esim: "Wow! 😍" → Ei lisätä otsikkoa
  - Ratkaisu: Käytä H-näppäintä tai nuolinäppäimiä

## Palaute

Toimiiko nyt paremmin? Kerro kokemuksesi!

---

**Versio:** 1.2  
**Julkaistu:** 6.2.2026  
**Edellinen versio:** 1.1  
**Suurin muutos:** Vain yksi otsikko per julkaisu!
