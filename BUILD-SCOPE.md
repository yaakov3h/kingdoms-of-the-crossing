# Solo campaign upgrade
Target: Thursday 2026-11-26 12:00 Asia/Jerusalem.
Baseline: independent local checkpoint 1103. Old published version unchanged.

The design compass is the strategic depth and legibility of classic exploration/town/tactical games. No copied names, assets, factions, maps or text.

## Completion gates
- 15: solo-first versioned baseline, faction/system catalog, migration-safe saves, regression tests.
- 30: larger coherent world, eight-way terrain-aware travel and route preview, mobile exploration.
- 45: four faction rosters, town prerequisites and recruitment growth, resource/trade loop.
- 60: independent hero armies/progression/equipment, tactical combat/AI/auto/siege loop.
- 75: original integrated landscape, objects, troops and town presentation at mobile/desktop sizes.
- 90: full campaign and save/import/reload/regression/performance checks.
- 100: fixes, inspected deliverable, source backup/history and explicit limits.

Percentages refer to verified outcomes of this upgrade, not elapsed time or every feature in another commercial game. Existing features alone do not complete a new gate.

## Deferred
Network persistence, remote multiplayer/group play, external identity setup and any paid service. Keep the existing command/state boundary so a server adapter can be added later. Solo saves remain local to the browser unless exported.

## Publication
Status 2026-11-24: source is in the public repository yaakov3h/kingdoms-of-the-crossing, and the static solo build is live at https://kingdoms-of-the-crossing.pages.dev/. The previous game preview remains unchanged. Earlier notes said the repository was private and nothing was deployed; that was true while building.

## Risks
Faction balance is iterative. Browser emulation is not physical-phone performance testing. Existing save imports must be checked against fixtures before a migration is advertised.
