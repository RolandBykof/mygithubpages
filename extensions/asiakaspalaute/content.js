(function() {
    console.log("============================================");
    console.log("Saavutettavuuslaajennus v1.3 KÄYNNISTYY");
    console.log("URL:", window.location.href);
    console.log("============================================");

    // Luodaan ARIA live -alue ruudunlukijalle
    let liveRegion = null;
    let logCount = 0;
    
    function createLiveRegion() {
        liveRegion = document.createElement('div');
        liveRegion.setAttribute('role', 'status');
        liveRegion.setAttribute('aria-live', 'polite');
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.style.position = 'fixed';
        liveRegion.style.top = '10px';
        liveRegion.style.right = '10px';
        liveRegion.style.backgroundColor = '#ffffff';
        liveRegion.style.border = '3px solid #4d8400';
        liveRegion.style.padding = '15px';
        liveRegion.style.zIndex = '999999';
        liveRegion.style.maxWidth = '400px';
        liveRegion.style.fontSize = '14px';
        liveRegion.style.fontFamily = 'Arial, sans-serif';
        liveRegion.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
        
        // Otsikko
        const title = document.createElement('h2');
        title.textContent = 'Saavutettavuuslaajennus';
        title.style.margin = '0 0 10px 0';
        title.style.fontSize = '16px';
        title.style.fontWeight = 'bold';
        title.style.color = '#4d8400';
        liveRegion.appendChild(title);
        
        // Loki-alue
        const logArea = document.createElement('div');
        logArea.id = 'accessibility-log';
        logArea.style.maxHeight = '300px';
        logArea.style.overflowY = 'auto';
        logArea.style.marginTop = '10px';
        liveRegion.appendChild(logArea);
        
        // Sulje-painike
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Sulje (x)';
        closeButton.setAttribute('aria-label', 'Sulje lokialue');
        closeButton.style.marginTop = '10px';
        closeButton.style.padding = '5px 10px';
        closeButton.style.backgroundColor = '#4d8400';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.cursor = 'pointer';
        closeButton.style.fontSize = '14px';
        closeButton.addEventListener('click', function() {
            liveRegion.style.display = 'none';
            announceToScreenReader('Lokialue suljettu');
        });
        liveRegion.appendChild(closeButton);
        
        document.body.appendChild(liveRegion);
        
        announceToScreenReader('Saavutettavuuslaajennus käynnistetty. Loki näkyy oikeassa yläkulmassa.');
    }
    
    function announceToScreenReader(message) {
        if (!liveRegion) return;
        
        logCount++;
        const logArea = document.getElementById('accessibility-log');
        const entry = document.createElement('p');
        entry.textContent = `${logCount}. ${message}`;
        entry.style.margin = '5px 0';
        entry.style.padding = '5px';
        entry.style.borderBottom = '1px solid #eee';
        logArea.appendChild(entry);
        
        // Vieritä automaattisesti alas
        logArea.scrollTop = logArea.scrollHeight;
        
        // Päivitä live-alueen aria-label ruudunlukijaa varten
        liveRegion.setAttribute('aria-label', message);
        
        console.log(message);
    }

    // Ruudunlukijan "mykistyksen" poisto (Unhide-logiikka)
    function unhideContent() {
        // Poistetaan aria-hidden kaikilta elementeiltä, jotka saattavat mykistää sivun
        const hiddenElements = document.querySelectorAll('[aria-hidden="true"]');
        hiddenElements.forEach(el => {
            el.removeAttribute('aria-hidden');
            announceToScreenReader(`Poistettu aria-hidden elementistä: ${el.tagName}`);
        });

        // Varmistetaan, ettei body-elementtiä ole mykistetty
        if (document.body.getAttribute('aria-hidden') === 'true') {
            document.body.removeAttribute('aria-hidden');
            announceToScreenReader('Poistettu aria-hidden body-elementistä');
        }
    }

    function fixAccessibility() {
        unhideContent(); // Ajetaan mykistyksen poisto jokaisella muutoksella

        // TYÖJONOT-VALIKKO
        // Etsitään dropdown-toggle linkki, jossa on teksti "Työjonot"
        const queueDropdowns = document.querySelectorAll('a.dropdown-toggle');
        queueDropdowns.forEach(link => {
            const text = link.textContent.trim();
            if (text === 'Työjonot' || text.includes('Työjonot')) {
                if (!link.hasAttribute('role')) {
                    link.setAttribute('role', 'button');
                    link.setAttribute('aria-haspopup', 'true');
                    link.setAttribute('aria-expanded', 'false');
                    announceToScreenReader('Korjattu Työjonot-valikko');
                }
                
                // Lisätään aria-expanded päivitys klikkaukselle
                if (!link.dataset.expandAttached) {
                    link.addEventListener('click', function() {
                        const isExpanded = this.getAttribute('aria-expanded') === 'true';
                        this.setAttribute('aria-expanded', !isExpanded);
                    });
                    link.dataset.expandAttached = "true";
                }
            }
        });

        // Korjataan dropdown-menu
        const dropdownMenus = document.querySelectorAll('ul.dropdown-menu');
        dropdownMenus.forEach(menu => {
            if (!menu.hasAttribute('role')) {
                menu.setAttribute('role', 'menu');
                announceToScreenReader('Korjattu dropdown-menu');
            }
            // Korjataan menu-itemit
            const menuItems = menu.querySelectorAll('li a');
            menuItems.forEach(item => {
                if (!item.hasAttribute('role')) {
                    item.setAttribute('role', 'menuitem');
                }
            });
        });

        // ASIANTUNTIJALLE SIIRTO
        // Etsitään kaikki linkit, joissa on create-subaction -luokka
        const transferLinks = document.querySelectorAll('a.create-subaction');
        transferLinks.forEach(link => {
            if (!link.hasAttribute('role')) {
                link.setAttribute('role', 'button');
                link.setAttribute('tabindex', '0');
                
                // Lisätään aria-label jos ei ole tekstiä
                const linkText = link.textContent.trim();
                if (!linkText && !link.hasAttribute('aria-label')) {
                    link.setAttribute('aria-label', 'Siirrä asiantuntijalle');
                }
                announceToScreenReader('Korjattu asiantuntijalle siirto -linkki');
            }
        });

        // YLEINEN LINKKI → PAINIKE KORJAUS
        // Etsitään linkkejä, jotka toimivat painikkeiden tavoin (ei href tai href="#")
        const buttonLikeLinks = document.querySelectorAll('a[href="#"], a:not([href])');
        buttonLikeLinks.forEach(link => {
            if (!link.hasAttribute('role') && !link.dataset.roleFixed) {
                link.setAttribute('role', 'button');
                link.setAttribute('tabindex', '0');
                link.dataset.roleFixed = "true";
            }
        });

        // NÄPPÄIMISTÖTUKI
        const customButtons = document.querySelectorAll('[role="button"]');
        customButtons.forEach(btn => {
            if (!btn.dataset.kbAttached) {
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
                btn.dataset.kbAttached = "true";
            }
        });

        // DROPDOWN-PAINIKKEIDEN NÄPPÄIMISTÖTUKI
        const dropdownButtons = document.querySelectorAll('[aria-haspopup="true"]');
        dropdownButtons.forEach(btn => {
            if (!btn.dataset.dropdownKbAttached) {
                btn.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        btn.click();
                    }
                });
                btn.dataset.dropdownKbAttached = "true";
            }
        });
    }

    // Käynnistys - odotetaan että DOM on valmis
    if (document.body) {
        createLiveRegion();
        fixAccessibility();
    } else {
        document.addEventListener('DOMContentLoaded', function() {
            createLiveRegion();
            fixAccessibility();
        });
    }
    
    const observer = new MutationObserver(fixAccessibility);
    observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    
    announceToScreenReader('Saavutettavuuskorjaukset käynnissä');
})();
