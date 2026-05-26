# Design Philosophy

This workspace is for small WebGL experiments that can become unusually polished after a few focused iterations. The goal is not just to make a thing work in WebGL. The goal is to find the expressive system inside the idea.

Prismalith Engine is the current quality benchmark. It works because the default scene is immediately compelling, the visual system has a clear identity, the motion is rich without becoming unreadable, and the controls deepen the experience instead of merely toggling features.

## Core Principles

### Identity First

Start with a strong premise. A good experiment should feel like a specific artifact, not a generic implementation.

Examples:

- `Prismalith Engine`, not just particle morphing.
- `Causal Field`, not just neural network visualization.
- `Signal City`, not just system map.
- `Kinetic Containment`, not just ball physics v2.
- `Barycentric Dawn`, not just a three-body demo.
- `Vector Bloom`, not just particle flow.

The name, visual language, controls, readouts, and motion should reinforce the same idea.

### Default-State Excellence

The first load matters. The scene should already feel alive, legible, and intentional before the user touches anything.

Controls should deepen or redirect the system. They should not be required to make the page interesting.

### Readable Density

Dense is good when it remains readable. The best experiments have enough activity to feel alive while still preserving structure.

Use:

- Strong silhouettes and spatial organization.
- Tuned scale and spacing.
- Color palettes with hierarchy.
- Bloom and trails that clarify motion instead of washing it out.
- HUD metrics that reveal what the system is doing.

Avoid visual noise that looks impressive only for a second and then becomes indistinct.

### Particle Sprite Hygiene

Never use raw textureless `PointsMaterial` for visible glowing particles in polished experiments. It renders square sprites, and with additive blending or bloom those squares can collapse into the recurring giant fixed glowing-square failure.

For visible particle fields:

- Use shader particles or a sprite texture with circular alpha.
- Hard-cap `gl_PointSize`.
- Discard fragments outside the intended particle circle.
- Initialize particle buffers offscreen or into valid first-frame positions before rendering.
- If a custom shader point field still renders as squares after circular discard and point-size caps, remove `THREE.Points` from the affected scene and use textured scene geometry instead.
- Treat a single fixed glowing square as a blocker, not a cosmetic issue.

### Feel Before Feature Count

For games, correct rules are only the baseline. Movement, timing, input response, collision feedback, scoring pressure, powerup readability, and recovery loops determine whether the game feels good.

Asteroids is the clearest example. It is visually acceptable, but movement, playability, powerups, and moment-to-moment feedback need iteration before more features matter.

### Controls As Expressive Levers

Every control should produce an immediate visible or tactile consequence.

Good controls reshape the system:

- Morph form.
- Inject signal.
- Pulse traffic.
- Change temperature.
- Trigger vortex.
- Alter gravity or bounce.

Weak controls merely expose implementation details without changing the experience in a meaningful way.

### HUDs As Instruments

HUDs should show state, not explain the app. Prefer compact readouts, selection details, meters, and event logs over instructional copy.

The scene should teach itself through feedback. In-app text should support the system's fiction and state, not describe the UI.

### Preserve Lineage

Keep originals when an experiment evolves meaningfully. Make `v2`, `v3`, or named variants instead of overwriting useful history.

This makes taste visible. Comparing versions helps show what actually improved.

## Lessons From Current Experiments

### Prismalith Engine

Prismalith is the strongest work so far and should be treated as the benchmark for expressive visual systems.

What works:

- Strong identity.
- Impressive first frame.
- Rich but legible particle density.
- Shader motion that feels designed.
- Clear form changes.
- Restrained bloom.
- Controls that meaningfully shape the scene.

When building future visual systems, ask whether the default scene reaches this level of presence.

### Causal Field And Signal City

These work because they translate abstract systems into spatial metaphors. The user can inspect subsystems, watch traffic, and see pressure move through the environment.

What to preserve:

- Data/system concepts mapped to visible structures.
- Modes that alter behavior, not just colors.
- Clickable entities with meaningful local response.
- Projected labels used sparingly.
- Metrics that track the system's state.

### Chess, Go, And Checkers

These are solid, but more pedestrian. They succeed as functional board-game implementations, but their concepts are inherited rather than discovered.

To raise them above competent:

- Add stronger material identity.
- Improve piece motion and capture feedback.
- Increase atmosphere without hurting board readability.
- Consider AI, analysis, replay, or ritual-like presentation as differentiators.

### Asteroids

Asteroids has acceptable visual direction, but it needs feel-first iteration.

Priorities:

- Ship acceleration, drag, rotation, and thrust feel.
- Shooting cadence and projectile readability.
- Collision feedback and recovery windows.
- Enemy and asteroid timing.
- Powerup identity, timing, and pickup feedback.
- Scoring pressure and escalation.

Do not add more mechanics until movement and combat feel good.

### Gravity Loom

Gravity Loom is the first deliberate test of this design philosophy after writing it down. It should be judged less as a technical demo and more as an artifact: a suspended mass-thread instrument with readable density and expressive controls.

The result is a process success but a useful concept lesson. Gravity Loom is gorgeous, graphically solid, well built, and has a strong UI. After playtesting, the idea itself is not as exciting as the strongest particle engines. Treat that distinction as important: execution quality and concept excitement are different axes.

What to watch during iteration:

- Does the default scene feel compelling before input?
- Do the thread bundles read as a loom rather than random lines?
- Are pulse, knot, unwind, gravity, tension, and flow visibly distinct?
- Does dense shuttle traffic clarify motion instead of creating noise?
- Does the HUD feel like an instrument panel for the loom?
- After the visual craft is working, is the underlying idea still exciting?

### Vector Bloom

Vector Bloom is the current playable-particle test. It exists to answer a specific question: can the Prismalith-style particle language support an engaging loop with goals, pressure, and tactile control?

What to preserve during iteration:

- Particle flow should remain the main subject, not a background effect.
- Draggable field nodes should produce immediate, readable consequences.
- Gates, overload wells, score, stability, and log feedback should make consequences visible without heavy instruction text.
- The default scene should already have strong flow, active pressure, and visible gate progress.
- The first playable loop should stay compact enough to evaluate feel before adding more mechanics.

The main playtesting risk is that it becomes a beautiful toy rather than a game. If the loop is not exciting, iterate on pressure, timing, gate feedback, and node affordance before adding new node types.

`vector-bloom-grok.html` is the external-agent comparison variant. Treat it as a useful test of the same philosophy: keep the original readable particle instrument intact, then evaluate whether professional game-development polish actually clarifies intent. Valuable upgrades include explicit player feedback for gates, combos, pressure, and recovery; discoverable controls instead of hidden shortcuts; and bug fixes that preserve visual state, such as rebuilding node geometry when the selected type changes.

When using AI-generated variants, review them like production submissions. Check shortcut conflicts, stale rendered state, draw-range math, selector wiring, particle-sprite hygiene, and whether new feedback strengthens the core loop rather than burying it.

### Kinetic Containment

Kinetic Containment shows the value of iterative tuning. The original demo was functional; v2 became more compelling by adding a premise, density, controls, HUD diagnostics, better particles, and a clearer visual system.

Current design constraints:

- Preserve the original ball physics file.
- Tune v2 separately.
- Gravity defaults to 0.
- Default density is 320 bodies, max 640.
- Bodies use varied blue palettes.
- Bodies should remain small enough for density to read.
- Collisions should be visibly physical, not decorative.

### Barycentric Dawn

Barycentric Dawn is the current test for realistic simulation as an expressive artifact. It should read as a gravity-driven two-star one-planet system first, then as a beautiful particle scene second.

Current design constraints:

- Keep the body motion tied to scaled Newtonian gravity.
- Preserve visible barycentric motion and orbital trails.
- Use stellar flux, solar wind, atmosphere, and magnetosphere particle-flow layers to clarify cause and effect.
- Use gravity-particle effects to make spacetime distortion dynamic, but keep them bounded and readable.
- Do not keep a mesh or line surrogate for spacetime distortion when the design calls for particles. The particles themselves must be visible, simulated, and responsible for the effect.
- A particle effect that is only technically present is a failed particle effect. Default particle size, opacity, count, seeding, and render order must make the effect obvious in the first viewport.
- If particles represent gravity wells, they need coherent per-body structure and continuous flow. A random cloud falling toward one body, or particles orbiting like satellites, does not communicate spacetime curvature.
- Keep gravity-well particle flow source-body-local. The barycenter can be labeled and connected, but it should not become the default particle sink unless the design explicitly asks for barycentric accretion.
- For moving celestial bodies, compute gravity-well particle stream targets in body-local coordinates each frame. Free world-space particles will visually chase the bodies and read as fog, not as a replacement for the old body-local mesh.
- Do not remove unrelated readability layers while replacing a failed layer. Celestial connection lines, orbital trails, magnetosphere particle flow, and gravity-particle distortion each have separate jobs.
- When a planet-local force layer is requested as particles, remove the line proxy for that layer and build a local-frame birth/death stream. Static curves with particles added on top are not a real replacement.
- Keep the force layers readable rather than letting particles hide the bodies.
- Treat presets as orbital regimes with distinct dynamics, not only camera or color changes.

Lessons from the successful iteration:

- Define each force layer's visual job before implementing it. Orbital trails show history, connection lines show current body relationships, solar wind shows stellar flux, magnetosphere flow shows planet-local shielding, and gravity particles show spacetime-well distortion. If two layers do the same job, one will read as clutter.
- A particle replacement must actually replace the old representation. Leaving a mesh or line proxy in place while adding particles nearby produces conceptual drift and makes debugging harder.
- "Particles are present" is not enough. They must be visible in the default camera, have a clean footprint, preserve frame rate, and communicate their physical role within seconds.
- For gravity wells, avoid three failed shapes: random dust piles, orbiting moth swarms, and barycenter rain. The useful shape is a continuous birth/death flow that remains local to each body while being perturbed by the other bodies.
- Moving sources require body-local particle targets. World-space particles tied loosely to a moving body read as fog chasing the object, even if the math is technically updating.
- Interaction should be bounded. Other bodies and nearby particles can bend, brighten, or offset a local stream, but they should not steal the stream's identity or collapse the scene into one attractor.
- Particle population should follow the meaning of the field. In Barycentric Dawn, gravity-particle counts scale by visual gravity-well size, so the primary sun gets the most, the companion gets fewer, and the planet gets the least while remaining visible.
- Visual hierarchy matters after the physics works. Red gravity particles, cyan/green magnetosphere flow, a dimmed starfield, transparent panels, and distinct trail colors make the separate systems readable instead of merely colorful.
- Performance is part of visual design. One bounded shader-particle field with typed arrays was better than stacked instanced halos, oversized geometry, and expensive overdraw.
- Manual playtesting exposed failures that static correctness missed: the fixed square, invisible particles, haystack arrows, spiderweb lines, dust piles, moth orbits, barycenter rain, and chasing fog. Treat those visual readings as primary evidence.

## Quality Rubric

Before calling an experiment good, check:

- Does the default state look intentional within 10 seconds?
- Can the user describe what the artifact is, not just what tech it uses?
- Is there a coherent visual hierarchy?
- Is dense motion still readable?
- Do controls produce immediate visible consequences?
- Does the HUD reveal state rather than explain usage?
- Does the experience have a stronger identity than a generic demo?
- After playtesting, is the concept itself exciting enough to keep iterating?
- For games, does the core loop feel good before feature expansion?
- Has the relevant README or guidance file been updated?

## Development Notes

Use self-contained HTML, CSS, and modern JavaScript modules unless the experiment clearly needs more structure.

Write source experiments in the git repository when possible. In this workspace, that means `webgl-games/`. Root-level files are best treated as notes, guidance, or older mirrors unless there is a deliberate reason to keep source outside version control.

Prefer:

- Import maps with pinned Three.js versions.
- Small procedural generators.
- Instancing and buffer geometry for dense scenes.
- Shader particles for atmosphere and motion feedback.
- Raycasting for direct inspection.
- Responsive controls that stay usable below `720px`.
- Manual playtesting for visual feel and interaction quality.

Avoid:

- Rewriting older experiments destructively.
- Adding generic UI panels that do not affect the scene.
- Letting bloom, trails, or particles hide structure.
- Using textureless square point sprites for visible glowing particles.
- Building feature lists before the core interaction feels good.
- Treating a working implementation as finished when the identity is still generic.
