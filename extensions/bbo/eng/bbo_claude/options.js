chrome.storage.sync.get('anthropicApiKey', function(data) {
    if (data.anthropicApiKey) {
        document.getElementById('apikey').value = data.anthropicApiKey;
    }
});

document.getElementById('save').addEventListener('click', function() {
    var key = document.getElementById('apikey').value.trim();
    chrome.storage.sync.set({ anthropicApiKey: key }, function() {
        var status = document.getElementById('status');
        status.textContent = key ? 'Avain tallennettu!' : 'Avain poistettu.';
    });
});
