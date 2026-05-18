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
- Building feature lists before the core interaction feels good.
- Treating a working implementation as finished when the identity is still generic.
