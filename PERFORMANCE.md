# Performance budget

World Focus uses a per-asset production budget so a single dependency or media change cannot silently make the initial experience much heavier.

## Enforced limits

| Asset | Raw limit | Gzip limit |
| --- | ---: | ---: |
| JavaScript chunk | 500 kB | 150 kB |
| CSS file | 20 kB | 10 kB |
| Raster image | 450 kB | — |

Run `npm run performance:check` after dependency or UI changes. The command builds the production bundle, prints every measured asset and exits with an error when a limit is exceeded.

## Current baseline

The July 2026 P0 build passes all limits. The heaviest JavaScript files are the split application entry and vendor chunks; the Lofi artwork is the largest raster asset at approximately 402 kB. YouTube and the radio stream remain third-party media and load independently from the JavaScript bundle.

Runtime resource timings are aggregated per provider (`youtube`, `supabase`, `spotify`, and `lofi-radio`) in the session-scoped `world-focus-third-party-performance` entry. Each record tracks request count, cumulative duration and transferred bytes without retaining full URLs or user data.

## Follow-up target

The next performance iteration should replace the Lofi JPEG with a responsive WebP/AVIF source and defer nonessential authentication/music vendors until their controls are opened.
