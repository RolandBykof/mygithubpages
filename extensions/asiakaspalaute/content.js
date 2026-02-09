(function() {
    'use strict';
    
    const logMessages = [];
    let attemptNumber = 0;
    let totalFixes = 0;
    
    function log(message) {
        console.log(message);
        logMessages.push(message);
    }
    
    log("===========================================");
    log("SAAVUTETTAVUUSLAAJENNUS v2.0 - FINAL");
    log("===========================================");
    log("URL: " + window.location.href);
    log("Aika: " + new Date().toLocaleString('fi-FI'));
    log("");
    log("Korjaukset:");
    log("  1. Työjonot-valikko (li.parent-page)");
    log("  2. Asiantuntijalle siirto (div.create-subaction)");
    log("");
    
    function downloadLog() {
        try {
            log("\n>>> LUODAAN LOKI.TXT <<<");
            
            const logText = logMessages.join('\n');
            const blob = new Blob([logText], { type: 'text/plain;charset=utf-8' });
            
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = 'saavutettavuus-loki-' + new Date().getTime() + '.txt';
            link.style.display = 'none';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            log("✓ Loki ladattu!");
            
        } catch (e) {
            log("VIRHE: " + e.message);
        }
    }
    
    function fixAccessibility() {
        attemptNumber++;
        
        log("\n" + "=".repeat(50));
        log("KORJAUSYRITYS #" + attemptNumber);
        log("=".repeat(50));
        
        let fixedThisTime = 0;
        
        // 1. Poista aria-hidden
        try {
            const hidden = document.querySelectorAll('[aria-hidden="true"]');
            if (hidden.length > 0) {
                log("\n1. ARIA-HIDDEN: " + hidden.length + " elementtiä");
                hidden.forEach(function(el) {
                    el.removeAttribute('aria-hidden');
                });
                fixedThisTime += hidden.length;
            }
        } catch(e) {
            log("VIRHE aria-hidden: " + e.message);
        }
        
        // 2. TYÖJONOT-VALIKKO
        try {
            log("\n2. TYÖJONOT-VALIKKO");
            
            const parentPages = document.querySelectorAll('li.parent-page');
            log("   Löydettiin: " + parentPages.length + " li.parent-page");
            
            if (parentPages.length > 0) {
                for (let i = 0; i < parentPages.length; i++) {
                    const li = parentPages[i];
                    const span = li.querySelector('span.ebs-navigation-panel-text');
                    
                    if (span) {
                        const text = span.textContent.trim();
                        log("   Li " + (i+1) + ": '" + text + "'");
                        
                        if (text === 'Työjonot' || text.indexOf('Työjonot') !== -1) {
                            if (!span.getAttribute('role')) {
                                span.setAttribute('role', 'button');
                                span.setAttribute('aria-haspopup', 'true');
                                span.setAttribute('aria-expanded', 'false');
                                span.setAttribute('tabindex', '0');
                                log("      ✓ KORJATTU");
                                
                                if (!span.dataset.clickFixed) {
                                    span.addEventListener('click', function() {
                                        const expanded = this.getAttribute('aria-expanded') === 'true';
                                        this.setAttribute('aria-expanded', !expanded);
                                    });
                                    span.dataset.clickFixed = 'true';
                                }
                                
                                fixedThisTime++;
                            }
                        }
                    }
                }
            }
            
        } catch(e) {
            log("   VIRHE: " + e.message);
        }
        
        // 3. ASIANTUNTIJALLE SIIRTO - div.create-subaction
        try {
            log("\n3. ASIANTUNTIJALLE SIIRTO (dynaamiset modalit)");
            
            // Etsi div.create-subaction elementit (ne luodaan dynaamisesti)
            const subactions = document.querySelectorAll('div.create-subaction');
            log("   Löydettiin: " + subactions.length + " div.create-subaction");
            
            subactions.forEach(function(div, index) {
                const dataValue = div.getAttribute('data-value');
                log("   Div " + (index+1) + ": data-value='" + dataValue + "'");
                
                if (dataValue === 'Asiantuntijan käsittely') {
                    log("      → 'Asiantuntijan käsittely' LÖYTYI!");
                    
                    // Korjaa h3-otsikko
                    const h3 = div.querySelector('.ebs-modal-dialog-body h3');
                    if (h3 && !h3.getAttribute('data-fixed')) {
                        // Lisää aria-label, koska CSS piilottaa alkuperäisen tekstin
                        h3.setAttribute('aria-label', 'Asiantuntijalle siirto');
                        h3.setAttribute('data-fixed', 'true');
                        log("      ✓ Korjattu h3: aria-label='Asiantuntijalle siirto'");
                        fixedThisTime++;
                    }
                }
            });
            
        } catch(e) {
            log("   VIRHE: " + e.message);
        }
        
        // 4. Näppäimistötuki
        try {
            const buttons = document.querySelectorAll('[role="button"]:not([data-kb-fixed])');
            if (buttons.length > 0) {
                log("\n4. NÄPPÄIMISTÖTUKI: " + buttons.length + " painiketta");
                for (let i = 0; i < buttons.length; i++) {
                    buttons[i].addEventListener('keydown', function(e) {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            this.click();
                        }
                    });
                    buttons[i].setAttribute('data-kb-fixed', 'true');
                }
            }
        } catch(e) {}
        
        totalFixes += fixedThisTime;
        log("\nTämä yritys: " + fixedThisTime + " korjausta");
        log("Yhteensä: " + totalFixes + " korjausta");
    }
    
    function updateBanner() {
        try {
            let banner = document.getElementById('accessibility-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'accessibility-banner';
                banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#4d8400;color:white;padding:12px;text-align:center;z-index:999999;font-size:15px;font-weight:bold;';
                document.body.appendChild(banner);
            }
            banner.textContent = '✓ Saavutettavuus v2.0: ' + totalFixes + ' korjausta (yritys ' + attemptNumber + '/4)';
        } catch(e) {}
    }
    
    function finalReport() {
        log("\n" + "=".repeat(50));
        log("LOPULLINEN YHTEENVETO");
        log("=".repeat(50));
        log("Korjausyrityksiä: " + attemptNumber);
        log("Korjauksia yhteensä: " + totalFixes);
        log("=".repeat(50));
        
        downloadLog();
        
        try {
            const banner = document.getElementById('accessibility-banner');
            if (banner) {
                if (totalFixes > 0) {
                    banner.textContent = '✓ Saavutettavuus: ' + totalFixes + ' korjausta - Loki ladattu!';
                    banner.style.background = '#2d6400';
                } else {
                    banner.textContent = '⚠ Saavutettavuus: 0 korjausta - Katso loki!';
                    banner.style.background = '#cc6600';
                }
                
                setTimeout(function() {
                    banner.style.display = 'none';
                }, 15000);
            }
        } catch(e) {}
    }
    
    function scheduleAttempts() {
        log("Ajastetaan 4 korjausyritystä (0s, 2s, 5s, 10s)");
        
        fixAccessibility();
        updateBanner();
        
        setTimeout(function() {
            log("\n⏰ 2 sekuntia");
            fixAccessibility();
            updateBanner();
        }, 2000);
        
        setTimeout(function() {
            log("\n⏰ 5 sekuntia");
            fixAccessibility();
            updateBanner();
        }, 5000);
        
        setTimeout(function() {
            log("\n⏰ 10 sekuntia - VIIMEINEN");
            fixAccessibility();
            updateBanner();
            finalReport();
        }, 10000);
    }
    
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', scheduleAttempts);
    } else {
        scheduleAttempts();
    }
    
})();
