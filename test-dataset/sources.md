# Test dataset — image sources

Drop the images into `test-dataset/images/` named `<slug>.<ext>` (jpg/png/webp).
The seed script (`pnpm seed`) ingests each through the real pipeline and stores it
at `storage_path = seed/<slug>.<ext>`, which the benchmark uses to map the
ground-truth slugs (see `ground-truth.json`) to real image ids.

Use small, license-safe images (Unsplash/Pexels or your own photos). Record the
source + license per image below so the dataset stays redistributable.

| Slug                 | Suggested subject                                 | Source URL | License |
| -------------------- | ------------------------------------------------- | ---------- | ------- |
| `colmar-canal`       | Canal with medieval timber-framed houses (Colmar) |            |         |
| `beach-sunset`       | Golden beach at sunset over the ocean             |            |         |
| `gothic-cathedral`   | Gothic cathedral facade / architecture            |            |         |
| `snowy-mountain`     | Snow-capped mountain peak at dawn                 |            |         |
| `northern-lights`    | Green aurora over a night sky                     |            |         |
| `desert-dunes`       | Rolling desert sand dunes                         |            |         |
| `tokyo-street-neon`  | Neon-lit city street at night                     |            |         |
| `venice-gondola`     | Gondola on a Venetian canal                       |            |         |
| `coffee-latte-art`   | Coffee cup with latte art (top-down)              |            |         |
| `autumn-forest-path` | Forest path with autumn foliage                   |            |         |
| `red-vintage-car`    | A red vintage/classic car                         |            |         |
| `lavender-field`     | Rows of purple lavender in a field                |            |         |
| `city-night-skyline` | City skyline at night (extra / gallery filler)    |            |         |
| `old-library`        | Interior of an old library                        |            |         |
| `surfers-waves`      | Surfers riding ocean waves                        |            |         |

The first 12 slugs are referenced by `ground-truth.json`; the last three are
optional filler so the gallery and retrieval have distractors to compete against.
