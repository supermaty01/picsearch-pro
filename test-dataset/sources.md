# Test dataset — image sources

Images live in `test-dataset/images/`, named `<slug>.<ext>`. The seed script
(`pnpm seed`) ingests each through the real pipeline and stores it at
`storage_path = seed/<slug>.<ext>`, which the benchmark uses to map the
ground-truth slugs (see `ground-truth.json`) to real image ids.

## Real photos (owner's own travel photos)

Personal photographs by the project owner (Mateo), used with permission. Mostly a
2024 trip through France and Croatia, plus some winter/animal shots.

| Slug                         | Subject                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `police-lamborghini-airport` | Blue "Polizia" Lamborghini on display in an airport terminal |
| `notre-dame-facade-night`    | Notre-Dame de Paris — Gothic twin-tower facade at blue hour  |
| `flowering-tree-blue-sky`    | Flowering linden tree against a blue summer sky              |
| `louvre-glass-pyramid`       | The Louvre glass pyramid and courtyard, Paris                |
| `hilltop-stone-fortress`     | Hilltop stone fortress on a rocky coast (Dubrovnik)          |
| `dubrovnik-sea-walls-kayaks` | Dubrovnik sea walls with red kayaks on turquoise water       |
| `dubrovnik-oldtown-sunset`   | Dubrovnik old-town harbor at golden hour, palm silhouette    |
| `calico-cat-bougainvillea`   | Calico cat sleeping on a ledge by purple bougainvillea       |
| `pink-sunset-beach`          | Dramatic pink sunset over a beach with people at the shore   |
| `turquoise-clear-water`      | Crystal-clear turquoise water over rocks at a lake edge      |
| `emerald-lake-cliff`         | Emerald lake below a limestone cliff, lush forest (Plitvice) |
| `ornate-church-golden-hour`  | Ornate stone church facade with rose window at golden hour   |
| `french-manor-magnolia`      | French country manor with a pink magnolia in spring          |
| `full-moon-city-night`       | Full moon through clouds over a Haussmann building at night  |
| `paris-street-corner-cafe`   | Parisian street corner with a café under a mackerel sky      |
| `snowman-santa-hat`          | Snowman with a Santa hat, scarf, and carrot nose at night    |
| `snow-angel-imprint`         | Snow-angel imprint in fresh snow at night                    |
| `christmas-nativity-scene`   | Elaborate Christmas nativity scene (nacimiento) with lights  |
| `potbellied-pig-farm`        | Black-and-white pot-bellied pig in a leafy farmyard          |

## Generated illustrations (not photographs)

Flat-design vector illustrations produced by `scripts/generate_illustrations.py`
(Pillow) to add category variety. Regenerate with
`python scripts/generate_illustrations.py`. Replace with real photos anytime.

| Slug                   | Subject                                    |
| ---------------------- | ------------------------------------------ |
| `snowy-mountain-peak`  | Snow-capped mountain peak under a blue sky |
| `desert-sand-dunes`    | Rolling desert sand dunes at low sun       |
| `tropical-beach-palms` | Tropical beach with a palm tree and sea    |
| `city-skyline-night`   | City skyline at night with a moon          |
| `autumn-forest-path`   | Autumn forest with a path                  |

The benchmark (`ground-truth.json`) exercises all four agent-route categories
(direct, noisy, multi-concept, ambiguous) across these images.
