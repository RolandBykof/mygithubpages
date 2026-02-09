# Saavutettavuuslaajennus v1.7 - LOKI-TIEDOSTO AUTOMAATTISESTI

## 🎉 UUSI OMINAISUUS: Automaattinen loki.txt-tiedosto!

Kun avaat sivun, laajennus:
1. ✅ Tekee kaikki saavutettavuuskorjaukset
2. ✅ Kerää kaikki lokit tekstitiedostoon
3. ✅ **LATAA AUTOMAATTISESTI** `saavutettavuus-loki.txt` Downloads-kansioon

**Ei tarvitse avata Developer Toolsia!** Kaikki tiedot ovat helposti luettavassa tekstitiedostossa.

## Asennus

### 1. POISTA vanha laajennus (jos olet asentanut aiemman version)
1. Mene `chrome://extensions/`
2. Etsi "Palautekäsittelyn Saavutettavuuskorjaus"
3. Klikkaa **"Poista"** (Remove)

### 2. LATAA v1.7
1. Klikkaa **"Lataa paketoitu"** (Load unpacked)
2. Valitse kansio jossa on tiedostot:
   - `content.js` (v1.7)
   - `manifest.json` (v1.7)

### 3. Anna lupa paikallisille tiedostoille
1. Klikkaa laajennuksen **"Details"**
2. Kytke **"Allow access to file URLs"** PÄÄLLE

## Käyttö

1. **Avaa `palautesivu.html` selaimessa**

2. **Näet vihreän bannerin** sivun yläreunassa:
   ```
   ✓ Saavutettavuuslaajennus ajettu (12 korjausta) - Loki ladattu Downloads-kansioon
   ```

3. **Selain lataa automaattisesti** tiedoston `saavutettavuus-loki.txt`

4. **Avaa Downloads-kansio** ja etsi tiedosto `saavutettavuus-loki.txt`

5. **Avaa tiedosto** Muistiolla tai missä tahansa tekstieditorissa

## Esimerkki loki.txt-tiedostosta

```
===========================================
SAAVUTETTAVUUSLAAJENNUS v1.7
===========================================
URL: file:///C:/Users/Ville/palautesivu.html
Aika: 9.2.2026 klo 14.23.45

>>> ALOITETAAN KORJAUKSET <<<

1. ARIA-HIDDEN
   Löydettiin 2 aria-hidden elementtiä
   ✓ Poistettu aria-hidden 2 elementistä

2. TYÖJONOT-VALIKKO
   Löydettiin 3 a.dropdown-toggle elementtiä

   Linkki 1: 'Etusivu'
   Linkki 2: 'Työjonot'
      → LÖYTYI! Korjataan...
      ✓ Lisätty: role="button"
      ✓ Lisätty: aria-haspopup="true"
      ✓ Lisätty: aria-expanded="false"
   Linkki 3: 'Asetukset'

3. DROPDOWN-MENUT
   Löydettiin 5 ul.dropdown-menu elementtiä
   ✓ Korjattu 5 menua

4. NÄPPÄIMISTÖTUKI
   Löydettiin 8 [role="button"] elementtiä
   ✓ Lisätty Enter/Space-tuki 8 painikkeelle

>>> KORJAUKSET VALMIIT <<<
>>> Yhteensä 15 korjausta <<<

>>> Luodaan loki.txt-tiedosto...
✓ Loki tallennettu tiedostoon: saavutettavuus-loki.txt
✓ Tiedosto ladattu Downloads-kansioon!
```

## Mitä loki kertoo?

### ✅ Jos Työjonot-valikko LÖYTYI:
```
2. TYÖJONOT-VALIKKO
   Löydettiin 3 a.dropdown-toggle elementtiä
   
   Linkki 2: 'Työjonot'
      → LÖYTYI! Korjataan...
      ✓ Lisätty: role="button"
```

### ⚠️ Jos Työjonot-valikkoa EI LÖYTYNYT:
```
2. TYÖJONOT-VALIKKO
   Löydettiin 3 a.dropdown-toggle elementtiä
   
   Linkki 1: 'Joku muu teksti'
   Linkki 2: 'Toinen linkki'
   Linkki 3: 'Kolmas linkki'
   
   ⚠ HUOMIO: Työjonot-valikkoa ei löytynyt!
   ⚠ Yksikään linkki ei sisältänyt tekstiä 'Työjonot'
```

### ⚠️ Jos elementtejä EI OLE OLLENKAAN:
```
2. TYÖJONOT-VALIKKO
   Löydettiin 0 a.dropdown-toggle elementtiä
   
   ⚠ HUOMIO: Sivulla ei ole yhtään a.dropdown-toggle elementtiä!
```

## Lähettäminen minulle

Jos laajennus ei toimi:

1. ✅ Avaa Downloads-kansio
2. ✅ Etsi `saavutettavuus-loki.txt`
3. ✅ Avaa tiedosto
4. ✅ Kopioi KAIKKI teksti
5. ✅ Lähetä minulle

**TÄMÄ ON PALJON HELPOMPAA KUIN ETSIÄ DEVELOPER TOOLSISTA RUUDUNLUKIJALLA!**

## Vianetsintä

**Ei lataudu mitään tiedostoa?**
- Tarkista että laajennus on päällä (`chrome://extensions/`)
- Tarkista että "Allow access to file URLs" on päällä
- Katso selaimen latausilmoitukset (yleensä alareunassa)

**Tiedosto on tyhjä?**
- Laajennus ei päässyt ajamaan
- Avaa Developer Console (F12) ja tarkista virheet

**Vanha versio näkyy lokissa (v1.6, v1.5...)?**
- Et ole ladannut uutta versiota
- POISTA vanha laajennus kokonaan
- Lataa UUSI v1.7

## Mitä laajennus tekee?

1. **Poistaa aria-hidden** - Korjaa modaali-ikkunoiden jättämät virheet
2. **Korjaa Työjonot-valikon** - Lisää role="button" ja ARIA-attribuutit
3. **Korjaa dropdown-menut** - Lisää role="menu" ja role="menuitem"
4. **Lisää näppäimistötuen** - Enter ja Välilyönti toimivat painikkeissa

## Edut v1.7:ssä

- ✅ **Helppo ruudunlukijalle** - Ei tarvitse käyttää Developer Toolsia
- ✅ **Tekstitiedosto** - Voit avata Muistiolla tai missä tahansa
- ✅ **Automaattinen lataus** - Ei tarvitse tehdä mitään
- ✅ **Yksityiskohtaiset lokit** - Näet tarkalleen mitä löytyi
- ✅ **Helppo lähettää** - Kopioi teksti ja lähetä

## Versiohistoria

**1.7** (NYKYINEN) ⭐
- ✅ Automaattinen loki.txt-tiedosto
- ✅ Ladataan Downloads-kansioon
- ✅ Yksityiskohtaiset lokit

**1.6**
- Minimaalinen versio
- Korjattu jäätymisbugi

**1.3-1.5**
- ❌ Bugiset versiot, älä käytä
