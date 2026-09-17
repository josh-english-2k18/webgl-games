# Astra Meridian Workbench

## Pinned Next Experiment

User deferred the 3D dogfighting idea while improving the planet. Revisit one interceptor
with readable attack runs, evasive turns, vulnerable recovery, advance threat cues, and
combat above/below the rings. First test one pursuit/evasion/counterattack encounter;
do not start mission systems or additional enemy classes before that encounter is fun.

## Ring Rendering Follow-up (2026-09-10)

- Manual findings: radial detail resembles corduroy; rings sometimes appear superimposed on the planet; an intermittent square flicker occurs with the planet visible. Keep these three observations distinct. Browser automation remains prohibited; no visual resolution is claimed from CPU tests.
- Removed the two regular sine-density ripples. Broad blue/warm ring zones remain, with restrained, irregular radial variation. In the sampled 128-151-unit interval, average neighboring alpha-byte difference fell from 8.61 to 0.84; this is a texture-data measurement, not a rendered aliasing score.
- Real ray probes found both top/bottom surfaces contributing under double-sided transparency. Closed ring slabs now select one entry surface outside, or one exit surface when the camera is inside. Two shared front/back materials preserve both hemispheres and unrestricted flight; eight band draws remain. Optical depth accounts for the previous pair of faces without compositing duplicate detail.
- Split ring appearance from its shadow: a cached 512x1 optical-density texture adds a padded, softened penumbra instead of stamping fine ring striations onto cloud bands. Added base storage: 2 KiB. The 4K planet bake, palette, storm, other celestial assets, and gameplay are unchanged.
- Removed the planet shadow's nonuniform conditional mip lookup. Every fragment now samples before applying branchless directional/radial masks; padded texture edges and the mask prevent coarse mip bleed outside the annulus. This addresses a concrete [undefined implicit-derivative condition](https://registry.khronos.org/OpenGL/specs/es/3.2/GLSL_ES_Specification_3.20.pdf), not a GPU reproduction of the reported square. The planet now always performs its fourth cached texture lookup; no extra pass is added.
- Planet opaque depth writes and ring depth tests are explicit. Foreground rings may physically cross the planet's projected disk; far-side rings must fail planetary depth. Tests check those separate cases rather than hiding every ring pixel over the planet.
- Independent review found a second invalid-input candidate: float32-normalized real mesh normals can produce a dot product of `1.0000001192`, making the base of fractional rim-lighting powers negative. The planet, both atmosphere shells, and the identically affected spherical missile-pulse shader now clamp those bases to `[0,1]`. No extra noise, texture, or postprocessing pass is involved. This is an arithmetic reproduction, not a GPU NaN observation.
- The critic also reproduced a thin radial containment mismatch: actual 192-sided slab walls sit inside their nominal circles. Material selection now uses the polygon's facet apothems, with production ray regressions at inner/outer facet boundaries in four quadrants for every band.
- The corrected initial 18-case scene/celestial/camera run passed in 70.75 seconds. The first occlusion fixture incorrectly expected a foreground plane intersection on steep rays; the corrected fixture includes a real grazing foreground case while retaining steep far-side cases.
- Final focused run: 22 passed, zero failures/skips, in 82.58 seconds. Includes all six new regressions, celestial/scene/camera/quality checks, real wing-missile impacts, and spherical-pulse pool behavior. The permanent suite now contains 126 cases; the complete suite was not rerun for this scoped rendering correction.
- Independent final review closed both findings on SHA `7e927e11b1ce9020ae261089e57c05fe5da5ed45d76a2883c25fdaf28ffe01c4`: 23,296 mesh-derived rim-expression evaluations, 864 boundary classifications, and 1,296 real Raycaster checks passed, plus 3/3 independently run permanent tests. No remaining blocking code-level finding in the requested scope. These are CPU arithmetic/geometry checks, not GPU or visual approval.
- Remaining manual checks: ring density at shallow angles, fly-through transitions, shadow softness, square flicker, and GPU frame timing. A shader compiler is not installed; Node tests do not compile or execute GLSL.

## Gas Giant Cloud Pass

Current target: retain the predominantly blue giant, warm accents, compact red storm,
spherical collider, and rendering budget. Replace regular noisy stripes and a stamped
storm with unequal cloud belts, folded shear boundaries, nested eddies, and filamentary
convective blooms. Avoid the previous eyeball, target-ring, and clean mathematical-spiral
failure modes. Celestial appearance remains manual-playtest territory; no browser automation.

- Implemented: unequal blue/tan/rust belts, irregularly clustered nested vortices, branching cloud crests, dark folded channels, and a filled compact red storm. All vortices distort the same cloud material instead of overlaying separate spiral lines.
- Reference: [Juno's turbulent cloud bands](https://www.jpl.nasa.gov/images/pia23610-mocha-swirls-in-jupiters-turbulent-atmosphere/) informed structure, not the fictional blue palette. No reference photograph is embedded in the game.
- Raw asset inspection caught overly regular spacing in the first vortex layout. Varied spacing, sizes, centers, and daughter eddies replaced that layout. This inspection is of generated texture bytes, not rendered gameplay or GPU evidence.
- Animation: a cached signed flow map drives two staggered, blended advection phases. Hidden resets bound distortion; no accumulating UV shear or oscillating storm rotation. This is an artistic cloud-flow approximation, not a fluid solver.
- Initial budget: retained the 2048x1024 RGBA8 cloud map and added one 512x256 RGBA8 flow map (0.5 MiB base, approximately 0.67 MiB including mip levels). Three cloud/flow texture samples plus the existing conditional ring-shadow sample; no per-fragment fractal noise, extra draw, or postprocessing pass. Cloud-top shading is shallow normal relief; geometry and collider are unchanged.
- Initial production initialization: 1,306.2 ms in the Node/Three r174 harness. Excludes GPU upload/compilation/rendering and browser layout; not a frame-rate measurement.
- Initial complete regression: 118 passed, zero failures/skips, in 162.39 seconds. Includes bounded/cached textures and neutral polar flow, blue-majority/warm-detail palette with continuous longitude seam, and phase-reset continuity through the actual animation controller.
- Independent review identified incomplete vortex-candidate bounds and encoded-space temporal blending, plus residual oval storm contours and a risk of synchronized softening during the nine-second repeating advection. The first two receive corrections below; remaining appearance/animation judgments require manual playtesting, not a claim that the approximation is sustained fluid transport.

### Pixelation Follow-up

- Manual finding: "definitely a step in the right direction," but the planet looks pixelated. Preserve the accepted cloud composition; focus on sampling and shading instead of another storm redesign.
- Desktop cloud albedo/relief is now 4096x2048, capped by device texture limits; coarse-pointer devices retain 2048x1024. Keep mipmapped linear filtering and enable at most 4x hardware-supported anisotropy. Other textures and the scene-wide render resolution budget are unchanged.
- Reduced fine-grain frequency/contrast, removed narrow filament lines from cloud-height relief, and halved normal perturbation. This addresses texel magnification and overly etched shading without blurring the whole scene or removing the swirls.
- Corrected candidate selection to include the latitudes reachable after preceding vortex deformations. Decode both color samples before temporal blending so moving clouds do not darken from blending square-root-encoded values.
- Actual desktop bootstrap: 3,540.9 ms CPU. Giant textures now use 32.5 MiB base storage, approximately 43.33 MiB with mipmaps, versus 8.5 MiB / 11.33 MiB previously. Touch retains the lower budget. No extra pass or shader texture sample, but higher texture traffic and anisotropy can affect GPU cost; FPS is not established by these CPU measurements.
- Twelve focused production checks passed: ten scene/rendering checks in 36.45 seconds, plus actual low-capability/coarse-pointer bootstraps and candidate-bound coverage in 9.94 seconds. These cover actual scene initialization, populated textures, seams, phase transitions, adaptive render limits, and the 2K fallback. The full 118-case suite passed before this focused correction; it was not rerun in full afterward. The permanent suite now contains 120 cases.
- Independent final review: no blocking code-level finding on SHA `71fb42c3100726d0674d35deafdb7008a8db11ec3a258409f4d730387c934e80`. A 4096x2048 comparison against the uncullled baker found exactly zero differing RGBA texels. Linear-light temporal blending is corrected. Alpha neighbor-jump P99 fell from 34 to 8 byte values, with no material loss of the cloud layout in raw asset inspection. Nine independently run focused tests passed.
- Remaining risk: point-sampled fine RGB filaments can still alias, particularly at the retained 2K touch resolution. The change reduces demonstrated coarse texture/height artifacts; only manual rendering can establish whether the reported pixelation is resolved.
- No browser automation or gameplay screenshots. Final close-range clarity, temporal appearance, and frame rate remain manual checkpoints.

## Wing Rocket Interception Follow-up

- Manual finding: `R` rockets circle targets without hitting. The previous impact regression only covered large stationary rocks, so its pass did not establish useful small-target guidance.
- Reproduced with actual production missile/asteroid updates: both rockets expired without damage against a small rock 6 or 30 units straight ahead, and against a close off-axis rock. One of two missed an obliquely moving target.
- Wing-specific correction: short rack-clearance phase, rate-limited quaternion steering that handles exact reversal, predictive aim using approach speed, and bounded terminal deceleration. Keep cruise speed, damage, blast radius, physical collision radii, swept collision tests, seeker guidance, and wing-rack reload unchanged.
- Eight production reproduction scenarios now hit with both rockets. Four new regression cases pass: seven close/moving small-rock scenarios through actual `updateGame`, two moving targets from pitched/rolled high-speed flight, dead-target reacquisition behind an overshot missile with bounded turn/deceleration, and a native-health maneuvering hunter kill followed by reacquisition/kill of a newly arrived small rock.
- Independent critic: 394/402 real swept impacts across 201 scenarios, including 72/72 against production hunters. Two misses followed asteroid belt-return invalidation; six used abrupt scripted reversals at minimum 0.4 steering tuning. No retained-target failure reproduced at default tuning, and no enlarged hitbox or artificial damage found.
- Feel tradeoff: terminal speed control increased an already-successful stationary 60-unit interception from about 0.53 s to 1.16 s in the critic's probe. Appearance and feel still require manual playtesting; not every maneuver or tuning extreme guarantees a hit.
- Verification complete: 114-case full suite passed with zero failures/skips (161.90 s); the subsequently added native-health hunter/reacquisition regression also passed separately (1.70 s). All 115 permanent checks are covered. Module syntax and whitespace checks pass; original source SHA remains unchanged.
- Independently reviewed game SHA: `e818bbb9753aa226f41780ae3542116010214c203cd30a6b18877bc565aeec06`. No browser automation was run.

## Prior Upgrade

- Lead: multi-target gun salvos and seeker locks, two physical wingtip rockets with independent reload, spherical missile launch/explosion effects, retro exhaust, and near-planet asteroid returns.
- Celestial builder: richer giant/rings/moons/Milky Way with a bounded shader and pixel budget, time-based adaptive rendering toward 60 FPS.
- HUD builder: persistent contact identities, multi-target lead cues, off-screen threat tracking, compact situational awareness, wing-rocket readiness, and performance telemetry.
- Verification builder: expanded the original 77 regressions to 111 production checks, plus optional CPU-only workload measurements for the new systems.
- Integrated: celestial texture/quality pass, persistent-contact HUD, weapons, spherical effects, retro exhaust, asteroid returns, and one instanced batch for all triangle debris.
- Integration smoke caught a HUD marker initialization failure while the new pass was being assembled; corrected and actual production bootstrap now passes. Contact projections run every render while ranking/readouts run at 20 Hz.
- Independent core review: no material weapon/flight blocker reproduced. Its debris-fog parity finding received a correction using the pinned Three.js fog/color shader chunks, independently confirmed closed.
- Independent whole-artifact review: corrected double aspect correction in rim bearings, cooldown/ready styling disagreement, overlapping multi-target lead labels, and stale respawn exhaust history. Final independent probes closed all four on source SHA prefix `e31f4f424134`: accurate bearings across desktop/ultrawide/portrait, distinct label boxes at coincident true intercepts, readiness following heat/cooldown, and post-respawn ribbon edges around 0.19 units rather than 102.5. No additional material finding reproduced.
- Current static checks: module parses, all 113 DOM IDs unique, original source SHA unchanged. Runtime diagnostics now expose adaptive render scale, pixel budget, rolling frame time, and effective quality.
- Final production suite: 111 passed, 0 failed, 0 skipped, expanded from 77. Verification builder ran it in 142.69 s; lead independently reran all 111 in 144.88 s with the same result. Optional CPU workloads include boss waves 10/20 and dense non-boss wave 19.
- No FPS guarantee: actual GPU throughput, visual quality, native input, and layout require the user's manual playtest. No browser automation was run.

### Final Workload Evidence

Lead ran the actual production `animate()` at simulated 60 Hz, including 120 Hz physics,
clocked HUD ranking, effects, and all CPU render preparation. Each case includes 120
warmup steps, then 1,200 measured physics steps (600 frames). Scripted input holds MK7
thrust/yaw/fire, attempts wing rockets each second, replenishes Tempest each four seconds,
and applies a lethal asteroid hit each two seconds. Invulnerability keeps the workload alive.

| Wave | Peak Rocks / Shots / Missiles | Peak Shards | Mean CPU/Frame | p95 | Max |
| --- | --- | --- | --- | --- | --- |
| 10 | 28 / 115 / 12 | 105 | 0.209 ms | 0.338 ms | 0.606 ms |
| 19 | 75 / 115 / 13 | 131 | 0.327 ms | 0.461 ms | 1.827 ms |
| 20 | 43 / 115 / 12 | 111 | 0.266 ms | 0.429 ms | 0.897 ms |

All three cases passed with zero skips. Each exercised 191 contact scans and one debris
instance batch. Apple M5, Node 22.22.2; final game SHA-256:
`e31f4f4241348446f51235a1a1e423da03cd5403aee058980070eb25caa59c01`.

Reproduce from the repository:

```sh
ASTRA_BENCH=1 node --experimental-vm-modules --test --test-reporter=spec --test-name-pattern='CPU benchmark' tests/asteroids-astra.test.mjs
```

These are CPU-only measurements with explicit DOM/renderer/composer adapters, not FPS.
They exclude browser layout, WebGL submission, GPU execution, and shader compilation.
They are samples of scripted workloads, not exhaustive worst-case performance bounds.

### Celestial CPU Profile

- Apple M5, Node 22.22.2, real Three.js r174, 1280x800 adapter viewport, fresh texture bakes. Sample source SHA prefix `569ca6ec93e9`, before the final HUD corrections.
- Actual `init()` CPU time: 1,250.6 ms. Included builder times: sky 411.1 ms, giant 733.3 ms, moons 80.2 ms, rings 1.3 ms, ring dust 1.0 ms. These are nested in init, not additive costs beyond it.
- Six celestial RGBA8 textures: 18,358,272 base bytes (17.51 MiB); uncompressed mip payload estimate 24,483,160 bytes (23.35 MiB). This is not total GPU memory.
- Excludes browser layout, shader compilation, texture upload, GPU mip generation, and rendering. Startup preparation and frame rate are different measurements.

## Baseline

- Target: `asteroids-3d-astra.html`, copied directly from `asteroids-3d.html`.
- Both initial SHA-256: `827025e437eaf8a126139afb8c6b6ab8894206ea406b04ba37b010977bf9e011`.
- Original file remains unchanged.
- Manual visual/play testing belongs to the user. No browser automation.

## Initial Variant Status

- Complete: flight assist, inertial flight, rechargeable boost, all-vector brake, FOV response, local speed dust.
- Complete: entry-time and relative-motion collision tests, boss-size broadphase, multi-hit piercing, predictive/converging guns, fixed 120 Hz steps.
- Integrated: unframed edge instruments, separate nose/velocity/lead markers, four camera modes, touch boost, hit/heat/contact feedback.
- Complete: final production-module Node suite, independently rerun by the lead: 77 passed, 0 failed, 0 skipped (6.13 s).
- Complete: final-review corrections for forward-cone missile painting, rate-derived projectile capacity, no phantom firing under pool pressure, click/keyboard fallback focus, independently held gun triggers, and an explicit peak-combo label.
- Independent critic's second pass: all five reproduced gaps resolved; no remaining major code-level gap reproduced. The permanent suite includes 17 additional regressions covering that correction round.
- Complete: README and workspace reference updates. Original source hash rechecked unchanged.

## Bar

Mouse flight and keyboard thrust must feel precise; every targeting cue must correspond
to a real firing solution. Full 3D movement, original world art, missiles, Tempest,
progression and particle safeguards must survive. Static results do not prove visual
quality or frame rate; those remain explicit manual checkpoints.

## Initial Variant Evidence

- Direct-copy checksum verified before edits.
- Initial independent critic identified twin-gun divergence, closest-approach instead of entry-time collision, boss/fragment broadphase omissions, and render-rate-dependent simulation/cadence. Targeted production changes address those gaps.
- Fresh complete-artifact critic reproduced rearward missile painting, MK7 shot-pool exhaustion with phantom firing feedback, fine-pointer fallback click/focus failure, mixed-input trigger cancellation, and a mislabeled combo readout. Each received a targeted correction and a new regression request. The critic's CPU-only stress probes found no additional performance blocker; this is not a GPU frame-rate result.
- Independent correction probes: missile paint accepts 39.9 degrees and rejects 40.1 degrees, sideways, and rearward contacts; all seven tiers sustain complete salvos; MK7 peaks at 161/168 pool slots; forced exhaustion spends no heat/cooldown/sparks; fallback taps fire and focus the canvas; four simultaneous gun triggers release independently and pause clears all; `PEAK x` labels the combo record.
- Integration caught the focused-button keyboard guard blocking flight after pointer capture; focus filtering now respects active mouse capture.
- New speed dust is one geometry batch (180 grains desktop, 90 touch), with initialized centers, circular alpha discard, depth testing, and bounded brightness. No raw `PointsMaterial` added.
- Local HTTP header check: `200 OK` at `http://localhost:8000/webgl-games/asteroids-3d-astra.html`.
- Module syntax passes; all 102 DOM IDs are unique. Diff whitespace checks pass.
- Integrated tests cover actual scene builders and finite transforms/buffers, HUD projection/occlusion/contact limits, paused/stale feedback, focused keyboard handling, quaternion axes, assist/retro/braking/boost release, identical simulated flight at 20/60/144 render Hz, collision entry and moving-target sweeps, boss/fragment broadphase, celestial obstruction, intercept math and barrel convergence, pool cleanup, and reset persistence.
- Final command: `node --experimental-vm-modules --test --test-reporter=spec tests/asteroids-astra.test.mjs`. All 77 tests pass, with no skipped cases. The original-source SHA assertion also passes.
- No browser automation, screenshots, or GPU measurements were run. Manual flight feel, appearance, frame rate, native pointer-lock behavior, and layout remain unverified.
