const params = new URLSearchParams(location.search);
const id = params.get('id') || 'house';
const main = document.querySelector('#show-main');
const dialog = document.querySelector('#episode-dialog');

function ratingClass(value) {
  if (!value) return 'unrated';
  if (value >= 9) return 'elite';
  if (value >= 8) return 'great';
  if (value >= 7) return 'good';
  if (value >= 6) return 'mixed';
  if (value >= 5) return 'weak';
  return 'poor';
}

function formatVotes(value) {
  return value >= 1000 ? `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k votes` : `${value.toLocaleString()} votes`;
}

function openEpisode(episode) {
  const rating = document.querySelector('#dialog-rating');
  rating.className = `dialog-rating ${ratingClass(episode.rating)}`;
  rating.textContent = episode.rating?.toFixed(1) ?? '—';
  document.querySelector('#dialog-code').textContent = `Season ${episode.season} · Episode ${episode.episode}`;
  document.querySelector('#dialog-title').textContent = episode.title || 'Untitled episode';
  document.querySelector('#dialog-summary').textContent = episode.summary || 'A quick summary is not available for this episode yet.';
  document.querySelector('#dialog-meta').textContent = episode.rating ? `IMDb rating · ${formatVotes(episode.votes)}` : 'Not yet rated on IMDb';
  document.querySelector('#dialog-link').href = `https://www.imdb.com/title/${episode.imdbId}/`;
  dialog.showModal();
}

function render(show) {
  document.title = `${show.name} ratings — Episode Index`;
  const seasons = new Map();
  show.episodes.forEach(ep => {
    if (!seasons.has(ep.season)) seasons.set(ep.season, []);
    seasons.get(ep.season).push(ep);
  });
  const maxEpisodes = Math.max(...[...seasons.values()].map(items => Math.max(...items.map(ep => ep.episode))));

  main.innerHTML = `
    <section class="show-hero" style="--accent:${show.accent}">
      <div>
        <p class="eyebrow">${show.years} · ${show.seasonCount} seasons</p>
        <h1>${show.name}</h1>
        <p>Click any rating to meet the episode behind the number.</p>
      </div>
      <div class="show-highlights">
        <div><span>Series average</span><b>${show.average}</b></div>
        <div><span>Highest rated</span><b>${show.best.rating}</b><small>S${show.best.season} E${show.best.episode}</small></div>
      </div>
    </section>
    <section class="matrix-section">
      <div class="matrix-tools">
        <h2>Episode map</h2>
        <div class="compact-legend"><i class="poor"></i><span>Lower</span><span class="gradient"></span><span>Higher</span><i class="elite"></i></div>
      </div>
      <div class="matrix-scroll">
        <div class="rating-matrix" style="--columns:${maxEpisodes}">
          <div class="matrix-corner">SEASON</div>
          ${Array.from({length:maxEpisodes}, (_, i) => `<div class="episode-label">E${i + 1}</div>`).join('')}
          ${[...seasons].map(([season, episodes]) => {
            const byNumber = new Map(episodes.map(ep => [ep.episode, ep]));
            return `<div class="season-label">S${season}</div>` + Array.from({length:maxEpisodes}, (_, i) => {
              const ep = byNumber.get(i + 1);
              return ep ? `<button class="rating-cell ${ratingClass(ep.rating)}" data-id="${ep.imdbId}" aria-label="Season ${season}, episode ${ep.episode}, ${ep.title}, rated ${ep.rating ?? 'unrated'}">${ep.rating?.toFixed(1) ?? '—'}</button>` : '<span class="empty-cell"></span>';
            }).join('');
          }).join('')}
        </div>
      </div>
      <p class="scroll-note">Swipe horizontally to explore every episode →</p>
    </section>`;

  const lookup = new Map(show.episodes.map(ep => [ep.imdbId, ep]));
  document.querySelectorAll('.rating-cell').forEach(button => button.addEventListener('click', () => openEpisode(lookup.get(button.dataset.id))));
}

fetch(`data/${id}.json`)
  .then(response => { if (!response.ok) throw new Error(); return response.json(); })
  .then(render)
  .catch(() => main.innerHTML = '<div class="loading">Series not found. <a href="index.html">Return home</a></div>');

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
