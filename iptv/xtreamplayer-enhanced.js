document.getElementById('login-form').addEventListener('submit', function(e) {
  e.preventDefault();

  const server = document.getElementById('server').value.trim();
  const user = document.getElementById('username').value.trim();
  const pass = document.getElementById('password').value.trim();

  const m3uUrl = `${server}/get.php?username=${user}&password=${pass}&type=m3u&output=ts`;

  fetch(m3uUrl)
    .then(response => {
      if (!response.ok) throw new Error("Virhe haettaessa M3U-tiedostoa");
      return response.text();
    })
    .then(data => {
      parseM3U(data);
    })
    .catch(error => {
      document.getElementById('status').textContent = `Virhe: ${error.message}`;
    });
});

const allChannels = [];

function parseM3U(content) {
  const lines = content.split('\n');
  let currentName = "";
  let currentGroup = "";
  let channels = [];

  lines.forEach(line => {
    if (line.startsWith('#EXTINF')) {
      const nameMatch = line.match(/,(.*)$/);
      const groupMatch = line.match(/group-title="([^"]+)"/);
      if (nameMatch) currentName = nameMatch[1];
      if (groupMatch) currentGroup = groupMatch[1];
    } else if (line.startsWith('http')) {
      channels.push({ name: currentName, group: currentGroup, url: line.trim() });
      currentName = "";
      currentGroup = "";
    }
  });

  allChannels.length = 0;
  allChannels.push(...channels);

  displayChannels(allChannels);
  document.getElementById('status').textContent = `Löydettiin ${channels.length} kanavaa`;
}

function displayChannels(channels) {
  const grouped = {};
  channels.forEach(ch => {
    const group = ch.group || "Muut";
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(ch);
  });

  const container = document.getElementById('channel-groups');
  container.innerHTML = "";

  Object.keys(grouped).sort().forEach(group => {
    const groupHeader = document.createElement('h3');
    groupHeader.textContent = group;
    container.appendChild(groupHeader);

    const ul = document.createElement('ul');
    ul.setAttribute('aria-label', `Kanavat ryhmässä ${group}`);
    grouped[group].sort((a, b) => a.name.localeCompare(b.name)).forEach((ch, index) => {
      const li = document.createElement('li');
      li.textContent = ch.name || `Kanava ${index + 1}`;
      li.tabIndex = 0;
      li.setAttribute('role', 'button');
      li.setAttribute('aria-pressed', 'false');

      li.addEventListener('click', () => playChannel(ch.url, ch.name));
      li.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          playChannel(ch.url, ch.name);
        }
      });

      ul.appendChild(li);
    });

    container.appendChild(ul);
  });
}

document.getElementById('search').addEventListener('input', function() {
  const query = this.value.toLowerCase();
  const filtered = allChannels.filter(ch => ch.name.toLowerCase().includes(query));
  displayChannels(filtered);
});

function playChannel(url, name) {
  const player = document.getElementById('player');
  player.src = url;
  player.play();

  document.getElementById('status').textContent = `Toistaa: ${name}`;
}
