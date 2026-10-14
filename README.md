# Episode Index

A static, responsive IMDb episode-ratings explorer for House MD, The Simpsons, Once Upon a Time, Yu-Gi-Oh! Duel Monsters, Mighty Morphin Power Rangers, and Futurama.

## Data

Ratings, vote totals, titles, and episode numbering come from the [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/). Episode summaries come from the [TVmaze API](https://www.tvmaze.com/api).

The Simpsons data excludes untitled future placeholders for announced seasons 39–40, includes the full-length Disney+ exclusives in their IMDb season positions, and appends the 48 Tracey Ullman Show shorts as a separate collection.

Yu-Gi-Oh! includes the 27-episode 1998 Toei series (“Season 0”) as a separate collection. Mighty Morphin Alien Rangers is separated from the final ten episodes of IMDb's third Mighty Morphin season so it can be browsed as its own run.

## Refresh the data

```powershell
node scripts/build-data.mjs
```

Then commit the updated files in `data/`.

## Local preview

Serve this folder with any static file server, for example:

```powershell
npx serve .
```
