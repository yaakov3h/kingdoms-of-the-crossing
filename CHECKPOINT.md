# Solo checkpoint 0.2.0

Status 2026-11-24: the final audited build is deployed at https://kingdoms-of-the-crossing.pages.dev/ and its source is in this public repository. The old hosted 0.11 publication is unchanged. The notes below were written at the 90% checkpoint and are kept as history, except where marked. SHA256SUMS is the manifest of the current source tree in this repository (every tracked file except itself); check it with sha256sum -c SHA256SUMS. The audited production build it was derived from differs from it only in README.md, BUILD-SCOPE.md, CHECKPOINT.md and .gitignore (blank lines), which were edited for status and credits.

## Current work
- Four original factions, eight units each;24/32random worlds; weighted eight-way map-tap route walking; local independent hero armies.
- Town prerequisites, one build/day, weekly recruitment stock, resources/trade, equipment/talents, manual/automatic/siege battles.
- Original isolated troops, commanders and sites, blended terrain, curved textured roads with sparse stones/flowers/rocks.
- Full-viewport map shell, browser fullscreen when supported, persistent live map during route movement, visible save-failure warnings.
- Local save slots and JSON export/import. Old saves retain their rules. No network multiplayer or server deployment in this release.

## Verified
- Rules: legacy imports,160new world/faction/seed cases,240roundtrips,5000shared random attempts, town chains and natural opening budgets,32single-use abilities, equipment isolation,64adjacent city attacks, defeat persistence.
- Campaigns: four factions, two seeds; all four factions x both sizes x one/two opponents. All win with actual starting resources and periodic save roundtrips. Safe strategies take189–216game days, so this is completion evidence rather than final balance/pacing evidence.
- Browser: map tap route and exact AP, exhaustion/combat stop, manual tactical battle, fullscreen persistence, touch pinch/tap, actual JSON download/import/reload, non-overwriting imports, quota-failure warning.
- Layout: four-faction map/town/roster at320/390/1280; home/setup/hero/army/economy and scroll endpoints at those sizes. Actual pixels inspected.
- Production: new32world, loaded-session offline route walking, save restoration after reload, no external requests/failed assets.
- Portable file:87embedded images, file:// new game/route/save/reload with no network requests in desktop Chromium. Physical-phone opening not tested.
- Performance: live retained canvas, normal route p95 roughly17ms; fourfold CPU-throttled route p95 roughly33ms. Synthetic environment, not physical-phone performance.

## Remaining limits
- No paid service. (At checkpoint time there was no public hosting; the static build is now live at the address above.) Existing hosted private React viewer is a different format; directly inserting this build would break its storage/download assumptions.
- Portable HTML is a computer fallback, not a verified phone-delivery route. Saves stay local to that browser/origin/file path; no automatic migration from the old hosted game.
- Faction balance and pacing remain iterative. Army limit is six individual units, not troop stacks. All world terrain is traversable at varying costs.
- Experimental paired source and tests remain for later work; they are not enabled as the delivered solo experience. No terms/accounts/auth/money work is authorized by these build notes.

See README for current reproducible commands. Historical paired test scripts target the earlier interface and are not all compatible with the new solo-first screens. Only the suites named above were rerun for this checkpoint.
