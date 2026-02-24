# Haso.fi kohdevalikon saavutettavuuskorjaus

Chrome-selainlaajennus, joka korjaa haso.fi-sivuston puheenjohtajan yhteydenottolomakkeen kohdevalikon saavutettavuusongelmat ruudunlukuohjelmille (NVDA, JAWS).

## Ongelma

Sivulla `haso.fi/puheenjohtajan-yhteydenottolomake/` lomake on iframe-upotuksessa, eikä kohteen valintaan käytetty pudotusvalikko toimi ruudunlukuohjelmalla. DOM-analyysin perusteella:

- Lomake on iframe-elementissä (fokus on `<iframe>`)
- Kohdevalikko ei näy saavutettavuuspuussa oikein
- Navigointiovalikossa on virheellisiä `role="separator"` -attribuutteja `<ul>`-elementeillä
- Custom-pudotusvalikot eivät tue näppäimistönavigaatiota

## Mitä laajennus korjaa

1. **Piilotetut `<select>`-elementit**: Jos natiivi `<select>` on piilotettu CSS:llä (display:none, visibility:hidden, opacity:0 tms.), laajennus tekee sen näkyväksi ruudunlukuohjelmalle sr-only-tekniikalla ja piilottaa custom-valikkoversion `aria-hidden`-attribuutilla.

2. **Custom-pudotusvalikot**: Tunnistaa Select2-, Choices.js-, Tom Select-, HDS- ja muut div-pohjaiset pudotusvalikot ja lisää niihin:
   - `role="combobox"` trigger-elementille
   - `role="listbox"` ja `role="option"` vaihtoehdoille
   - `aria-expanded`, `aria-haspopup`, `aria-activedescendant`
   - Label-yhdistykset (`aria-labelledby`)

3. **Näppäimistönavigaatio**: Lisää custom-pudotusvalikoille täyden näppäimistötuen:
   - Nuoli ylös/alas: siirry vaihtoehdoissa
   - Enter/välilyönti: valitse / avaa
   - Escape: sulje valikko
   - Home/End: ensimmäinen/viimeinen vaihtoehto
   - Kirjainhaku (type-ahead): kirjoita etsiäksesi

4. **Live region -ilmoitukset**: `aria-live="polite"` -alue ilmoittaa valinnoista ruudunlukuohjelmalle.

5. **Virheelliset ARIA-roolit**: Poistaa `role="separator"` -attribuutit `<ul>`-elementeiltä, joita sivuston navigointivalikko käyttää virheellisesti.

6. **Labelittomat lomakekentät**: Yhdistää labelittomat input/select/textarea-elementit lähimpään label-tekstiin.

## Asennus

1. Lataa tai pura laajennuksen kansio
2. Avaa Chrome ja siirry osoitteeseen `chrome://extensions/`
3. Ota käyttöön **Kehittäjätila** (Developer mode) oikeasta yläkulmasta
4. Valitse **Lataa pakattu** (Load unpacked)
5. Valitse laajennuksen kansio (`haso-accessibility-fix`)
6. Laajennus aktivoituu automaattisesti haso.fi-sivuilla

## Teknisiä huomioita

- Laajennus toimii kaikissa iframe-kehyksissä (`all_frames: true`)
- MutationObserver tarkkailee dynaamisesti lisättäviä elementtejä
- Suoritusviiveet (1s, 3s, 5s) varmistavat, että myös hitaasti latautuvat iframet käsitellään
- Fokustyylissä käytetään Helsinki Design Systemin värejä (sininen #0072c6, keltainen #ffc61e)
- Laajennus kohdistuu vain haso.fi-domainiin eikä vaikuta muihin sivustoihin

## Yhteensopivuus

- Chrome / Chromium-pohjaiset selaimet (Manifest V3)
- NVDA-ruudunlukuohjelma
- JAWS-ruudunlukuohjelma
