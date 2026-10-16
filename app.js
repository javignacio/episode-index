const grid = document.querySelector('#series-grid');
const dataVersion = '2026-10-15-pokemon-zeo-movies';

function ratingClass(value) {
  if (value >= 9) return 'elite';
  if (value >= 8) return 'great';
  if (value >= 7) return 'good';
  if (value >= 6) return 'mixed';
  if (value >= 5) return 'weak';
  return 'poor';
}

fetch(`data/shows.json?v=${dataVersion}`).then(response => response.json())
  .then(shows => Promise.all(shows.map(show => fetch(`data/${show.id}.json?v=${dataVersion}`).then(r => r.json()))))
  .then(data => {
    document.querySelector('#series-count').textContent = `${data.length} collections`;
    grid.innerHTML = data.map((show, index) => `
      <a class="series-card" style="--accent:${show.accent}" href="show.html?id=${show.id}" aria-label="Explore ${show.name}">
        <img class="series-image" src="assets/${show.id}.jpg" alt="${show.name} artwork">
        <div class="series-card-top">
          <div>
            <span class="series-index">0${index + 1}</span>
            <p class="series-years">${show.years}</p>
            <h3>${show.name}</h3>
          </div>
          <span class="arrow">↗</span>
        </div>
        <div class="series-stats">
          <span><b>${show.seasonCount}</b> ${show.type === 'movies' ? 'sagas' : show.type === 'franchise' ? 'runs' : 'seasons'}</span>
          <span><b>${show.episodeCount}</b> ${show.type === 'movies' ? 'movies' : 'episodes'}</span>
          <span><b>${show.average}</b> avg.</span>
        </div>
      </a>`).join('');
  })
  .catch(() => grid.innerHTML = '<p>Could not load the series data.</p>');

const labels = [['9+', 'elite'], ['8–8.9', 'great'], ['7–7.9', 'good'], ['6–6.9', 'mixed'], ['5–5.9', 'weak'], ['< 5', 'poor']];
document.querySelector('#legend').innerHTML = labels.map(([label, cls]) => `<span><i class="${cls}"></i>${label}</span>`).join('');
