// Korjaus: Muuttaa huonosti toteutetun dropdownin saavutettavaksi comboboxiksi

function korjaaElementti(filterButton) {
  const dropdown = document.querySelector('#dropdown');
  const items = dropdown.querySelectorAll('.item');
  
  // Muutetaan painike comboboxiksi
  filterButton.setAttribute('role', 'combobox');
  filterButton.setAttribute('tabindex', '0');
  filterButton.setAttribute('aria-expanded', 'false');
  filterButton.setAttribute('aria-haspopup', 'listbox');
  filterButton.setAttribute('aria-controls', 'dropdown');
  
  // Muutetaan dropdown listboxiksi
  dropdown.setAttribute('role', 'listbox');
  dropdown.setAttribute('id', 'dropdown');
  
  // Muutetaan vaihtoehdot option-rooleiksi
  items.forEach((item, index) => {
    item.setAttribute('role', 'option');
    item.setAttribute('id', 'option-' + index);
    item.setAttribute('tabindex', '-1');
  });
  
  let avoinna = false;
  let aktiivisenIndeksi = -1;
  
  function avaaDropdown() {
    avoinna = true;
    dropdown.style.display = 'block';
    filterButton.setAttribute('aria-expanded', 'true');
    aktiivisenIndeksi = 0;
    paivitaAktiivinen();
  }
  
  function suljeDropdown() {
    avoinna = false;
    dropdown.style.display = 'none';
    filterButton.setAttribute('aria-expanded', 'false');
    aktiivisenIndeksi = -1;
    items.forEach(item => item.removeAttribute('aria-selected'));
    filterButton.removeAttribute('aria-activedescendant');
  }
  
  function paivitaAktiivinen() {
    items.forEach((item, index) => {
      if (index === aktiivisenIndeksi) {
        item.setAttribute('aria-selected', 'true');
        filterButton.setAttribute('aria-activedescendant', item.id);
      } else {
        item.removeAttribute('aria-selected');
      }
    });
  }
  
  function valitse() {
    if (aktiivisenIndeksi >= 0 && aktiivisenIndeksi < items.length) {
      filterButton.textContent = items[aktiivisenIndeksi].textContent + ' ';
      suljeDropdown();
    }
  }
  
  // Näppäimistökäsittely
  filterButton.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!avoinna) {
          avaaDropdown();
        } else if (aktiivisenIndeksi < items.length - 1) {
          aktiivisenIndeksi++;
          paivitaAktiivinen();
        }
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        if (avoinna && aktiivisenIndeksi > 0) {
          aktiivisenIndeksi--;
          paivitaAktiivinen();
        }
        break;
        
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (avoinna) {
          valitse();
        } else {
          avaaDropdown();
        }
        break;
        
      case 'Escape':
        e.preventDefault();
        suljeDropdown();
        break;
    }
  }, true); // capture-vaihe ohittaa sivuston eston
  
  // Suljetaan kun fokus siirtyy pois
  filterButton.addEventListener('blur', () => {
    setTimeout(suljeDropdown, 100);
  });
}

// MutationObserver tarkkailee DOM:ia
const observer = new MutationObserver((mutations, obs) => {
  const filterButton = document.querySelector('#filterButton');
  if (filterButton) {
    korjaaElementti(filterButton);
    obs.disconnect();
  }
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true
});
