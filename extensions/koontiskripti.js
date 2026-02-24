const elementData = {
    tag: $0.tagName,
    classes: [...$0.classList],
    text: $0.innerText.substring(0, 100),
    rect: $0.getBoundingClientRect(),
    styles: {
        zIndex: window.getComputedStyle($0).zIndex,
        position: window.getComputedStyle($0).position
    }
};

// Lataa JSON-tiedostona
const blob = new Blob([JSON.stringify(elementData, null, 2)], {type : 'application/json'});
const url = URL.createObjectURL(blob);
const link = document.createElement('a');
link.href = url;
link.download = 'elementti_analyysi.json';
link.click();