const params = new URLSearchParams(location.search);
const id = params.get('id') || 'house';
const main = document.querySelector('#show-main');
const dialog = document.querySelector('#episode-dialog');
const searchDialog = document.querySelector('#search-dialog');
const disneyExclusives = new Set(["O C'mon All Ye Faithful", 'The Past and the Furious', 'Yellow Planet', 'Extreme Makeover: Homer Edition', 'Simpsley', 'Yellow Mirror']);
let episodeOrder = [];
let activeEpisodeIndex = -1;

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
  activeEpisodeIndex = episodeOrder.findIndex(item => item.imdbId === episode.imdbId);
  const rating = document.querySelector('#dialog-rating');
  rating.className = `dialog-rating ${ratingClass(episode.rating)}`;
  rating.textContent = episode.rating?.toFixed(1) ?? '—';
  document.querySelector('#dialog-code').textContent = episode.collection
    ? `${episode.collection} · S${episode.season} E${episode.episode}`
    : `Season ${episode.season} · Episode ${episode.episode}`;
  document.querySelector('#dialog-title').textContent = episode.title || 'Untitled episode';
  document.querySelector('#dialog-summary').textContent = episode.summary || 'A quick summary is not available for this episode yet.';
  document.querySelector('#dialog-meta').textContent = `${episode.rating ? `IMDb rating · ${formatVotes(episode.votes)}` : 'Not yet rated on IMDb'}${disneyExclusives.has(episode.title) ? ' · Disney+ exclusive' : ''}`;
  document.querySelector('#dialog-link').href = `https://www.imdb.com/title/${episode.imdbId}/`;
  document.querySelector('#episode-prev').disabled = activeEpisodeIndex <= 0;
  document.querySelector('#episode-next').disabled = activeEpisodeIndex >= episodeOrder.length - 1;
  dialog.showModal();
}

function episodeCode(episode) {
  return episode.collection
    ? `${episode.collection} · S${episode.season} E${episode.episode}`
    : `Season ${episode.season} · Episode ${episode.episode}`;
}

function searchEpisodes(query) {
  const needle = query.trim().toLocaleLowerCase();
  const results = needle
    ? episodeOrder.filter(episode => episode.title?.toLocaleLowerCase().includes(needle))
    : [];
  const resultsContainer = document.querySelector('#search-results');
  document.querySelector('#search-results-title').textContent = results.length
    ? `${results.length} ${results.length === 1 ? 'result' : 'results'} for “${query.trim()}”`
    : `No results for “${query.trim()}”`;
  resultsContainer.innerHTML = results.length
    ? results.map(episode => `<button class="search-result" data-id="${episode.imdbId}"><span>${episode.title}</span><small>${episodeCode(episode)}</small></button>`).join('')
    : '<p class="search-empty">No episode titles matched that search.</p>';
  resultsContainer.querySelectorAll('.search-result').forEach(button => button.addEventListener('click', () => {
    const episode = episodeOrder.find(item => item.imdbId === button.dataset.id);
    searchDialog.close();
    openEpisode(episode);
  }));
  searchDialog.showModal();
}

function matrixMarkup(episodes, label = 'Season') {
  const seasons = new Map();
  episodes.forEach(ep => {
    if (!seasons.has(ep.season)) seasons.set(ep.season, []);
    seasons.get(ep.season).push(ep);
  });
  const maxEpisodes = Math.max(...[...seasons.values()].map(items => Math.max(...items.map(ep => ep.episode))));
  return `<div class="matrix-scroll"><div class="rating-matrix" style="--columns:${maxEpisodes}">
    <div class="matrix-corner">${label}</div>
    ${Array.from({length:maxEpisodes}, (_, i) => `<div class="episode-label">${label === 'Season' ? 'E' : '#'}${i + 1}</div>`).join('')}
    ${[...seasons].map(([season, items]) => {
      const byNumber = new Map(items.map(ep => [ep.episode, ep]));
      return `<div class="season-label">${label === 'Season' ? 'S' : 'Y'}${season}</div>` + Array.from({length:maxEpisodes}, (_, i) => {
        const ep = byNumber.get(i + 1);
        return ep ? `<button class="rating-cell ${ratingClass(ep.rating)}" data-id="${ep.imdbId}" aria-label="${label} ${season}, episode ${ep.episode}, ${ep.title}, rated ${ep.rating ?? 'unrated'}">${ep.rating?.toFixed(1) ?? '—'}</button>` : '<span class="empty-cell"></span>';
      }).join('');
    }).join('')}
  </div></div>`;
}

function render(show) {
  document.title = `${show.name} — TV Episode Ratings`;
  const extraEpisodes = (show.extras || []).flatMap(extra => extra.episodes.map(ep => ({...ep, collection: extra.name})));
  episodeOrder = [...show.episodes, ...extraEpisodes];

  main.innerHTML = `
    <section class="show-hero" style="--accent:${show.accent}">
      <div class="show-identity">
        <img src="assets/${show.id}.jpg" alt="${show.name} artwork">
        <div><p class="eyebrow">${show.years} · ${show.seasonCount} seasons</p>
        <h1>${show.name}</h1></div>
      </div>
      <div class="show-highlights">
        <div><span>Series average</span><small aria-hidden="true">&nbsp;</small><b>${show.average}</b></div>
        <button class="highlight-best" data-id="${show.episodes.find(ep => ep.season === show.best.season && ep.episode === show.best.episode)?.imdbId}"><span>Highest rated</span><small>S${show.best.season} E${show.best.episode} · View episode</small><b>${show.best.rating}</b></button>
      </div>
    </section>
    <section class="matrix-section">
      <div class="matrix-tools">
        <h2>Episode map</h2>
        <div class="matrix-actions">
          <form class="episode-search" role="search">
            <label class="sr-only" for="episode-search-input">Search episode titles</label>
            <input id="episode-search-input" type="search" placeholder="Search episode name" autocomplete="off" required>
            <button type="submit" aria-label="Search episodes">Search</button>
          </form>
          <div class="compact-legend"><i class="poor"></i><span>Lower</span><span class="gradient"></span><span>Higher</span><i class="elite"></i></div>
        </div>
      </div>
      ${matrixMarkup(show.episodes)}
      <p class="scroll-note">Swipe horizontally to explore every episode →</p>
      ${show.id === 'the-simpsons' ? `<p class="data-note">IMDb currently has titled entries through season 38. Placeholder entries for the already-announced seasons 39–40 are excluded. Full-length Disney+ exclusives are included in their season rows and identified in episode details; promotional shorts are not counted.</p>` : ''}
    </section>
    ${(show.extras || []).filter(extra => extra.episodes.length).map(extra => `<section class="extras-section"><div class="matrix-tools"><div><p class="eyebrow">Related run · ${extra.years}</p><h2>${extra.name}</h2><p class="extras-copy">Shown separately from the main series, with IMDb ratings where available.</p></div></div>${matrixMarkup(extra.episodes)}</section>`).join('')}`;

  const lookup = new Map(episodeOrder.map(ep => [ep.imdbId, ep]));
  document.querySelectorAll('.rating-cell').forEach(button => button.addEventListener('click', () => openEpisode(lookup.get(button.dataset.id))));
  document.querySelector('.highlight-best').addEventListener('click', event => openEpisode(lookup.get(event.currentTarget.dataset.id)));
  document.querySelector('.episode-search').addEventListener('submit', event => {
    event.preventDefault();
    searchEpisodes(document.querySelector('#episode-search-input').value);
  });
}

fetch(`data/${id}.json`)
  .then(response => { if (!response.ok) throw new Error(); return response.json(); })
  .then(render)
  .catch(() => main.innerHTML = '<div class="loading">Series not found. <a href="index.html">Return home</a></div>');

document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('#episode-prev').addEventListener('click', () => activeEpisodeIndex > 0 && openEpisode(episodeOrder[activeEpisodeIndex - 1]));
document.querySelector('#episode-next').addEventListener('click', () => activeEpisodeIndex < episodeOrder.length - 1 && openEpisode(episodeOrder[activeEpisodeIndex + 1]));
document.addEventListener('keydown', event => {
  if (!dialog.open) return;
  if (event.key === 'ArrowLeft' && activeEpisodeIndex > 0) openEpisode(episodeOrder[activeEpisodeIndex - 1]);
  if (event.key === 'ArrowRight' && activeEpisodeIndex < episodeOrder.length - 1) openEpisode(episodeOrder[activeEpisodeIndex + 1]);
});
dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
document.querySelector('.search-dialog-close').addEventListener('click', () => searchDialog.close());
searchDialog.addEventListener('click', event => { if (event.target === searchDialog) searchDialog.close(); });
