# Episode Index

A static, responsive IMDb episode-ratings explorer for House, The Simpsons, and Once Upon a Time.

## Data

Ratings, vote totals, titles, and episode numbering come from the [IMDb non-commercial datasets](https://developer.imdb.com/non-commercial-datasets/). Episode summaries come from the [TVmaze API](https://www.tvmaze.com/api).

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
