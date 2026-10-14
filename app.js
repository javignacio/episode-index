const shows = ['house', 'the-simpsons', 'once-upon-a-time'];
const grid = document.querySelector('#series-grid');

function ratingClass(value) {
  if (value >= 9) return 'elite';
  if (value >= 8) return 'great';
  if (value >= 7) return 'good';
  if (value >= 6) return 'mixed';
  if (value >= 5) return 'weak';
  return 'poor';
}

function miniGrid(episodes) {
  return episodes.filter(e => e.rating).slice(-52).map(e =>
    `<i class="mini-cell ${ratingClass(e.rating)}" title="S${e.season}E${e.episode}: ${e.rating}"></i>`
  ).join('');
}

Promise.all(shows.map(id => fetch(`data/${id}.json`).then(r => r.json())))
  .then(data => {
    grid.innerHTML = data.map((show, index) => `
      <a class="series-card" style="--accent:${show.accent}" href="show.html?id=${show.id}" aria-label="Explore ${show.name}">
        <div class="series-number">0${index + 1}</div>
        <div class="series-card-top">
          <div>
            <p class="series-years">${show.years}</p>
            <h3>${show.name}</h3>
          </div>
          <span class="arrow">↗</span>
        </div>
        <div class="mini-grid" aria-hidden="true">${miniGrid(show.episodes)}</div>
        <div class="series-stats">
          <span><b>${show.seasonCount}</b> seasons</span>
          <span><b>${show.episodeCount}</b> episodes</span>
          <span><b>${show.average}</b> avg.</span>
        </div>
      </a>`).join('');
  })
  .catch(() => grid.innerHTML = '<p>Could not load the series data.</p>');

const labels = [['9+', 'elite'], ['8–8.9', 'great'], ['7–7.9', 'good'], ['6–6.9', 'mixed'], ['5–5.9', 'weak'], ['< 5', 'poor']];
document.querySelector('#legend').innerHTML = labels.map(([label, cls]) => `<span><i class="${cls}"></i>${label}</span>`).join('');
