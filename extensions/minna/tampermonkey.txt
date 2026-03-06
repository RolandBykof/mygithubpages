// ==UserScript==
// @name         Saavutettavuuskorjaus – Select2 & ui-select
// @namespace    https://palautekasittely.hel.fi
// @version      1.0
// @description  Korjaa Select2-pudotusvalikot ja AngularJS ui-select-komponentit ruudunlukijalle saavutettaviksi. Tarkkailee sivua automaattisesti ja korjaa uudet elementit heti kun ne ilmestyvät.
// @author       Ville Lamminen (digitalisaatioasiantuntija) & Claude (AI)
// @match        https://palautekasittely.hel.fi/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  // ==========================================================================
  // Apufunktiot: status-ilmoitukset ruudunlukijalle
  // ==========================================================================

  let statusEl = null;

  function createStatusRegion() {
    if (statusEl) return;
    statusEl = document.createElement('div');
    statusEl.setAttribute('role', 'status');
    statusEl.setAttribute('aria-live', 'polite');
    statusEl.setAttribute('aria-atomic', 'true');
    statusEl.style.cssText =
      'position:fixed;top:10px;left:50%;transform:translateX(-50%);' +
      'background:#333;color:#fff;padding:12px 20px;z-index:9999999;' +
      'border-radius:5px;font-size:16px;pointer-events:none;opacity:0;transition:opacity .3s;';
    document.body.appendChild(statusEl);
  }

  function showStatus(msg, duration) {
    if (!statusEl) createStatusRegion();
    statusEl.textContent = msg;
    statusEl.style.opacity = '1';
    if (duration) {
      setTimeout(function () {
        statusEl.style.opacity = '0';
      }, duration);
    }
  }

  // ==========================================================================
  // OSA 1: Select2-pudotusvalikoiden korvaus saavutettavilla painikkeilla
  // ==========================================================================

  function findNativeSelect(el, doc) {
    var container = el.closest('.select2-container, .select2');
    if (!container) return null;

    var prev = container.previousElementSibling;
    if (prev && prev.tagName === 'SELECT') return prev;

    var sid = container.getAttribute('data-select2-id');
    if (sid) {
      var sel = doc.querySelector('select[data-select2-id="' + sid + '"]');
      if (sel) return sel;
    }

    var parent = container.parentElement;
    if (parent) {
      var sel2 = parent.querySelector('select');
      if (sel2) return sel2;
    }
    return null;
  }

  function findLabel(el, doc) {
    var nativeSel = findNativeSelect(el, doc);
    if (nativeSel && nativeSel.id) {
      var lbl = doc.querySelector('label[for="' + nativeSel.id + '"]');
      if (lbl) return lbl.textContent.trim();
    }
    var group = el.closest(
      '.xbl-component, .xforms-group, .form-group, fieldset, .xforms-select1'
    );
    if (group) {
      var lbl2 = group.querySelector('label, legend, .xforms-label');
      if (lbl2) return lbl2.textContent.trim();
    }
    return '';
  }

  function buildAccessibleSelect2(rendered, doc, win) {
    var selection = rendered.closest('.select2-selection') || rendered;
    var s2container = rendered.closest('.select2-container, .select2');
    var nativeSelect = findNativeSelect(rendered, doc);
    var label = findLabel(rendered, doc);
    var currentText =
      rendered.textContent.replace(/^[\s×]+/, '').trim() || 'Ei valittu';

    // Wrapper
    var wrapper = doc.createElement('div');
    wrapper.className = 'a11y-select2-wrapper';
    wrapper.style.cssText =
      'position:relative;display:inline-block;width:100%;margin:2px 0;';

    // Painike
    var btn = doc.createElement('button');
    btn.type = 'button';
    btn.className = 'a11y-select2-btn';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute(
      'aria-label',
      (label ? label + ': ' : '') +
        currentText +
        '. Paina Enter avataksesi valikon.'
    );
    btn.textContent = (label ? label + ': ' : '') + currentText;
    btn.style.cssText =
      'display:block;width:100%;padding:8px 12px;font-size:15px;text-align:left;' +
      'background:#fff;border:2px solid #555;border-radius:4px;cursor:pointer;' +
      'color:#000;min-height:40px;';
    wrapper.appendChild(btn);

    // Paneeli
    var panel = doc.createElement('div');
    panel.className = 'a11y-select2-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', (label || 'Valikko') + ' – haku');
    panel.style.cssText =
      'display:none;position:absolute;top:100%;left:0;right:0;background:#fff;' +
      'border:2px solid #333;border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,0.3);' +
      'z-index:999999;max-height:400px;';
    wrapper.appendChild(panel);

    // Hakukenttä
    var search = doc.createElement('input');
    search.type = 'text';
    search.className = 'a11y-select2-search';
    search.setAttribute('role', 'combobox');
    search.setAttribute(
      'aria-label',
      (label || 'Valikko') +
        ' – Kirjoita hakusana ja paina Enter, tai paina Enter näyttääksesi kaikki vaihtoehdot'
    );
    search.setAttribute('aria-expanded', 'false');
    search.setAttribute('aria-autocomplete', 'list');
    search.setAttribute('autocomplete', 'off');
    search.style.cssText =
      'display:block;width:calc(100% - 16px);margin:8px;padding:8px;font-size:15px;' +
      'border:2px solid #555;border-radius:4px;box-sizing:border-box;';
    panel.appendChild(search);

    // Ohje
    var help = doc.createElement('div');
    help.textContent =
      'Kirjoita hakusana ja paina Enter suodattaaksesi, tai paina Enter suoraan näyttääksesi kaikki. ' +
      'Nuolinäppäimillä selaat, Enterillä valitset, Escapella suljet.';
    help.style.cssText =
      'padding:4px 12px;font-size:13px;color:#555;font-style:italic;';
    help.setAttribute('aria-hidden', 'true');
    panel.appendChild(help);

    // Listbox
    var listboxId =
      'a11y-listbox-' + Math.random().toString(36).substr(2, 9);
    var listbox = doc.createElement('ul');
    listbox.id = listboxId;
    listbox.setAttribute('role', 'listbox');
    listbox.setAttribute(
      'aria-label',
      (label || 'Valikko') + ' – vaihtoehdot'
    );
    listbox.style.cssText =
      'list-style:none;margin:0;padding:0;max-height:300px;overflow-y:auto;';
    panel.appendChild(listbox);

    // Live-region
    var liveRegion = doc.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText =
      'position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;';
    wrapper.appendChild(liveRegion);

    search.setAttribute('aria-controls', listboxId);

    // Tila
    var state = {
      options: [],
      filteredOptions: [],
      activeIndex: -1,
      isOpen: false,
      optionsLoaded: false,
    };

    function announce(msg) {
      liveRegion.textContent = '';
      setTimeout(function () {
        liveRegion.textContent = msg;
      }, 100);
    }

    function parseNativeOptions(sel) {
      if (!sel) return [];
      var opts = [];
      var groups = sel.querySelectorAll('optgroup');
      if (groups.length > 0) {
        groups.forEach(function (g) {
          var glabel = g.getAttribute('label') || '';
          if (glabel) opts.push({ value: '__group__', text: glabel, level: 0, isGroup: true });
          g.querySelectorAll('option').forEach(function (o) {
            if (o.textContent.trim() && o.value !== '')
              opts.push({ value: o.value, text: o.textContent.trim(), level: 1 });
          });
        });
      } else {
        sel.querySelectorAll('option').forEach(function (o) {
          var txt = o.textContent.trim();
          if (txt && o.value !== '') opts.push({ value: o.value, text: txt, level: 0 });
        });
      }
      return opts;
    }

    function loadOptions(callback) {
      if (state.optionsLoaded && state.options.length > 0) {
        callback(state.options);
        return;
      }
      if (nativeSelect) {
        var parsed = parseNativeOptions(nativeSelect);
        if (parsed.length > 0) {
          state.options = parsed;
          state.optionsLoaded = true;
          callback(parsed);
          return;
        }
      }
      // Avataan Select2 ohjelmallisesti ja luetaan vaihtoehdot
      var target = rendered.closest('.select2-selection') || rendered;
      target.dispatchEvent(
        new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: win })
      );
      target.dispatchEvent(
        new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: win })
      );
      setTimeout(function () {
        var opts = [];
        doc.querySelectorAll('.select2-results__option').forEach(function (o) {
          var txt = o.textContent.trim();
          if (txt)
            opts.push({
              value: o.getAttribute('data-select2-id') || txt,
              text: txt,
              level: 0,
            });
        });
        // Suljetaan alkuperäinen
        var esc = new KeyboardEvent('keydown', {
          key: 'Escape',
          keyCode: 27,
          bubbles: true,
        });
        doc.dispatchEvent(esc);
        var sf = doc.querySelector('.select2-search__field');
        if (sf) sf.dispatchEvent(esc);
        if (opts.length > 0) {
          state.options = opts;
          state.optionsLoaded = true;
        }
        callback(opts);
      }, 600);
    }

    function setActive(idx) {
      var prev = listbox.querySelector('[data-a11y-active="true"]');
      if (prev) {
        prev.style.backgroundColor = '#fff';
        prev.style.color = '#000';
        prev.setAttribute('aria-selected', 'false');
        prev.removeAttribute('data-a11y-active');
      }
      if (state.filteredOptions[idx] && state.filteredOptions[idx].isGroup) return;
      state.activeIndex = idx;
      var el = listbox.querySelector('#' + listboxId + '-opt-' + idx);
      if (el) {
        el.style.backgroundColor = '#0060df';
        el.style.color = '#fff';
        el.setAttribute('aria-selected', 'true');
        el.setAttribute('data-a11y-active', 'true');
        search.setAttribute('aria-activedescendant', el.id);
        el.scrollIntoView({ block: 'nearest' });
        announce(el.textContent.trim());
      }
    }

    function moveActive(dir) {
      var idx = state.activeIndex;
      var len = state.filteredOptions.length;
      if (len === 0) return;
      do {
        idx += dir;
        if (idx < 0) idx = len - 1;
        if (idx >= len) idx = 0;
        if (!state.filteredOptions[idx].isGroup) break;
      } while (idx !== state.activeIndex);
      setActive(idx);
    }

    function selectOption(idx) {
      var opt = state.filteredOptions[idx];
      if (!opt || opt.isGroup) return;
      if (nativeSelect) {
        nativeSelect.value = opt.value;
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          if (win.jQuery) win.jQuery(nativeSelect).val(opt.value).trigger('change');
        } catch (e) {}
      }
      btn.textContent = (label ? label + ': ' : '') + opt.text;
      btn.setAttribute(
        'aria-label',
        (label ? label + ': ' : '') + opt.text + '. Paina Enter avataksesi valikon.'
      );
      closePanel();
      announce('Valittu: ' + opt.text);
      btn.focus();
    }

    function renderOptions(opts) {
      listbox.innerHTML = '';
      state.filteredOptions = opts;
      state.activeIndex = -1;
      if (opts.length === 0) {
        var li = doc.createElement('li');
        li.setAttribute('role', 'option');
        li.setAttribute('aria-disabled', 'true');
        li.textContent = 'Ei vaihtoehtoja';
        li.style.cssText = 'padding:8px 12px;color:#999;font-style:italic;';
        listbox.appendChild(li);
        announce('Ei vaihtoehtoja.');
        return;
      }
      opts.forEach(function (opt, i) {
        var li = doc.createElement('li');
        li.id = listboxId + '-opt-' + i;
        if (opt.isGroup) {
          li.setAttribute('role', 'presentation');
          li.textContent = opt.text;
          li.style.cssText =
            'padding:6px 12px;font-weight:bold;background:#f0f0f0;color:#333;' +
            'font-size:14px;border-top:1px solid #ddd;';
        } else {
          li.setAttribute('role', 'option');
          li.setAttribute('aria-selected', 'false');
          li.setAttribute('data-value', opt.value);
          li.textContent = (opt.level > 0 ? '    ' : '') + opt.text;
          li.style.cssText =
            'padding:8px ' +
            (opt.level > 0 ? '24px' : '12px') +
            ';cursor:pointer;font-size:15px;color:#000;border-bottom:1px solid #eee;';
          li.addEventListener('mouseover', function () {
            setActive(i);
          });
          li.addEventListener('click', function (e) {
            e.preventDefault();
            selectOption(i);
          });
        }
        listbox.appendChild(li);
      });
      search.setAttribute('aria-expanded', 'true');
      announce(
        opts.filter(function (o) {
          return !o.isGroup;
        }).length + ' vaihtoehtoa. Selaa nuolinäppäimillä.'
      );
    }

    function openPanel() {
      panel.style.display = 'block';
      btn.setAttribute('aria-expanded', 'true');
      state.isOpen = true;
      search.value = '';
      listbox.innerHTML = '';
      search.setAttribute('aria-expanded', 'false');
      search.removeAttribute('aria-activedescendant');
      search.focus();
      announce(
        'Valikko avattu. ' +
          (label || '') +
          '. Kirjoita hakusana ja paina Enter, tai paina Enter näyttääksesi kaikki vaihtoehdot.'
      );
    }

    function closePanel() {
      panel.style.display = 'none';
      btn.setAttribute('aria-expanded', 'false');
      search.setAttribute('aria-expanded', 'false');
      search.removeAttribute('aria-activedescendant');
      state.isOpen = false;
      state.activeIndex = -1;
    }

    // Tapahtumakuuntelijat
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      state.isOpen ? closePanel() : openPanel();
    });

    btn.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        state.isOpen ? closePanel() : openPanel();
      }
    });

    search.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closePanel();
        btn.focus();
        announce('Valikko suljettu.');
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (state.filteredOptions.length > 0) moveActive(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (state.filteredOptions.length > 0) moveActive(-1);
        return;
      }
      if (e.key === 'Tab') {
        closePanel();
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        if (state.activeIndex >= 0 && state.filteredOptions.length > 0) {
          selectOption(state.activeIndex);
        } else {
          var query = search.value.trim().toLowerCase();
          announce('Haetaan vaihtoehtoja...');
          loadOptions(function (allOpts) {
            var filtered;
            if (query === '') {
              filtered = allOpts;
            } else {
              filtered = allOpts.filter(function (o) {
                return o.text.toLowerCase().indexOf(query) !== -1 || o.isGroup;
              });
              // Poistetaan tyhjät ryhmäotsikot
              filtered = filtered.filter(function (o, i, arr) {
                if (!o.isGroup) return true;
                for (var j = i + 1; j < arr.length; j++) return !arr[j].isGroup;
                return false;
              });
            }
            renderOptions(filtered);
            if (filtered.length > 0) {
              for (var k = 0; k < filtered.length; k++) {
                if (!filtered[k].isGroup) {
                  setActive(k);
                  break;
                }
              }
            }
          });
        }
      }
    });

    // Sijoitetaan sivulle
    if (s2container && s2container.parentNode) {
      s2container.parentNode.insertBefore(wrapper, s2container);
      s2container.style.display = 'none';
      s2container.setAttribute('aria-hidden', 'true');
    } else if (selection.parentNode) {
      selection.parentNode.insertBefore(wrapper, selection);
      selection.style.display = 'none';
    }

    return wrapper;
  }

  function processSelect2InDoc(doc, win) {
    var items = doc.querySelectorAll(
      '.select2-selection__rendered:not([data-a11y-fixed="true"])'
    );
    var count = 0;
    items.forEach(function (el) {
      el.setAttribute('data-a11y-fixed', 'true');
      buildAccessibleSelect2(el, doc, win);
      count++;
    });
    return count;
  }

  // ==========================================================================
  // OSA 2: AngularJS ui-select ARIA-korjaukset
  // ==========================================================================

  function processUiSelect(doc) {
    var containers = doc.querySelectorAll(
      '.ui-select-container:not([data-a11y-uiselect-fixed="true"])'
    );
    var count = 0;

    containers.forEach(function (container) {
      container.setAttribute('data-a11y-uiselect-fixed', 'true');
      var input = container.querySelector('input.ui-select-search');
      var listbox = container.querySelector('ul.ui-select-choices');

      if (!input || !listbox) return;

      if (!input.getAttribute('aria-autocomplete')) {
        input.setAttribute('aria-autocomplete', 'list');
      }

      var updateAria = function () {
        var activeRow = container.querySelector('.ui-select-choices-row.active');
        var allRows = container.querySelectorAll('.ui-select-choices-row');

        allRows.forEach(function (row) {
          if (!row.id) {
            row.id = 'a11y-uisel-' + Math.random().toString(36).substr(2, 9);
          }
          row.setAttribute(
            'aria-selected',
            row === activeRow ? 'true' : 'false'
          );
          if (row.getAttribute('role') !== 'option') {
            row.setAttribute('role', 'option');
          }
        });

        if (activeRow) {
          input.setAttribute('aria-activedescendant', activeRow.id);
          input.setAttribute('aria-expanded', 'true');
        }
      };

      var observer = new MutationObserver(function () {
        updateAria();
      });

      observer.observe(container, {
        attributes: true,
        childList: true,
        subtree: true,
        attributeFilter: ['class'],
      });

      updateAria();
      count++;
    });

    return count;
  }

  // ==========================================================================
  // OSA 3: Automaattinen tarkkailu – MutationObserver
  // ==========================================================================

  function scanAll() {
    var s2count = processSelect2InDoc(document, window);
    var uiCount = processUiSelect(document);

    // Tarkistetaan myös iframet
    document.querySelectorAll('iframe').forEach(function (iframe) {
      try {
        var iDoc = iframe.contentDocument || iframe.contentWindow.document;
        var iWin = iframe.contentWindow;
        if (iDoc) {
          s2count += processSelect2InDoc(iDoc, iWin);
          uiCount += processUiSelect(iDoc);
        }
      } catch (e) {
        // Cross-origin iframe, ohitetaan
      }
    });

    return { select2: s2count, uiSelect: uiCount };
  }

  // Ensimmäinen skannaus
  createStatusRegion();
  showStatus('Etsitään pudotusvalikkoja…', 2000);

  var initialResult = scanAll();
  var totalInitial = initialResult.select2 + initialResult.uiSelect;

  if (totalInitial > 0) {
    showStatus(
      totalInitial +
        ' valikkoa korjattu (' +
        initialResult.select2 +
        ' Select2, ' +
        initialResult.uiSelect +
        ' ui-select)',
      4000
    );
    console.log(
      '[Saavutettavuuskorjaus] Alkuskannaus: ' +
        initialResult.select2 +
        ' Select2, ' +
        initialResult.uiSelect +
        ' ui-select'
    );
  }

  // Jatkuva tarkkailu
  var scanTimer = null;

  function debouncedScan() {
    if (scanTimer) clearTimeout(scanTimer);
    scanTimer = setTimeout(function () {
      var result = scanAll();
      var total = result.select2 + result.uiSelect;
      if (total > 0) {
        showStatus(total + ' uutta valikkoa korjattu!', 3000);
        console.log(
          '[Saavutettavuuskorjaus] Uudet korjaukset: ' +
            result.select2 +
            ' Select2, ' +
            result.uiSelect +
            ' ui-select'
        );
      }
    }, 500);
  }

  var mainObserver = new MutationObserver(function (mutations) {
    var dominated = false;
    for (var i = 0; i < mutations.length; i++) {
      if (mutations[i].addedNodes.length > 0) {
        dominated = true;
        break;
      }
    }
    if (dominated) debouncedScan();
  });

  mainObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Tarkkaillaan myös iframeja jotka lisätään myöhemmin
  var iframeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (m) {
      m.addedNodes.forEach(function (node) {
        if (node.tagName === 'IFRAME') {
          node.addEventListener('load', function () {
            try {
              var iDoc = node.contentDocument || node.contentWindow.document;
              if (iDoc) {
                var iObserver = new MutationObserver(function () {
                  debouncedScan();
                });
                iObserver.observe(iDoc.body, { childList: true, subtree: true });
                debouncedScan();
              }
            } catch (e) {}
          });
        }
      });
    });
  });

  iframeObserver.observe(document.body, { childList: true, subtree: true });

  console.log('[Saavutettavuuskorjaus] Skripti aktiivinen – tarkkailu käynnissä.');
})();
