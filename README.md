# bb-plugin-unslop

Anti-slop filtering for BB agent output. Strips overused AI patterns —
hedging, filler, corporate affect — from text and returns the cleaned version.

## Tools

- **`unslop_filter`** — strips overused AI patterns from text. Call it on your
  own output before sending it, or on text you've read. In `rewrite` mode it
  removes the patterns; in `flag_only` mode it wraps them in ⚠️ markers.

## Slop patterns

Built-in patterns cover:

- **Hedging / filler** — "I hope this helps", "I'd be happy to help", "Please
  let me know if you have any questions", "Feel free to reach out".
- **Corporate affect** — "It's important to note that", "As an AI language
  model", "However, it's worth noting that", "I completely understand your
  frustration".
- **Over-apologising** — "I apologize for the confusion".
- **Redundant sign-offs** — "Happy coding!", "Good luck!", "Let me know if you
  need anything".

## Settings

| Setting | Default | Description |
|---|---|---|
| `customPatterns` | *(empty)* | Additional regex patterns to strip, one per line, case-insensitive. |
| `mode` | `rewrite` | `rewrite` removes slop; `flag_only` wraps slop in ⚠️ markers. |

## Install

```sh
npm install
bb plugin install .
```

After editing sources, reload:

```sh
bb plugin reload unslop
```

## Configure

```sh
bb plugin config unslop
bb plugin config unslop set mode flag_only
```

## Build

```sh
bb plugin build
```
