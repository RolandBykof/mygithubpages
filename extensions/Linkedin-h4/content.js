/**
 * LinkedIn H4 Navigation
 * Lisää h4-otsikot syötejulkaisuihin ruudunlukijanavigointia varten
 */

(function() {
  'use strict';

  // Merkitään käsitellyt julkaisut data-attribuutilla
  const PROCESSED_ATTR = 'data-h4-nav-processed';

  /**
   * Etsii julkaisijan nimen julkaisuelementistä
   */
  function getAuthorName(postElement) {
    // Ensisijainen: aria-hidden span julkaisijan nimellä
    const authorSpan = postElement.querySelector('.update-components-actor__title span span[aria-hidden="true"]');
    if (authorSpan && authorSpan.textContent.trim()) {
      return authorSpan.textContent.trim();
    }

    // Vaihtoehto: visually-hidden span
    const hiddenSpan = postElement.querySelector('.update-components-actor__title .visually-hidden');
    if (hiddenSpan && hiddenSpan.textContent.trim()) {
      return hiddenSpan.textContent.trim();
    }

    return null;
  }

  /**
   * Etsii julkaisun tekstisisällön alun
   */
  function getPostText(postElement) {
    // Etsitään tekstisisältö update-components-text -elementistä
    const textContainer = postElement.querySelector('.update-components-text .tvm-parent-container > span');
    if (textContainer) {
      // Otetaan vain tekstisisältö, ei lapsi-elementtejä
      let text = '';
      for (const node of textContainer.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          text += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && node.tagName !== 'A') {
          // Ohitetaan linkit, otetaan muu teksti
          if (node.classList.contains('white-space-pre')) {
            text += ' ';
          }
        }
      }
      return text.trim();
    }

    // Vaihtoehto: break-words container
    const breakWords = postElement.querySelector('.break-words.tvm-parent-container > span');
    if (breakWords && breakWords.textContent) {
      return breakWords.textContent.trim();
    }

    return null;
  }

  /**
   * Lyhentää tekstin haluttuun pituuteen
   */
  function truncateText(text, maxLength = 80) {
    if (!text) return '';
    // Poistetaan ylimääräiset välilyönnit ja rivinvaihdot
    text = text.replace(/\s+/g, ' ').trim();
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '…';
  }

  /**
   * Luo h4-otsikon julkaisulle
   */
  function createH4Heading(authorName, postText) {
    const h4 = document.createElement('h4');
    h4.className = 'linkedin-h4-nav-heading';
    
    // Otsikko: "Julkaisija: tekstin alku"
    let headingText = '';
    
    if (authorName) {
      headingText = authorName;
      if (postText) {
        headingText += ': ' + truncateText(postText, 60);
      }
    } else if (postText) {
      headingText = truncateText(postText, 80);
    } else {
      headingText = 'LinkedIn-julkaisu';
    }

    h4.textContent = headingText;
    
    // Tyyli: visuaalisesti piilotettu mutta ruudunlukijalle näkyvä
    h4.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;

    return h4;
  }

  /**
   * Käsittelee yksittäisen julkaisun
   */
  function processPost(postElement) {
    // Ohitetaan jo käsitellyt
    if (postElement.hasAttribute(PROCESSED_ATTR)) {
      return;
    }

    const authorName = getAuthorName(postElement);
    const postText = getPostText(postElement);

    // Luodaan ja lisätään h4-otsikko
    const h4 = createH4Heading(authorName, postText);
    
    // Lisätään julkaisun alkuun
    postElement.style.position = 'relative';
    postElement.insertBefore(h4, postElement.firstChild);
    
    // Merkitään käsitellyksi
    postElement.setAttribute(PROCESSED_ATTR, 'true');
  }

  /**
   * Etsii ja käsittelee kaikki julkaisut
   */
  function processAllPosts() {
    // LinkedIn käyttää feed-shared-update-v2 -luokkaa ja role="article"
    const posts = document.querySelectorAll('.feed-shared-update-v2[role="article"]:not([' + PROCESSED_ATTR + '])');
    
    posts.forEach(post => {
      try {
        processPost(post);
      } catch (error) {
        console.error('LinkedIn H4 Nav: Virhe julkaisun käsittelyssä', error);
      }
    });

    if (posts.length > 0) {
      console.log(`LinkedIn H4 Nav: Käsitelty ${posts.length} julkaisua`);
    }
  }

  /**
   * Seuraa DOM-muutoksia uusien julkaisujen varalta (infinite scroll)
   */
  function observeNewPosts() {
    const observer = new MutationObserver((mutations) => {
      let shouldProcess = false;
      
      for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
          shouldProcess = true;
          break;
        }
      }

      if (shouldProcess) {
        // Pieni viive, jotta LinkedIn ehtii renderöidä sisällön
        setTimeout(processAllPosts, 100);
      }
    });

    // Seurataan koko dokumenttia
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    return observer;
  }

  /**
   * Alustus
   */
  function init() {
    console.log('LinkedIn H4 Nav: Käynnistetään...');
    
    // Käsitellään olemassa olevat julkaisut
    processAllPosts();
    
    // Seurataan uusia julkaisuja
    observeNewPosts();
    
    // Käsitellään myös sivun latautuessa kokonaan
    window.addEventListener('load', () => {
      setTimeout(processAllPosts, 500);
    });

    console.log('LinkedIn H4 Nav: Valmis');
  }

  // Käynnistetään kun DOM on valmis
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
