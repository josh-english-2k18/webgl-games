# webgl-games
A simple repository of WebGL games, prototypes and experiments.

The strategic direction is to use small, self-contained WebGL experiments to explore richer interactive systems: audio-reactive instruments, generative visual engines, simulation-driven interfaces, and polished single-page prototypes. Each experiment is meant to be immediately runnable, easy to inspect, and useful as a stepping stone for more ambitious real-time creative tools.

See [DESIGN.md](DESIGN.md) for the shared design philosophy, quality rubric, and current lessons from these experiments. See [DEV_LOG.md](DEV_LOG.md) for the running record of experiments, iterations, and playtesting lessons.

## games

- [3D Audio Meter](https://josh-english-2k18.github.io/webgl-games/3d-audio-meter.html) (`3d-audio-meter.html`)
- [Axiom Breach](https://josh-english-2k18.github.io/webgl-games/axiom-breach.html) (`axiom-breach.html`)
- [Rift Conductor](https://josh-english-2k18.github.io/webgl-games/rift-conductor.html) (`rift-conductor.html`)
- [Vector Bloom](https://josh-english-2k18.github.io/webgl-games/vector-bloom.html) (`vector-bloom.html`)
- [Vector Bloom Composer](https://josh-english-2k18.github.io/webgl-games/vector-bloom-composer.html) (`vector-bloom-composer.html`)
- [Vector Bloom Grok](https://josh-english-2k18.github.io/webgl-games/vector-bloom-grok.html) (`vector-bloom-grok.html`)
- [Vesper Belt](https://josh-english-2k18.github.io/webgl-games/asteroids.html) (`asteroids.html`)
- [Vesper Belt Composer](https://josh-english-2k18.github.io/webgl-games/asteroids-composer.html) (`asteroids-composer.html`)
- [Crownfield Chess](https://josh-english-2k18.github.io/webgl-games/chess.html) (`chess.html`)
- [Crownline Checkers](https://josh-english-2k18.github.io/webgl-games/checkers.html) (`checkers.html`)
- [Umbra Meridian Othello](https://josh-english-2k18.github.io/webgl-games/othello.html) (`othello.html`)
- [Sente Garden](https://josh-english-2k18.github.io/webgl-games/go.webgl.html) (`go.webgl.html`)
- [Matrix Audio Visualizer](https://josh-english-2k18.github.io/webgl-games/matrix-audio-visualizer.html) (`matrix-audio-visualizer.html`)
- [Auralith Mastering Console](https://josh-english-2k18.github.io/webgl-games/mastering-console-visualizer.html) (`mastering-console-visualizer.html`)
- [3D Ball Physics Simulation](https://josh-english-2k18.github.io/webgl-games/ball-physics-simulation.html) (`ball-physics-simulation.html`)
- [Kinetic Containment](https://josh-english-2k18.github.io/webgl-games/ball-physics-simulation-v2.html) (`ball-physics-simulation-v2.html`)
- [Vectorwing: Rift Patrol](https://josh-english-2k18.github.io/webgl-games/starfox.html) (`starfox.html`)
- [Fractal Music Visualizer](https://josh-english-2k18.github.io/webgl-games/fractal-music-visualizer.html) (`fractal-music-visualizer.html`)
- [MandelTone Engine](https://josh-english-2k18.github.io/webgl-games/fractal-music-visualizer-v2.html) (`fractal-music-visualizer-v2.html`)
- [Waveglyph Engine](https://josh-english-2k18.github.io/webgl-games/fractal-music-visualizer-v3.html) (`fractal-music-visualizer-v3.html`)
- [Asteroids (Grok 4)](https://josh-english-2k18.github.io/webgl-games/grok-4-asteroids.html) (`grok-4-asteroids.html`)
- [Asteroids (GPT-5)](https://josh-english-2k18.github.io/webgl-games/gpt-5-asteroids.html) (`gpt-5-asteroids.html`)
- [Holograph Particle Morphing](https://josh-english-2k18.github.io/webgl-games/holograph-particle-morphing.html) (`holograph-particle-morphing.html`)
- [Prismalith Engine](https://josh-english-2k18.github.io/webgl-games/holograph-particle-morphing-v2.html) (`holograph-particle-morphing-v2.html`)
- [Causal Field](https://josh-english-2k18.github.io/webgl-games/causal-field.html) (`causal-field.html`)
- [Signal City](https://josh-english-2k18.github.io/webgl-games/signal-city.html) (`signal-city.html`)
- [Gravity Loom](https://josh-english-2k18.github.io/webgl-games/gravity-loom.html) (`gravity-loom.html`)
- [Barycentric Dawn](https://josh-english-2k18.github.io/webgl-games/barycentric-dawn.html) (`barycentric-dawn.html`)
- [Barycentric Dawn Composer](https://josh-english-2k18.github.io/webgl-games/barycentric-dawn-composer.html) (`barycentric-dawn-composer.html`)
- [Barycentric Dawn AGY](https://josh-english-2k18.github.io/webgl-games/barycentric-dawn-agy.html) (`barycentric-dawn-agy.html`)

## notes

`ball-physics-simulation.html` is the original r128 global-script ball-physics container demo and should remain available for comparison.

`ball-physics-simulation-v2.html` is Kinetic Containment, a polished v2 built with the newer Three.js module/import-map pattern used by the recent experiments. It keeps the simulation self-contained and currently defaults to 320 small blue bodies, max 640 bodies, gravity 0, substepped collision resolution, spatial-hash broadphase checks, raycast body inspection, shader field particles, event sparks, and HUD diagnostics. Use manual playtesting as the source of truth for visual and physics feel unless browser automation is explicitly requested.

`gravity-loom.html` is Gravity Loom, a process test for the shared design philosophy. It is visually strong, graphically solid, and has a strong UI, but playtesting showed that the concept itself is not as exciting as the best particle engines. Keep that distinction visible when evaluating future experiments: polished execution is necessary, but not the same as concept strength.

`barycentric-dawn.html` is Barycentric Dawn, a scaled Newtonian three-body simulation with two stars and one terrestrial planet. It layers orbital trails, particle-only gravity distortion, procedural starfield, instanced solar wind, stellar corona embers, ecliptic dust, ion sparks, mutually attracting gravity particles, troposphere scattering, cloud bands, aurora rings, and a bow-shock magnetosphere with continuous planet-local particle flow around the live body integration.

`barycentric-dawn-composer.html` is Barycentric Dawn Composer, a cinematic variant of the same Newtonian three-body suite with camera shot presets, color grading, anamorphic lens streaks, nebula backdrop, film grain, letterboxing, and refined composer-style HUD controls for bloom and grade. Built with Composer 2.5.

`barycentric-dawn-agy.html` is Barycentric Dawn AGY, an observatory-style variant with fixed-timestep Newtonian integration, regime profiles, probe injection, live telemetry, an energy graph, debug force readouts, and a compact Outfit/JetBrains Mono HUD. Built by Gemini 3.5 Flash on Antigravity CLI.

`vector-bloom.html` is Vector Bloom, a playable particle-field experiment built from the pinned design idea. It combines dense shader particles, draggable force nodes, bloom gates, overload pressure wells, score/stability feedback, mode presets, and compact tuning controls to test whether Prismalith-level visual craft can support a genuinely engaging interaction loop.

`vector-bloom-composer.html` is Vector Bloom Composer, a cinematic variant with post-processing bloom and color grade, camera shot presets, projected field labels, a shader flow backdrop, film grain, letterboxing, compact transparent HUD controls, and denser particles. It demonstrates that framing can make the same particle system feel more directed and legible, while still needing separate game-loop evaluation. Built with Composer 2.5.

`vector-bloom-grok.html` is Vector Bloom Grok, a Grok-built variant that received a professional game-developer upgrade pass. It keeps the particle-instrument identity while adding clearer game-loop feedback, explicit unlink/reset controls, combo and gate milestone feedback, pressure telegraphing, and targeted fixes for shortcut conflicts, node visual rebuilding, and resonance link rendering.

`asteroids.html` is Vesper Belt, a wrap-around 3D asteroids shooter with wave progression, shield and heat management, missile locks, pickup upgrades, and a compact mission-driven HUD.

`asteroids-composer.html` is Vesper Belt Composer, a cinematic variant with post-processing bloom and color grade, camera shot presets, a shader belt backdrop, nebula dome, denser starfield, film grain, letterboxing, and compact transparent HUD controls. Bloom and grade tuning live in the debug console. Built with Composer 2.5.

The Vesper Belt comparison sharpened the process lesson: Codex should not build a plain game and wait for a separate presentation pass to add taste. Future game experiments should include the director layer up front: camera grammar, atmospheric frame, transparent HUD hierarchy, feedback language, and live tuning controls alongside movement and combat feel.

## License

This repository is licensed under the MIT License. See [LICENSE](LICENSE) for details.
