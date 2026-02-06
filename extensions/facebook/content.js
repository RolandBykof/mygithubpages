/**
 * Facebook Accessibility Headers - Content Script
 * Lisää h5-otsikot julkaisuteksteihin parantaakseen ruudunlukijan navigointia
 */

(function() {
  'use strict';

  // Merkitse käsitellyt elementit välttääkseen duplikaatteja
  const processedElements = new WeakSet();
  const processedArticles = new WeakSet();
  
  /**
   * Tarkistaa, onko elementti julkaisuteksti
   * Perustuu DOM-analyysiin Facebookin rakenteesta
   */
  function isPostText(element) {
    // Tarkista, että elementti sisältää tekstiä
    const text = element.textContent ? element.textContent.trim() : '';
    if (text.length === 0) {
      return false;
    }
    
    // Julkaisutekstin pitää olla vähintään 20 merkkiä pitkä
    // Tämä suodattaa pois tekijänimet ja lyhyet metatiedot
    if (text.length < 20) {
      return false;
    }
    
    // Tarkista CSS-luokat jotka viittaavat julkaisutekstiin
    const classList = element.className || '';
    const hasPostTextClasses = (
      classList.includes('x193iq5w') && 
      classList.includes('xeuugli') &&
      (classList.includes('xo1l8bm') || classList.includes('xzsf02u'))
    );
    
    // Varmista että elementti on article-roolin sisällä
    const isInArticle = element.closest('[role="article"]') !== null;
    
    // Vältä käsittelemästä navigaatio-elementtejä, painikkeita, linkkejä
    const isInteractive = element.closest('button, a, [role="button"], [role="link"]') !== null;
    
    // Vältä h3-elementtien sisältöä (tekijän nimet ovat usein h3:ssa)
    const isInHeading = element.closest('h1, h2, h3, h4, h5, h6') !== null;
    
    // Vältä elementtejä jotka sisältävät ajantietoja
    const hasTimeInfo = text.match(/\d+\s*(min|h|pv|viikko|kuukausi|vuosi|vuotta)/i) !== null;
    const hasShareInfo = text.match(/(jaettu|seuraaville|julkinen|kaverit)/i) !== null;
    
    return hasPostTextClasses && 
           isInArticle && 
           !isInteractive && 
           !isInHeading && 
           !hasTimeInfo && 
           !hasShareInfo;
  }
  
  /**
   * Tarkistaa, onko div-elementti julkaisutekstin container
   * (yksinkertaisempi teksti ilman span-wrapperia)
   */
  function isSimplePostText(element) {
    if (element.tagName !== 'DIV') return false;
    
    const text = element.textContent ? element.textContent.trim() : '';
    if (text.length < 20) return false;
    
    const classList = element.className || '';
    const hasSimpleTextClass = classList.includes('xdj266r') && 
                                classList.includes('x126k92a');
    
    const isInArticle = element.closest('[role="article"]') !== null;
    const isInteractive = element.closest('button, a, [role="button"], [role="link"]') !== null;
    const isInHeading = element.closest('h1, h2, h3, h4, h5, h6') !== null;
    
    // Vältä elementtejä jotka sisältävät metatietoja
    const hasTimeInfo = text.match(/\d+\s*(min|h|pv|viikko|kuukausi|vuosi|vuotta)/i) !== null;
    const hasShareInfo = text.match(/(jaettu|seuraaville|julkinen|kaverit)/i) !== null;
    
    return hasSimpleTextClass && 
           isInArticle && 
           !isInteractive && 
           !isInHeading && 
           !hasTimeInfo && 
           !hasShareInfo;
  }
  
  /**
   * Lisää h5-otsikon tekstielementin eteen
   */
  function addHeaderToText(textElement) {
    // Älä käsittele samaa elementtiä kahdesti
    if (processedElements.has(textElement)) {
      return;
    }
    
    // Hae article-elementti
    const article = textElement.closest('[role="article"]');
    if (!article) {
      return; // Ei article-elementtiä, ei otsikkoa
    }
    
    // Varmista että lisätään vain yksi otsikko per article
    if (processedArticles.has(article)) {
      return; // Tähän articleen on jo lisätty otsikko
    }
    
    // Merkitse käsitellyksi
    processedElements.add(textElement);
    processedArticles.add(article);
    
    // Hae julkaisun varsinainen teksti
    let postText = textElement.textContent.trim();
    
    if (!postText || postText.length === 0) {
      return; // Ei tekstiä, ei otsikkoa
    }
    
    // Poista mahdolliset "Näytä lisää" ja "..." -merkit lopusta
    postText = postText.replace(/\.\.\..*$/, '').trim();
    postText = postText.replace(/Näytä lisää.*$/i, '').trim();
    postText = postText.replace(/….*$/, '').trim();
    
    // Ota ensimmäiset 80 merkkiä (sopiva pituus otsikolle)
    let headingText = postText;
    if (postText.length > 80) {
      headingText = postText.substring(0, 80);
      // Etsi viimeinen kokonainen sana
      const lastSpace = headingText.lastIndexOf(' ');
      if (lastSpace > 40) { // Varmista että jää järkevä määrä tekstiä
        headingText = headingText.substring(0, lastSpace);
      }
      headingText += '...';
    }
    
    // Luo h5-otsikko
    const heading = document.createElement('h5');
    heading.className = 'fb-accessibility-heading';
    heading.textContent = headingText;
    
    // Lisää ARIA-attribuutit
    heading.setAttribute('role', 'heading');
    heading.setAttribute('aria-level', '5');
    
    // Lisää otsikko ennen tekstielementtiä
    textElement.parentNode.insertBefore(heading, textElement);
    
    console.log('Facebook A11y: Lisätty otsikko:', headingText);
  }
  
  /**
   * Käsittele kaikki julkaisutekstit sivulla
   */
  function processAllPosts() {
    // Etsi kaikki mahdolliset tekstielementit
    const textElements = document.querySelectorAll('span, div, strong');
    
    let processedCount = 0;
    
    textElements.forEach(element => {
      if (isPostText(element) || isSimplePostText(element)) {
        addHeaderToText(element);
        processedCount++;
      }
    });
    
    if (processedCount > 0) {
      console.log(`Facebook A11y: Käsitelty ${processedCount} julkaisutekstiä`);
    }
  }
  
  /**
   * MutationObserver seuraa dynaamisia muutoksia
   * (Facebook lataa julkaisuja scrollatessa)
   */
  const observer = new MutationObserver((mutations) => {
    let shouldProcess = false;
    
    for (const mutation of mutations) {
      // Tarkista lisätyt nodet
      if (mutation.addedNodes.length > 0) {
        for (const node of mutation.addedNodes) {
          // Tarkista onko lisätty article-elementti tai sen sisältöä
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.getAttribute('role') === 'article' || 
                node.querySelector('[role="article"]')) {
              shouldProcess = true;
              break;
            }
          }
        }
      }
    }
    
    if (shouldProcess) {
      // Odota hetki että DOM stabiloituu
      setTimeout(processAllPosts, 500);
    }
  });
  
  /**
   * Aloita observointi
   */
  function startObserving() {
    const targetNode = document.body;
    
    if (targetNode) {
      observer.observe(targetNode, {
        childList: true,
        subtree: true
      });
      
      console.log('Facebook A11y: MutationObserver aloitettu');
    }
  }
  
  /**
   * Alusta laajennus
   */
  function init() {
    console.log('Facebook Accessibility Headers: Alustetaan...');
    
    // Käsittele olemassa olevat julkaisut
    processAllPosts();
    
    // Aloita observointi uusia julkaisuja varten
    startObserving();
    
    // Käsittele uudelleen kun käyttäjä scrollaa (varmuuden vuoksi)
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(processAllPosts, 1000);
    }, { passive: true });
    
    console.log('Facebook Accessibility Headers: Valmis!');
  }
  
  // Odota että DOM on valmis
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
})();
