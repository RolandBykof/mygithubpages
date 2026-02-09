(function() {
    'use strict';
    
    // Kerää kaikki lokit tähän taulukkoon
    const logMessages = [];
    
    // Oma log-funktio joka tallentaa sekä konsoliin että taulukkoon
    function log(message) {
        console.log(message);
        logMessages.push(message);
    }
    
    log("===========================================");
    log("SAAVUTETTAVUUSLAAJENNUS v1.7");
    log("===========================================");
    log("URL: " + window.location.href);
    log("Aika: " + new Date().toLocaleString('fi-FI'));
    log("");
    
    // Lataa loki.txt-tiedosto
    function downloadLog() {
        try {
            log("\n>>> Luodaan loki.txt-tiedosto...");
            
            // Yhdistä kaikki lokit yhteen tekstiin
            const logText = logMessages.join('\n');
            
            // Luo Blob (tekstitiedosto)
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            
            // Luo download-linkki
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'saavutettavuus-loki.txt';
            link.style.display = 'none';
            
            // Lisää linkki sivulle, klikkaa sitä, poista se
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            log("✓ Loki tallennettu tiedostoon: saavutettavuus-loki.txt");
            log("✓ Tiedosto ladattu Downloads-kansioon!");
            
            console.log("\n=== LOKI TALLENNETTU ===");
            console.log("Avaa Downloads-kansio ja etsi: saavutettavuus-loki.txt");
            
        } catch (e) {
            log("VIRHE lokin tallennuksessa: " + e.message);
            console.error("Virhe lokin tallennuksessa:", e);
        }
    }
    
    // VAIN YKSI funktio, ajetaan VAIN KERRAN
    function fixOnce() {
        log("\n>>> ALOITETAAN KORJAUKSET <<<");
        log("");
        
        let fixedCount = 0;
        
        // 1. Poista KAIKKI aria-hidden
        try {
            const hidden = document.querySelectorAll('[aria-hidden="true"]');
            log("1. ARIA-HIDDEN");
            log("   Löydettiin " + hidden.length + " aria-hidden elementtiä");
            
            hidden.forEach(function(el) {
                el.removeAttribute('aria-hidden');
                fixedCount++;
            });
            
            if (hidden.length > 0) {
                log("   ✓ Poistettu aria-hidden " + hidden.length + " elementistä");
            }
        } catch(e) {
            log("   ✗ VIRHE: " + e.message);
            console.error("Virhe aria-hidden poistossa:", e);
        }
        
        log("");
        
        // 2. Korjaa Työjonot-valikko
        try {
            log("2. TYÖJONOT-VALIKKO");
            const dropdowns = document.querySelectorAll('a.dropdown-toggle');
            log("   Löydettiin " + dropdowns.length + " a.dropdown-toggle elementtiä");
            log("");
            
            let found = false;
            for (let i = 0; i < dropdowns.length; i++) {
                const link = dropdowns[i];
                const text = link.textContent.trim();
                const shortText = text.length > 40 ? text.substring(0, 40) + "..." : text;
                log("   Linkki " + (i+1) + ": '" + shortText + "'");
                
                if (text.indexOf('Työjonot') !== -1) {
                    found = true;
                    log("      → LÖYTYI! Korjataan...");
                    
                    link.setAttribute('role', 'button');
                    link.setAttribute('aria-haspopup', 'true');
                    link.setAttribute('aria-expanded', 'false');
                    
                    log("      ✓ Lisätty: role=\"button\"");
                    log("      ✓ Lisätty: aria-haspopup=\"true\"");
                    log("      ✓ Lisätty: aria-expanded=\"false\"");
                    
                    fixedCount++;
                }
            }
            
            if (!found && dropdowns.length > 0) {
                log("");
                log("   ⚠ HUOMIO: Työjonot-valikkoa ei löytynyt!");
                log("   ⚠ Yksikään linkki ei sisältänyt tekstiä 'Työjonot'");
            } else if (dropdowns.length === 0) {
                log("   ⚠ HUOMIO: Sivulla ei ole yhtään a.dropdown-toggle elementtiä!");
            }
            
        } catch(e) {
            log("   ✗ VIRHE: " + e.message);
            console.error("Virhe dropdown-korjauksessa:", e);
        }
        
        log("");
        
        // 3. Korjaa dropdown-menut
        try {
            log("3. DROPDOWN-MENUT");
            const menus = document.querySelectorAll('ul.dropdown-menu');
            log("   Löydettiin " + menus.length + " ul.dropdown-menu elementtiä");
            
            for (let i = 0; i < menus.length; i++) {
                menus[i].setAttribute('role', 'menu');
                
                const items = menus[i].querySelectorAll('li a');
                for (let j = 0; j < items.length; j++) {
                    items[j].setAttribute('role', 'menuitem');
                }
                fixedCount++;
            }
            
            if (menus.length > 0) {
                log("   ✓ Korjattu " + menus.length + " menua");
            }
        } catch(e) {
            log("   ✗ VIRHE: " + e.message);
            console.error("Virhe menu-korjauksessa:", e);
        }
        
        log("");
        
        // 4. Lisää näppäimistötuki
        try {
            log("4. NÄPPÄIMISTÖTUKI");
            const buttons = document.querySelectorAll('[role="button"]');
            log("   Löydettiin " + buttons.length + " [role=\"button\"] elementtiä");
            
            for (let i = 0; i < buttons.length; i++) {
                buttons[i].addEventListener('keydown', function(e) {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        this.click();
                    }
                });
            }
            
            if (buttons.length > 0) {
                log("   ✓ Lisätty Enter/Space-tuki " + buttons.length + " painikkeelle");
            }
        } catch(e) {
            log("   ✗ VIRHE: " + e.message);
            console.error("Virhe näppäimistötuessa:", e);
        }
        
        log("");
        log(">>> KORJAUKSET VALMIIT <<<");
        log(">>> Yhteensä " + fixedCount + " korjausta <<<");
        log("");
        
        // Lataa loki heti kun korjaukset on tehty
        downloadLog();
        
        // Lisää näkyvä palaute sivulle
        try {
            const banner = document.createElement('div');
            banner.textContent = '✓ Saavutettavuuslaajennus ajettu (' + fixedCount + ' korjausta) - Loki ladattu Downloads-kansioon';
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#4d8400;color:white;padding:15px;text-align:center;z-index:999999;font-size:16px;font-weight:bold;';
            document.body.appendChild(banner);
            
            // Poista banneri 8 sekunnin kuluttua
            setTimeout(function() {
                banner.style.display = 'none';
            }, 8000);
        } catch(e) {
            log("Ei voitu lisätä banneria: " + e.message);
        }
    }
    
    // AJETAAN kun sivu on ladattu
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixOnce);
        log("Odotetaan sivun latautumista...");
    } else {
        log("Sivu jo ladattu, ajetaan heti!");
        fixOnce();
    }
    
})();
