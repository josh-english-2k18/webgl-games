/**
 * Nonbrowser production-module regressions for ARGON // Armillary (asteroids-argon.html).
 * Executes the shipped module against Three.js r174 with GPU adapters; it does not prove shaders render,
 * layout, frame rate, pointer lock or flight feel.
 * From webgl-games/:
 *   node --experimental-vm-modules --test --test-reporter=spec tests/asteroids-argon.test.mjs
 * Needs the r174 cache described in tests/asteroids-astra.test.mjs (three.module.js + three.core.js).
 */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, test } from 'node:test';
import vm from 'node:vm';

assert.equal(typeof vm.SourceTextModule, 'function', 'Run Node with --experimental-vm-modules');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(repo, 'asteroids-argon.html');
const html = await readFile(htmlPath, 'utf8');
const modules = [...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(modules.length, 1, 'Expected one inline game module');
const source = modules[0][1];
const rendererConstructor = /new THREE\.WebGLRenderer\(\{[^}]*\}\)/g;
assert.equal([...source.matchAll(rendererConstructor)].length, 1, 'GPU boundary changed');
const executable = source.replace(rendererConstructor, 'globalThis.__gpuRenderer');
const moduleLine = html.slice(0, modules[0].index + modules[0][0].indexOf('>') + 1).split('\n').length - 1;
const SIM_DT = 1 / 120;

async function findThree() {
    const candidates = process.env.ASTRA_THREE_MODULE
        ? [resolve(process.env.ASTRA_THREE_MODULE)]
        : [...new Set([
            join(tmpdir(), 'astra-three-r174', 'three.module.js'),
            '/tmp/astra-three-r174/three.module.js',
            join(repo, 'node_modules/three/build/three.module.js'),
            join(repo, '../node_modules/three/build/three.module.js')
        ])];
    for (const path of candidates) {
        try {
            const module = await readFile(path, 'utf8');
            const core = await readFile(join(dirname(path), 'three.core.js'), 'utf8');
            assert.match(core, /const REVISION = ['"]174['"];/);
            return { path, module, core };
        } catch (_) {}
    }
    throw new Error('Three.js r174 cache unavailable in /tmp/astra-three-r174');
}
const threeFiles = await findThree();

class ElementStub {
    constructor(tagName = 'div', ownerDocument = null) {
        this.tagName = tagName.toUpperCase();
        this.ownerDocument = ownerDocument;
        this.style = { setProperty(name, value) { this[name] = String(value); } };
        this.dataset = {};
        this.children = [];
        this.parentNode = null;
        this.attributes = new Map();
        this.classes = new Set();
        this.listeners = new Map();
        this.value = '';
        this.checked = false;
        this.text = '';
        this.rect = { left: 0, top: 0, right: 160, bottom: 36, width: 160, height: 36 };
        const classes = this.classes;
        this.classList = {
            add: (...names) => names.forEach((n) => classes.add(n)),
            remove: (...names) => names.forEach((n) => classes.delete(n)),
            contains: (n) => classes.has(n),
            toggle(n, force = !classes.has(n)) {
                if (force) classes.add(n); else classes.delete(n);
                return force;
            }
        };
    }
    get parentElement() { return this.parentNode; }
    get textContent() { return this.text + this.children.map((c) => c.textContent).join(''); }
    set textContent(v) { this.children = []; this.text = v == null ? '' : String(v); }
    set innerHTML(v) {
        this.children = [];
        for (const m of String(v).matchAll(/<span\s+class="([^"]+)"[^>]*><\/span>/g)) {
            const child = new ElementStub('span', this.ownerDocument);
            m[1].split(/\s+/).filter(Boolean).forEach((c) => child.classList.add(c));
            this.appendChild(child);
        }
    }
    getContext(type) { return type === 'webgl2' ? {} : null; }
    addEventListener(type, cb) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(cb);
    }
    removeEventListener(type, cb) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter((f) => f !== cb));
    }
    dispatch(type, event = {}) {
        const target = this.tagName === 'DOCUMENT' && type.startsWith('key') ? this.activeElement : this;
        const e = { target, preventDefault() {}, stopPropagation() {}, ...event };
        for (const cb of this.listeners.get(type) || []) cb(e);
    }
    appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
    replaceChildren(...nodes) { this.children = []; nodes.forEach((n) => this.appendChild(n)); }
    setAttribute(k, v) { this.attributes.set(k, String(v)); }
    getAttribute(k) { return this.attributes.get(k) ?? null; }
    getBoundingClientRect() { return { ...this.rect }; }
    setBoundingClientRect(r) { this.rect = { ...this.rect, ...r }; }
    querySelector(sel) {
        if (sel.startsWith('.')) {
            const cls = sel.slice(1);
            return this.children.find((c) => c.classList.contains(cls)) || null;
        }
        return null;
    }
    focus() {}
    animate() { return { cancel() {} }; }
}

function makeDocument() {
    const doc = new ElementStub('document');
    doc.body = new ElementStub('body', doc);
    doc.documentElement = new ElementStub('html', doc);
    doc.activeElement = doc.body;
    const byId = new Map();
    for (const m of html.matchAll(/\bid="([^"]+)"/g)) {
        const el = new ElementStub('div', doc);
        el.id = m[1];
        doc.body.appendChild(el);
        byId.set(m[1], el);
    }
    for (const [id, v] of [
        ['shake-slider', '1'], ['cascade-slider', '1'], ['pull-slider', '1'], ['sling-slider', '1'],
        ['thrust-slider', '26'], ['drag-slider', '0.62'], ['turn-slider', '4.4'], ['speed-slider', '50'],
        ['mouse-slider', '1'], ['pitch-slider', '1'], ['roll-slider', '1'], ['bloom-slider', '0.26'], ['grade-slider', '0.24']
    ]) {
        if (byId.has(id)) byId.get(id).value = v;
    }
    doc.getElementById = (id) => byId.get(id) || null;
    doc.querySelectorAll = () => [];
    doc.createElement = (t) => new ElementStub(t, doc);
    return doc;
}

class GpuPass { constructor(s) { if (s?.uniforms) this.uniforms = structuredClone(s.uniforms); } }
class GpuComposer {
    constructor() { this.passes = []; this.renderCalls = 0; }
    setPixelRatio() {}
    setSize() {}
    addPass(p) { this.passes.push(p); }
    render() { this.renderCalls++; }
}
const gpuImports = {
    'three/addons/postprocessing/EffectComposer.js': { EffectComposer: GpuComposer },
    'three/addons/postprocessing/RenderPass.js': { RenderPass: GpuPass },
    'three/addons/postprocessing/UnrealBloomPass.js': { UnrealBloomPass: GpuPass },
    'three/addons/postprocessing/ShaderPass.js': { ShaderPass: GpuPass },
    'three/addons/postprocessing/OutputPass.js': { OutputPass: GpuPass }
};

const expose = `
globalThis.__argon = {
    THREE, state, input, player, scene, camera, composer, gradePass, ui,
    asteroids, hunters, missiles, shots, pendingShatter, geoPool,
    animate, updateGame, resetRun, createAsteroid, hitAsteroid, clearCollection, spawnHunter,
    fireWingRockets, fireTempest, solveGunIntercept, isGunSolution, getForward,
    ICE_FAMILIES, lattice, wake, pinch, nova, armillary, beams, arcBolts, hullDrive, lantern,
    buildLatticeGraph, findLoopClosure, pinchBonus, ionizeRock, rebuildLattice, triggerPinch, wakeNodeAt,
    armillaryMisalignment, updateArgonVisuals, LATTICE_ION_THRESHOLD, TETHER_REACH, PINCH_DRAW, NOVA_DURATION,
    cryoBursts, screenShocks, envProbe, colorGradeShader, limitBloomFireflies, ringSystem, gasGiant
};
`;

async function loadArgon() {
    const document = makeDocument();
    const window = new ElementStub('window');
    Object.assign(window, {
        innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
        location: { search: '' },
        matchMedia: () => ({ matches: false }),
        WebGL2RenderingContext: class {}
    });
    let now = 1000;
    const frames = new Map();
    let cbId = 0;
    const errors = [];
    const renderer = {
        domElement: new ElementStub('canvas', document),
        capabilities: { maxTextureSize: 2048, getMaxAnisotropy: () => 4 },
        setPixelRatio() {},
        setSize() {}
    };
    const context = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    Object.assign(context, {
        document, window, URLSearchParams,
        performance: { now: () => now },
        console: { ...console, info() {}, error: (...args) => errors.push(args) },
        localStorage: { getItem: () => null, setItem: () => {} },
        requestAnimationFrame: (cb) => { frames.set(++cbId, cb); return cbId; },
        cancelAnimationFrame: (id) => frames.delete(id),
        setTimeout: () => 1, clearTimeout: () => {},
        __gpuRenderer: renderer
    });
    const core = new vm.SourceTextModule(threeFiles.core, { context, identifier: join(dirname(threeFiles.path), 'three.core.js') });
    const three = new vm.SourceTextModule(threeFiles.module, { context, identifier: threeFiles.path });
    await three.link(() => core);
    await three.evaluate();
    const gameModule = new vm.SourceTextModule(executable + expose, {
        context, identifier: htmlPath, lineOffset: moduleLine
    });
    await gameModule.link((spec) => {
        if (spec === 'three') return three;
        const exp = gpuImports[spec];
        return new vm.SyntheticModule(Object.keys(exp), function () {
            for (const [k, v] of Object.entries(exp)) this.setExport(k, v);
        }, { context, identifier: spec });
    });
    await gameModule.evaluate({ timeout: 15000 });
    assert.equal(errors.length, 0, `Startup errors: ${errors.join('\n')}`);
    const game = context.__argon;
    return Object.assign(game, {
        document,
        window,
        errors,
        advanceTime(dt) { now += dt * 1000; },
        // Mirrors one fixed animate() simulation step.
        sim(steps = 1) {
            for (let i = 0; i < steps; i++) {
                game.state.visualTime += SIM_DT;
                game.updateGame(SIM_DT, SIM_DT, SIM_DT);
            }
        },
        frame(dt = 1 / 60) {
            now += dt * 1000;
            game.animate();
        }
    });
}

function isolate(game) {
    game.clearCollection(game.asteroids);
    game.clearCollection(game.hunters);
    game.state.invulnerable = 100;
    game.player.velocity.set(0, 0, 0);
}

describe('ARGON // Armillary production module (Three.js r174)', { concurrency: false }, () => {
    let game;

    beforeEach(async () => {
        game = await loadArgon();
    });

    afterEach(() => {
        if (!game) return;
        game.scene.traverse((obj) => {
            obj.geometry?.dispose();
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) m?.dispose();
        });
        game = null;
    });

    test('sets readiness flags and passes all 19 spatial + Armillary invariants', () => {
        assert.equal(game.window.__argonWakeReady, true);
        assert.equal(game.window.__argonArmillaryReady, true);
        assert.equal(game.window.__asteroidsArgonReady, true);
        assert.equal(game.document.documentElement.dataset.ready, 'argon-armillary');
        const diag = game.window.__asteroidsArgonDiagnostics.run();
        assert.equal(diag.results.length, game.window.__asteroids3DDiagnostics.run().results.length + 8);
        assert.equal(diag.results.length, 19);
        for (const r of diag.results) assert.equal(r.pass, true, `Failed diagnostic: ${r.name} ${JSON.stringify(r.details)}`);
        assert.equal(diag.passed, true);
    });

    test('runs full animate() frames through every presentation path without errors', () => {
        isolate(game);
        game.createAsteroid('large', new game.THREE.Vector3(170, 12, 20), new game.THREE.Vector3(), 1, 'glass');
        game.createAsteroid('large', new game.THREE.Vector3(180, 12, 24), new game.THREE.Vector3(), 1, 'glass');
        for (const rock of game.asteroids) game.ionizeRock(rock, 1);
        game.rebuildLattice();
        assert.equal(game.triggerPinch(), true);
        game.input.keys.KeyW = true;
        for (let i = 0; i < 90; i++) game.frame(1 / 60);
        assert.equal(game.errors.length, 0, game.errors.join('\n'));
        assert.ok(game.composer.renderCalls >= 90);
        assert.ok(game.state.pinchCount >= 1, 'Z-Pinch must release inside animate()');
        assert.ok(Number.isFinite(game.gradePass.uniforms.uLensStrength.value));
    });

    test('builds the Lantern airframe from authored geometry and drives its hull uniforms', () => {
        const airframe = game.player.group.userData.authoredAirframe;
        assert.ok(airframe?.isGroup, 'Player must carry the authored Lantern airframe');
        let meshes = 0;
        airframe.traverse((obj) => {
            if (!obj.isMesh) return;
            meshes++;
            const pos = obj.geometry.getAttribute('position');
            assert.ok(pos.array.every(Number.isFinite), `${obj.name} vertices must be finite`);
            const nrm = obj.geometry.getAttribute('normal');
            if (nrm) assert.ok(nrm.array.every(Number.isFinite), `${obj.name} normals must be finite`);
        });
        assert.ok(meshes >= 12, 'Airframe must be a composed hull, not a primitive');
        assert.ok(game.lantern.ringGlow && game.lantern.sheath, 'Lantern ring and Cherenkov sheath must exist');

        isolate(game);
        const idle = game.hullDrive.drive.value;
        game.input.keys.KeyW = true;
        for (let i = 0; i < 30; i++) { game.sim(2); game.updateArgonVisuals(1 / 60); }
        assert.ok(game.hullDrive.drive.value > idle + 0.2, 'Thrust must brighten the hull light pipes');
    });

    test('builds six seeded clathrate families with sound, deterministic geometry', () => {
        assert.deepEqual([...game.ICE_FAMILIES], ['geode', 'slab', 'shard', 'cratered', 'binary', 'needle']);
        const largeGlass = game.geoPool['glass:large'];
        assert.equal(largeGlass.variants.length, 6);
        largeGlass.variants.forEach((variant, i) => {
            assert.equal(variant.family, game.ICE_FAMILIES[i]);
            assert.ok(variant.geo.getAttribute('color'), 'Clathrate ice must carry frost vertex colours');
            assert.ok(variant.geo.getAttribute('normal').array.every(Number.isFinite));
        });
        const rock = game.createAsteroid('large', new game.THREE.Vector3(200, 0, 0), new game.THREE.Vector3(), 1, 'glass');
        assert.ok(rock.material.userData.ion, 'Each rock gets its own ion uniform');
        assert.equal(rock.edges.visible, false, 'Legacy wire edges must stay hidden on clathrate ice');
    });

    test('ion wake charges ice the ship threads past, and tethers form a constellation', () => {
        isolate(game);
        game.player.position.set(156, 12, 0);
        game.player.velocity.set(0, 0, 38);
        game.sim(40);
        const wakePoint = game.wakeNodeAt(game.wake.count - 4).pos.clone();
        const near = game.createAsteroid('medium', wakePoint.clone().add(new game.THREE.Vector3(2, 0, 0)), new game.THREE.Vector3(), 1, 'glass');
        const twin = game.createAsteroid('medium', wakePoint.clone().add(new game.THREE.Vector3(-5, 1, 0)), new game.THREE.Vector3(), 1, 'glass');
        const far = game.createAsteroid('medium', new game.THREE.Vector3(-200, 0, 120), new game.THREE.Vector3(), 1, 'glass');
        game.sim(72);
        assert.ok(near.ion >= game.LATTICE_ION_THRESHOLD, `Rock on the wake must ionize (ion ${near.ion})`);
        assert.ok(twin.ion >= game.LATTICE_ION_THRESHOLD, `Rock on the wake must ionize (ion ${twin.ion})`);
        assert.ok(!(far.ion > 0), 'Distant rocks must stay neutral');
        game.rebuildLattice();
        assert.ok(game.lattice.edges.some(([a, b]) => (a === near && b === twin) || (a === twin && b === near)), 'Nearby beacons must tether');
        assert.ok(game.state.latticePinchable >= 2);
    });

    test('Z-Pinch draws a constellation inward, then implodes it with arc bolts and a squared bonus', () => {
        isolate(game);
        game.player.position.set(156, 12, 0);
        const centre = new game.THREE.Vector3(156, 12, 40);
        const rocks = [];
        for (let i = 0; i < 4; i++) {
            const a = (i / 4) * Math.PI * 2;
            const rock = game.createAsteroid('large', centre.clone().add(new game.THREE.Vector3(Math.cos(a) * 9, Math.sin(a) * 9, 0)), new game.THREE.Vector3(), 1, 'iron');
            game.ionizeRock(rock, 1);
            rocks.push(rock);
        }
        const scoreBefore = game.state.score;
        assert.equal(game.triggerPinch(), true);
        assert.equal(game.pinch.phase, 'draw');
        const startGap = rocks[0].group.position.distanceTo(centre);
        game.sim(Math.floor(game.PINCH_DRAW / SIM_DT * 0.5));
        assert.ok(rocks[0].group.position.distanceTo(centre) < startGap, 'Nodes must be drawn toward the centroid');
        assert.ok(game.state.lensStrength > 0.05, 'Gravitational lens must ramp during the draw');
        game.sim(Math.ceil(game.PINCH_DRAW / SIM_DT));
        assert.equal(game.state.pinchCount, 1);
        assert.equal(game.state.lastPinch, 4);
        assert.ok(rocks.every((rock) => rock.dying || !game.asteroids.includes(rock)), 'Every iron node must break');
        assert.ok(game.arcBolts.some((bolt) => bolt.active), 'Release must fire arc bolts');
        assert.ok(game.state.score - scoreBefore >= game.pinchBonus(4), 'Squared pinch bonus must be banked');
        assert.ok(game.state.pinchCooldown > 0);
        assert.equal(game.triggerPinch(), false, 'Cooldown must gate the next pinch');
    });

    test('pinch with no constellation refuses and reports it', () => {
        isolate(game);
        game.createAsteroid('large', new game.THREE.Vector3(170, 12, 30), new game.THREE.Vector3(), 1, 'glass');
        assert.equal(game.triggerPinch(), false);
        assert.equal(game.pinch.phase, 'idle');
    });

    test('closing a flight loop lassoes and ionizes every rock inside it', () => {
        isolate(game);
        const centre = new game.THREE.Vector3(170, 12, 0);
        const inside = game.createAsteroid('small', centre.clone(), new game.THREE.Vector3(), 1, 'glass');
        const loopsBefore = game.state.loopCount;
        const radius = 16;
        const speed = 40;
        const omega = speed / radius;
        for (let step = 0; step < 520 && game.state.loopCount === loopsBefore; step++) {
            const theta = step * SIM_DT * omega;
            game.player.position.set(centre.x + Math.cos(theta) * radius, centre.y, centre.z + Math.sin(theta) * radius);
            game.player.velocity.set(-Math.sin(theta) * speed, 0, Math.cos(theta) * speed);
            game.state.visualTime += SIM_DT;
            game.updateGame(SIM_DT, SIM_DT, SIM_DT);
            game.player.position.set(centre.x + Math.cos(theta) * radius, centre.y, centre.z + Math.sin(theta) * radius);
        }
        assert.ok(game.state.loopCount > loopsBefore, 'A closed wake loop must register a lasso');
        assert.ok(inside.ion >= game.LATTICE_ION_THRESHOLD, 'Rocks inside the lasso must ionize');
    });

    test('shattered ice is born charged so fragments can rejoin the lattice', () => {
        isolate(game);
        const parent = game.createAsteroid('large', new game.THREE.Vector3(190, 12, 30), new game.THREE.Vector3(), 1, 'glass');
        const index = game.asteroids.indexOf(parent);
        assert.equal(game.hitAsteroid(index, parent.group.position.clone(), 1, false, false), true);
        game.sim(12);
        const children = game.asteroids.filter((rock) => rock !== parent && rock.size === 'medium');
        assert.ok(children.length >= 2, 'Large glass must split');
        for (const child of children) assert.ok(child.ion >= game.LATTICE_ION_THRESHOLD, `Fragment ion ${child.ion}`);
    });

    test('Armillary Nova implodes from the cage and ionizes the whole field', () => {
        isolate(game);
        const rocks = [
            game.createAsteroid('large', new game.THREE.Vector3(240, 30, 60), new game.THREE.Vector3(), 1, 'glass'),
            game.createAsteroid('medium', new game.THREE.Vector3(-210, -10, 150), new game.THREE.Vector3(), 1, 'iron'),
            game.createAsteroid('small', new game.THREE.Vector3(30, 120, -150), new game.THREE.Vector3(), 1, 'glass')
        ];
        game.state.charge = game.state.chargeMax;
        game.fireTempest();
        assert.equal(game.nova.active, true);
        game.sim(Math.ceil(game.NOVA_DURATION / SIM_DT) + 4);
        assert.equal(game.nova.active, false);
        for (const rock of rocks) {
            if (rock.dying || !game.asteroids.includes(rock)) continue;
            assert.ok(rock.ion >= game.LATTICE_ION_THRESHOLD, 'Nova must ionize every surviving rock');
        }
        assert.ok(game.armillaryMisalignment(1) < game.armillaryMisalignment(0));
    });

    test('quenchers drain beacons and shear on live tethers', () => {
        isolate(game);
        const a = game.createAsteroid('large', new game.THREE.Vector3(200, 12, 40), new game.THREE.Vector3(), 1, 'iron');
        const b = game.createAsteroid('large', new game.THREE.Vector3(220, 12, 40), new game.THREE.Vector3(), 1, 'iron');
        game.ionizeRock(a, 1);
        game.ionizeRock(b, 1);
        game.rebuildLattice();
        game.spawnHunter(1);
        const hunter = game.hunters[game.hunters.length - 1];
        hunter.group.position.set(210, 12, 40);
        hunter.velocity?.set(0, 0, 0);
        const hpBefore = hunter.hp;
        game.sim(2);
        assert.ok(hunter.hp < hpBefore || hunter.dying || !game.hunters.includes(hunter), 'A quencher crossing a tether must be sheared');
        assert.ok(a.ion < 1 || b.ion < 1, 'A quencher must drain nearby beacons');
    });

    test('predictive guns and wingtip rockets still intercept in full 3D', () => {
        isolate(game);
        game.player.position.set(156, 20, 0);
        game.player.orientation.identity();
        const rock = game.createAsteroid('small', new game.THREE.Vector3(156, 20, 26), new game.THREE.Vector3(), 1, 'glass');
        rock.velocity.set(2, -1, 0);
        const intercept = new game.THREE.Vector3();
        assert.equal(game.solveGunIntercept(rock, intercept), true);
        assert.equal(game.isGunSolution(rock), true);
        game.fireWingRockets();
        assert.equal(game.missiles.length, 2, 'Both wingtip racks must launch');
        for (let step = 0; step < 160 && !rock.dying && game.asteroids.includes(rock); step++) game.sim(1);
        assert.ok(rock.dying || !game.asteroids.includes(rock), 'Wingtip rockets must intercept a moving rock');
    });

    test('alternating 488 nm / 514 nm argon lances share one shot pool', () => {
        isolate(game);
        game.player.position.set(156, 20, 0);
        game.input.firing = true;
        game.sim(40);
        const colours = new Set(game.shots.map((shot) => shot.group.material.color.getHexString()));
        assert.ok(colours.size >= 2, `Expected both argon lines, saw ${[...colours].join(', ')}`);
    });

    test('presentation layers: visible tethers, cryo bursts, screen shocks, quiet shield, HDR-safe grade', () => {
        isolate(game);
        const THREE = game.THREE;
        assert.equal(game.beams.mesh.material.side, THREE.DoubleSide, 'Tether quads wind clockwise in view space and must not be culled');
        assert.ok(game.cryoBursts.mesh, 'Cryo burst impostors must be built');
        assert.equal(game.envProbe.generator, null, 'The reflection probe must stay inert without a real WebGL renderer');
        assert.doesNotMatch(game.colorGradeShader.fragmentShader, /clamp\(color, 0\.0, 1\.0\)/, 'The grade must hand HDR to the tone curve unclipped');
        const shield = game.player.shield.material;
        assert.ok(shield.uniforms && shield.uniforms.uStrength, 'Shield must be the fresnel lattice shader');
        game.state.invulnerable = 0;
        game.sim(2);
        assert.ok(shield.uniforms.uStrength.value < 0.2, 'A resting shield must stay nearly invisible');

        game.player.position.set(156, 20, 0);
        game.player.orientation.identity();
        game.camera.position.set(156, 24, -14);
        game.camera.lookAt(156, 20, 30);
        game.camera.updateMatrixWorld(true);
        const rock = game.createAsteroid('large', new THREE.Vector3(156, 20, 30), new THREE.Vector3(), 1, 'glass');
        const before = game.state.visualTime;
        game.hitAsteroid(game.asteroids.indexOf(rock), rock.group.position.clone(), 999, false, true, 4);
        for (let step = 0; step < 30 && game.asteroids.includes(rock); step++) game.sim(1);
        const births = game.cryoBursts.params.array.filter((_, i) => i % 4 === 0);
        assert.ok(births.some((birth) => birth >= before - 1e-6), 'Destroying ice must spawn a cryo burst');
        assert.ok(game.screenShocks.some((shock) => shock.age < shock.life), 'Destroying ice must queue a screen shock');
        game.updateArgonVisuals(1 / 60);
        const shocks = game.gradePass.uniforms.uShocks.value;
        assert.ok(shocks.some((shock) => shock.w > 0 && shock.x > 0 && shock.x < 1 && shock.y > 0 && shock.y < 1), 'An on-screen blast must project into the grade');
    });

    test('rendering hygiene: no coincident halo z-fighting, no square cell glints, firefly-limited bloom', () => {
        for (const ring of game.armillary.rings) {
            assert.match(ring.halo.material.fragmentShader, /if \(across < 0\.4167\) discard;/, 'Halo must skip the band it shares a surface with');
        }
        assert.doesNotMatch(game.ringSystem.outsideMaterial.fragmentShader, /floor\(vWorld/, 'Ring sparkle must not light whole world-space cells');
        const giant = game.gasGiant.material.fragmentShader;
        assert.match(giant, /textureGrad\(map/, 'Warped cloud lookups must keep unwarped mip gradients');
        assert.match(giant, /vObj\.xz \/ \(1\.0 \+ capY\)/, 'Poles must use the singularity-free stereographic cap');
        const pass = { materialHighPassFilter: { fragmentShader: 'void main() {\n\tvec4 texel = texture2D( tDiffuse, vUv );\n\tgl_FragColor = texel;\n}', needsUpdate: false } };
        assert.equal(game.limitBloomFireflies(pass), true);
        assert.match(pass.materialHighPassFilter.fragmentShader, /texel\.rgb \/= 1\.0 \+ max\(/, 'Bloom input peaks must be soft-limited');
        assert.equal(game.limitBloomFireflies({}), false, 'A stub bloom pass must be left alone');
    });
});
