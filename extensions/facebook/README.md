# Facebook Accessibility Headers

Selainlaajennus, joka parantaa Facebookin saavutettavuutta lisäämällä h5-otsikot julkaisuteksteihin. Tämä mahdollistaa nopean navigoinnin julkaisusta toiseen ruudunlukijaohjelmilla (NVDA, JAWS).

## Ominaisuudet

- ✅ Lisää h5-otsikot automaattisesti kaikkiin Facebookin julkaisuteksteihin
- ✅ Otsikot näkyvät vain ruudunlukijalle (eivät häiritse visuaalista ulkoasua)
- ✅ Toimii dynaamisesti - käsittelee myös uudet julkaisut kun scrollaat
- ✅ Ei vaadi mitään käyttäjän toimenpiteitä asennuksen jälkeen
- ✅ Kevyt ja tehokas

## Navigointi ruudunlukijalla

### NVDA:
- **H** = Seuraava otsikko
- **Shift + H** = Edellinen otsikko
- **5** = Seuraava tason 5 otsikko (vain julkaisutekstit)
- **Shift + 5** = Edellinen tason 5 otsikko

### JAWS:
- **H** = Seuraava otsikko
- **Shift + H** = Edellinen otsikko
- **5** = Seuraava tason 5 otsikko
- **Shift + 5** = Edellinen tason 5 otsikko

## Asennus

### Google Chrome / Microsoft Edge / Opera / Brave

1. Lataa kaikki tiedostot kansioon (esim. `facebook-accessibility-headers`)
2. Avaa Chrome ja mene osoitteeseen `chrome://extensions/`
3. Ota käyttöön "Kehittäjätila" (Developer mode) oikeasta yläkulmasta
4. Klikkaa "Lataa paketoitu laajennus" (Load unpacked)
5. Valitse `facebook-accessibility-headers` -kansio
6. Valmis! Mene Facebookiin ja testaa

### Mozilla Firefox

1. Lataa kaikki tiedostot kansioon
2. Avaa Firefox ja mene osoitteeseen `about:debugging#/runtime/this-firefox`
3. Klikkaa "Lataa väliaikainen lisäosa" (Load Temporary Add-on)
4. Valitse `manifest.json` tiedosto kansiosta
5. Valmis! Mene Facebookiin ja testaa

**Huom:** Firefoxissa laajennus poistuu selaimen sulkemisen yhteydessä. Pysyvää asennusta varten laajennus pitää allekirjoittaa ja julkaista Firefox Add-ons -palvelussa.

## Testaus

1. Avaa Facebook (https://www.facebook.com)
2. Avaa selaimen konsoli (F12 → Console)
3. Näet viestit: "Facebook Accessibility Headers: Alustetaan..." ja "Käsitelty X julkaisutekstiä"
4. Käytä ruudenlukijaasi ja paina **H**-näppäintä siirtyäksesi otsikoista toiseen
5. Paina **5**-näppäintä siirtyäksesi vain julkaisutekstien välillä
6. Ruudunlukija lukee julkaisun tekstin alun (esim. "Olin tänään ostoksilla ja löysin...")

## Vianmääritys

### Laajennus ei toimi:

1. **Tarkista konsoli:** Avaa F12 ja katso Console-välilehti. Pitäisi näkyä viestejä "Facebook A11y: Käsitelty X julkaisutekstiä"
2. **Päivitä sivu:** Paina F5 ladataksesi sivun uudelleen
3. **Tarkista että olet Facebook.com -sivulla:** Laajennus toimii vain facebook.com-osoitteessa
4. **Varmista että laajennus on käytössä:** Mene extensions-sivulle ja tarkista että laajennus on enabled

### Otsikot näkyvät sivulla (ei haluttu):

1. Avaa `styles.css`
2. Varmista että `.fb-accessibility-heading` käyttää "screen reader only" -tyyliä (ei kommentoitu pois)

### Otsikkoja ei löydy ruudunlukijalla:

1. Varmista että käytät H-näppäintä (ei nuolinäppäimiä)
2. Odota hetki sivun latauksen jälkeen (MutationObserver käsittelee julkaisuja)
3. Tarkista konsolista että julkaisuja on käsitelty

## Näkyvät otsikot (valinnainen)

Jos haluat nähdä otsikot myös visuaalisesti (testaustarkoituksiin):

1. Avaa `styles.css`
2. Kommentoi pois `.fb-accessibility-heading` "screen reader only" -tyyli
3. Poista kommentit vaihtoehtoisesta tyylistä (rivit alussa `/*` ja lopussa `*/`)

## Tiedostorakenne

```
facebook-accessibility-headers/
├── manifest.json       # Laajennuksen määrittelytiedosto
├── content.js          # Pääskripti joka lisää otsikot
├── styles.css          # Tyylitiedosto otsikoille
├── icon16.png          # Pieni kuvake
├── icon48.png          # Keskikokoinen kuvake
├── icon128.png         # Suuri kuvake
└── README.md           # Tämä tiedosto
```

## Tekniset yksityiskohdat

### Miten laajennus toimii:

1. **DOM-analyysi:** Etsii julkaisutekstit CSS-luokkien perusteella (`x193iq5w`, `xeuugli`, `xo1l8bm`, `xzsf02u`)
2. **Tekstin poiminta:** Ottaa julkaisun tekstistä ensimmäiset ~80 merkkiä
3. **Otsikon lisäys:** Lisää h5-elementin ennen julkaisutekstiä, otsikkona tekstin alku
4. **Dynaaminen seuranta:** MutationObserver seuraa uusia julkaisuja ja käsittelee ne automaattisesti
5. **Duplikaattien esto:** WeakSet pitää kirjaa käsitellyistä elementeistä

### ARIA-attribuutit:

```html
<h5 class="fb-accessibility-heading" role="heading" aria-level="5">
  Olin tänään ostoksilla ja löysin...
</h5>
```

Otsikko sisältää julkaisun tekstin alun (enintään 80 merkkiä), jotta ruudunlukijan käyttäjä näkee heti mistä julkaisu kertoo ilman että hänen tarvitsee navigoida varsinaiseen tekstiin.

## Yhteensopivuus

- ✅ Chrome 88+
- ✅ Edge 88+
- ✅ Firefox 78+
- ✅ Opera 74+
- ✅ Brave 1.20+

## Lisenssi

MIT License - Vapaa käyttöön ja muokkaukseen

## Kehittäjä

Luotu saavutettavuuden parantamiseksi. Palautetta ja parannusehdotuksia otetaan vastaan!

## Versiohistoria

### 1.2 (2026-02-06)
- **KRIITTINEN KORJAUS:** Poistettu ylimääräiset h5-otsikot
- Nyt lisätään vain YKSI h5-otsikko per julkaisu (varsinainen teksti)
- Ei enää otsikoita tekijän nimelle tai julkaisuajalle
- Parannettu suodatus:
  - Vähintään 20 merkkiä (suodattaa nimet pois)
  - Ei otsikoiden sisältöä (h1-h6)
  - Ei ajantietoja (min, h, pv, viikko jne.)
  - Ei jako-infoa (jaettu, seuraaville, kaverit)
  - Vain yksi otsikko per article-elementti

### 1.1 (2026-02-06)
- **KORJAUS:** Otsikko sisältää nyt julkaisun tekstin alun (esim. "Olin tänään ostoksilla...") tekijän nimen sijaan
- Parannettu käytettävyyttä: käyttäjä näkee heti mistä julkaisu kertoo
- Otsikon maksimipituus 80 merkkiä

### 1.0 (2026-02-06)
- Ensimmäinen julkaisu
- Perustoiminnallisuus: h5-otsikot julkaisuteksteihin
- MutationObserver dynaamista sisältöä varten
- Screen reader only -tyylitys
