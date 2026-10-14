import { createReadStream, createWriteStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createGunzip } from 'node:zlib';
import { createInterface } from 'node:readline';
import { pipeline } from 'node:stream/promises';

const root = new URL('../', import.meta.url);
const cache = new URL('.cache/', root);
const dataDir = new URL('data/', root);
mkdirSync(cache, { recursive: true });
mkdirSync(dataDir, { recursive: true });

const shows = [
  { id: 'house', imdbId: 'tt0412142', tvmazeId: 118, name: 'House MD', years: '2004–2012', accent: '#70dfad' },
  { id: 'the-simpsons', imdbId: 'tt0096697', tvmazeId: 83, name: 'The Simpsons', years: '1989–', accent: '#ffd84d' },
  { id: 'once-upon-a-time', imdbId: 'tt1843230', tvmazeId: 111, name: 'Once Upon a Time', years: '2011–2018', accent: '#a9b8ff' },
];
const extras = [{ showId: 'the-simpsons', imdbId: 'tt12294152', name: 'The Tracey Ullman Show shorts', years: '1987–1989' }];

const sources = {
  episodes: 'https://datasets.imdbws.com/title.episode.tsv.gz',
  ratings: 'https://datasets.imdbws.com/title.ratings.tsv.gz',
  basics: 'https://datasets.imdbws.com/title.basics.tsv.gz',
};

async function download(name, url) {
  const target = new URL(`${name}.tsv.gz`, cache);
  if (existsSync(target)) return target;
  console.log(`Downloading ${name}…`);
  const response = await fetch(url);
  if (!response.ok || !response.body) throw new Error(`${response.status} ${url}`);
  await pipeline(response.body, createWriteStream(target));
  return target;
}

async function rows(gzPath, visit) {
  const stream = createReadStream(gzPath).pipe(createGunzip());
  const rl = createInterface({ input: stream, crlfDelay: Infinity });
  let headers;
  for await (const line of rl) {
    if (!headers) { headers = line.split('\t'); continue; }
    const values = line.split('\t');
    await visit(Object.fromEntries(headers.map((header, i) => [header, values[i]])));
  }
}

const episodeFile = await download('episodes', sources.episodes);
const ratingsFile = await download('ratings', sources.ratings);
const basicsFile = await download('basics', sources.basics);

const parentIds = new Set([...shows.map(show => show.imdbId), ...extras.map(extra => extra.imdbId)]);
const episodes = new Map();
await rows(episodeFile, row => {
  if (!parentIds.has(row.parentTconst) || row.seasonNumber === '\\N' || row.episodeNumber === '\\N') return;
  episodes.set(row.tconst, {
    imdbId: row.tconst,
    showImdbId: row.parentTconst,
    season: Number(row.seasonNumber),
    episode: Number(row.episodeNumber),
  });
});

await rows(ratingsFile, row => {
  const episode = episodes.get(row.tconst);
  if (!episode) return;
  episode.rating = Number(row.averageRating);
  episode.votes = Number(row.numVotes);
});

await rows(basicsFile, row => {
  const episode = episodes.get(row.tconst);
  if (!episode) return;
  episode.title = row.primaryTitle;
  episode.year = row.startYear === '\\N' ? null : Number(row.startYear);
});

function cleanSummary(value = '') {
  return (value || '').replace(/<[^>]+>/g, '').replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, '&').trim();
}

async function traceyUllmanSummaries() {
  const response = await fetch('https://www.simpsonsarchive.com/guides/tracey.ullman.html');
  if (!response.ok) return [];
  const html = await response.text();
  const summaries = [];
  const blocks = html.matchAll(/<B>([\s\S]*?MG\d+[\s\S]*?)<\/B><BR>([\s\S]*?)<P>/gi);
  for (const block of blocks) {
    const summary = cleanSummary(block[2])
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/First appearance[\s\S]*$/i, '')
      .replace(/Beginning with this episode[\s\S]*$/i, '')
      .trim();
    if (summary) summaries.push(summary);
  }
  return summaries;
}

const traceySummaries = await traceyUllmanSummaries();
const simpsonsSummaryFallbacks = new Map([
  ['Stew Lies', "When a food-show host loses his appetite, Homer tries to restore it and leads them to Fat Tony's dangerously guarded secret stew recipe. Meanwhile, Bart starts repeating everything Lisa says."],
  ['Full Heart, Empty Pool', 'Homer and Grampa invent Noodleball, an empty-pool sport that becomes a sensation, but success threatens their partnership when a company offers to take it professional.'],
  ['Estranger Things', 'After Bart and Lisa stop watching Itchy & Scratchy together, their lives drift apart and lead to an unexpected reunion decades later.'],
  ['Extreme Makeover: Homer Edition', 'After learning that Homer left the children with a doorbell camera as their babysitter, Marge imagines several very different versions of her husband.'],
  ['Simpsley', 'In a noir-inspired story, Marge travels to Italy to bring Seymour Skinner home and becomes tempted by his wealthy lifestyle and his houseguest, Homer Simpsley.'],
  ['Yellow Mirror', 'A defective lamp challenges Homer’s sense of reality, while an AI-powered tablet befriends Maggie and begins to control her.'],
]);

for (const show of shows) {
  const response = await fetch(`https://api.tvmaze.com/shows/${show.tvmazeId}/episodes?specials=1`);
  if (!response.ok) throw new Error(`TVmaze ${response.status} for ${show.name}`);
  const tvmazeEpisodes = await response.json();
  const summaries = new Map(tvmazeEpisodes.map(item => [`${item.season}-${item.number}`, cleanSummary(item.summary)]));
  const showEpisodes = [...episodes.values()]
    .filter(item => item.showImdbId === show.imdbId)
    .filter(item => show.id !== 'the-simpsons' || !/^Episode #\d+\.\d+$/.test(item.title || ''))
    .map(item => ({ ...item, summary: summaries.get(`${item.season}-${item.episode}`) || '' }))
    .map(item => show.id === 'the-simpsons' && !item.summary ? { ...item, summary: simpsonsSummaryFallbacks.get(item.title) || '' } : item)
    .sort((a, b) => a.season - b.season || a.episode - b.episode);

  const showExtras = extras.filter(extra => extra.showId === show.id).map(extra => ({
    ...extra,
    episodes: [...episodes.values()]
      .filter(item => item.showImdbId === extra.imdbId)
      .sort((a, b) => a.season - b.season || a.episode - b.episode),
  })).map(extra => ({ ...extra, episodes: extra.episodes.map((episode, index) => ({ ...episode, summary: traceySummaries[index] || '' })) }));

  const rated = showEpisodes.filter(item => Number.isFinite(item.rating));
  const average = rated.reduce((sum, item) => sum + item.rating, 0) / rated.length;
  const best = rated.reduce((a, b) => a.rating >= b.rating ? a : b);
  writeFileSync(new URL(`${show.id}.json`, dataDir), JSON.stringify({
    ...show,
    average: Number(average.toFixed(1)),
    episodeCount: showEpisodes.length,
    seasonCount: Math.max(...showEpisodes.map(item => item.season)),
    best: { title: best.title, rating: best.rating, season: best.season, episode: best.episode },
    episodes: showEpisodes,
    extras: showExtras,
  }));
  console.log(`${show.name}: ${showEpisodes.length} episodes`);
}

writeFileSync(new URL('shows.json', dataDir), JSON.stringify(shows));
console.log('Done.');
