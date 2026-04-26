# Search Backends

notewell always includes the `json-index` backend. It rebuilds
`.notewell/index.json` from Markdown and searches that cache locally.

Advanced search backends are opt-in:

```bash
notewell index --backend flexsearch
notewell search "query" --backend flexsearch
```

The first optional backend name is `flexsearch`. In this lightweight baseline it
falls back to `json-index` unless a future package wires in the actual
FlexSearch dependency. That fallback is intentional: optional search must never
replace the Markdown vault or make the JSON index unavailable.
