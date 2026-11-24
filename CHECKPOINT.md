# Local checkpoint, 2026-11-24

Not published. No external account created or signed into. Existing private0.11 unchanged. Free-only. No contact with other people.

## Implemented

- Phaser independent map and tactical battle canvases, DOM Hebrew controls.
- Separate full-screen city panorama with embedded clickable buildings; building details use a full screen, not an overlay.
- All four factions use existing original artwork, full3:4panoramas without crop.
- Solo engine from0.11 unchanged, independent multi-slot local save system, local profile separation (not authentication), JSON download/import into a new slot.
- Deep save shape/bounds validation, no silent replacement of corrupt repository, quota errors preserve previous stored value.
- Full solo map/city/army/heroes/economy navigation, transfer, talents, equipment, doctrine, buildings, recruitment, trades.
- Local Worker + SQLite Durable Object room backend, hashed bearer capabilities, one-use guest invitation, authoritative shared state, membership, optimistic versioning and command idempotency inside storage transaction.
- Distinct two-human shared-world model, separate human armies and resources, turn ownership, neutral combat, alternating human combat actions, basic coop objective and PvP siege victory.
- Paired browser test UI with manual refresh (no repeated logged-in-site polling), local session resume, pending command survives uncertain network result and retries with same ID.
- Versus server responses redact unseen opponent army location, resource balances and opponent seen cells.

## Tested

- npm test passes:240solo faction/world/battle save roundtrips, corruption, quota, room/command rules,40shared neutral battles, PvP/cooperative basic resolutions.
- npm run build passes, Phaser vendor chunk still large339.84KBgzip.
- node server-check.mjs passes actual local DO creation/join/auth, one-use invitation, stale-version and duplicate protection, persistent restart, concurrent CAS.
- node ui-paired.mjs passes two isolated browser contexts, own-army control, turn exchange, reload, lost response after commit and same-ID safe retry.
- node ui-deep.mjs passes actual download/import, invalid import, battle resume/auto,15layouts at320/390/1280.
- node ui-controls.mjs passes self-heal immediate action, transfer, map drag no hero movement, four city renders.
- npx tsx campaign.ts and node ui-campaign.mjs pass175actions through actual UI until day51victory, with mines, treasury, markets, advanced buildings, equipment, doctrine, second hero and pyro.
- node ui-tactical.mjs passes entire manual solo battle via accessible row/column controls,13commands.
- node ui-human-battle.mjs passes real-start siege and45alternating browser commands, including reload while waiting.
- node ui-touch.mjs passes emulated two-finger pinch without hero movement, not a physical-device test.
- Paired rules additionally tested for eight building levels, special recruitment, four once-per-battle abilities, and remote-capital garrison isolation without teleporting distant army.
- node ui-paired-panels.mjs passes city building navigation/recruitment/own-turn gating, three layouts320/390/1280, private access backup and restore in third browser, old-token revocation, lost rotation response recovery.
- node ui-bootstrap-recovery.mjs passes lost create and lost join responses, full reload, safe retry with saved local intent.
- server-check additionally checks replaced invite invalidates old invite,20KBcap, cross-origin rejection and429rate rejection.
- Paired economy added: treasury, mine improvements and market transactions with own-turn/resource/location gating. Daily income is symmetric for both at shared day rollover; no first-day income advantage.
- Second full solo UI replay now passes after dividing at action85and restoring exact checkpoint from file. Current source completed all175actions/day51again. Reproduce: START=0 END=85 node ui-campaign.mjs, then START=85 END=175 node ui-campaign.mjs.
- Actual pixels inspected: four city panoramas, mobile320/390layouts, battle/self-heal, map, paired state and final campaign result. Some graphically dense card labels remain basic.

## Open work, do not call release-ready

1. Paired UI and rules are explicitly experimental. Advanced buildings and four faction abilities now implemented and unit-tested. Multiple commanders now implemented and browser-tested. Richer coop enemy opposition and balance remain. Equipment collection/equip now tested through a legal real-start browser path, not a full equipment campaign. City/army navigation is now coherent, continuous city with embedded buildings and full detail pages. Access backup/import, invitation replacement and token rotation exist and are browser tested, including lost-response after rotation. Create/join also save local intent before send and recover after lost initial responses and reload. No recovery without backup or connected device.
2. No Internet server deployed. Account/terms/access audience approval needed separately before any external hosting. Existing game saves cannot cross origins automatically. Old hosted export bridge remains unresolved, do not promise automatic migration.
3. Partial safeguards now exist:20KBstream-limited request,1MBroom state cap,120requests/minute per live room instance, same-origin enforcement (localhost proxy exception only). External service is now disabled by default in Worker code before provisioning; test proves accidental external request cannot create an object. Still need persistent/global rate/capacity guard, room TTL/delete and deployment auth. Not fit for external testing yet.
4. Battle visual improvement needed: larger distinct unit art, range overlays, explanatory labels. Pointer pinch tested in touch emulation, not on a real device. No physical-phone testing.
5. Paired page now labels local-test status separately and hides solo controls to avoid mixed saves/navigation.
6. All-solo-faction campaign completion not tested through UI; only Mars/one-AI full path. Engine old regressions exist in previous project.
7. Camera view now retained across same-save screen updates, but scene is still recreated, not retained. Needs performance profiling on phone and cross-slot camera tests. Battle now has selected-unit highlight, range tint, enemy labels and distinct neutral art; still needs stronger visual work.
8. Shared sites now have specific rewards/heal/reveal and local recruitment stock/refill. Relic sites now grant own-player lens/shield/coil collection. Army screen can equip one; combat-only stats are restored after retreat or completion. No claim of full solo parity. Neutral auto-battle exists and is forbidden for human combat.

## Files and next step

Source:/downloads/kingdom-independent. Package lock included. Test fixtures can generate outputs under/downloads. Do not bundle .local-server,.wrangler,local browser data or invitation/access capability values.

Next: shared-state invariant/fuzz tests, paired economy/sites parity, reduce repeated Phaser recreation and test full solo campaign again after shared UI work. Add global deployment gate only after account/audience authority is settled. Do not invent final battle-waiting or coop/PvP policy. No external deployment or release before separate approval.

## Latest visual follow fix9:33
Inspection of the completed campaign showed camera could remain at an old map position after the hero moved off-screen. Local fix: retain pan/zoom on ordinary screen changes, but recenter after movement, hero switch or battle transition. Build, ui-controls, ui-deep and manual tactical test pass after fix. Full campaign was before this camera-only fix. Needs movement follow screenshot check and performance work.

##9:51checkpoint
- Full local cooperative campaign now passed through two separate browser contexts:213legal actions/day62team win, real-start state, independent armies, movement/mines/recruit/heal. Ran in segments0/35/70/105/140/175/213with persistent server restart and browser reload each time. Test uses fixed local-only seed7319so trace matches world; no external ability to pick seed.
- Test script ui-coop-campaign.mjs uses private session fixture outside source folder. Never archive that fixture. Reproduce with shared-campaign.ts then START/ENDsegments.
- Added paired map zoom/center controls, retained camera view across pages, local management menu collapsed by default, Hebrew team victory text. Latest build, ui-paired-panels, ui-bootstrap-recovery, ui-deep and npm test pass. Full cooperative browser campaign predates these cosmetic camera/menu changes.
- Earlier panel/bootstrap timeout was test navigation of collapsed management menu, corrected tests now expand as needed. No lost game state.

##9:55equipment increment
- Added shared equipment collection/equip/next-battle effects. Rules tests cover three items, actual shield hit reduction,9repeated retreats without accumulating base stats, isolated inventories. UI exists on army page but full collection-to-equip browser path still unverified.
- Current npm test/build, shared-campaign, ui-paired-panels, ui-bootstrap-recovery, ui-deep and45command human battle pass after increment. Human battle rate limit triggered and recovered after61seconds, without relaxing limits.

##10:06multiple-commanders milestone
- Up to3commanders per human player; hire at capital, separate location/AP/army/equipment, switching, co-located unit transfer, daily AP reset, shared city upgrades.
- Correct inactive opposing expedition is selected for combat. Losing that expedition does not defeat the player or damage another army. Remote capital garrison does not borrow distant expedition equipment.
- Client map shows own inactive expeditions and all visible opposing expeditions. Versus snapshot filters unseen commanders and strips equipment; inactive commander state and active projection validated before storage.
- Real-start browser path legally saved income, traded for crystals, hired second commander, transferred a unit, moved second commander, confirmed first remained at capital and reload retained active commander. Inspected390pxarmy screen. No fixture resource edits in browser test.
- Current npm test/build, ui-paired-commanders, ui-paired-equipment, ui-deep, ui-paired-panels, ui-bootstrap-recovery and actual server-check pass.213action shared rules campaign rerun after commander implementation. Prior full cooperative browser campaign predates commanders. Human45command browser battle last run before commanders; new inactive-expedition combat covered in rules tests.
- Tests include equipment single-owner restriction, off-location transfer rejection, all-army level upgrade, inactive defender combat resolution, fog redaction and malformed inactive state rejection. Fixture combat is not balance evidence.
- No publication, no account action, no change to hosted0.11. Existing experimental battle waiting/coop/PvP policy remains unapproved as final.

##10:24regression closeout
- Replayed full two-browser213-action/day62cooperative campaign against current commander-enabled code with persistent server state and reloads between segments. This follows the original single-commander campaign path; extra commander path is tested separately.
- Replayed real-start human siege through45alternating browser commands on current code, split12/12/12/9with saved private access between segments. No state/resource fixture edits. Reload while waiting and completion pass.
- Long test runs hit execution time limits/rate limits. Resumed only from recorded committed index after inspecting progress. Test runner now supports SETUP_ONLY=1 and RESUME=1 MAX_COMMANDS=12 for human battle. Private test access stays outside source archive.
- Final npm test/build pass after regressions. Inspected current390pxhuman battle and cooperative victory pixels. Expanded room management reduces map area; collapsed is the normal UI. Battle art and physical-phone performance remain limitations.

##10:32mobile battle refinement
- Replaced noisy terrain textures under tactical units with calm alternating board cells. Kept distinct original unit sprites, selected-unit border and range tint; added health bars. No combat-rule change.
- Paired room management moved below the play area when collapsed. Compact header and controls free more mobile space. Battle hides non-working map zoom controls, shows selected unit health/damage/range and a brief enemy/range legend.
- Inspected current390pxbattle and full-map pixels. Main actions, turn state and management summary fit. Small-screen context remains scrollable for larger armies; not a physical-device test. Battle sprites remain small and crystal base-unit artwork is reused, not full bespoke art.
- Build, full rules suite, complete13command solo manual battle,15-layout checks, paired commander browser path, city/access panels and bootstrap recovery pass after refinement. Current human battle completed45commands across visual-refinement segments. First few commands predate last CSS-only adjustments; final33commands use latest compact board controls. Full213-action cooperative replay was immediately before this visual-only increment, not after it.
- No publication, account, payment or old-host changes. Further work: performance on device, clearer per-unit artwork,320pxpaired battle accessibility and large-army context checks, production access/capacity/TTL safeguards before external hosting.

##10:37small paired viewport check
- Added ui-paired-layout.mjs: explicitly mocked API snapshot with six units on each side, checks320/390/768pxunit selection, retreat scroll access and no horizontal document overflow. This is layout-only fixture evidence, not a legal-start server or combat test.
- Fixed startup race that opened room management before first state arrived. Waiting rooms still open management; playing rooms remain collapsed by default.
- Six-unit selectors now one horizontally scrollable strip rather than several rows; short screens use smaller board allocation. Actual320x740pixels inspected: board, selected unit stats, ability, cell target, command and retreat fit. Not all unit selectors visible simultaneously by design. No physical-device claim.
- Current build, six-unit layout and paired city/access panels pass. Bootstrap recovery passed after startup-open fix, before selector-strip-only change. Full campaign and human battle were before this final UI-only change. No rule or backend change.

##10:45narrow-screen input fix
- Actual320pxhuman battle exposed DOM cell selectors triggering unintended Phaser board commands. Added board pointer-origin/target guard: only gestures starting and ending on canvas can issue board commands. Snapshot test now asserts choosing unit/cell emits zero mutations.
- Fresh legal-start320pxsiege completed45alternating commands after fix, split12/12/12/9with waiting reloads. Previous disposable test room had unintended moves and was abandoned, no user saves involved.
- Current build/rules, six-unit320/390/768fixture layouts with zero-DOM-mutation assertion, solo manual13commands, drag/transfer/heal controls and emulated pinch pass. Physical device still untested.

##10:51paired direct map input
- Paired map now directly attacks adjacent enemy army/capital on tap, matching solo input. Own inactive commander tap selects it. Empty-cell movement remains explicit to avoid accidental walks.
- New ui-paired-map-input.mjs uses actual canvas pointer clicks against a mocked visible-world fixture and checks exact outgoing adjacent-attack/commander-select actions. Does not claim server combat completion. Inspected rendered390pxmap after scene startup; test waits for scene readiness instead of capturing transient empty canvas.
- Build, current rules, commander browser path, manual tactical battle and six-unit layout/input-isolation tests pass. No expiry/deletion policy silently chosen: automatic saved-game deletion remains a separate product decision. No external hosting action.

##11:03persistent per-room rate guard
- Existing-room120requests/minute guard now persists as a fixed minute bucket in SQLite and survives room process restart. Each accepted request adds storage traffic; not a global abuse shield and may burst across minute boundaries.
- Unknown room probes do not write persistent buckets, avoiding storage amplification on random room IDs. Their memory guard is intentionally weaker until a global authenticated entry gate exists. No capacity/TTL policy invented.
- Actual local server-check passes429then restart429within same minute, plus auth/CAS/idempotency. Build/rules, bootstrap recovery and city/access browser tests pass. No external deployment.
- profile-local.ts measurements saved separately: localNode wall time only. Creation median0.378ms, endTurn0.59ms, sample neutral auto9.219ms. Not hosted CPU, phone performance, or free-tier capacity evidence. Provider quotas still need real deployed measurement after approval.
