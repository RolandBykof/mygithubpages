// BBO Screen Reader Support – background service worker

var BRIDGE_SYSTEM_PROMPT =
    'You are an expert bridge player and teacher with decades of experience. ' +
    'You play Standard American (SAYC) with 5-card majors, strong 1NT (15-17 HCP), ' +
    'Stayman, Jacoby transfers, and standard slam conventions. ' +
    'When asked for a bidding recommendation, you must: ' +
    '1) Count HCP accurately. ' +
    '2) Consider the auction context carefully (seat, vulnerability, previous bids). ' +
    '3) State your recommended bid clearly on the first line. ' +
    '4) Give a concise but accurate justification in 2-3 sentences. ' +
    'Respond in the same language as the user\'s message.';

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    if (message.action === 'openHelp') {
        chrome.tabs.create({ url: chrome.runtime.getURL('userguide.html') });
        return;
    }

    if (message.action === 'askAI') {
        chrome.storage.sync.get('anthropicApiKey', function(data) {
            var apiKey = data.anthropicApiKey;
            if (!apiKey) {
                sendResponse({ error: 'API-avain puuttuu. Aseta se laajennuksen asetuksissa.' });
                return;
            }

            fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': apiKey,
                    'anthropic-version': '2023-06-01',
                    'anthropic-dangerous-direct-browser-access': 'true'
                },
                body: JSON.stringify({
                    model: 'claude-sonnet-4-6',
                    max_tokens: 400,
                    system: BRIDGE_SYSTEM_PROMPT,
                    messages: [{ role: 'user', content: message.prompt }]
                })
            })
            .then(function(res) { return res.json(); })
            .then(function(data) {
                if (data.type === 'error' && data.error) {
                    sendResponse({ error: data.error.type + ': ' + data.error.message });
                    return;
                }
                if (data.content && data.content[0] && data.content[0].text) {
                    sendResponse({ result: data.content[0].text });
                    return;
                }
                sendResponse({ error: 'Tuntematon vastausrakenne: ' + JSON.stringify(data).substring(0, 200) });
            })
            .catch(function(err) {
                sendResponse({ error: 'Verkkovirhe: ' + err.message });
            });
        });

        return true; // Pidä viestikanava auki asynkronista vastausta varten
    }
});
