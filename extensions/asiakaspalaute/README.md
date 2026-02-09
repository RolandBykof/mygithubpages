# Palautekäsittelyn saavutettavuuskorjaus - Versio 1.3

## Uutta versiossa 1.3
✨ **ARIA Live -alue ruudunlukijalle!** Laajennus näyttää nyt kaikki korjaukset visuaalisessa ruudussa oikeassa yläkulmassa. Ruudunlukija lukee automaattisesti jokaisen tehdyn korjauksen.

## Tunnistetut saavutettavuusongelmat HTML-tiedostossa

### 1. KRIITTINEN: Koko sisältö piilotettu ruudunlukijalta
- **Ongelma**: `<main>`-elementissä on `aria-hidden="true"` (rivi 91)
- **Vaikutus**: Koko sivun pääsisältö on piilotettu ruudunlukijalta
- **Korjaus**: Laajennus poistaa automaattisesti kaikki `aria-hidden="true"` attribuutit

### 2. Työjonot-valikko (rivit 137-185)
- **Ongelma**: 
  - `<a class="dropdown-toggle">` linkki ilman `role`-attribuuttia
  - Ei `aria-haspopup` tai `aria-expanded` attribuutteja
  - Dropdown-menu `<ul>` ilman `role="menu"`
- **Korjaus**:
  - Lisätty `role="button"`, `aria-haspopup="true"`, `aria-expanded="false"`
  - Dropdown-menulle lisätty `role="menu"`
  - Menu-itemeille lisätty `role="menuitem"`
  - Näppäimistötuki (Enter/Space avaa valikon)

### 3. Asiantuntijalle siirto -linkit (rivit 251-281)
- **Ongelma**:
  - `<a class="create-subaction">` linkit ilman semanttista roolia
  - Toimivat painikkeina mutta ilmoitetaan linkkeinä
  - Ei aria-label -määritystä
- **Korjaus**:
  - Lisätty `role="button"`
  - Lisätty `aria-label="Siirrä asiantuntijalle"` tyhjille linkeille
  - Näppäimistötuki (Enter/Space aktivoi)

### 4. Yleiset linkki-painike -ongelmat
- **Ongelma**: Monet `<a href="#">` linkit toimivat painikkeina
- **Korjaus**: Kaikille `href="#"` linkeille lisätty `role="button"`

## Laajennuksen toiminnot

### Automaattiset korjaukset
1. **Aria-hidden poisto**: Poistaa kaikki aria-hidden attribuutit
2. **Dropdown-valikot**: Korjaa ARIA-roolit ja -attribuutit
3. **Painike-semantiikka**: Muuttaa painikkeina toimivat linkit button-roolin
4. **Näppäimistötuki**: Lisää Enter/Space -näppäintuen kaikille painikkeille
5. **Menu-navigointi**: Lisää kunnolliset ARIA-roolit dropdown-valikoille

### Käyttäjäpalaute
- **ARIA Live -alue**: Näkyvä ruutu oikeassa yläkulmassa, joka ilmoittaa kaikki korjaukset
- **Ruudunlukija**: Lukee automaattisesti jokaisen tehdyn korjauksen
- **Konsoliloki**: Kaikki korjaukset näkyvät myös Developer Tools -konsolissa
- **Sulje-painike**: Live-alueen voi sulkea X-painikkeesta

## Asennus

### 1. Lataa laajennus selaimeen
1. Avaa Chrome/Edge selaimessa: `chrome://extensions/` (tai `edge://extensions/`)
2. Aktivoi **"Kehittäjätila"** (Developer mode) oikeasta yläkulmasta
3. Klikkaa **"Lataa paketoitu"** (Load unpacked)
4. Valitse kansio, jossa on `manifest.json` ja `content.js`

### 2. TÄRKEÄ: Anna lupa paikallisille tiedostoille
**ILMAN TÄTÄ LAAJENNUS EI TOIMI PAIKALLISILLA HTML-TIEDOSTOILLA!**

1. Etsi juuri asentamasi "Palautekäsittelyn Saavutettavuuskorjaus" -laajennus
2. Klikkaa **"Details"** (Tiedot) -painiketta
3. Vieritä alas ja etsi kohta **"Allow access to file URLs"** (Salli pääsy tiedosto-URL:eihin)
4. **KYTKE TÄMÄ PÄÄLLE** (toggle switch siniseksi)

### 3. Avaa HTML-tiedosto
- Avaa `palautesivu.html` tiedosto suoraan selaimessa
- URL-osoite alkaa `file:///`

## Testaus että laajennus toimii

### Tapa 1: ARIA Live -alue (helpoin ruudunlukijalla)
1. Avaa HTML-tiedosto selaimessa
2. Ruudunlukija ilmoittaa: "Saavutettavuuslaajennus käynnistetty. Loki näkyy oikeassa yläkulmassa."
3. Ruudunlukija lukee automaattisesti jokaisen tehdyn korjauksen, esim:
   - "Poistettu aria-hidden elementistä: DIV"
   - "Korjattu Työjonot-valikko"
   - "Korjattu dropdown-menu"
4. Voit navigoida live-alueeseen ruudunlukijalla (se on `role="status"`)
5. Sulje live-alue painamalla "Sulje (x)" -painiketta

### Tapa 2: Developer Console (visuaalisille käyttäjille)
1. Avaa selaimessa Developer Tools (**F12**)
2. Mene **Console**-välilehdelle
3. Lataa sivu uudelleen (**F5** tai **Ctrl+R**)
4. Sinun pitäisi nähdä konsolissa:
   ```
   ============================================
   Saavutettavuuslaajennus v1.3 KÄYNNISTYY
   URL: file:///C:/polku/palautesivu.html
   ============================================
   1. Saavutettavuuslaajennus käynnistetty. Loki näkyy oikeassa yläkulmassa.
   2. Poistettu aria-hidden elementistä: DIV
   3. Korjattu Työjonot-valikko
   ```

### Jos et näe/kuule mitään:
- ❌ **Et ole antanut lupaa paikallisille tiedostoille** → Tee vaihe 2 uudelleen
- ❌ **Laajennus ei ole päällä** → Tarkista `chrome://extensions/` että se on aktiivinen
- ❌ **Väärä URL** → Tarkista että URL alkaa `file:///`

## Testaus ruudunlukijalla (NVDA)

### Työjonot-valikko
1. Tab-näppäimellä kohtaan "Työjonot"
2. NVDA ilmoittaa: "Työjonot, painike, tiivistetty" 
3. Paina Enter tai Space → valikko avautuu
4. NVDA ilmoittaa: "Työjonot, painike, laajennettu"

### Asiantuntijalle siirto
1. Tab-näppäimellä siirtolinkkiin
2. NVDA ilmoittaa: "Siirrä asiantuntijalle, painike"
3. Paina Enter tai Space → toiminto aktivoituu

## Tekniset yksityiskohdat

### MutationObserver
Laajennus käyttää MutationObserveria seuraamaan DOM-muutoksia ja korjaamaan dynaamisesti lisätyt elementit automaattisesti.

### Konsoli-lokitus
Kaikki tehdyt korjaukset kirjataan selaimen konsoliin (`F12` → Console):
- "Poistettu aria-hidden elementistä: ..."
- "Korjattu Työjonot-valikko: ..."
- "Korjattu siirto-linkki: ..."

## Yhteensopivuus

- Chrome 88+
- Edge 88+
- Manifest V3
- NVDA 2020.1+
- JAWS 2018+

## Versiohistoria

**1.3** (nykyinen)
- Lisätty ARIA Live -alue ruudunlukijalle
- Näkyvä loki-ikkuna oikeassa yläkulmassa
- Ruudunlukija ilmoittaa automaattisesti kaikki korjaukset
- Sulje-painike live-alueelle
- Parannettu debuggaus

**1.2**
- Poistettu äänimerkki (ei toiminut luotettavasti)
- Yksinkertaistettu koodi

**1.1**
- Korjattu Työjonot-valikon tunnistus
- Korjattu Asiantuntijalle siirto -linkkien tunnistus
- Lisätty dropdown-menu ARIA-roolit
- Parannettu näppäimistötuki

**1.0** (alkuperäinen)
- Perus aria-hidden poisto
- Äänimerkki
- Alustava valikkojen korjaus
