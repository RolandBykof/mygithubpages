# LinkedIn H4 Navigation

Selainlaajennus, joka lisää h4-tason otsikot LinkedIn-syötejulkaisuihin. Tämä mahdollistaa nopean navigoinnin ruudunlukijalla julkaisusta toiseen käyttäen h4-otsikkonavigointia.

## Ominaisuudet

- Lisää jokaiseen syötejulkaisuun h4-otsikon
- Otsikko sisältää julkaisijan nimen ja tekstin alun
- Otsikot ovat visuaalisesti piilotettuja mutta ruudunlukijalle näkyviä
- Toimii automaattisesti infinite scroll -latauksessa
- Ei muuta LinkedInin visuaalista ulkoasua

## Asennus Chromeen/Edgeen

1. Pura ZIP-tiedosto haluamaasi kansioon
2. Avaa Chrome ja siirry osoitteeseen `chrome://extensions/`
   - Edgessä: `edge://extensions/`
3. Ota käyttöön "Kehittäjätila" (Developer mode) oikeasta yläkulmasta
4. Napsauta "Lataa pakkaamaton" (Load unpacked)
5. Valitse purettu kansio
6. Laajennus on nyt aktiivinen

## Asennus Firefoxiin

1. Pura ZIP-tiedosto
2. Avaa Firefox ja siirry osoitteeseen `about:debugging`
3. Valitse "Tämä Firefox" (This Firefox)
4. Napsauta "Lataa väliaikainen lisäosa" (Load Temporary Add-on)
5. Valitse `manifest.json`-tiedosto puretusta kansiosta

**Huom:** Firefoxissa väliaikainen laajennus poistuu selaimen sulkeutuessa.

## Käyttö ruudunlukijalla

Kun laajennus on aktiivinen ja olet LinkedInin syötesivulla:

### NVDA
- Paina `H` siirtyäksesi seuraavaan otsikkoon
- Paina `4` siirtyäksesi seuraavaan h4-otsikkoon
- Paina `Shift+4` siirtyäksesi edelliseen h4-otsikkoon

### JAWS
- Paina `H` tai `4` siirtyäksesi h4-otsikoihin
- Paina `Shift+H` tai `Shift+4` siirtyäksesi taaksepäin

### VoiceOver (macOS)
- Käytä rotoria (VO+U) ja valitse "Otsikot"
- Navigoi ylös/alas-nuolilla

## Otsikon muoto

Jokainen h4-otsikko on muotoa:

```
Julkaisijan nimi: Tekstin alku (max 60 merkkiä)...
```

Esimerkki:
```
Ari-Pekka Saarela: Käyttäjäkokemuksen laadun teemalla jatketaan. Kiitos palautteesta...
```

## Tekniset tiedot

- Manifest versio: 3
- Toimii vain linkedin.com/feed -sivulla
- Käyttää MutationObserveria uusien julkaisujen havaitsemiseen
- Ei lähetä dataa ulkoisille palvelimille

## Versiohistoria

### 1.0
- Ensimmäinen versio
- H4-otsikot syötejulkaisuille
- Infinite scroll -tuki
