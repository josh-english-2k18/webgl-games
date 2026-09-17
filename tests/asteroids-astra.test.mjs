/**
 * Nonbrowser production-module regressions. From webgl-games/:
 *   node --experimental-vm-modules --test tests/asteroids-astra.test.mjs
 * Node 22.8+; no npm install or repository dependency is needed.
 * Opt-in CPU timings for real wave 10/19/20 simulations (not GPU FPS):
 *   ASTRA_BENCH=1 node --experimental-vm-modules --test --test-reporter=spec tests/asteroids-astra.test.mjs
 * Optional ASTRA_BENCH_STEPS=1200 (even) measured 120 Hz steps, after 120 warmup steps.
 * Uses actual animate() at 60 Hz, including clocked HUD ranking and CPU render prep.
 * Scripted stress: invulnerable MK7 flight, wing/Tempest volleys, lethal rock hits.
 * Timings are informational; correctness assertions still apply, with no speed threshold.
 *
 * Uses a local Three.js r174 module, never an approximate math implementation.
 * Optional: ASTRA_THREE_MODULE=/absolute/path/to/three.module.js
 * Otherwise populate the temporary cache (both files are required):
 *   curl -fL --create-dirs -o /tmp/astra-three-r174/three.module.js https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.module.js
 *   curl -fL --create-dirs -o /tmp/astra-three-r174/three.core.js https://cdn.jsdelivr.net/npm/three@0.174.0/build/three.core.js
 *
 * The HTML is read once, never written. Its only in-memory substitution is the
 * WebGLRenderer constructor. GPU postprocessing imports use explicit adapters;
 * real init(), scene builders, event binding, and the first animate() tick run.
 * RAF/timers are queued, not automatically advanced. No WebGL, shader, pixel,
 * layout, audio, or actual pointer-lock behavior is claimed by these tests.
 * Every tested game function is exported by appending code to the actual module.
 * Missing APIs, unexpected imports, and swallowed startup errors fail loudly.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { cpus, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { performance as cpuClock } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { after, afterEach, beforeEach, describe, test } from 'node:test';
import vm from 'node:vm';

assert.equal(typeof vm.SourceTextModule, 'function', 'Run Node with --experimental-vm-modules');
const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = join(repo, 'asteroids-3d-astra.html');
const html = await readFile(htmlPath, 'utf8');
const sourceHash = createHash('sha256').update(html).digest('hex');
const modules = [...html.matchAll(/<script\b[^>]*\btype=["']module["'][^>]*>([\s\S]*?)<\/script>/gi)];
assert.equal(modules.length, 1, 'Expected one inline game module');
const source = modules[0][1];
const rendererConstructor = /new THREE\.WebGLRenderer\(\{[^}]*\}\)/g;
assert.equal([...source.matchAll(rendererConstructor)].length, 1, 'GPU boundary changed; review the harness');
const executable = source.replace(rendererConstructor, 'globalThis.__gpuRenderer');
const moduleLine = html.slice(0, modules[0].index + modules[0][0].indexOf('>') + 1).split('\n').length - 1;

async function findThree() {
    const candidates = process.env.ASTRA_THREE_MODULE
        ? [resolve(process.env.ASTRA_THREE_MODULE)]
        : [...new Set([
            join(tmpdir(), 'astra-three-r174', 'three.module.js'),
            '/tmp/astra-three-r174/three.module.js',
            join(repo, 'node_modules/three/build/three.module.js'),
            join(repo, '../node_modules/three/build/three.module.js')
        ])];
    const errors = [];
    for (const path of candidates) {
        try {
            const module = await readFile(path, 'utf8');
            const core = await readFile(join(dirname(path), 'three.core.js'), 'utf8');
            assert.match(core, /const REVISION = ['"]174['"];/, 'Three.js must be pinned to r174');
            return { path, module, core };
        } catch (error) {
            errors.push(`${path}: ${error.message}`);
        }
    }
    throw new Error(`Three.js r174 cache unavailable. Use the curl commands at the top of this test file.\n${errors.join('\n')}`);
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
        this.textContent = '';
        const classes = this.classes;
        this.classList = {
            add: (...names) => names.forEach((name) => classes.add(name)),
            remove: (...names) => names.forEach((name) => classes.delete(name)),
            contains: (name) => classes.has(name),
            toggle(name, force = !classes.has(name)) {
                if (force) classes.add(name); else classes.delete(name);
                return force;
            }
        };
    }
    get parentElement() { return this.parentNode; }
    get className() { return [...this.classes].join(' '); }
    set className(value) {
        this.classes.clear();
        for (const name of String(value).split(/\s+/).filter(Boolean)) this.classes.add(name);
    }
    get textContent() { return this.text + this.children.map((child) => child.textContent).join(''); }
    set textContent(value) {
        this.replaceChildren();
        this.text = value == null ? '' : String(value);
    }
    addEventListener(type, callback) {
        if (!this.listeners.has(type)) this.listeners.set(type, []);
        this.listeners.get(type).push(callback);
    }
    removeEventListener(type, callback) {
        this.listeners.set(type, (this.listeners.get(type) || []).filter((fn) => fn !== callback));
    }
    dispatch(type, event = {}) {
        const target = this.tagName === 'DOCUMENT' && type.startsWith('key') ? this.activeElement : this;
        const e = { target, preventDefault() {}, stopPropagation() {}, ...event };
        for (const callback of this.listeners.get(type) || []) callback(e);
    }
    focus(options = {}) {
        assert.ok(this.ownerDocument, 'Cannot focus an element without an owner document');
        this.ownerDocument.activeElement = this;
        this.focusOptions = { ...options };
    }
    appendChild(child) {
        assert.ok(child instanceof ElementStub, 'The HUD adapter only supports element children');
        if (child.parentNode) {
            const siblings = child.parentNode.children;
            siblings.splice(siblings.indexOf(child), 1);
        }
        this.children.push(child);
        child.parentNode = this;
        child.ownerDocument = this.ownerDocument;
        return child;
    }
    replaceChildren(...children) {
        for (const child of children) assert.ok(child instanceof ElementStub, 'Unsupported replacement node');
        for (const child of this.children) child.parentNode = null;
        this.children.length = 0;
        this.text = '';
        for (const child of children) this.appendChild(child);
    }
    set innerHTML(markup) {
        this.replaceChildren();
        for (const [, tag, classes] of markup.matchAll(/<([a-z]+)\s+class="([^"]*)"[^>]*>/g)) {
            const child = new ElementStub(tag);
            child.classList.add(...classes.split(/\s+/));
            this.appendChild(child);
        }
    }
    querySelector(selector) {
        assert.match(selector, /^\.[\w-]+$/, 'Only class lookup is implemented for generated HUD labels');
        for (const child of this.children) {
            if (child.classList.contains(selector.slice(1))) return child;
            const descendant = child.querySelector(selector);
            if (descendant) return descendant;
        }
        return null;
    }
    closest(selector) {
        const choices = selector.split(',').map((part) => part.trim());
        for (const choice of choices) {
            assert.match(choice, /^(?:[a-z]+|\[contenteditable="true"\])$/, `Unsupported closest selector: ${choice}`);
        }
        for (let element = this; element; element = element.parentElement) {
            if (choices.some((choice) => choice === '[contenteditable="true"]'
                ? element.getAttribute('contenteditable') === 'true'
                : element.tagName === choice.toUpperCase())) return element;
        }
        return null;
    }
    setAttribute(name, value) {
        const text = String(value);
        this.attributes.set(name, text);
        if (name === 'class') this.className = text;
        else if (name.startsWith('data-')) this.dataset[datasetKey(name.slice(5))] = text;
        else if (name === 'id' || name === 'value' || name === 'title') this[name] = text;
    }
    getAttribute(name) {
        if (name === 'class') return this.className || (this.attributes.has(name) ? '' : null);
        if (name.startsWith('data-')) return this.dataset[datasetKey(name.slice(5))] ?? null;
        return this.attributes.get(name) ?? null;
    }
    setBoundingClientRect({ left = 0, top = 0, width = 0, height = 0 }) {
        this.rect = { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height };
    }
    getBoundingClientRect() {
        // No CSS layout in Node: projection tests provide explicit occluder rectangles.
        return this.rect ? { ...this.rect } : { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    }
    setPointerCapture(id) { this.capturedPointer = id; }
    releasePointerCapture() { this.capturedPointer = null; }
    animate() { return { cancel() {} }; }
    getContext(type) {
        assert.equal(type, 'webgl2', 'Unexpected canvas API at the nonbrowser boundary');
        return {}; // Only webglAvailable() uses this; a real renderer is never constructed.
    }
}

function datasetKey(name) { return name.replace(/-([a-z])/g, (_, char) => char.toUpperCase()); }

function makeDocument() {
    const elements = [];
    const ids = new Map();
    const body = new ElementStub('body');
    const documentElement = new ElementStub('html');
    documentElement.appendChild(body);
    const stack = [body];
    const voidTags = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);
    const bodyMarkup = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html);
    assert.ok(bodyMarkup, 'Expected a body containing HUD markup');
    const markup = bodyMarkup[1].replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<!--[\s\S]*?-->/g, '');
    // Preserve the authored element hierarchy and attributes, without emulating CSS/layout.
    for (const [, closing, tag, attributes, text] of markup.matchAll(/<(\/?)([a-z][\w:-]*)\b([^<>]*)>|([^<]+)/gi)) {
        if (text !== undefined) {
            stack.at(-1).text += text;
            continue;
        }
        if (closing) {
            assert.equal(stack.at(-1).tagName, tag.toUpperCase(), `Unexpected closing HUD tag: ${tag}`);
            stack.pop();
            continue;
        }
        const element = new ElementStub(tag);
        for (const [, name, doubleQuoted, singleQuoted, unquoted] of attributes.matchAll(/([^\s=/'">]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) {
            element.setAttribute(name, doubleQuoted ?? singleQuoted ?? unquoted ?? '');
        }
        element.checked = element.getAttribute('checked') !== null;
        if (element.id) ids.set(element.id, element);
        elements.push(element);
        stack.at(-1).appendChild(element);
        if (!voidTags.has(tag.toLowerCase()) && !attributes.endsWith('/')) stack.push(element);
    }
    assert.equal(stack.length, 1, 'Unclosed HUD markup');
    const document = new ElementStub('document');
    Object.assign(document, {
        body, documentElement,
        activeElement: body,
        hidden: false,
        pointerLockElement: null,
        getElementById: (id) => ids.get(id) || null,
        createElement: (tag) => new ElementStub(tag, document),
        querySelectorAll(selector) {
            const match = /^\[data-([\w-]+)\]$/.exec(selector);
            assert.ok(match, `Unexpected DOM selector: ${selector}`);
            const key = datasetKey(match[1]);
            return elements.filter((element) => Object.hasOwn(element.dataset, key));
        },
        exitPointerLock() { this.pointerLockElement = null; this.dispatch('pointerlockchange'); }
    });
    for (const element of [body, documentElement, ...elements]) element.ownerDocument = document;
    return document;
}

class GpuPass {
    constructor(shader) {
        if (shader?.uniforms) this.uniforms = structuredClone(shader.uniforms);
    }
}
class GpuComposer {
    constructor() { this.passes = []; this.renderCalls = 0; this.pixelRatio = 1; }
    setPixelRatio(ratio) { this.pixelRatio = ratio; }
    setSize(width, height) { this.size = { width, height }; }
    addPass(pass) { this.passes.push(pass); }
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
globalThis.__astra = {
    THREE, state, input, seeker, player, scene, fieldGroup, camera, renderer, composer,
    asteroids, hunters, moons, shots, shotPool, missiles, missilePool, lockPool,
    pickups, shards, rings, sparks, thrusterTrails, pendingShatter, rockGrid,
    getForward, getRight, getUp, setOrientationFromForward, orientationToCamera,
    makePerpendicularBasis, composeCameraLook, updatePlayer, cancelTransientInput,
    projectileSegmentHitTime, findProjectileHit, hitWorldBody, hasLineOfSight,
    targetInAimCone, collectRocksNearSegment, updateRockCollisions, resolveRockPair,
    missileInterceptDirection, resetRun, resetShots, resetMissiles, clearLocks,
    clearCollection, spawnShot, gunSpec, fireGuns, bestGunTarget, collectGunTargets, checkCollisions,
    updateShots, updateMoonSystem, updateGame, setPaused, animate, updateAsteroids,
    updateAsteroidTrajectories, asteroidTrajectoryMesh, updateSeekers, updateMissiles,
    onMissileDown, onMissileUp, fireTempest, missileSpec, spawnMissile,
    fireWingRockets, updateWingRockets, wingRocketSpec, sphericalLaunchDirection,
    sphericalPulses, spawnSphericalPulse, updateSphericalPulses, returnAsteroidToBelt,
    shardBatch, spawnShardBurst, updateShards, syncShardInstances, resetShardPool,
    rebuildRockGrid, movingTargetHitTime, worldHitTime, isGunSolution,
    createAsteroid, hitAsteroid, resolveShatter, registerKill,
    combatHud, buildCombatHud, updateCombatHud, updateCombatLayout, projectCombatPoint,
    positionCombatCue, combatTargetVisible, combatContactRank, combatGunsReady,
    acquireNextLock, onFireDown, onFireUp, updateWeapons, requestFlightPointerLock,
    updateUi, upgradeSpecs, audio, spawnWave, updateBackdropTime, updateCamera, updateThrusterTrails,
    renderQuality, updateRenderQuality, preferredMaxPixelRatio, applyRenderPixelRatio, onResize,
    preferredRenderPixelBudget, resetRenderQualityHistory, applyCelestialQuality,
    celestialAssets, starField, ringDust, gasGiantTextureWidth, gasGiantVortexCandidates, gasGiantVortices,
    ringSystem, updateRingView, getCelestialRingTexture, getCelestialRingShadowTexture,
    get gunTargetCursor() { return gunTargetCursor; },
    interceptTime: typeof interceptTime === 'function' ? interceptTime : null,
    solveGunIntercept: typeof solveGunIntercept === 'function' ? solveGunIntercept : null,
    constants: { PLANET_R, WORLD_R_MIN, WORLD_R_MAX, PLAYER_RADIUS, SHOT_POOL, MISSILE_POOL,
        GUN_LIFE, SIM_STEP, MISSILE_PAINT_COS, ASTEROID_RETURN_RADIUS, COMBAT_R_MAX,
        WING_ROCKET_RELOAD, RING_PLANE_Y, RING_VIS_INNER, RING_VIS_OUTER }
};`;

async function loadGame({ coarsePointer = false, maxTextureSize = 16384, maxAnisotropy = 16 } = {}) {
    const document = makeDocument();
    const window = new ElementStub('window');
    Object.assign(window, {
        innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
        location: { search: '' },
        matchMedia: (query) => ({ matches: query === '(pointer: coarse)' && coarsePointer }),
        WebGL2RenderingContext: class {}
    });
    const localStore = new Map();
    const pendingCallbacks = new Map();
    const frames = new Map();
    let callbackId = 0;
    let now = 1000;
    const queue = (callback) => { pendingCallbacks.set(++callbackId, callback); return callbackId; };
    const errors = [];
    const renderer = {
        domElement: new ElementStub('canvas', document),
        capabilities: { maxTextureSize, getMaxAnisotropy: () => maxAnisotropy },
        pixelRatio: 1,
        setPixelRatio(ratio) { this.pixelRatio = ratio; },
        getPixelRatio() { return this.pixelRatio; },
        setSize(width, height) {
            this.size = { width, height };
            this.domElement.setBoundingClientRect({ width, height });
        }
    };
    renderer.domElement.setBoundingClientRect({ width: window.innerWidth, height: window.innerHeight });
    // Native VM globals avoid a host-proxy call for every procedural texture sample.
    assert.ok(vm.constants.DONT_CONTEXTIFY, 'Use Node 22.8+ for native VM globals');
    const context = vm.createContext(vm.constants.DONT_CONTEXTIFY);
    Object.assign(context, {
        document, window, URLSearchParams,
        performance: { now: () => now },
        console: { ...console, info() {}, error: (...args) => errors.push(args) },
        localStorage: {
            getItem: (key) => localStore.get(key) ?? null,
            setItem: (key, value) => localStore.set(key, String(value))
        },
        requestAnimationFrame: (callback) => { frames.set(++callbackId, callback); return callbackId; },
        cancelAnimationFrame: (id) => frames.delete(id),
        setTimeout: queue, clearTimeout: (id) => pendingCallbacks.delete(id),
        __gpuRenderer: renderer
    });
    vm.runInContext(`{
        let seed = 0x41535452;
        Math.random = () => {
            seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
            return seed / 0x100000000;
        };
    }`, context);
    const core = new vm.SourceTextModule(threeFiles.core, { context, identifier: join(dirname(threeFiles.path), 'three.core.js') });
    const three = new vm.SourceTextModule(threeFiles.module, { context, identifier: threeFiles.path });
    await three.link((specifier) => {
        assert.equal(specifier, './three.core.js', 'Unexpected pinned Three.js dependency');
        return core;
    });
    await three.evaluate();
    assert.equal(three.namespace.REVISION, '174');
    const gameModule = new vm.SourceTextModule(executable + expose, {
        context, identifier: htmlPath, lineOffset: moduleLine
    });
    await gameModule.link((specifier) => {
        if (specifier === 'three') return three;
        const exports = gpuImports[specifier];
        assert.ok(exports, `Unexpected game import: ${specifier}`);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context, identifier: specifier });
    });
    await gameModule.evaluate({ timeout: 15000 });
    const assertNoErrors = () => assert.equal(errors.length, 0,
        `Production logged errors:\n${errors.flat().map((e) => e?.stack || e).join('\n')}`);
    assertNoErrors();
    const game = context.__astra;
    assert.ok(game?.player?.group?.isObject3D, 'Real production createPlayer/init must complete');
    assert.equal(game.composer.renderCalls, 1, 'The real first animate() tick must run');
    return Object.assign(game, {
        document, window, pendingCallbacks, localStore, assertNoErrors,
        advanceTime(dt) {
            assert.ok(Number.isFinite(dt) && dt >= 0);
            now += dt * 1000;
        },
        frame(dt) {
            assert.equal(frames.size, 1, 'Expected one pending production animation callback');
            const [id, callback] = frames.entries().next().value;
            frames.delete(id);
            now += dt * 1000;
            callback(now);
        }
    });
}

let game;
let THREE;
const vector = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function close(actual, expected, epsilon = 1e-8) {
    assert.ok(Number.isFinite(actual) && Math.abs(actual - expected) <= epsilon,
        `Expected ${actual} to be within ${epsilon} of ${expected}`);
}
function vectorClose(actual, expected, epsilon = 1e-8) {
    close(actual.distanceTo(expected), 0, epsilon);
}
function quaternionClose(actual, expected) {
    close(Math.abs(actual.dot(expected)), 1, 1e-8);
}
function target(position, radius = 1, kind = 'asteroid', velocity = vector()) {
    const group = new THREE.Group();
    group.position.copy(position);
    game.fieldGroup.add(group);
    const entity = { group, radius, kind, velocity, dying: false, type: 'glass', collideCd: 0 };
    (kind === 'hunter' ? game.hunters : game.asteroids).push(entity);
    return entity;
}
function clearThreats() {
    game.clearCollection(game.asteroids);
    game.clearCollection(game.hunters);
}
function putPlayer(position, orientation = new THREE.Quaternion()) {
    game.player.position.copy(position);
    game.player.previousPosition.copy(position);
    game.player.velocity.set(0, 0, 0);
    game.player.orientation.copy(orientation);
    game.player.group.position.copy(position);
    game.player.group.quaternion.copy(orientation);
}
function prepareHud(width = 1280, height = 800) {
    clearThreats();
    putPlayer(vector(200, 0, 0));
    game.window.innerWidth = width;
    game.window.innerHeight = height;
    game.camera.aspect = width / height;
    game.camera.position.set(200, 0, -10);
    game.camera.up.set(0, 1, 0);
    game.camera.lookAt(vector(200, 0, 100));
    game.camera.updateProjectionMatrix();
    Object.assign(game.state, { paused: false, gameOver: false, debugOpen: false, controlsActive: true, heat: 0, gunTimer: 0 });
    refreshHud();
}
function refreshHud(seconds = 0.051) {
    game.advanceTime(seconds);
    game.updateCombatHud();
}
function assertHudHidden() {
    for (const mark of game.combatHud.marks) assert.equal(mark.el.style.opacity, '0');
    for (const key of ['lead', 'path', 'bore']) assert.equal(game.combatHud[key].style.opacity, '0', key);
}
function recordGunAudio() {
    const log = { starts: 0 };
    const parameter = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {} });
    // Observe production tone scheduling only, without an audio device or replacing sfxFire().
    game.audio.ctx = {
        currentTime: 0,
        createGain: () => ({ gain: parameter(), connect() {} }),
        createOscillator: () => ({ frequency: parameter(), connect() {}, start() { log.starts++; }, stop() {} })
    };
    game.audio.master = {};
    return log;
}
function fillShotPool(freeSlots) {
    game.resetShots();
    for (let i = 0; i < game.shotPool.length - freeSlots; i++) {
        assert.equal(game.spawnShot(vector(200, 0, 0), vector(0, 0, 1), game.gunSpec()), true);
    }
}
function pointerEvent(overrides = {}) {
    return { button: 0, pointerId: 1, clientX: 100, clientY: 100, ...overrides };
}
function summarizeTimings(samples) {
    const sorted = [...samples].sort((a, b) => a - b);
    return {
        samples: sorted.length,
        meanMs: samples.reduce((total, time) => total + time, 0) / samples.length,
        p50Ms: sorted[Math.floor((sorted.length - 1) * 0.5)],
        p95Ms: sorted[Math.ceil((sorted.length - 1) * 0.95)],
        maxMs: sorted.at(-1)
    };
}

describe('Astra production module (real Three.js r174, no browser)', { concurrency: false }, () => {
    after(async () => {
        const current = await readFile(htmlPath);
        const currentHash = createHash('sha256').update(current).digest('hex');
        // Node versions can report a suite after-hook failure with a zero exit code.
        if (currentHash !== sourceHash) process.exitCode = 1;
        assert.equal(currentHash, sourceHash,
            'Astra source changed during verification. A concurrent edit requires rerunning the suite.');
    });
    beforeEach(async () => {
        game = await loadGame();
        THREE = game.THREE;
    });
    afterEach(() => {
        if (!game) return;
        try {
            game.assertNoErrors();
        } finally {
            game.scene.traverse((object) => {
                object.geometry?.dispose();
                const materials = Array.isArray(object.material) ? object.material : [object.material];
                for (const material of materials) material?.dispose();
            });
            game.pendingCallbacks.clear();
            game = null;
            THREE = null;
        }
    });

    test('bootstrap constructs real scene graphs, pools, and bound input handlers', () => {
        assert.equal(THREE.REVISION, '174');
        assert.ok(game.scene.isScene && game.camera.isPerspectiveCamera);
        assert.ok(game.asteroids.length > 0 && game.moons.length > 0);
        assert.equal(game.shotPool.length, game.constants.SHOT_POOL);
        assert.equal(game.missilePool.length, game.constants.MISSILE_POOL);
        assert.ok(game.document.listeners.get('mousemove')?.length);
        assert.ok(game.renderer.domElement.listeners.get('pointermove')?.length);
    });

    test('GPU-free CPU scene and HUD updates contain finite transforms, vertices, and projected cues', () => {
        prepareHud();
        target(vector(200, 0, 100));
        game.player.velocity.set(2, 1, 20);
        refreshHud();
        game.scene.updateMatrixWorld(true);
        let meshes = 0;
        game.scene.traverse((object) => {
            for (const values of [object.position.toArray(), object.quaternion.toArray(), object.scale.toArray(), object.matrixWorld.elements]) {
                assert.ok(values.every(Number.isFinite), `Nonfinite transform in ${object.name || object.type}`);
            }
            const positions = object.geometry?.getAttribute('position');
            if (positions) {
                meshes++;
                assert.ok(positions.array.every(Number.isFinite), `Nonfinite position buffer in ${object.name || object.type}`);
            }
        });
        assert.ok(meshes > 0);
        assert.notEqual(game.renderer.isWebGLRenderer, true);
        for (const key of ['lead', 'path', 'bore']) {
            const element = game.combatHud[key];
            assert.ok(Number(element.style.opacity) > 0, `${key} should project visibly in this fixture`);
            for (const property of ['left', 'top']) assert.ok(Number.isFinite(parseFloat(element.style[property])), `${key}.${property}`);
        }
    });

    test('HUD rebuild replaces old children and preserves label parents, readouts, and occluder discovery', () => {
        const host = game.document.getElementById('tgt-hud');
        const oldChildren = [...host.children];
        game.buildCombatHud();
        assert.ok(oldChildren.every((child) => child.parentElement === null));
        const expected = [...game.combatHud.marks.flatMap((mark) => [mark.el, mark.lead]), game.combatHud.path, game.combatHud.bore];
        assert.equal(host.children.length, expected.length);
        assert.ok(host.children.every((child, index) => child === expected[index]));
        assert.equal(new Set(host.children).size, host.children.length);
        for (const { el, label } of game.combatHud.marks) {
            assert.equal(el.parentElement, host);
            assert.equal(label.parentElement, el);
            assert.equal(label, el.querySelector('.lbl'));
        }
        assert.ok(Object.values(game.combatHud.readouts).every(Boolean));
        assert.ok(game.combatHud.readouts.waveStatus.parentElement.classList.contains('wave-state'));
        assert.ok(game.combatHud.occluders.includes(game.document.getElementById('mission-title').parentElement));
        assert.ok(game.combatHud.occluders.every((element) => element.getAttribute('data-hud-occluder') === ''));
        refreshHud();
    });

    test('real celestial DataTextures contain populated byte buffers without a Canvas2D adapter', () => {
        const textures = new Set();
        game.scene.traverse((object) => {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
                if (!material) continue;
                for (const value of Object.values(material)) if (value?.isDataTexture) textures.add(value);
                for (const uniform of Object.values(material.uniforms || {})) if (uniform.value?.isDataTexture) textures.add(uniform.value);
            }
        });
        assert.ok(textures.size >= 3, 'Actual sky, giant, and rings must reference generated texture data');
        for (const texture of textures) {
            const { data, width, height } = texture.image;
            assert.ok(width > 0 && height > 0 && ArrayBuffer.isView(data), texture.name);
            assert.equal(data.length, width * height * 4, texture.name);
            assert.ok(data.some((value, index) => index % 4 !== 3 && value > 0), `${texture.name} is blank`);
            assert.ok(new Set(data).size > 8, `${texture.name} has no tonal variation`);
            assert.ok(texture.version > 0, `${texture.name} was not marked for upload`);
        }
    });

    test('ring profile keeps broad color bands without high-contrast fine density ripples', () => {
        const texture = game.getCelestialRingTexture();
        assert.equal(texture, game.celestialAssets.rings);
        assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
        assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
        const { data, width } = texture.image;
        const values = [];
        for (let i = 0; i < width; i++) {
            const radius = game.constants.RING_VIS_INNER + (i + 0.5) / width
                * (game.constants.RING_VIS_OUTER - game.constants.RING_VIS_INNER);
            if (radius > 120 && radius < 140) values.push(data[i * 4 + 3]);
        }
        const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
        const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
        const steps = values.slice(1).reduce((sum, value, i) => sum + Math.abs(value - values[i]), 0) / (values.length - 1);
        assert.ok(mean > 70 && mean < 130, 'Retain a visible, translucent central band');
        assert.ok(Math.sqrt(variance) > 0.15, 'Keep natural variation, not a flat annulus');
        assert.ok(Math.sqrt(variance) / mean < 0.08, 'Fine texture must not dominate the broad bands');
        assert.ok(steps < 1, 'Reject the old densely alternating opacity ridges');
    });

    test('ring shadow uses a separate smooth padded density texture and unconditional shader sampling', () => {
        const body = game.scene.getObjectByName('cerulean-gas-giant');
        const texture = game.getCelestialRingShadowTexture();
        assert.equal(texture, body.material.uniforms.ringShadow.value);
        assert.notEqual(texture, game.celestialAssets.rings);
        assert.equal(texture, game.getCelestialRingShadowTexture(), 'Cache the penumbra bake');
        const { data, width, height } = texture.image;
        assert.equal(width, 512);
        assert.equal(height, 1);
        assert.equal(data.byteLength, 2048);
        assert.equal(data[3], 0);
        assert.equal(data[(width - 1) * 4 + 3], 0, 'Clamped out-of-range UVs must be unshadowed');
        assert.ok(body.material.uniforms.ringInner.value < game.constants.RING_VIS_INNER);
        assert.ok(body.material.uniforms.ringOuter.value > game.constants.RING_VIS_OUTER);
        assert.equal(texture.wrapS, THREE.ClampToEdgeWrapping);
        let maximum = 0, largestStep = 0;
        for (let i = 0; i < width; i++) {
            maximum = Math.max(maximum, data[i * 4 + 3]);
            if (i) largestStep = Math.max(largestStep, Math.abs(data[i * 4 + 3] - data[(i - 1) * 4 + 3]));
        }
        assert.ok(maximum > 50 && maximum < 200, 'Keep optical shadow density without an opaque decal');
        assert.ok(largestStep < 16, 'The penumbra cannot contain hard radial steps');
        // Source contract only, not GLSL execution: no divergent branch surrounds a mip lookup.
        const shader = body.material.fragmentShader;
        assert.doesNotMatch(shader, /\bif\s*\(/);
        assert.match(shader, /texture2D\(ringShadow, vec2\(shadowU, 0\.5\)\)/);
        assert.match(shader, /float shadowBounds = smoothstep\(0\.0, 0\.025, shadowU\)/,
            'Coarse mip levels must not smear clamp-edge density beyond the shadow domain');
        assert.doesNotMatch(shader, /texture2D\(ringProfile/);
    });

    test('ring shell contributes one surface from above, below, and inside each band', () => {
        game.scene.updateMatrixWorld(true);
        for (const band of game.ringSystem.bandMeshes) {
            const r = (band.inner + band.outer) * 0.5;
            for (const offset of [-12, 12, 0]) {
                const eye = vector(r, game.constants.RING_PLANE_Y + offset, 0.01);
                const direction = vector(0, offset > 0 ? -1 : 1, 0);
                game.camera.position.copy(eye);
                game.updateRingView();
                assert.equal(band.mesh.material.side, offset === 0 ? THREE.BackSide : THREE.FrontSide);
                assert.equal(band.mesh.material.depthTest, true);
                assert.equal(band.mesh.material.depthWrite, false);
                const hits = new THREE.Raycaster(eye, direction, 0.01, 100).intersectObject(band.mesh);
                assert.equal(hits.length, 1, 'Do not composite both faces or lose the band from within its slab');
                close(hits[0].distance, offset === 0 ? band.halfHeight : 12 - band.halfHeight, 1e-4);
            }
        }
        assert.equal(game.ringSystem.insideMaterial.uniforms, game.ringSystem.outsideMaterial.uniforms);
    });

    test('ring shell containment agrees with actual polygon facets near inner and outer edges', () => {
        game.scene.updateMatrixWorld(true);
        for (const band of game.ringSystem.bandMeshes) {
            const { geometry } = band.mesh;
            const pointsPerSection = geometry.parameters.points.length;
            const positions = geometry.attributes.position;
            for (const section of [0, 47, 95, 191]) {
                for (const edge of [0, 1]) {
                    const a = vector().fromBufferAttribute(positions, section * pointsPerSection + edge);
                    const b = vector().fromBufferAttribute(positions, (section + 1) * pointsPerSection + edge);
                    const midpoint = a.add(b).multiplyScalar(0.5).setY(0);
                    const nominal = edge === 0 ? band.inner : band.outer;
                    const radius = (midpoint.length() + nominal) * 0.5;
                    const eye = midpoint.normalize().multiplyScalar(radius).setY(game.constants.RING_PLANE_Y);
                    game.camera.position.copy(eye);
                    game.updateRingView();
                    const hits = new THREE.Raycaster(eye, vector(0, 1, 0), 0.01, 100).intersectObject(band.mesh);
                    assert.equal(band.mesh.material.side, edge === 0 ? THREE.BackSide : THREE.FrontSide);
                    assert.equal(hits.length, edge === 0 ? 1 : 0, 'Containment must match the actual straight facet');
                }
            }
        }
    });

    test('planet atmosphere and spherical-pulse rim powers stay finite under float32 normalization overshoot', () => {
        const planet = game.scene.getObjectByName('cerulean-gas-giant');
        const meshes = [...planet.parent.children, game.sphericalPulses[0].mesh];
        const f = Math.fround;
        const dot = (a, b) => f(f(f(a[0] * b[0]) + f(a[1] * b[1])) + f(a[2] * b[2]));
        const normalize = values => {
            const inverse = f(1 / Math.sqrt(dot(values, values)));
            return values.map(value => f(value * inverse));
        };
        let overshoots = 0;
        for (const mesh of meshes) {
            const expression = /float (?:limb|rim) = pow\(([^;]+), ([\d.]+)\);/.exec(mesh.material.fragmentShader);
            assert.ok(expression, 'Execute the actual production rim expression, not a replacement formula');
            const evaluate = new Function('n', 'V', 'vNormal', 'vView', 'dot', 'normalize', 'abs', 'clamp',
                `return Math.pow(${expression[1]}, ${expression[2]});`);
            const { position, normal } = mesh.geometry.attributes;
            const indices = mesh.geometry.index;
            const sample = (attr, id) => [attr.getX(id), attr.getY(id), attr.getZ(id)];
            for (let i = 0; i < indices.count; i += 3) {
                const ids = [indices.getX(i), indices.getX(i + 1), indices.getX(i + 2)];
                const p = [0, 1, 2].map(c => f(ids.reduce((sum, id) => sum + sample(position, id)[c], 0) / 3));
                const ns = ids.map(id => normalize(sample(normal, id)));
                const n = normalize([0, 1, 2].map(c => f(ns.reduce((sum, value) => sum + value[c], 0) / 3)));
                const eye = mesh.geometry.parameters.radius > 95
                    ? n.map(value => f(value * 95)) : p.map((value, c) => f(value + n[c] * 200));
                const view = normalize(eye.map((value, c) => f(value - p[c])));
                if (Math.abs(dot(n, view)) > 1) overshoots++;
                const rim = evaluate(n, view, n, view, dot, normalize, Math.abs, (v, lo, hi) => Math.min(hi, Math.max(lo, v)));
                assert.ok(Number.isFinite(rim) && rim >= 0 && rim <= 1, 'Rim lighting must not feed invalid values into bloom');
            }
        }
        assert.ok(overshoots > 0, 'The float32 fixture must exercise the original out-of-domain dot product');
    });

    test('ring occlusion retains foreground rings while far-side bands lie behind opaque planetary depth', () => {
        const body = game.scene.getObjectByName('cerulean-gas-giant');
        assert.equal(body.material.transparent, false);
        assert.equal(body.material.depthWrite, true);
        assert.equal(body.material.depthTest, true);
        const ringMeshes = game.ringSystem.bandMeshes.map(band => band.mesh);
        game.scene.updateMatrixWorld(true);
        let foregroundRays = 0;
        for (const eye of [vector(0, 40, 320), vector(0, -40, 320), vector(320, game.constants.RING_PLANE_Y + 0.1, 0)]) {
            game.camera.position.copy(eye);
            game.updateRingView();
            const farPoint = vector(-eye.x, 0, -eye.z).normalize().multiplyScalar(170);
            farPoint.y = game.constants.RING_PLANE_Y;
            const ray = new THREE.Raycaster(eye, farPoint.clone().sub(eye).normalize());
            const planet = ray.intersectObject(body)[0];
            assert.ok(planet, 'The fixture must cross the visible planetary disk');
            const hits = ray.intersectObjects(ringMeshes);
            if (hits.some(hit => hit.distance < planet.distance)) foregroundRays++;
            assert.ok(hits.some(hit => hit.distance > planet.distance), 'The far side must be behind planetary depth');
            assert.ok(hits.every(hit => hit.object.material.depthTest && !hit.object.material.depthWrite));
        }
        assert.ok(foregroundRays > 0, 'The grazing view must retain legitimately visible foreground rings');
    });

    test('gas giant uses bounded cached cloud and signed-flow textures without changing its collider', () => {
        const body = game.scene.getObjectByName('cerulean-gas-giant');
        const uniforms = body.material.uniforms;
        const clouds = uniforms.map.value;
        const flow = uniforms.flowMap.value;
        assert.equal(clouds, game.celestialAssets.giant);
        assert.equal(flow, game.celestialAssets.giantFlow);
        assert.equal(clouds.image.width, 4096);
        assert.equal(clouds.image.height, 2048);
        assert.equal(flow.image.width, 512);
        assert.equal(flow.image.height, 256);
        assert.ok(clouds.image.data.byteLength + flow.image.data.byteLength <= 33 * 1024 * 1024);
        assert.equal(clouds.anisotropy, 4);
        assert.equal(game.gasGiantTextureWidth(16384, false), 4096);
        assert.equal(game.gasGiantTextureWidth(16384, true), 2048);
        assert.equal(game.gasGiantTextureWidth(2048, false), 2048);
        assert.equal(game.gasGiantTextureWidth(1024, false), 1024);
        assert.equal(body.geometry.parameters.radius, game.constants.PLANET_R);
        vectorClose(body.scale, vector(1, 1, 1));
        for (const texture of [clouds, flow]) {
            assert.equal(texture.wrapS, THREE.RepeatWrapping);
            assert.equal(texture.wrapT, THREE.ClampToEdgeWrapping);
            assert.equal(texture.minFilter, THREE.LinearMipmapLinearFilter);
            assert.equal(texture.magFilter, THREE.LinearFilter);
            assert.equal(texture.colorSpace, THREE.NoColorSpace);
        }
        const { data, width, height } = flow.image;
        for (const channel of [0, 1]) {
            let negative = 0, positive = 0;
            for (let i = channel; i < data.length; i += 4) {
                if (data[i] < 125) negative++;
                if (data[i] > 131) positive++;
            }
            assert.ok(negative > 100 && positive > 100, 'The wind field must contain both directions');
            for (const row of [0, height - 1]) for (let col = 0; col < width; col++) {
                assert.equal(data[(row * width + col) * 4 + channel], 128, 'Polar flow must converge to neutral');
            }
        }
    });

    test('gas giant texture respects actual low-capability and coarse-pointer bootstraps', async () => {
        for (const options of [{ maxTextureSize: 2048, maxAnisotropy: 1 }, { coarsePointer: true }]) {
            const limited = await loadGame(options);
            const texture = limited.celestialAssets.giant;
            assert.equal(texture.image.width, 2048);
            assert.equal(texture.image.height, 1024);
            assert.equal(texture.image.data.byteLength, 8 * 1024 * 1024);
            assert.equal(texture.anisotropy, options.maxAnisotropy || 4);
            assert.ok(texture.image.data.some((value, index) => index % 4 !== 3 && value > 0));
        }
    });

    test('gas giant candidate bounds retain eddies reachable after earlier vortex deformations', () => {
        const { gasGiantVortices: vortices, gasGiantVortexCandidates: candidates } = game;
        // Adversarial reachable latitudes, including jitter beyond the unwarped ellipse.
        for (let row = 0; row < 1024; row++) {
            const lat = ((row + 0.5) / 1024 - 0.5) * Math.PI;
            const selected = new Set(candidates(lat));
            let low = lat - 0.016, high = lat + 0.016;
            for (const vortex of vortices) {
                if (high < vortex.lat - vortex.ry * 2 || low > vortex.lat + vortex.ry * 2) continue;
                assert.ok(selected.has(vortex), 'A prior vortex can carry cloud material into this eddy');
                const maximumJitter = Math.hypot(0.24, 0.31) + 0.31;
                low = Math.min(low, vortex.lat - (2 + maximumJitter) * vortex.ry);
                high = Math.max(high, vortex.lat + (2 + maximumJitter) * vortex.ry);
            }
        }
    });

    test('gas giant texture preserves a blue majority, warm cloud material, and a continuous longitude seam', () => {
        const { data, width, height } = game.celestialAssets.giant.image;
        let blue = 0, warm = 0, seam = 0, interior = 0;
        for (let row = 0; row < height; row++) for (let col = 0; col < width; col++) {
            const i = (row * width + col) * 4;
            if (data[i + 2] > data[i] * 1.08 && data[i + 1] > data[i]) blue++;
            if (data[i] > data[i + 2] * 1.08) warm++;
            for (let channel = 0; channel < 4; channel++) {
                if (col === 0) seam += Math.abs(data[i + channel] - data[(row * width + width - 1) * 4 + channel]);
                else interior += Math.abs(data[i + channel] - data[i - 4 + channel]);
            }
        }
        assert.ok(blue / (width * height) > 0.6, 'Preserve the blue-dominant giant');
        assert.ok(warm / (width * height) > 0.02 && warm / (width * height) < 0.35);
        const seamStep = seam / (height * 4);
        const interiorStep = interior / (height * (width - 1) * 4);
        assert.ok(seamStep <= interiorStep * 3 + 1, 'Longitude wrap must not create an exceptional color/height jump');
        assert.ok(interiorStep > 0.1, 'The baked cloud material cannot be a flat fill');
    });

    test('gas giant advection keeps discontinuous phase resets fully hidden and matches the baked first frame', () => {
        const uniforms = game.scene.getObjectByName('cerulean-gas-giant').material.uniforms;
        const weightsAt = (time) => {
            game.updateBackdropTime(time);
            const phase = uniforms.flowPhase.value;
            assert.ok(phase.toArray().every(Number.isFinite));
            assert.ok(phase.x >= 0 && phase.x < 1 && phase.y >= 0 && phase.y < 1);
            assert.ok(phase.z >= 0 && phase.z <= 1);
            return [[phase.x - 0.5, 1 - phase.z], [phase.y - 0.5, phase.z]];
        };
        const first = weightsAt(0);
        assert.deepEqual(first, [[-0.5, 0], [0, 1]], 'Visible texture sampling starts at its authored position');
        for (const time of [9, 18, 27, 18000]) {
            const at = weightsAt(time);
            const before = weightsAt(time - 1e-6);
            const after = weightsAt(time + 1e-6);
            for (let i = 0; i < 2; i++) if (Math.abs(before[i][0] - after[i][0]) > 0.9) {
                assert.equal(at[i][1], 0, 'A resetting UV phase must contribute no color or relief');
                assert.ok(before[i][1] < 1e-6 && after[i][1] < 1e-6);
            }
            for (const power of [1, 2, 3]) {
                const sample = (weights) => weights.reduce((sum, [offset, weight]) => sum + Math.pow(offset, power) * weight, 0);
                close(sample(before), sample(after), 1e-6);
            }
        }
        assert.equal(uniforms.flowMap.value, game.celestialAssets.giantFlow, 'Animation must not rebake its flow texture');
    });

    test('shard bursts pack live transforms, colors, and alpha into one actual instanced scene mesh', () => {
        game.resetShardPool();
        const batch = game.shardBatch;
        assert.ok(batch.mesh.isInstancedMesh && batch.mesh.parent);
        assert.ok(batch.mesh.material.isShaderMaterial);
        assert.equal(batch.mesh.material.fog, true);
        assert.ok(batch.mesh.material.uniforms.fogColor.value.isColor);
        assert.ok(batch.mesh.material.uniforms.fogColor.value !== THREE.UniformsLib.fog.fogColor.value,
            'The batch must own cloned fog uniforms rather than mutate Three.js defaults');
        assert.equal(batch.mesh.material.side, THREE.DoubleSide);
        assert.equal(batch.mesh.material.blending, THREE.AdditiveBlending);
        assert.ok(game.shards.every((shard) => shard.mesh.isObject3D && !shard.mesh.isMesh && !shard.mesh.parent));
        game.spawnShardBurst(vector(200, 0, 0), new THREE.Color(0x44bbff), 1, false);
        game.spawnShardBurst(vector(200, 10, 0), new THREE.Color(0xff7744), 4, true);
        game.updateShards(0.1);
        game.syncShardInstances();
        const active = game.shards.filter((shard) => shard.active);
        assert.equal(active.length, 20);
        assert.equal(batch.mesh.count, active.length);
        assert.equal(batch.mesh.visible, true);
        const matrix = new THREE.Matrix4();
        active.forEach((shard, index) => {
            batch.mesh.getMatrixAt(index, matrix);
            assert.ok(matrix.elements.every(Number.isFinite));
            matrix.elements.forEach((value, axis) => close(value, shard.mesh.matrix.elements[axis], 2e-5));
            close(batch.alphas[index], shard.material.opacity, 1e-6);
            assert.ok(batch.alphas[index] > 0 && batch.alphas[index] <= 1);
            shard.material.color.toArray().forEach((value, channel) => close(batch.colors[index * 3 + channel], value, 1e-6));
        });
        active[0].life = 0.001;
        active[1].life = 0.2;
        game.updateShards(0.01);
        game.syncShardInstances();
        assert.equal(batch.mesh.count, 19);
        assert.ok(batch.alphas[0] < active[1].opacity, 'The faded survivor, not the expired shard, owns instance zero');
    });

    test('shard instance reset and pooled overflow cannot leave visible stale triangles', () => {
        const pool = game.shards.length;
        for (let i = 0; i < Math.ceil(pool / 6) + 2; i++) {
            game.spawnShardBurst(vector(200, i % 10, 0), new THREE.Color(0xffffff), 1, false);
        }
        game.syncShardInstances();
        assert.equal(game.shardBatch.mesh.count, pool);
        assert.equal(game.shards.length, pool);
        game.updateShards(2);
        game.syncShardInstances();
        assert.equal(game.shardBatch.mesh.count, 0);
        assert.equal(game.shardBatch.mesh.visible, false);
        game.spawnShardBurst(vector(200, 0, 0), new THREE.Color(0xff00ff), 1, false);
        game.syncShardInstances();
        assert.equal(game.shardBatch.mesh.count, 6);
        game.resetShardPool();
        assert.equal(game.shardBatch.mesh.count, 0);
        assert.equal(game.shardBatch.mesh.visible, false);
        game.syncShardInstances();
        assert.equal(game.shardBatch.mesh.count, 0);
        assert.ok(game.shards.every((shard) => !shard.active && !shard.mesh.visible));
    });

    test('adaptive resolution respects viewport pixel budgets and synchronizes all particle ratios', () => {
        const q = game.renderQuality;
        assert.equal(q.targetFps, 60);
        for (const [width, height, dpr] of [[390, 844, 3], [1920, 1080, 2], [3840, 2160, 2], [7680, 4320, 3]]) {
            Object.assign(game.window, { innerWidth: width, innerHeight: height, devicePixelRatio: dpr });
            game.onResize();
            game.applyRenderPixelRatio(100);
            assert.ok(q.pixelRatio <= q.maxPixelRatio && q.pixelRatio >= q.minPixelRatio);
            assert.ok(q.renderPixels <= q.maxRenderPixels, `${width}x${height}: ${q.renderPixels} > ${q.maxRenderPixels}`);
            assert.equal(q.maxRenderPixels, game.preferredRenderPixelBudget());
            assert.equal(game.renderer.pixelRatio, q.pixelRatio);
            assert.equal(game.composer.pixelRatio, q.pixelRatio);
            assert.deepEqual(game.renderer.size, { width, height });
            assert.deepEqual(game.composer.size, { width, height });
            for (const particles of [game.sparks, game.starField, game.ringDust]) {
                close(particles.material.uniforms.uPixelRatio.value, q.pixelRatio);
            }
            game.applyRenderPixelRatio(-100);
            close(q.pixelRatio, q.minPixelRatio);
            const ratio = q.pixelRatio;
            game.applyRenderPixelRatio(NaN);
            close(q.pixelRatio, ratio);
        }
    });

    test('adaptive resolution reacts to sustained load, not a single hitch, and recovers gradually', () => {
        const q = game.renderQuality;
        game.applyRenderPixelRatio(q.maxPixelRatio);
        game.resetRenderQualityHistory(0);
        const initial = q.pixelRatio;
        game.updateRenderQuality(0.1);
        close(q.pixelRatio, initial);
        for (let i = 0; i < 180; i++) game.updateRenderQuality(1 / 30);
        assert.ok(q.pixelRatio < initial);
        assert.equal(q.lastChange, 'load');
        const lower = q.pixelRatio;
        game.updateRenderQuality(1 / 60);
        close(q.pixelRatio, lower, 1e-6);
        for (let i = 0; i < 2400 && q.pixelRatio <= lower; i++) game.updateRenderQuality(1 / 60);
        assert.ok(q.pixelRatio > lower, 'Stable 60 Hz should eventually probe spare capacity');
        assert.ok(q.pixelRatio <= lower * 1.061 && q.pixelRatio <= q.maxPixelRatio);
        assert.equal(q.lastChange, 'recovery-probe');
        assert.ok(q.probeSeconds > 0);
    });

    test('adaptive quality ignores hidden and invalid frames and never distorts simulation timing', () => {
        const q = game.renderQuality;
        game.resetRenderQualityHistory(0);
        for (let i = 0; i < 200; i++) game.updateRenderQuality(1 / 144);
        assert.ok(q.sampleCount <= q.samples.length);
        close(q.rollingFps, 144, 1e-5);
        const ratio = q.pixelRatio;
        for (const dt of [0, -1, NaN, Infinity, 2]) {
            game.updateRenderQuality(dt);
            assert.equal(q.sampleCount, 0);
            assert.ok(q.warmupSeconds > 0);
            close(q.pixelRatio, ratio);
        }
        game.document.hidden = true;
        game.updateRenderQuality(1 / 20);
        assert.equal(q.sampleCount, 0);
        close(q.pixelRatio, ratio);
        assert.equal(game.constants.SIM_STEP, 1 / 120);
    });

    test('production diagnostic snapshot reports current resolution and shard batch state without mutation', () => {
        const diagnostics = game.window.__asteroidsAstraDiagnostics;
        assert.ok(diagnostics && typeof diagnostics.snapshot === 'function');
        game.spawnShardBurst(vector(200, 0, 0), new THREE.Color(0xffbb55), 1, false);
        game.syncShardInstances();
        game.state.fps = 59;
        game.applyRenderPixelRatio(game.renderQuality.minPixelRatio);
        const before = game.player.position.clone();
        const snapshot = diagnostics.snapshot();
        const rendering = snapshot.rendering;
        assert.equal(rendering.targetFps, 60);
        assert.equal(rendering.observedFps, 59);
        for (const key of ['rollingFrameMs', 'pixelRatio', 'renderPixels', 'maxRenderPixels', 'lastChange']) {
            assert.equal(rendering[key], game.renderQuality[key], key);
        }
        assert.equal(rendering.quality, game.renderQuality.effectiveQuality);
        assert.equal(rendering.shardBatches, 1);
        assert.equal(snapshot.active.shards, 6);
        vectorClose(game.player.position, before);
        game.resetShardPool();
        assert.equal(diagnostics.snapshot().rendering.shardBatches, 0);
        assert.equal(snapshot.rendering.shardBatches, 1, 'An earlier diagnostic snapshot is not a mutable live view');
    });

    test('HUD drive readouts clamp charge, represent invalid data, and synchronize assist aria state', () => {
        const hud = game.combatHud.readouts;
        game.state.driveCharge = 46.6;
        game.input.boosting = true;
        refreshHud();
        assert.equal(hud.driveValue.textContent, '47%');
        assert.equal(hud.driveFill.style.width, '47%');
        assert.equal(hud.driveLabel.textContent, 'BOOSTING');
        assert.equal(hud.drive.dataset.active, 'true');
        game.state.driveLocked = true;
        game.state.flightAssist = false;
        refreshHud();
        assert.equal(hud.driveLabel.textContent, 'RECHARGE');
        assert.equal(hud.drive.dataset.locked, 'true');
        assert.equal(hud.assist.getAttribute('aria-pressed'), 'false');
        hud.assist.dispatch('click');
        refreshHud();
        assert.equal(game.state.flightAssist, true);
        assert.equal(hud.assist.getAttribute('aria-pressed'), 'true');
        for (const [charge, text, width] of [[130, '100%', '100%'], [-1, '0%', '0%'], [NaN, '--', '0%']]) {
            game.state.driveCharge = charge;
            refreshHud();
            assert.equal(hud.driveValue.textContent, text);
            assert.equal(hud.driveFill.style.width, width);
        }
    });

    test('HUD system status prioritizes jam, pause, director, and game-over; wave countdown clears', () => {
        const hud = game.combatHud.readouts;
        game.state.flightAssist = false;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'INERTIAL FLIGHT');
        game.state.shield = 1;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'SHIELD LOW');
        assert.equal(hud.systemStatus.dataset.alert, 'true');
        game.seeker.jam = 1;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'SEEKER JAM');
        game.state.paused = true;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'FLIGHT PAUSED');
        assert.equal(hud.systemStatus.dataset.alert, 'false');
        game.state.debugOpen = true;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'DIRECTOR');
        game.state.gameOver = true;
        game.state.waveCountdown = 1.2;
        refreshHud();
        assert.equal(hud.systemStatus.textContent, 'SIGNAL LOST');
        assert.equal(hud.gunStatus.textContent, 'OFFLINE');
        assert.equal(hud.waveStatus.textContent, 'NEXT WAVE 2s');
        assert.equal(hud.waveStatus.parentElement.dataset.waiting, 'true');
        game.state.waveCountdown = 0;
        refreshHud();
        assert.equal(hud.waveStatus.textContent, 'CONTACTS');
        assert.equal(hud.waveStatus.parentElement.dataset.waiting, 'false');
    });

    test('HUD gun solution changes to cycling, hot, and track without falsely retaining ready styling', () => {
        prepareHud();
        const victim = target(vector(200, 0, 100));
        const hud = game.combatHud;
        refreshHud();
        assert.equal(hud.readouts.gunStatus.textContent, 'SOLUTION');
        assert.ok(hud.lead.classList.contains('solution'));
        assert.ok(hud.marks[0].el.classList.contains('solution'));
        assert.match(hud.marks[0].label.textContent, /^[0-9A-Z]+ ROCK 100u$/);
        game.state.gunTimer = 0.1;
        refreshHud();
        assert.equal(hud.readouts.gunStatus.textContent, 'CYCLING');
        assert.equal(hud.lead.classList.contains('solution'), false);
        assert.equal(hud.marks[0].el.classList.contains('solution'), false);
        game.state.heat = 100;
        refreshHud();
        assert.equal(hud.readouts.gunStatus.textContent, 'HOT');
        assert.equal(hud.readouts.gunStatus.dataset.alert, 'true');
        assert.ok(hud.bore.classList.contains('hot'));
        game.state.heat = 0;
        game.state.gunTimer = 0;
        victim.group.position.x = 200 + Math.tan(15 * Math.PI / 180) * 100;
        refreshHud();
        assert.equal(hud.readouts.gunStatus.textContent, 'TRACK');
        assert.equal(hud.lead.classList.contains('solution'), false);
        assert.equal(hud.readouts.gunStatus.dataset.alert, 'false');
    });

    test('HUD hides all stale cues when inactive and when the tracked target disappears', () => {
        prepareHud();
        const victim = target(vector(200, 0, 100));
        game.player.velocity.set(1, 0, 10);
        for (const key of ['paused', 'debugOpen', 'gameOver']) {
            refreshHud();
            assert.ok(game.combatHud.used > 0);
            game.state[key] = true;
            refreshHud();
            assertHudHidden();
            game.state[key] = false;
        }
        refreshHud();
        victim.dying = true;
        game.player.velocity.set(0, 0, 0);
        refreshHud();
        assert.equal(game.combatHud.used, 0);
        assert.equal(game.combatHud.lead.style.opacity, '0');
        assert.equal(game.combatHud.path.style.opacity, '0');
        assert.ok(game.combatHud.marks.every((mark) => mark.el.style.opacity === '0'));
    });

    test('HUD projection uses camera -Z, rejects invalid points, and respects supplied occluder bounds', () => {
        prepareHud();
        const point = vector(200, 0, 100);
        const out = vector();
        assert.equal(game.projectCombatPoint(point, out), true);
        close(out.x, 640);
        close(out.y, 400);
        for (const invalid of [vector(200, 0, -30), vector(200, 0, -10), vector(200, 0, 3000), vector(10000, 0, 100), vector(NaN, 0, 100)]) {
            assert.equal(game.projectCombatPoint(invalid, out), false);
        }
        const occluder = game.document.getElementById('mission-title').parentElement;
        occluder.setBoundingClientRect({ left: 600, top: 360, width: 80, height: 80 });
        refreshHud(0.6);
        assert.equal(game.projectCombatPoint(point, out), false, 'Point under a HUD instrument must be rejected');
        occluder.setBoundingClientRect({ left: 900, top: 600, width: 100, height: 100 });
        refreshHud(0.6);
        assert.equal(game.projectCombatPoint(point, out), true);
        game.camera.position.x = 210;
        refreshHud();
        assert.equal(game.projectCombatPoint(point, out), true);
        assert.ok(Math.abs(out.x - 640) > 1, 'A camera move must refresh the projection matrix');
    });

    test('HUD caps visible contacts at desktop/mobile limits and clears the unused marks after resize', () => {
        prepareHud();
        for (const x of [-45, -15, 15, 45]) {
            for (const y of [-20, 20]) target(vector(200 + x, y, 100));
        }
        target(vector(200, 45, 100));
        refreshHud();
        assert.equal(game.combatHud.contacts.length, 8);
        assert.equal(game.combatHud.used, 8);
        game.window.innerWidth = 390;
        game.window.innerHeight = 844;
        game.camera.aspect = 390 / 844;
        game.camera.updateProjectionMatrix();
        refreshHud();
        assert.equal(game.combatHud.width, 390);
        assert.equal(game.combatHud.height, 844);
        assert.equal(game.combatHud.contacts.length, 4);
        assert.ok(game.combatHud.used <= 4);
        assert.equal(game.combatHud.marks.filter((mark) => mark.record).length, 4);
        for (const mark of game.combatHud.marks.filter((item) => !item.record)) {
            assert.equal(mark.el.style.opacity, '0');
            assert.equal(mark.lead.style.opacity, '0');
            assert.equal(mark.rim.style.opacity, '0');
        }
    });

    test('HUD keeps contact identity and DOM slots stable while projecting between 20 Hz scans', () => {
        prepareHud();
        const victim = target(vector(200, 0, 100));
        refreshHud();
        const record = game.combatHud.records.get(victim);
        const mark = game.combatHud.marks.find((item) => item.record === record);
        assert.ok(mark && record.id);
        const stamp = game.combatHud.stamp;
        const left = parseFloat(mark.el.style.left);
        game.camera.position.x += 2;
        game.advanceTime(0.01);
        game.updateCombatHud();
        assert.equal(game.combatHud.stamp, stamp, 'Contact ranking should not run at render frequency');
        assert.ok(Math.abs(parseFloat(mark.el.style.left) - left) > 1, 'Projection still follows every camera move');
        refreshHud();
        assert.ok(game.combatHud.records.get(victim) === record);
        assert.ok(mark.record === record);
        assert.ok(game.combatHud.stamp > stamp);
        assert.equal(mark.rowId.textContent, record.id);
        victim.dying = true;
        game.updateCombatHud();
        assert.equal(mark.el.style.opacity, '0', 'Dead contacts must hide before the next ranking scan');
        assert.equal(mark.lead.style.opacity, '0');
        assert.equal(mark.rim.style.opacity, '0');
    });

    test('ultrawide HUD rim preserves a true 45-degree bearing without applying aspect twice', () => {
        prepareHud(2560, 1080);
        const victim = target(vector(100, 100, 0));
        refreshHud();
        const mark = game.combatHud.marks.find((item) => item.record?.target === victim);
        assert.ok(mark);
        assert.ok(Number(mark.rim.style.opacity) > 0);
        const bearing = parseFloat(mark.rim.style['--bearing']) - Math.PI / 2;
        close(bearing, -Math.PI / 4, 0.001);
        const match = /^translate\(([-\d.]+)px, ([-\d.]+)px\)$/.exec(mark.rim.style.transform);
        assert.ok(match, 'Expected a finite rim position');
        const dx = Number(match[1]) - 1280, dy = Number(match[2]) - 540;
        assert.ok(dx > 0 && dy < 0);
        close(Math.atan2(dy, dx), -Math.PI / 4, 0.001);
    });

    test('coincident gun intercepts do not render overlapping lead identifiers', () => {
        prepareHud();
        target(vector(200, 0, 100));
        target(vector(200, 0, 100));
        refreshHud();
        assert.equal(game.combatHud.gunTargets.length, 2, 'Both distinct contacts remain valid firing solutions');
        const labels = game.combatHud.marks.filter((mark) => Number(mark.lead.style.opacity) > 0 &&
            mark.leadLabel.style.opacity !== '0' && mark.leadLabel.style.visibility !== 'hidden' && mark.leadLabel.style.display !== 'none');
        assert.ok(labels.length >= 1, 'At least one honest intercept identifier must remain visible');
        for (const mark of labels) {
            close(parseFloat(mark.lead.style.left), 640, 0.1);
            close(parseFloat(mark.lead.style.top), 400, 0.1);
            assert.ok(mark.leadLabelBox, 'Visible labels must reserve actual production bounds');
            assert.ok(Object.values(mark.leadLabelBox).every(Number.isFinite));
            assert.ok(mark.leadLabelBox.right > mark.leadLabelBox.left && mark.leadLabelBox.bottom > mark.leadLabelBox.top);
        }
        for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
            const a = labels[i].leadLabelBox, b = labels[j].leadLabelBox;
            assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top,
                'Two lead identifiers occupy the same screen-space label footprint');
        }
    });

    test('HUD readiness requires controls, cooldown, heat, and enough capacity for the entire salvo', () => {
        prepareHud();
        target(vector(200, 0, 100));
        game.state.gunsLevel = 7;
        assert.equal(game.combatGunsReady(), true);
        for (const [key, value] of [['controlsActive', false], ['gunTimer', 0.01], ['heat', 100], ['paused', true], ['debugOpen', true], ['gameOver', true]]) {
            const before = game.state[key];
            game.state[key] = value;
            assert.equal(game.combatGunsReady(), false, key);
            game.state[key] = before;
        }
        for (const freeSlots of [0, 6, 7]) {
            fillShotPool(freeSlots);
            const ready = freeSlots >= 7;
            assert.equal(game.combatGunsReady(), ready, `${freeSlots} slots`);
            refreshHud();
            const mark = game.combatHud.marks.find((item) => item.record?.gunIndex >= 0);
            assert.ok(mark);
            assert.equal(mark.el.classList.contains('solution'), ready);
            assert.equal(mark.lead.classList.contains('solution'), ready);
            assert.equal(game.combatHud.readouts.gunStatus.textContent === 'SOLUTION', ready);
        }
    });

    test('HUD exposes three matching gun leads and per-rack reload state without inventing readiness', () => {
        prepareHud();
        const victims = [target(vector(195, 0, 100)), target(vector(205, 0, 100)), target(vector(200, 5, 100))];
        refreshHud();
        assert.equal(game.combatHud.readouts.gunStatus.textContent, '3 SOL');
        const leads = game.combatHud.marks.filter((mark) => Number(mark.lead.style.opacity) > 0);
        assert.equal(leads.length, 3);
        assert.equal(new Set(leads.map((mark) => mark.record.target)).size, 3);
        for (const mark of leads) {
            assert.ok(victims.includes(mark.record.target));
            assert.equal(mark.leadLabel.textContent, 'G' + mark.record.id);
            assert.ok(game.isGunSolution(mark.record.target));
        }
        game.fireWingRockets();
        refreshHud();
        const hud = game.combatHud.readouts;
        assert.equal(hud.rockets.textContent, '0/2');
        for (const rack of [hud.rackLeft, hud.rackRight]) {
            assert.equal(rack.dataset.ready, 'false');
            assert.equal(rack.dataset.fill, '0.00');
        }
        assert.match(hud.rocketButton.getAttribute('aria-label'), /0 of 2 ready.*4\.5 seconds/);
        game.player.wingRacks[0].cooldown = 0;
        game.updateWingRockets(2.25);
        refreshHud();
        assert.equal(hud.rockets.textContent, '1/2');
        assert.equal(hud.rackLeft.dataset.ready, 'true');
        assert.equal(hud.rackRight.dataset.fill, '0.50');
        assert.equal(hud.rocketButton.dataset.reloading, 'false');
    });

    test('HUD prioritizes an actual 3D collision approach and retires identities after a warp', () => {
        prepareHud();
        const harmless = target(vector(200, 0, 100));
        const incoming = target(vector(200, 60, 0), 1, 'asteroid', vector(0, -60, 0));
        refreshHud();
        assert.ok(game.combatHud.primary.target === incoming);
        assert.equal(game.combatHud.primary.danger, true);
        assert.match(game.combatHud.readouts.trackStatus.textContent, /^COLLISION /);
        assert.match(game.combatHud.readouts.trackVector.textContent, /CPA 1\.0s/);
        const before = game.combatHud.records.get(incoming);
        incoming.velocity.set(20, 0, 0);
        incoming.warpedAt = 10;
        incoming.group.position.set(210, 10, 80);
        refreshHud();
        const after = game.combatHud.records.get(incoming);
        assert.notEqual(after.id, before.id);
        assert.equal(after.danger, false);
        assert.ok(game.combatHud.records.get(harmless));
        assert.ok(game.combatHud.marks.every((mark) => mark.record !== before));
    });

    test('focused controls do not block pointer-locked flight keys after new-run/resume clicks', () => {
        for (const id of ['new-run', 'pause']) {
            game.cancelTransientInput();
            putPlayer(vector(200, 0, 0));
            game.input.pointerLocked = true;
            const button = game.document.getElementById(id);
            const label = new ElementStub('span');
            button.appendChild(label);
            assert.equal(label.closest('button'), button);
            game.document.dispatch('keydown', { target: label, code: 'KeyW', repeat: false });
            assert.equal(game.input.keys.KeyW, true, id);
            game.updatePlayer(1 / 120);
            assert.ok(game.player.velocity.z > 0, `${id}: focused button suppressed locked thrust`);
            game.document.dispatch('keyup', { target: label, code: 'KeyW' });
            assert.equal(game.input.keys.KeyW, false);
            const before = game.state.flightAssist;
            game.document.dispatch('keydown', { target: label, code: 'KeyC', repeat: false });
            assert.equal(game.state.flightAssist, !before);
        }
    });

    test('unlocked buttons, inputs, menus, and editable descendants retain their keyboard controls', () => {
        game.cancelTransientInput();
        game.input.pointerLocked = false;
        const controls = ['button', 'input', 'select', 'textarea'].map((tag) => new ElementStub(tag));
        const editable = new ElementStub('div');
        editable.setAttribute('contenteditable', 'true');
        controls.push(editable);
        for (const control of controls) {
            const eventTarget = control.tagName === 'DIV' ? control.appendChild(new ElementStub('span')) : control;
            const assist = game.state.flightAssist;
            const shot = game.state.shot;
            for (const code of ['KeyW', 'KeyC', 'KeyF', 'Space', 'Tab', 'ArrowUp']) {
                let prevented = false;
                game.document.dispatch('keydown', { target: eventTarget, code, repeat: false, preventDefault() { prevented = true; } });
                assert.equal(prevented, false, `${control.tagName} / ${code}`);
                assert.notEqual(game.input.keys[code], true);
            }
            assert.equal(game.state.flightAssist, assist);
            assert.equal(game.state.shot, shot);
            assert.equal(game.state.paused, false);
            assert.equal(game.input.firing, false);
        }
        let prevented = false;
        game.document.dispatch('keydown', { target: controls[0], code: 'Escape', repeat: false, preventDefault() { prevented = true; } });
        assert.equal(prevented, true, 'Escape must still be handled from an unlocked control');
        assert.equal(game.state.paused, true);
    });

    test('missile painting rejects a rear target instead of acquiring it through the ship', () => {
        prepareHud();
        const rear = target(vector(200, 0, -30));
        rear.type = 'prism';
        assert.equal(game.acquireNextLock(), false);
        assert.equal(game.seeker.locks.length, 0);
        const front = target(vector(200, 0, 30));
        assert.equal(game.acquireNextLock(), true);
        assert.deepEqual(Array.from(game.seeker.locks), [front]);
    });

    test('missile paint cone uses the 40-degree ship-local half-angle even after pitch and roll', () => {
        prepareHud();
        close(game.constants.MISSILE_PAINT_COS, Math.cos(40 * Math.PI / 180));
        const victim = target(vector(200, 0, 30));
        for (const orientation of [
            new THREE.Quaternion(),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0.55, 0.3, Math.PI / 2, 'YXZ'))
        ]) {
            putPlayer(vector(200, 0, 0), orientation);
            for (const [degrees, accepted] of [[0, true], [39, true], [41, false], [180, false]]) {
                game.clearLocks();
                const angle = degrees * Math.PI / 180;
                const direction = vector(Math.sin(angle), 0, Math.cos(angle)).applyQuaternion(orientation);
                victim.group.position.copy(game.player.position).addScaledVector(direction, 30);
                assert.equal(game.acquireNextLock(), accepted, `${degrees} degrees, orientation ${orientation.toArray()}`);
                assert.equal(game.seeker.locks.includes(victim), accepted);
            }
        }
    });

    test('default missile painting holds three distinct targets and releases one seeker per target', () => {
        prepareHud();
        const targets = [target(vector(190, 0, 70)), target(vector(210, 0, 70)), target(vector(200, 12, 80))];
        target(vector(200, -12, 90));
        assert.equal(game.state.missileTier, 0);
        assert.equal(game.missileSpec().maxLocks, 3);
        const ammo = game.state.missileAmmo;
        game.onMissileDown();
        for (let step = 0; step < 72; step++) game.updateSeekers(game.constants.SIM_STEP, game.constants.SIM_STEP);
        assert.equal(game.seeker.locks.length, 3);
        assert.equal(new Set(game.seeker.locks).size, 3);
        const locks = Array.from(game.seeker.locks);
        assert.ok(locks.some((locked) => targets.includes(locked)));
        game.onMissileUp();
        assert.equal(game.missiles.length, 3);
        assert.equal(game.state.missileAmmo, ammo - 3);
        assert.equal(new Set(game.missiles.map((missile) => missile.target)).size, 3);
        assert.ok(game.missiles.every((missile) => locks.includes(missile.target)));
        assert.equal(game.seeker.locks.length, 0);
        assert.equal(game.seeker.holding, false);
    });

    test('missile paint cannot promise more targets than remaining ammunition', () => {
        prepareHud();
        game.state.missileAmmo = 2;
        target(vector(195, 0, 80));
        target(vector(205, 0, 80));
        target(vector(200, 5, 80));
        game.onMissileDown();
        for (let step = 0; step < 72; step++) game.updateSeekers(game.constants.SIM_STEP, game.constants.SIM_STEP);
        assert.equal(game.seeker.locks.length, 2);
        game.onMissileUp();
        assert.equal(game.missiles.length, 2);
        assert.equal(game.state.missileAmmo, 0);
    });

    test('collectGunTargets reuses its output and returns only distinct reachable forward solutions', () => {
        prepareHud();
        const eligible = [target(vector(195, 0, 90)), target(vector(205, 0, 90)), target(vector(200, 5, 90)), target(vector(200, -5, 100))];
        const rear = target(vector(200, 0, -30));
        const dead = target(vector(200, 0, 80));
        dead.dying = true;
        target(vector(200, 0, 100), 1, 'asteroid', vector(0, 0, 200));
        target(vector(200, 0, 250));
        const out = [rear, dead];
        assert.equal(game.collectGunTargets(out), out);
        assert.equal(out.length, 3);
        assert.equal(new Set(out).size, 3);
        assert.ok(out.every((victim) => eligible.includes(victim) && game.isGunSolution(victim)));
        game.collectGunTargets(out, 2);
        assert.equal(out.length, 2);
        game.collectGunTargets(out, 0);
        assert.equal(out.length, 0);
        game.collectGunTargets(out, 8);
        assert.equal(out.length, eligible.length);
    });

    test('missile tiers deliberately expand simultaneous paint and acquisition range', () => {
        for (const [tier, locks, range] of [[0, 3, 130], [1, 4, 145], [2, 4, 160], [3, 5, 175], [4, 6, 190]]) {
            game.state.missileTier = tier;
            assert.equal(game.missileSpec().maxLocks, locks);
            assert.equal(game.missileSpec().lockRange, range);
        }
    });

    test('wing rockets leave exact rotated rack mounts and independently target two threats', () => {
        prepareHud();
        const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0.2, 0.7));
        putPlayer(vector(200, 0, 0), orientation);
        const victims = [-10, 10].map((x) => target(vector(x, 0, 80).applyQuaternion(orientation).add(game.player.position)));
        const ammo = game.state.missileAmmo;
        const racks = game.player.wingRacks;
        assert.equal(racks.length, 2);
        const origins = racks.map((rack) => rack.mount.clone().applyQuaternion(orientation).add(game.player.position));
        game.fireWingRockets();
        assert.equal(game.missiles.length, 2);
        assert.equal(new Set(game.missiles.map((missile) => missile.target)).size, 2);
        assert.equal(game.state.missileAmmo, ammo, 'Wing reload is separate from seeker ammunition');
        for (let i = 0; i < racks.length; i++) {
            const missile = game.missiles[i];
            assert.ok(game.missilePool.includes(missile));
            assert.ok(victims.includes(missile.target));
            assert.equal(missile.type, 'wing');
            assert.equal(missile.wingVisual.visible, true);
            assert.equal(missile.seekerVisual.visible, false);
            vectorClose(missile.group.position, origins[i]);
            vectorClose(missile.previousPosition, origins[i]);
            assert.equal(missile.trailGeo.drawRange.count, 0);
            close(racks[i].cooldown, 4.5);
            assert.equal(racks[i].group.visible, false);
        }
        game.fireWingRockets();
        assert.equal(game.missiles.length, 2, 'A cooling rack cannot launch twice');
        game.updateWingRockets(4.49);
        assert.ok(racks.every((rack) => rack.cooldown > 0 && !rack.group.visible));
        game.updateWingRockets(0.02);
        assert.ok(racks.every((rack) => rack.cooldown === 0 && rack.group.visible));
        game.fireWingRockets();
        assert.equal(game.missiles.length, 4);
    });

    test('partial missile capacity spends only the rack that actually launches', () => {
        prepareHud();
        for (const missile of game.missilePool) missile.active = true;
        const racks = game.player.wingRacks;
        const before = { sparks: game.sparks.head, punch: game.state.camPunch, ammo: game.state.missileAmmo };
        game.fireWingRockets();
        assert.equal(game.missiles.length, 0);
        assert.ok(racks.every((rack) => rack.cooldown === 0 && rack.group.visible));
        assert.equal(game.sparks.head, before.sparks);
        assert.equal(game.state.camPunch, before.punch);
        game.missilePool[0].active = false;
        game.fireWingRockets();
        assert.equal(game.missiles.length, 1);
        close(racks[0].cooldown, 4.5);
        assert.equal(racks[0].group.visible, false);
        assert.equal(racks[1].cooldown, 0);
        assert.equal(racks[1].group.visible, true);
        game.updateWingRockets(2);
        game.missilePool[1].active = false;
        game.fireWingRockets();
        assert.equal(game.missiles.length, 2);
        close(racks[0].cooldown, 2.5);
        close(racks[1].cooldown, 4.5);
        game.updateWingRockets(2.5);
        assert.equal(racks[0].group.visible, true);
        assert.equal(racks[1].group.visible, false);
        assert.equal(game.state.missileAmmo, before.ammo);
    });

    test('pooled wing missiles reacquire seeker visuals and fresh trails on reuse', () => {
        prepareHud();
        game.fireWingRockets();
        const wing = game.missiles[0];
        assert.equal(wing.type, 'wing');
        wing.trailHistory.fill(999);
        wing.trailPositions.fill(999);
        game.resetMissiles();
        const seeker = game.spawnMissile(null, game.missileSpec(), 0, 1);
        assert.equal(seeker, wing);
        assert.equal(seeker.type, 'seeker');
        assert.equal(seeker.wingVisual.visible, false);
        assert.equal(seeker.seekerVisual.visible, true);
        assert.equal(seeker.trailGeo.drawRange.count, 0);
        for (let i = 0; i < seeker.trailHistory.length; i += 3) {
            vectorClose(vector().fromArray(seeker.trailHistory, i), seeker.group.position, 2e-5);
        }
    });

    test('actual wing missile integration hits both assigned rocks and detonates spherical effects', () => {
        prepareHud();
        for (const x of [190, 210]) game.createAsteroid('large', vector(x, 0, 60), vector());
        const victims = Array.from(game.asteroids);
        for (const rock of victims) rock.hp = rock.maxHp = 20;
        game.rebuildRockGrid();
        const planarEffects = game.rings.filter((ring) => ring.active).length;
        game.fireWingRockets();
        const rockets = Array.from(game.missiles);
        assert.equal(new Set(rockets.map((rocket) => rocket.target)).size, 2);
        let trailObserved = false;
        for (let step = 0; step < 240 && game.missiles.length; step++) {
            game.updateMissiles(game.constants.SIM_STEP);
            for (const missile of game.missiles) {
                assert.ok(missile.group.position.toArray().every(Number.isFinite));
                assert.ok(missile.trailPositions.every(Number.isFinite));
                if (missile.trailGeo.drawRange.count > 1) trailObserved = true;
            }
        }
        assert.ok(trailObserved);
        assert.equal(game.missiles.length, 0);
        assert.ok(victims.every((rock) => rock.hp < 20), 'Both assigned targets must receive real impact damage');
        assert.ok(rockets.every((rocket) => !rocket.active && rocket.life > 0 && !rocket.trail.visible && !rocket.target));
        assert.ok(game.sphericalPulses.filter((pulse) => pulse.life > 0).length >= 2);
        assert.equal(game.rings.filter((ring) => ring.active).length, planarEffects);
    });

    test('wing rockets intercept close and crossing small rocks instead of circling until expiry', () => {
        const scenarios = [
            ['close ahead', [0, 0, 6], [0, 0, 0]],
            ['close off-axis', [12, 0, 8], [0, 0, 0]],
            ['small ahead', [0, 0, 30], [0, 0, 0]],
            ['crossing', [0, 0, 30], [20, 0, 0]],
            ['far', [10, 0, 80], [0, 0, 0]],
            ['oblique', [30, 20, 30], [-12, 5, 15]],
            ['receding', [0, 0, 75], [0, 0, 38]]
        ];
        for (const [name, offset, velocity] of scenarios) {
            prepareHud();
            game.resetMissiles();
            game.clearLocks();
            game.updateWingRockets(game.constants.WING_ROCKET_RELOAD);
            game.state.forceInvuln = true;
            game.createAsteroid('small', vector(...offset).add(game.player.position), vector());
            const rock = game.asteroids[0];
            rock.velocity.set(...velocity);
            rock.hp = rock.maxHp = 20;
            const radius = rock.radius;
            game.rebuildRockGrid();
            game.fireWingRockets();
            const rockets = Array.from(game.missiles);
            assert.equal(rockets.length, 2, name);
            assert.ok(rockets.every((missile) => missile.target === rock && missile.radius === 0.55), name);
            for (let step = 0; step < 300 && game.missiles.length; step++) {
                game.state.visualTime += game.constants.SIM_STEP;
                game.updateGame(game.constants.SIM_STEP, game.constants.SIM_STEP, game.constants.SIM_STEP);
            }
            assert.equal(game.missiles.length, 0, `${name}: both rockets must complete the intercept within 2.5s`);
            close(20 - rock.hp, 2 * game.wingRocketSpec.damage);
            assert.equal(rock.radius, radius, 'Do not enlarge targets to conceal a guidance failure');
            assert.ok(rockets.every((missile) => !missile.active && missile.life > 0), `${name}: impact, not lifetime detonation`);
        }
    });

    test('wing rockets intercept two moving small targets from pitched rolled flight', () => {
        prepareHud();
        const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.45, 0.55, 1.1));
        putPlayer(vector(200, 0, 0), orientation);
        game.player.velocity.copy(vector(0, 0, 80).applyQuaternion(orientation));
        game.state.forceInvuln = true;
        for (const [offset, velocity] of [
            [[-12, 10, 55], [8, -4, 15]],
            [[14, -12, 65], [-6, 5, 10]]
        ]) {
            game.createAsteroid('small', vector(...offset).applyQuaternion(orientation).add(game.player.position), vector());
            const rock = game.asteroids.at(-1);
            rock.velocity.copy(vector(...velocity).applyQuaternion(orientation));
            rock.hp = rock.maxHp = 20;
        }
        const victims = Array.from(game.asteroids);
        game.rebuildRockGrid();
        game.fireWingRockets();
        const rockets = Array.from(game.missiles);
        assert.equal(new Set(rockets.map((missile) => missile.target)).size, 2);
        for (let step = 0; step < 360 && game.missiles.length; step++) {
            game.state.visualTime += game.constants.SIM_STEP;
            game.updateGame(game.constants.SIM_STEP, game.constants.SIM_STEP, game.constants.SIM_STEP);
            assert.ok(rockets.every((missile) => missile.velocity.toArray().every(Number.isFinite)));
        }
        assert.equal(game.missiles.length, 0);
        assert.ok(victims.every((rock) => rock.hp <= 20 - game.wingRocketSpec.damage));
        assert.ok(rockets.every((missile) => !missile.active && missile.life > 0));
    });

    test('wing guidance turns through exact reversal and reacquires a rear target without snapping or circling', () => {
        prepareHud();
        game.createAsteroid('small', vector(200, 0, 100), vector());
        const lost = game.asteroids[0];
        game.createAsteroid('small', vector(200, 0, -30), vector());
        const victim = game.asteroids[1];
        victim.velocity.set(0, 0, 0);
        victim.hp = victim.maxHp = 20;
        const missile = game.spawnMissile(lost, game.wingRocketSpec, 0, 1, false, game.player.wingRacks[0]);
        lost.dying = true;
        missile.group.position.copy(game.player.position);
        missile.previousPosition.copy(missile.group.position);
        missile.velocity.set(0, 0, missile.speed);
        missile.boost = 0;
        game.rebuildRockGrid();
        const before = missile.velocity.clone();
        game.updateMissiles(game.constants.SIM_STEP);
        assert.equal(missile.target, victim);
        const angle = before.angleTo(missile.velocity);
        assert.ok(angle > 0.01, 'Antiparallel headings must turn, not collapse to unchanged normalized lerp');
        assert.ok(angle <= missile.turnRate * game.constants.SIM_STEP + 1e-8, 'Turning must stay rate limited');
        assert.ok(missile.velocity.length() < before.length(), 'Overshoot recovery must decelerate');
        assert.ok(before.length() - missile.velocity.length() <= missile.accel * 2 * game.constants.SIM_STEP + 1e-8);
        for (let step = 0; step < 360 && missile.active; step++) {
            game.updateAsteroids(game.constants.SIM_STEP);
            game.rebuildRockGrid();
            game.updateMissiles(game.constants.SIM_STEP);
        }
        assert.equal(missile.active, false);
        assert.ok(missile.life > 0);
        close(20 - victim.hp, game.wingRocketSpec.damage);
    });

    test('wing rockets kill a maneuvering native-health hunter and reacquire a newly arrived small rock', () => {
        prepareHud();
        game.state.forceInvuln = true;
        game.spawnWave(3);
        game.clearCollection(game.asteroids);
        assert.equal(game.hunters.length, 1);
        const hunter = game.hunters[0];
        hunter.group.position.set(200, 0, 40);
        hunter.previousPosition.copy(hunter.group.position);
        hunter.velocity.set(2, 1, -3);
        game.fireWingRockets();
        const rockets = Array.from(game.missiles);
        assert.ok(rockets.every((missile) => missile.target === hunter));
        game.createAsteroid('small', vector(200, 12, 70), vector());
        const rock = game.asteroids[0];
        let reacquired = false;
        for (let step = 0; step < 480 && game.missiles.length; step++) {
            game.state.visualTime += game.constants.SIM_STEP;
            game.updateGame(game.constants.SIM_STEP, game.constants.SIM_STEP, game.constants.SIM_STEP);
            reacquired ||= game.missiles.some((missile) => missile.target === rock);
        }
        assert.ok(hunter.dying && hunter.hp <= 0, 'Require a real native-health hunter kill');
        assert.ok(reacquired, 'The surviving rocket must acquire the new contact after the hunter dies');
        assert.ok(rock.dying && rock.hp <= 0, 'Require a real native-health asteroid kill');
        assert.equal(game.missiles.length, 0);
        assert.ok(rockets.every((missile) => !missile.active && missile.life > 0));
    });

    test('R and both wing buttons launch rockets while repeats, menu focus, and pause remain protected', () => {
        prepareHud();
        const menu = game.document.getElementById('new-run');
        menu.focus();
        game.document.dispatch('keydown', { code: 'KeyR', repeat: false });
        assert.equal(game.missiles.length, 0);
        game.renderer.domElement.focus();
        game.document.dispatch('keydown', { code: 'KeyR', repeat: true });
        assert.equal(game.missiles.length, 0);
        game.document.dispatch('keydown', { code: 'KeyR', repeat: false });
        assert.equal(game.missiles.length, 2);
        for (const id of ['wing-rocket-btn', 'mv-rocket']) {
            game.resetMissiles();
            game.updateWingRockets(4.5);
            const button = game.document.getElementById(id);
            assert.ok(button, `Missing wing control ${id}`);
            button.dispatch('click');
            assert.equal(game.missiles.length, 2, id);
        }
        game.resetMissiles();
        game.updateWingRockets(4.5);
        game.setPaused(true);
        game.document.dispatch('keydown', { code: 'KeyR', repeat: false });
        game.document.getElementById('wing-rocket-btn').dispatch('click');
        assert.equal(game.missiles.length, 0);
        assert.ok(game.player.wingRacks.every((rack) => rack.cooldown === 0));
    });

    test('Tempest launch velocities span all three axes and rotate with the ship basis', () => {
        prepareHud();
        const orientation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.6, 0.3, 1.2));
        putPlayer(vector(200, 0, 0), orientation);
        const inverse = orientation.clone().invert();
        game.state.charge = 100;
        game.fireTempest();
        assert.ok(game.missiles.length >= 6);
        const directions = game.missiles.map((missile, index) => {
            const expected = vector();
            assert.equal(game.sphericalLaunchDirection(index, game.missiles.length, expected), expected);
            close(expected.length(), 1);
            const actual = missile.velocity.clone().normalize();
            vectorClose(actual, expected);
            close(missile.life, 5.4);
            return actual.applyQuaternion(inverse);
        });
        for (const axis of ['x', 'y', 'z']) {
            assert.ok(Math.min(...directions.map((direction) => direction[axis])) < -0.4, axis);
            assert.ok(Math.max(...directions.map((direction) => direction[axis])) > 0.4, axis);
        }
        const volume = Math.abs(directions[0].dot(directions[1].clone().cross(directions[2])));
        assert.ok(volume > 0.1, 'The launch fan must not be planar');
        assert.equal(game.state.charge, 0);
        assert.ok(game.sphericalPulses.some((pulse) => pulse.life > 0));
    });

    test('normal seeker spread is a forward 3D cone rather than a flat launch fan', () => {
        prepareHud();
        const directions = [];
        for (let index = 0; index < 8; index++) {
            const missile = game.spawnMissile(null, game.missileSpec(), index, 8);
            directions.push(missile.velocity.clone().normalize());
        }
        assert.ok(directions.every((direction) => direction.z > 0.9));
        for (const axis of ['x', 'y']) {
            assert.ok(Math.min(...directions.map((direction) => direction[axis])) < -0.05, axis);
            assert.ok(Math.max(...directions.map((direction) => direction[axis])) > 0.05, axis);
        }
    });

    test('spherical pulse pool expands isotropically, expires, and resets without growing', () => {
        assert.equal(game.sphericalPulses.length, 12);
        game.resetRun();
        game.spawnSphericalPulse(vector(200, 30, 40), 0xabcdef, 10, 1);
        const pulse = game.sphericalPulses.find((item) => item.life > 0);
        assert.ok(pulse.mesh.isMesh && pulse.material.isShaderMaterial);
        pulse.mesh.geometry.computeBoundingBox();
        const size = pulse.mesh.geometry.boundingBox.getSize(vector());
        assert.ok(size.x > 1.9 && size.y > 1.9 && size.z > 1.9);
        game.updateSphericalPulses(0.5);
        assert.equal(pulse.mesh.visible, true);
        assert.ok(pulse.mesh.scale.x > 1);
        close(pulse.mesh.scale.x, pulse.mesh.scale.y);
        close(pulse.mesh.scale.x, pulse.mesh.scale.z);
        assert.ok(pulse.material.uniforms.opacity.value > 0 && pulse.material.uniforms.opacity.value < 0.8);
        game.updateSphericalPulses(0.5);
        assert.equal(pulse.life, 0);
        assert.equal(pulse.mesh.visible, false);
        for (let i = 0; i < 20; i++) game.spawnSphericalPulse(vector(200, i, 0), 0xffffff, 4, 1);
        assert.equal(game.sphericalPulses.length, 12);
        game.fireWingRockets();
        game.resetRun();
        assert.ok(game.sphericalPulses.every((item) => item.life === 0 && !item.mesh.visible));
        assert.ok(game.player.wingRacks.every((rack) => rack.cooldown === 0 && rack.group.visible));
        assert.equal(game.missiles.length, 0);
    });

    test('collectGunTargets separates tracking from firing solutions and clears stale targets', () => {
        prepareHud();
        const victim = target(vector(200 + Math.tan(15 * Math.PI / 180) * 100, 0, 100));
        const out = [];
        game.collectGunTargets(out);
        assert.equal(out.length, 0);
        game.collectGunTargets(out, 3, false);
        assert.deepEqual(out, [victim]);
        victim.dying = true;
        game.collectGunTargets(out, 3, false);
        assert.equal(out.length, 0);
    });

    test('multi-barrel railguns divide a salvo across distinct reachable targets', () => {
        prepareHud();
        const victims = [target(vector(195, 0, 100)), target(vector(205, 0, 100)), target(vector(200, 5, 100))];
        for (const barrels of [3, 7]) {
            game.resetShots();
            game.state.gunsLevel = barrels;
            game.state.gunTimer = 0;
            game.state.heat = 0;
            game.fireGuns();
            assert.equal(game.shots.length, barrels);
            const assigned = new Set();
            for (const shot of game.shots) {
                const hit = victims.find((victim) => {
                    const travel = victim.group.position.clone().sub(shot.group.position);
                    const time = travel.dot(shot.velocity) / shot.velocity.lengthSq();
                    return time > 0 && time < shot.life && shot.group.position.clone().addScaledVector(shot.velocity, time).distanceTo(victim.group.position) < 1e-7;
                });
                assert.ok(hit, 'Every assisted barrel must point at an actual target intercept');
                assigned.add(hit);
            }
            assert.equal(assigned.size, 3, `MK${barrels} should cover three targets`);
        }
    });

    test('shot capacity covers every tier lifetime plus a complete extra salvo', () => {
        assert.equal(game.constants.SHOT_POOL, 168);
        assert.equal(game.shotPool.length, game.constants.SHOT_POOL);
        for (let barrels = 1; barrels < game.upgradeSpecs.guns.length; barrels++) {
            const spec = game.upgradeSpecs.guns[barrels];
            const minimum = barrels * (Math.ceil(game.constants.GUN_LIFE / spec.cooldown) + 1);
            assert.ok(game.shotPool.length >= minimum, `MK${barrels} needs at least ${minimum} slots`);
        }
    });

    test('successive single-barrel salvos rotate across three solutions and resetRun resets the cursor', () => {
        prepareHud();
        const victims = [target(vector(195, 0, 100)), target(vector(205, 0, 100)), target(vector(200, 5, 100))];
        const assignments = [];
        for (let i = 0; i < 4; i++) {
            game.resetShots();
            game.state.gunTimer = 0;
            game.state.heat = 0;
            game.fireGuns();
            assert.equal(game.shots.length, 1);
            const shot = game.shots[0];
            const index = victims.findIndex((victim) => {
                const direction = victim.group.position.clone().sub(shot.group.position).normalize();
                return direction.distanceTo(shot.velocity.clone().normalize()) < 1e-8;
            });
            assert.notEqual(index, -1);
            assignments.push(index);
        }
        assert.equal(new Set(assignments.slice(0, 3)).size, 3);
        assert.equal(assignments[0], assignments[3]);
        assert.notEqual(game.gunTargetCursor, 0);
        game.resetRun();
        assert.equal(game.gunTargetCursor, 0);
    });

    for (const freeSlots of [0, 6]) {
        test(`MK7 preflight with ${freeSlots} free slots emits no partial salvo, heat, cooldown, sparks, or sound`, () => {
            prepareHud();
            game.state.gunsLevel = 7;
            fillShotPool(freeSlots);
            game.state.heat = 12;
            game.state.gunTimer = -game.constants.SIM_STEP / 2;
            const log = recordGunAudio();
            const before = {
                count: game.shots.length, heat: game.state.heat, timer: game.state.gunTimer,
                sparkHead: game.sparks.head, activeSparks: game.sparks.pool.filter((spark) => spark.active).length
            };
            const active = game.shotPool.map((shot) => shot.active);
            game.fireGuns();
            assert.equal(game.shots.length, before.count);
            assert.deepEqual(game.shotPool.map((shot) => shot.active), active);
            assert.equal(game.state.heat, before.heat);
            assert.equal(game.state.gunTimer, before.timer);
            assert.equal(game.sparks.head, before.sparkHead);
            assert.equal(game.sparks.pool.filter((spark) => spark.active).length, before.activeSparks);
            assert.equal(log.starts, 0);

            fillShotPool(7);
            const count = game.shots.length;
            game.fireGuns();
            assert.equal(game.shots.length - count, 7, 'Exactly enough capacity must emit a complete salvo');
            assert.ok(game.state.heat > before.heat && game.state.gunTimer > 0);
            assert.notEqual(game.sparks.head, before.sparkHead);
            assert.equal(log.starts, 1, 'The audio observation must detect an actual successful shot');
        });
    }

    test('sustained cold MK7 flight emits every scheduled seven-shot salvo beyond three projectile lifetimes', () => {
        clearThreats();
        game.resetShots();
        putPlayer(vector(0, 350, 0));
        game.player.velocity.set(3, 0, 0);
        game.state.flightAssist = false;
        game.state.gunsLevel = 7;
        game.state.heat = 0;
        game.state.gunTimer = 0;
        // A real distant rock prevents wave spawning while keeping the entire shot path clear.
        game.createAsteroid('small', vector(0, -200, 0), vector());
        const log = recordGunAudio();
        const dt = game.constants.SIM_STEP;
        game.onFireDown('KeyF');
        assert.equal(game.shots.length, 7);
        let salvos = 1;
        let peakActive = 7;
        const steps = Math.ceil(game.constants.GUN_LIFE * 3.2 / dt);
        for (let step = 1; step <= steps; step++) {
            // Isolate capacity at maximum firing rate, rather than letting heat mask starvation.
            game.state.heat = 0;
            const due = game.state.gunTimer <= dt;
            const previouslyActive = new Set(game.shots);
            game.updateGame(dt, dt, dt);
            const newborn = game.shots.filter((shot) => !previouslyActive.has(shot));
            assert.equal(newborn.length, due ? 7 : 0, `Incomplete volley at ${(step * dt).toFixed(3)}s`);
            for (const shot of newborn) close(shot.life, game.constants.GUN_LIFE - dt);
            if (due) salvos++;
            assert.equal(log.starts, salvos, 'Fire sound must correspond to an emitted salvo');
            assert.equal(game.state.heat, due ? game.gunSpec().heat : 0);
            assert.ok(game.shots.length > 0 && game.shots.length <= game.shotPool.length);
            assert.equal(game.state.lives, 3);
            peakActive = Math.max(peakActive, game.shots.length);
        }
        assert.ok(salvos > 60, 'Exercise sustained fire and pool reuse, not just the initial fill');
        assert.ok(peakActive > 110, 'Fixture must exceed the old pool capacity');
        assert.ok(salvos * 7 > game.shotPool.length * 2);
    });

    test('fine-pointer fallback click tap-fires and focuses the canvas after a menu button', () => {
        prepareHud();
        const surface = game.renderer.domElement;
        const menu = game.document.getElementById('new-run');
        menu.focus();
        assert.equal(game.document.activeElement, menu);
        assert.equal(surface.tabIndex, 0);
        assert.equal(surface.requestPointerLock, undefined);
        assert.equal(game.input.pointerLocked, false);
        surface.dispatch('pointerdown', pointerEvent());
        assert.equal(game.document.activeElement, surface);
        assert.equal(surface.focusOptions.preventScroll, true);
        assert.equal(game.input.pointerLockFailed, true);
        assert.equal(game.shots.length, 0, 'Fallback tap should wait for pointer-up');
        surface.dispatch('pointerup', pointerEvent());
        assert.equal(game.shots.length, 1);
        assert.equal(game.input.dragging, false);
        assert.equal(game.input.firing, false);
        assert.equal(game.input.fireSources.size, 0);
        game.document.dispatch('keydown', { code: 'KeyW', repeat: false });
        assert.equal(game.input.keys.KeyW, true, 'Canvas focus must release the old menu editing guard');
    });

    test('fine-pointer fallback drag steers without producing a tap shot', () => {
        prepareHud();
        const surface = game.renderer.domElement;
        surface.dispatch('pointerdown', pointerEvent());
        surface.dispatch('pointermove', pointerEvent({ clientX: 130, clientY: 120 }));
        assert.ok(game.input.dragDistance > 8);
        assert.ok(game.input.lookDX > 0 && game.input.lookDY > 0);
        game.updatePlayer(game.constants.SIM_STEP);
        assert.ok(game.player.orientation.angleTo(new THREE.Quaternion()) > 0.01);
        surface.dispatch('pointerup', pointerEvent({ clientX: 130, clientY: 120 }));
        assert.equal(game.input.dragging, false);
        assert.equal(game.input.dragPointerId, -1);
        assert.equal(game.shots.length, 0);
        assert.equal(game.state.heat, 0);
    });

    test('cancelled fallback pointer gestures never turn into tap shots', () => {
        prepareHud();
        const surface = game.renderer.domElement;
        for (const type of ['pointercancel', 'lostpointercapture']) {
            surface.dispatch('pointerdown', pointerEvent());
            surface.dispatch(type, pointerEvent());
            assert.equal(game.shots.length, 0, type);
            assert.equal(game.input.dragging, false);
            assert.equal(game.input.fireSources.size, 0);
        }
    });

    for (const rejected of [false, true]) {
        test(`New Run and Resume refocus the canvas when pointer lock is ${rejected ? 'rejected' : 'unsupported'}`, async () => {
            const surface = game.renderer.domElement;
            let attempts = 0;
            if (rejected) surface.requestPointerLock = () => {
                attempts++;
                return Promise.reject(new Error('Pointer lock rejected by test environment'));
            };
            for (const id of ['new-run', 'pause']) {
                const button = game.document.getElementById(id);
                if (id === 'pause') game.setPaused(true);
                button.focus();
                assert.equal(game.document.activeElement, button);
                button.dispatch('click');
                await Promise.resolve();
                assert.equal(game.document.activeElement, surface, id);
                assert.equal(surface.focusOptions.preventScroll, true);
                assert.equal(game.input.pointerLockFailed, true);
                assert.equal(game.input.pointerLocked, false);
                assert.equal(game.state.paused, false);
                game.document.dispatch('keydown', { code: 'KeyW', repeat: false });
                assert.equal(game.input.keys.KeyW, true);
                game.document.dispatch('keyup', { code: 'KeyW' });
            }
            assert.equal(attempts, rejected ? 2 : 0);
        });
    }

    test('holding F survives surface and window pointer releases and continues firing', () => {
        prepareHud();
        const surface = game.renderer.domElement;
        game.input.pointerLocked = true;
        game.document.dispatch('keydown', { code: 'KeyF', repeat: false });
        surface.dispatch('pointerdown', pointerEvent());
        assert.equal(game.input.fireSources.size, 2);
        surface.dispatch('pointerup', pointerEvent());
        game.window.dispatch('pointerup', pointerEvent());
        assert.deepEqual(Array.from(game.input.fireSources), ['KeyF']);
        assert.equal(game.input.firing, true);
        const before = game.shots.length;
        game.state.gunTimer = 0;
        game.updateWeapons();
        assert.equal(game.shots.length, before + 1);
        game.document.dispatch('keyup', { code: 'KeyF' });
        assert.equal(game.input.firing, false);
        assert.equal(game.input.fireSources.size, 0);
    });

    test('holding the pointer survives F release and continues firing', () => {
        prepareHud();
        const surface = game.renderer.domElement;
        game.input.pointerLocked = true;
        surface.dispatch('pointerdown', pointerEvent());
        game.document.dispatch('keydown', { code: 'KeyF', repeat: false });
        game.document.dispatch('keyup', { code: 'KeyF' });
        assert.deepEqual(Array.from(game.input.fireSources), ['pointer']);
        assert.equal(game.input.firing, true);
        const before = game.shots.length;
        game.state.gunTimer = 0;
        game.updateWeapons();
        assert.equal(game.shots.length, before + 1);
        surface.dispatch('pointerup', pointerEvent());
        assert.equal(game.input.firing, false);
    });

    test('F and Enter own independent fire holds and keyboard repeat does not duplicate a source', () => {
        prepareHud();
        for (const code of ['KeyF', 'Enter']) {
            game.document.dispatch('keydown', { code, repeat: false });
            game.document.dispatch('keydown', { code, repeat: true });
        }
        assert.deepEqual(Array.from(game.input.fireSources).sort(), ['Enter', 'KeyF']);
        assert.equal(game.shots.length, 1, 'A second hold must not emit an extra immediate shot');
        game.document.dispatch('keyup', { code: 'KeyF' });
        assert.equal(game.input.firing, true);
        assert.deepEqual(Array.from(game.input.fireSources), ['Enter']);
        game.document.dispatch('keyup', { code: 'Enter' });
        assert.equal(game.input.firing, false);
        assert.equal(game.input.fireSources.size, 0);
    });

    test('fire button wrappers own a named hold independent of keyboard and pointer releases', () => {
        prepareHud();
        const button = game.document.getElementById('fire');
        game.document.dispatch('keydown', { code: 'KeyF', repeat: false });
        button.dispatch('pointerdown', pointerEvent());
        assert.deepEqual(Array.from(game.input.fireSources).sort(), ['KeyF', 'button']);
        game.window.dispatch('pointerup', pointerEvent());
        assert.equal(game.input.fireSources.size, 2);
        button.dispatch('pointercancel', pointerEvent());
        assert.deepEqual(Array.from(game.input.fireSources), ['KeyF']);
        button.dispatch('pointerdown', pointerEvent());
        game.document.dispatch('keyup', { code: 'KeyF' });
        assert.deepEqual(Array.from(game.input.fireSources), ['button']);
        assert.equal(game.input.firing, true);
        button.dispatch('pointerup', pointerEvent());
        assert.equal(game.input.firing, false);
        assert.equal(game.input.fireSources.size, 0);
    });

    test('pause cancels all fire sources and resuming cannot resurrect a stale hold', () => {
        prepareHud();
        for (const source of ['pointer', 'KeyF', 'Enter', 'button']) game.onFireDown(source);
        assert.equal(game.input.fireSources.size, 4);
        game.setPaused(true);
        assert.equal(game.input.fireSources.size, 0);
        assert.equal(game.input.firing, false);
        const count = game.shots.length;
        game.state.gunTimer = 0;
        game.onFireDown('pointer');
        assert.equal(game.input.fireSources.size, 0, 'Paused presses cannot create future holds');
        game.setPaused(false);
        game.updateWeapons();
        assert.equal(game.shots.length, count);
        game.onFireUp();
        assert.equal(game.input.firing, false);
    });

    test('PEAK x labels the current-run combo peak rather than the saved best score', () => {
        const peak = game.document.getElementById('best-val');
        const label = peak.parentElement;
        game.state.bestScore = 987654;
        game.state.bestCombo = 7;
        game.updateUi(0);
        assert.equal(label.getAttribute('title'), 'Peak combo this run');
        assert.equal(label.textContent.trim(), 'PEAK x7');
        assert.doesNotMatch(label.textContent, /BEST|987654/);
        game.resetRun();
        game.updateUi(0);
        assert.equal(label.textContent.trim(), 'PEAK x0');
        assert.equal(game.state.bestScore, 987654);
    });

    test('flight basis is right-handed and orthonormal after yaw, pitch, and roll', () => {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.8, -1.1, 1.3, 'YXZ'));
        const sources = [q, { orientation: q }, { quaternion: q }, { group: { quaternion: q } }];
        for (const source of sources) {
            const forward = game.getForward(source, vector());
            const right = game.getRight(source, vector());
            const up = game.getUp(source, vector());
            for (const axis of [forward, right, up]) close(axis.length(), 1);
            close(forward.dot(right), 0);
            close(forward.dot(up), 0);
            close(up.dot(right), 0);
            vectorClose(right.clone().cross(up), forward);
            vectorClose(forward, vector(0, 0, 1).applyQuaternion(q));
        }
    });

    test('polar forward directions retain a valid basis and camera looks down local -Z', () => {
        for (const forward of [vector(0, 1, 0), vector(0, -1, 0), vector(1e-9, 1, 1e-9).normalize()]) {
            const q = game.setOrientationFromForward(new THREE.Quaternion(), forward);
            vectorClose(game.getForward(q, vector()), forward);
            close(q.length(), 1);
            const right = vector();
            const up = vector();
            game.makePerpendicularBasis(forward, right, up);
            vectorClose(right.clone().cross(up), forward);
            const cameraQ = game.orientationToCamera(q, new THREE.Quaternion());
            vectorClose(vector(0, 0, -1).applyQuaternion(cameraQ), forward);
        }
    });

    test('camera look preserves rolled up instead of snapping to world Y', () => {
        const up = vector(-1, 0, 0);
        const q = game.composeCameraLook(vector(0, 0, -10), vector(0, 0, 20), up, new THREE.Quaternion());
        vectorClose(vector(0, 0, -1).applyQuaternion(q), vector(0, 0, 1));
        vectorClose(vector(0, 1, 0).applyQuaternion(q), up);
    });

    test('actual mouse handler accumulates deltas; updatePlayer consumes them once', () => {
        game.input.pointerLocked = true;
        game.document.dispatch('mousemove', { movementX: 10, movementY: -5 });
        game.document.dispatch('mousemove', { movementX: 14, movementY: -7 });
        close(game.input.lookDX, 24);
        close(game.input.lookDY, -12);
        const before = game.player.orientation.clone();
        game.updatePlayer(1 / 60);
        const rotated = game.player.orientation.clone();
        assert.ok(before.angleTo(rotated) > 0.001);
        close(game.input.lookDX, 0);
        close(game.input.lookDY, 0);
        game.updatePlayer(1 / 60);
        quaternionClose(game.player.orientation, rotated);
    });

    test('mouse displacement is frame-rate independent and pitch inversion is effective', () => {
        const run = (dt, invert) => {
            game.player.orientation.identity();
            game.input.lookDX = 30;
            game.input.lookDY = 20;
            game.state.invertPitch = invert;
            game.updatePlayer(dt);
            return game.player.orientation.clone();
        };
        const fast = run(1 / 120, false);
        const slow = run(1 / 30, false);
        quaternionClose(fast, slow);
        const inverted = run(1 / 60, true);
        assert.ok(game.getForward(fast, vector()).y * game.getForward(inverted, vector()).y < 0);
    });

    test('yaw is ship-local after roll; keyboard input integrates elapsed time', () => {
        const initial = new THREE.Quaternion().setFromAxisAngle(vector(0, 0, 1), Math.PI / 2);
        game.player.orientation.copy(initial);
        game.input.keys.KeyA = true;
        game.updatePlayer(1 / 30);
        const once = game.player.orientation.clone();
        assert.ok(Math.abs(game.getForward(once, vector()).y) > 0.01);
        vectorClose(game.getUp(once, vector()), game.getUp(initial, vector()));
        game.player.orientation.copy(initial);
        game.updatePlayer(1 / 60);
        game.updatePlayer(1 / 60);
        quaternionClose(game.player.orientation, once);
    });

    test('thrust follows a pitched 3D nose and updates the swept start position', () => {
        const q = game.setOrientationFromForward(new THREE.Quaternion(), vector(0, 1, 0));
        const start = vector(200, 0, 0);
        putPlayer(start, q);
        game.input.keys.KeyW = true;
        game.updatePlayer(1 / 60);
        assert.ok(game.player.velocity.y > 0 && game.player.position.y > 0);
        close(game.player.velocity.x, 0);
        close(game.player.velocity.z, 0);
        vectorClose(game.player.previousPosition, start);
        vectorClose(game.player.group.position, game.player.position);
        quaternionClose(game.player.group.quaternion, game.player.orientation);
    });

    test('X brake damps sideways velocity without reversing it or adding nose thrust', () => {
        putPlayer(vector(200, 0, 0));
        game.state.flightAssist = false;
        game.player.velocity.set(12, -16, 0);
        const initialDirection = game.player.velocity.clone().normalize();
        game.document.dispatch('keydown', { code: 'KeyX', repeat: false });
        let previousSpeed = game.player.velocity.length();
        for (let i = 0; i < 120; i++) {
            game.updatePlayer(1 / 120);
            const speed = game.player.velocity.length();
            assert.ok(speed < previousSpeed && speed > 0);
            vectorClose(game.player.velocity.clone().normalize(), initialDirection);
            close(game.player.velocity.z, 0);
            previousSpeed = speed;
        }
    });

    test('S remains intentional retro-thrust, including from rest', () => {
        putPlayer(vector(200, 0, 0));
        game.input.keys.KeyS = true;
        game.updatePlayer(1 / 120);
        assert.ok(game.player.velocity.z < 0);
        close(game.player.velocity.x, 0);
        close(game.player.velocity.y, 0);
    });

    test('retro thrust lights real forward-facing RCS jets and fades them after release', () => {
        putPlayer(vector(200, 0, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.3, 0.4, 0.8)));
        const jets = game.player.group.userData.retroJets;
        assert.equal(jets.length, 2);
        assert.ok(jets.every(({ jet, core }) => jet.isMesh && core.isMesh && !jet.visible && !core.visible));
        game.input.keys.KeyS = true;
        for (let step = 0; step < 12; step++) game.updatePlayer(game.constants.SIM_STEP);
        assert.ok(game.input.retroBurn > 0.5);
        game.scene.updateMatrixWorld(true);
        const forward = game.getForward(game.player, vector());
        for (const { jet, core } of jets) {
            assert.ok(jet.visible && core.visible);
            assert.ok(jet.material.opacity > 0.2 && core.material.opacity > 0.2);
            // The shared flame cone points down local -Z; the retro mount flips it toward the nose.
            const exhaust = vector(0, 0, -1).applyQuaternion(jet.getWorldQuaternion(new THREE.Quaternion()));
            close(exhaust.dot(forward), 1);
            assert.ok(jet.getWorldPosition(vector()).sub(game.player.position).dot(forward) > 0);
        }
        game.input.keys.KeyS = false;
        for (let step = 0; step < 120; step++) game.updatePlayer(game.constants.SIM_STEP);
        assert.ok(jets.every(({ jet, core }) => !jet.visible && !core.visible));
    });

    test('braking forward momentum lights retro jets and pause clears the burn immediately', () => {
        putPlayer(vector(200, 0, 0));
        game.player.velocity.set(0, 0, 20);
        game.input.keys.KeyX = true;
        game.updatePlayer(game.constants.SIM_STEP);
        assert.ok(game.input.retroBurn > 0);
        assert.ok(game.player.group.userData.retroJets.every(({ jet, core }) => jet.visible && core.visible));
        assert.ok(game.player.velocity.z > 0 && game.player.velocity.z < 20);
        game.setPaused(true);
        close(game.input.retroBurn, 0);
        assert.ok(game.player.group.userData.retroJets.every(({ jet, core }) => !jet.visible && !core.visible));
    });

    test('releasing boost preserves continuous speed instead of snapping to the cruise cap', () => {
        putPlayer(vector(200, 0, 0));
        game.state.flightAssist = true;
        game.state.driveCharge = 100;
        game.input.keys.KeyW = true;
        game.input.keys.ShiftLeft = true;
        for (let i = 0; i < 240; i++) game.updatePlayer(1 / 120);
        const boostedSpeed = game.player.velocity.length();
        assert.ok(boostedSpeed > game.state.tuneMaxSpeed * 1.1, 'Fixture must reach boosted speed');
        game.input.keys.ShiftLeft = false;
        game.updatePlayer(1 / 120);
        const releasedSpeed = game.player.velocity.length();
        assert.equal(game.input.boosting, false);
        assert.ok(releasedSpeed > game.state.tuneMaxSpeed);
        assert.ok(releasedSpeed > boostedSpeed * 0.98 && releasedSpeed <= boostedSpeed);
    });

    test('C toggles assist off once and preserves all-vector inertia without thrust', () => {
        putPlayer(vector(200, 0, 0));
        game.state.flightAssist = true;
        game.player.velocity.set(4, -6, 8);
        const initial = game.player.velocity.clone();
        game.document.dispatch('keydown', { code: 'KeyC', repeat: false });
        assert.equal(game.state.flightAssist, false);
        game.document.dispatch('keydown', { code: 'KeyC', repeat: true });
        assert.equal(game.state.flightAssist, false, 'Key repeat must not toggle assist');
        for (let i = 0; i < 120; i++) game.updatePlayer(1 / 120);
        vectorClose(game.player.velocity, initial);
        vectorClose(game.player.position, vector(204, -6, 8));
    });

    test('actual animation loop advances identical flight at 20, 60, and 144 render Hz', () => {
        const results = [];
        for (const fps of [20, 60, 144]) {
            game.resetRun();
            clearThreats();
            putPlayer(vector(200, 0, 0));
            game.state.forceInvuln = true;
            game.state.visualTime = 0;
            game.input.keys.KeyW = true;
            game.input.keys.KeyA = true;
            for (let frame = 0; frame < fps; frame++) game.frame(1 / fps);
            close(game.state.visualTime, 1, 1e-9);
            results.push({ position: game.player.position.clone(), velocity: game.player.velocity.clone(), orientation: game.player.orientation.clone() });
        }
        for (const result of results.slice(1)) {
            vectorClose(result.position, results[0].position, 1e-7);
            vectorClose(result.velocity, results[0].velocity, 1e-7);
            quaternionClose(result.orientation, results[0].orientation);
        }
    });

    test('144 Hz render-only frames retain mouse input until the next 120 Hz physics step', () => {
        game.resetRun();
        clearThreats();
        putPlayer(vector(200, 0, 0));
        game.input.pointerLocked = true;
        game.document.dispatch('mousemove', { movementX: 12, movementY: 0 });
        game.frame(1 / 144);
        quaternionClose(game.player.orientation, new THREE.Quaternion());
        close(game.input.lookDX, 12);
        game.document.dispatch('mousemove', { movementX: 8, movementY: 0 });
        game.frame(1 / 144);
        const expectedYaw = -20 * 0.0018 * game.state.tuneMouse * (game.state.tuneTurn / 4.2);
        quaternionClose(game.player.orientation, new THREE.Quaternion().setFromAxisAngle(vector(0, 1, 0), expectedYaw));
        close(game.input.lookDX, 0);
        const previous = game.player.orientation.clone();
        game.frame(1 / 144);
        quaternionClose(game.player.orientation, previous);
    });

    const segmentCases = [
        ['first surface entry, not closest approach', [0, 0, 0], [10, 0, 0], [5, 0, 0], 1, 0.4],
        ['tangent contact', [0, 1, 0], [10, 1, 0], [5, 0, 0], 1, 0.5],
        ['starts inside', [0.5, 0, 0], [10, 0, 0], [0, 0, 0], 1, 0],
        ['stationary inside', [0, 0, 0], [0, 0, 0], [0, 0, 0], 1, 0],
        ['stationary outside', [2, 0, 0], [2, 0, 0], [0, 0, 0], 1, -1],
        ['surface start moving out', [1, 0, 0], [2, 0, 0], [0, 0, 0], 1, 0],
        ['endpoint contact', [0, 0, 0], [4, 0, 0], [5, 0, 0], 1, 1],
        ['sphere beyond endpoint', [0, 0, 0], [3, 0, 0], [5, 0, 0], 1, -1],
        ['sphere behind start', [0, 0, 0], [10, 0, 0], [-5, 0, 0], 1, -1],
        ['same XZ but different Y misses', [0, 0, 0], [0, 0, 10], [0, 3, 5], 1, -1],
        ['vertical sweep includes Y', [2, -5, 3], [2, 5, 3], [2, 0, 3], 1, 0.4],
        ['zero-radius point', [0, 0, 0], [10, 0, 0], [5, 0, 0], 0, 0.5]
    ];
    for (const [name, start, end, center, radius, expected] of segmentCases) {
        test(`segment/sphere: ${name}`, () => {
            close(game.projectileSegmentHitTime(vector(...start), vector(...end), vector(...center), radius), expected);
        });
    }

    test('segment/sphere contact is invariant under a common 3D rotation and translation', () => {
        const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.7, -1.2, 0.8));
        const transform = (v) => v.applyQuaternion(q).add(vector(123, -45, 67));
        close(game.projectileSegmentHitTime(transform(vector()), transform(vector(10, 0, 0)), transform(vector(5, 0, 0)), 1), 0.4);
    });

    test('projectiles choose earliest surface across both collections, not nearest center or array order', () => {
        clearThreats();
        const small = target(vector(200, 0, 5), 0.25);
        const large = target(vector(200, 0, 7), 3, 'hunter');
        const start = vector(200, 0, 0);
        const end = vector(200, 0, 10);
        let hit = game.findProjectileHit(end, 0, null, start);
        assert.equal(hit?.target, large, 'Larger hunter surface is encountered before smaller asteroid');
        close(hit.time, 0.4);
        vectorClose(hit.point, vector(200, 0, 4));
        large.dying = true;
        hit = game.findProjectileHit(end, 0, null, start);
        assert.equal(hit?.target, small);
        const shot = { hitTargets: [small], hitCount: 1 };
        assert.equal(game.findProjectileHit(end, 0, shot, start), null);
        assert.equal(game.findProjectileHit(vector(200, 20, 10), 0, null, vector(200, 20, 0)), null);
    });

    test('broadphase handles vertical segments, altitude separation, and no duplicate candidates', () => {
        clearThreats();
        const near = target(vector(200, 0, 0));
        const above = target(vector(200, 50, 0));
        game.updateRockCollisions(0);
        const candidates = [];
        game.collectRocksNearSegment(vector(200, -10, 0), vector(200, 10, 0), 0.5, candidates);
        assert.ok(candidates.includes(near));
        assert.ok(!candidates.includes(above));
        assert.equal(new Set(candidates).size, candidates.length);
        const hit = game.findProjectileHit(vector(200, 10, 0), 0.5, null, vector(200, -10, 0));
        assert.equal(hit?.target, near);
    });

    test('broadphase padding includes a radius-5 boss across the neighboring grid cell', () => {
        clearThreats();
        const boss = target(vector(12.1, 156, 0), 5);
        boss.type = 'prism';
        game.rebuildRockGrid();
        const start = vector(7, 156, 0);
        const end = vector(7, 156, 2);
        const candidates = [];
        game.collectRocksNearSegment(start, end, 0.85, candidates);
        assert.ok(candidates.includes(boss));
        const hit = game.findProjectileHit(end, 0.85, null, start);
        assert.equal(hit?.target, boss);
        close(hit.time, 0);
    });

    test('moving targets crossing Y are swept relative to the shot, including broadphase travel padding', () => {
        clearThreats();
        const crossing = target(vector(200, -50, 0));
        crossing.previousPosition = vector(200, 50, 0);
        const stationaryShot = vector(200, 0, 0);
        close(game.movingTargetHitTime(stationaryShot, stationaryShot, crossing, 0.5), 0.485);
        game.rebuildRockGrid();
        const hit = game.findProjectileHit(stationaryShot, 0.5, null, stationaryShot);
        assert.equal(hit?.target, crossing);
        close(hit.time, 0.485);
        crossing.previousPosition.x = 220;
        crossing.group.position.x = 220;
        game.rebuildRockGrid();
        assert.equal(game.findProjectileHit(stationaryShot, 0.5, null, stationaryShot), null);
    });

    test('children spawned after grid construction are hittable in the same production step', () => {
        clearThreats();
        const parent = game.createAsteroid('large', vector(200, 0, 30), vector());
        game.createAsteroid('small', vector(230, 40, -80), vector());
        game.rebuildRockGrid();
        game.hitAsteroid(game.asteroids.indexOf(parent), parent.group.position.clone(), 1000, false, false);
        parent.shatterTimer = 0;
        game.updateGame(1 / 120, 1 / 120, 1 / 120);
        assert.equal(game.asteroids.includes(parent), false);
        const children = game.asteroids.filter((entity) => entity.size === 'medium');
        assert.equal(children.length, 2, 'Real shatter should create children');
        const end = children[0].group.position.clone();
        const hit = game.findProjectileHit(end, 0.1, null, end);
        assert.ok(hit && children.includes(hit.target), 'Fresh child is missing from the rebuilt broadphase');
    });

    test('asteroid return enforces the 330-unit boundary and avoids the player and actual moons', () => {
        clearThreats();
        putPlayer(vector(-200, 0, 0));
        assert.equal(game.constants.ASTEROID_RETURN_RADIUS, 330);
        game.createAsteroid('small', vector(330, 0, 0), vector(2, 1, 0));
        const rock = game.asteroids[0];
        assert.equal(game.returnAsteroidToBelt(rock, false), false);
        vectorClose(rock.group.position, vector(330, 0, 0));
        rock.dying = true;
        rock.group.position.set(400, 0, 0);
        assert.equal(game.returnAsteroidToBelt(rock, false), false);
        rock.dying = false;
        for (let i = 0; i < 24; i++) {
            rock.group.position.set(400, i * 9, -i * 4);
            rock.previousPosition.copy(rock.group.position);
            game.state.visualTime = 10 + i;
            assert.equal(game.returnAsteroidToBelt(rock, false), true);
            const radius = rock.group.position.length();
            assert.ok(radius >= 152 && radius <= 238);
            assert.ok(rock.group.position.distanceTo(game.player.position) > rock.radius + 22);
            for (const moon of game.moons) {
                assert.ok(rock.group.position.distanceTo(moon.mesh.position) >= (moon.collideRadius || moon.mesh.scale.x) + rock.radius + 6);
            }
            vectorClose(rock.previousPosition, rock.group.position);
            assert.equal(rock.warpedAt, game.state.visualTime);
        }
    });

    test('warped asteroids drop stale locks and missile targets without sweeping across the world', () => {
        prepareHud();
        game.createAsteroid('small', vector(400, 200, 0), vector(4, 1, 0));
        const rock = game.asteroids[0];
        const old = rock.group.position.clone();
        const retained = target(vector(210, 0, 80));
        game.seeker.locks.push(rock, retained);
        const missile = game.spawnMissile(rock, game.missileSpec(), 0, 1);
        game.rebuildRockGrid();
        assert.equal(game.returnAsteroidToBelt(rock, false), true);
        assert.deepEqual(Array.from(game.seeker.locks), [retained]);
        assert.equal(missile.target, null);
        const crossed = old.clone().lerp(rock.group.position, 0.2);
        assert.equal(game.worldHitTime(crossed, crossed, 0.2), -1, 'Fixture must be clear of celestial bodies');
        assert.equal(game.movingTargetHitTime(crossed, crossed, rock, 0.2), -1);
        game.rebuildRockGrid();
        assert.equal(game.findProjectileHit(crossed, 0.2), null);
        assert.equal(game.collectRocksNearSegment(old, old, 0.2, []).includes(rock), false);
        assert.equal(game.findProjectileHit(rock.group.position, 0.2).target, rock, 'New location must remain hittable');
        game.updateAsteroidTrajectories();
        const matrix = new THREE.Matrix4();
        game.asteroidTrajectoryMesh.getMatrixAt(0, matrix);
        const position = vector(), scale = vector();
        matrix.decompose(position, new THREE.Quaternion(), scale);
        assert.ok(matrix.elements.every(Number.isFinite));
        assert.ok(position.distanceTo(rock.group.position) < rock.radius + 15);
        assert.ok(Math.max(scale.x, scale.y, scale.z) <= 14, 'Trajectory must not bridge the warp');
    });

    test('production asteroid update returns escaped rocks before world constraints and rebuilds collision state', () => {
        clearThreats();
        putPlayer(vector(200, 0, 0));
        game.createAsteroid('small', vector(331, 80, 0), vector(10, 1, 0));
        const rock = game.asteroids[0];
        game.updateAsteroids(game.constants.SIM_STEP);
        assert.ok(rock.group.position.length() >= 152 && rock.group.position.length() <= 238);
        vectorClose(rock.previousPosition, rock.group.position);
        assert.equal(rock.warpedAt, game.state.visualTime);
        assert.ok(game.sphericalPulses.filter((pulse) => pulse.life > 0).length >= 2);
        game.updateGame(game.constants.SIM_STEP, game.constants.SIM_STEP, game.constants.SIM_STEP);
        assert.ok(game.collectRocksNearSegment(rock.group.position, rock.group.position, 0.2, []).includes(rock));
    });

    test('world geometry blocks a target behind the planet, but not a nearer target', () => {
        clearThreats();
        target(vector(180, 0, 0));
        const start = vector(-200, 0, 0);
        const end = vector(200, 0, 0);
        let hit = game.findProjectileHit(end, 0, null, start);
        assert.equal(hit?.world, true);
        assert.equal(hit.target, null);
        close(hit.time, (200 - game.constants.PLANET_R) / 400);
        const nearer = target(vector(-150, 0, 0));
        hit = game.findProjectileHit(end, 0, null, start);
        assert.equal(hit?.world, false);
        assert.equal(hit.target, nearer);
    });

    test('rock collisions use Y separation and resolve actual vertical overlap', () => {
        clearThreats();
        const a = target(vector(200, 0, 0));
        const b = target(vector(200, 10, 0));
        game.resolveRockPair(a, b);
        vectorClose(a.group.position, vector(200, 0, 0));
        vectorClose(b.group.position, vector(200, 10, 0));
        b.group.position.y = 1;
        game.resolveRockPair(a, b);
        close(a.group.position.distanceTo(b.group.position), 2);
        close(a.group.position.x, 200);
        close(b.group.position.z, 0);
    });

    test('line of sight and aim cone do not flatten altitude into XZ', () => {
        assert.equal(game.hasLineOfSight(vector(-200, 0, 0), vector(200, 0, 0)), false);
        assert.equal(game.hasLineOfSight(vector(-200, 150, 0), vector(200, 150, 0)), true);
        assert.equal(game.targetInAimCone(vector(), vector(0, 0, 1), vector(0, 0, 20), 30, 0.9), true);
        assert.equal(game.targetInAimCone(vector(), vector(0, 0, 1), vector(0, 30, 20), 100, 0.9), false);
    });

    test('world-body collision detects an actual scene moon and rejects same-XZ altitude separation', () => {
        const moon = game.moons[0];
        putPlayer(moon.mesh.position.clone());
        assert.equal(game.hitWorldBody(), 'moon');
        putPlayer(moon.mesh.position.clone().add(vector(0, 80, 0)));
        assert.equal(game.hitWorldBody(), null);
    });

    test('world-body collision catches a moon crossed between two outside endpoints', () => {
        const moon = game.moons[0];
        const center = moon.mesh.getWorldPosition(vector());
        const offset = (moon.collideRadius || moon.mesh.scale.x) + game.player.radius + 8;
        const axis = vector().crossVectors(center.clone().normalize(), vector(0, 1, 0)).normalize();
        const start = center.clone().addScaledVector(axis, -offset);
        const end = center.clone().addScaledVector(axis, offset);
        putPlayer(end);
        game.player.previousPosition.copy(start);
        assert.equal(game.hitWorldBody(), 'moon', 'Swept player path crosses moon even though both endpoints are clear');
    });

    test('world-body collision catches crossing through the planet', () => {
        putPlayer(vector(130, 0, 0));
        game.player.previousPosition.set(-130, 0, 0);
        assert.equal(game.hitWorldBody(), 'planet');
    });

    test('actual planet-impact respawn discards old thruster samples before the next ribbon update', () => {
        clearThreats();
        putPlayer(vector(game.constants.PLANET_R + game.player.radius, 0, 0));
        game.state.forceInvuln = false;
        game.input.keys.KeyW = true;
        for (let i = 0; i < 5; i++) game.updateThrusterTrails(1 / 60, true);
        assert.ok(game.thrusterTrails.every((trail) => trail.count > 1 && trail.mesh.visible));
        assert.ok(game.thrusterTrails.some((trail) => trail.alphas.some((alpha) => alpha > 0.6)));
        const oldPosition = game.player.position.clone();
        const lives = game.state.lives;
        game.updatePlayer(game.constants.SIM_STEP);
        assert.equal(game.state.lives, lives - 1, 'Fixture must trigger the real planetary collision path');
        assert.ok(game.player.position.distanceTo(oldPosition) > 90);
        vectorClose(game.player.previousPosition, game.player.position);
        for (const trail of game.thrusterTrails) {
            assert.equal(trail.count, 0);
            assert.equal(trail.geometry.drawRange.count, 0);
            assert.equal(trail.mesh.visible, false);
            assert.ok(trail.alphas.every((alpha) => alpha === 0));
        }
        for (let i = 0; i < 3; i++) game.updateThrusterTrails(1 / 60, true);
        for (const trail of game.thrusterTrails) {
            assert.ok(trail.positions.every(Number.isFinite));
            for (let vertex = 0; vertex < trail.count * 2; vertex++) {
                if (trail.alphas[vertex] > 0.01) {
                    const point = vector().fromArray(trail.positions, vertex * 3);
                    assert.ok(point.distanceTo(game.player.position) < 4, 'Live ribbon spans the old impact and respawn positions');
                }
            }
        }
    });

    test('missile lead satisfies the reachable 3D interception equation', () => {
        const victim = { group: new THREE.Group(), velocity: vector(0, 30, 0) };
        victim.group.position.set(200, 0, 60);
        const missile = { group: new THREE.Group(), target: victim, speed: 60 };
        missile.group.position.set(200, 0, 0);
        const out = vector();
        assert.equal(game.missileInterceptDirection(missile, out), out);
        const time = 60 / Math.sqrt(60 * 60 - 30 * 30);
        const expected = vector(0, 30 * time, 60);
        vectorClose(out.clone().normalize(), expected.normalize());
        close(time, 2 / Math.sqrt(3));
    });

    test('missile fallback for an unreachable target remains finite and points forward', () => {
        const victim = { group: new THREE.Group(), velocity: vector(0, 0, 120) };
        victim.group.position.set(200, 0, 60);
        const missile = { group: new THREE.Group(), target: victim, speed: 60 };
        missile.group.position.set(200, 0, 0);
        const out = game.missileInterceptDirection(missile, vector());
        assert.ok(out.toArray().every(Number.isFinite));
        assert.ok(out.z > 0);
    });

    test('interceptTime solves stationary, transverse, and equal-speed linear cases', () => {
        assert.equal(typeof game.interceptTime, 'function', 'Lead must add interceptTime(relativePos, velocity, speed, maxTime)');
        close(game.interceptTime(vector(0, 0, 60), vector(), 60, 5), 1);
        close(game.interceptTime(vector(0, 0, 60), vector(0, 30, 0), 60, 5), 2 / Math.sqrt(3));
        close(game.interceptTime(vector(60, 0, 0), vector(-60, 0, 0), 60, 5), 0.5);
    });

    test('interceptTime rejects unreachable and lifetime-expired shots instead of inventing a hit', () => {
        assert.equal(typeof game.interceptTime, 'function', 'Lead intercept API is not present yet');
        for (const [r, v, speed, limit] of [
            [vector(0, 0, 60), vector(0, 0, 120), 60, 5],
            [vector(0, 0, 60), vector(120, 0, 0), 60, 5],
            [vector(0, 0, 600), vector(), 60, 1]
        ]) {
            const time = game.interceptTime(r, v, speed, limit);
            assert.ok(time === null || time === false || time === undefined || time < 0 || !Number.isFinite(time),
                `No intercept should be reported; got ${time}`);
        }
    });

    test('solveGunIntercept returns a finite reachable lead without mutating target state', () => {
        assert.equal(typeof game.solveGunIntercept, 'function', 'Lead must add solveGunIntercept(target, out)');
        clearThreats();
        putPlayer(vector(200, 0, 0));
        const victim = target(vector(200, 0, 60), 2, 'asteroid', vector(0, 8, 0));
        const position = victim.group.position.clone();
        const velocity = victim.velocity.clone();
        const out = vector();
        const result = game.solveGunIntercept(victim, out);
        assert.ok(result !== false && result !== null, 'Reachable target should have a solution');
        assert.ok(out.toArray().every(Number.isFinite));
        assert.ok(out.y > position.y, 'A rising target needs positive Y lead');
        vectorClose(victim.group.position, position);
        vectorClose(victim.velocity, velocity);
    });

    test('production fireGuns intercepts a moving target using its actual shot origin and speed', () => {
        clearThreats();
        game.resetShots();
        putPlayer(vector(200, 0, 0));
        const victim = target(vector(200, 0, 60), 2, 'asteroid', vector(0, 8, 0));
        game.state.gunsLevel = 1;
        game.state.gunTimer = 0;
        game.state.heat = 0;
        assert.equal(game.bestGunTarget(), victim);
        game.fireGuns();
        assert.equal(game.shots.length, 1);
        const shot = game.shots[0];
        const relative = victim.group.position.clone().sub(shot.group.position);
        const closing = shot.velocity.clone().sub(victim.velocity);
        const time = relative.dot(closing) / closing.lengthSq();
        assert.ok(time > 0 && time <= shot.life);
        const bulletPosition = shot.group.position.clone().addScaledVector(shot.velocity, time);
        const targetPosition = victim.group.position.clone().addScaledVector(victim.velocity, time);
        close(bulletPosition.distanceTo(targetPosition), 0, 1e-6);
        close(shot.velocity.length(), game.gunSpec().speed);
    });

    test('tier-2 assisted barrels converge on a target 100 units forward', () => {
        clearThreats();
        game.resetShots();
        putPlayer(vector(200, 0, 0));
        const victim = target(vector(200, 0, 100), 2);
        game.state.gunsLevel = 2;
        game.state.gunTimer = 0;
        game.state.heat = 0;
        assert.equal(game.bestGunTarget(), victim);
        assert.equal(game.isGunSolution(victim), true);
        game.fireGuns();
        assert.equal(game.shots.length, 2);
        assert.ok(game.shots[0].group.position.distanceTo(game.shots[1].group.position) > 0.5);
        for (const shot of game.shots) {
            const time = (victim.group.position.z - shot.group.position.z) / shot.velocity.z;
            assert.ok(time > 0 && time < shot.life);
            vectorClose(shot.group.position.clone().addScaledVector(shot.velocity, time), victim.group.position, 1e-7);
            const end = shot.group.position.clone().addScaledVector(shot.velocity, time);
            assert.equal(game.findProjectileHit(end, shot.radius, shot, shot.previousPosition)?.target, victim);
        }
    });

    test('27-degree tracking does not grant the narrower 8-degree firing solution', () => {
        clearThreats();
        putPlayer(vector(200, 0, 0));
        const victim = target(vector(200 + Math.tan(15 * Math.PI / 180) * 100, 0, 100));
        assert.equal(game.bestGunTarget(), victim);
        assert.equal(game.isGunSolution(victim), false);
        victim.group.position.x = 200 + Math.tan(5 * Math.PI / 180) * 100;
        assert.equal(game.isGunSolution(victim), true);
        victim.group.position.x = 200 + Math.tan(35 * Math.PI / 180) * 100;
        assert.equal(game.bestGunTarget(), null);
    });

    test('cancelTransientInput clears keys, pending deltas, touch holds, and missile paint', () => {
        game.input.keys.KeyW = true;
        Object.assign(game.input, {
            firing: true, thrusting: true, boosting: true, dragging: true,
            touchLeft: true, touchRight: true, touchThrust: true, touchBrake: true, touchBoost: true,
            lookDX: 99, lookDY: -77, dragPointerId: 42
        });
        game.seeker.holding = true;
        game.seeker.mode = 'painting';
        game.seeker.locks.push(game.asteroids[0]);
        game.cancelTransientInput();
        assert.equal(Object.keys(game.input.keys).length, 0);
        for (const key of ['firing', 'thrusting', 'boosting', 'dragging', 'touchLeft', 'touchRight', 'touchThrust', 'touchBrake', 'touchBoost']) {
            assert.equal(game.input[key], false, key);
        }
        close(game.input.lookDX, 0);
        close(game.input.lookDY, 0);
        assert.equal(game.input.dragPointerId, -1);
        assert.equal(game.seeker.locks.length, 0);
        assert.equal(game.seeker.holding, false);
        assert.equal(game.seeker.mode, 'idle');
    });

    test('shot reset removes old hit references and permits pooled reuse', () => {
        game.resetShots();
        const shot = game.shotPool[0];
        shot.active = true;
        shot.group.visible = true;
        shot.hitTargets[0] = game.asteroids[0];
        shot.hitCount = 1;
        game.shots.push(shot);
        game.resetShots();
        assert.equal(game.shots.length, 0);
        assert.equal(shot.active, false);
        assert.equal(shot.group.visible, false);
        assert.equal(shot.hitCount, 0);
        assert.ok(shot.hitTargets.every((entry) => entry === null));
        const position = vector(200, 10, 0);
        game.player.velocity.set(30, -20, 10);
        assert.equal(game.spawnShot(position, vector(0, 0, 1), game.gunSpec()), true);
        assert.equal(game.shots[0], shot);
        vectorClose(shot.previousPosition, position);
        vectorClose(shot.velocity, vector(0, 0, game.gunSpec().speed));
    });

    test('missile reset clears target references and visible trail state', () => {
        const missile = game.missilePool[0];
        missile.active = true;
        missile.group.visible = true;
        missile.trail.visible = true;
        missile.target = game.asteroids[0];
        missile.trailCount = 5;
        missile.trailHead = 4;
        missile.trailGeo.setDrawRange(0, 5);
        game.missiles.push(missile);
        game.resetMissiles();
        assert.equal(game.missiles.length, 0);
        assert.equal(missile.active, false);
        assert.equal(missile.group.visible, false);
        assert.equal(missile.trail.visible, false);
        assert.equal(missile.target, null);
        assert.equal(missile.trailCount, 0);
        assert.equal(missile.trailHead, 0);
        assert.equal(missile.trailGeo.drawRange.count, 0);
    });

    test('resetRun restores gameplay, clears transient pools, and retains tuning and best score', () => {
        const oldTargets = [...game.asteroids, ...game.hunters];
        game.registerKill(1000, game.player.position.clone(), false);
        const earnedScore = game.state.score;
        assert.ok(earnedScore > 0);
        Object.assign(game.state, {
            shield: 0, heat: 100, lives: 1, charge: 99,
            gameOver: true, paused: true, gunsLevel: 6, missileTier: 3,
            tuneMouse: 1.23, tuneThrust: 29
        });
        game.player.velocity.set(5, 6, 7);
        game.player.orientation.setFromEuler(new THREE.Euler(1, 2, 3));
        game.input.keys.KeyW = true;
        game.input.lookDX = 55;
        game.seeker.mode = 'painting';
        game.seeker.holding = true;
        game.seeker.locks.push(oldTargets[0]);
        game.pendingShatter.push({ target: oldTargets[0] });
        game.resetRun();
        assert.equal(game.state.score, 0);
        assert.equal(game.state.bestScore, earnedScore);
        assert.equal(game.state.wave, 1);
        assert.equal(game.state.lives, 3);
        assert.equal(game.state.shield, game.state.shieldMax);
        assert.equal(game.state.heat, 0);
        assert.equal(game.state.charge, 0);
        assert.equal(game.state.gameOver, false);
        assert.equal(game.state.paused, false);
        assert.equal(game.state.gunsLevel, 1);
        assert.equal(game.state.missileTier, 0);
        close(game.state.tuneMouse, 1.23);
        close(game.state.tuneThrust, 29);
        vectorClose(game.player.velocity, vector());
        vectorClose(game.player.previousPosition, game.player.position);
        vectorClose(game.player.group.position, game.player.position);
        quaternionClose(game.player.orientation, new THREE.Quaternion());
        assert.equal(Object.keys(game.input.keys).length, 0);
        assert.equal(game.input.lookDX, 0);
        assert.equal(game.seeker.holding, false);
        assert.equal(game.seeker.mode, 'idle');
        assert.equal(game.seeker.locks.length, 0);
        assert.equal(game.pendingShatter.length, 0);
        assert.equal(game.shots.length, 0);
        assert.equal(game.missiles.length, 0);
        assert.ok(game.shotPool.every((shot) => !shot.active && !shot.group.visible && shot.hitCount === 0));
        assert.ok(game.missilePool.every((missile) => !missile.active && missile.target === null));
        assert.ok(game.shards.every((shard) => !shard.active && !shard.mesh.visible));
        assert.ok(game.rings.every((ring) => !ring.active && !ring.mesh.visible));
        assert.equal(game.sparks.activeCount, 0);
        assert.equal(game.sparks.geometry.drawRange.count, 0);
        assert.ok(game.sparks.pool.every((spark) => !spark.active));
        assert.ok(game.thrusterTrails.every((trail) => trail.geometry.drawRange.count === 0 && !trail.mesh.visible));
        assert.ok(oldTargets.every((entity) => entity.group.parent === null));
        assert.ok(game.asteroids.length > 0, 'New wave must be populated');
        game.resetRun();
        assert.equal(game.state.bestScore, earnedScore, 'Repeated reset must retain best score');
    });

    if (process.env.ASTRA_BENCH === '1') {
        const steps = Number(process.env.ASTRA_BENCH_STEPS || 1200);
        assert.ok(Number.isInteger(steps) && steps % 2 === 0 && steps >= 120 && steps <= 12000,
            'ASTRA_BENCH_STEPS must be an even integer from 120 to 12000');
        for (const wave of [10, 19, 20]) {
            test(`CPU benchmark: actual wave ${wave}, ${steps} measured physics steps`, (t) => {
                game.resetRun();
                clearThreats();
                game.state.wave = wave;
                game.state.forceInvuln = true;
                game.state.gunsLevel = 7;
                game.spawnWave(wave);
                const initial = { asteroids: game.asteroids.length, hunters: game.hunters.length };
                assert.ok(initial.asteroids > 0 && initial.hunters > 0);
                game.input.keys.KeyW = true;
                game.input.keys.KeyA = true;
                game.onFireDown('benchmark');
                const frameTimes = [];
                const peaks = { asteroids: 0, hunters: 0, shots: 0, missiles: 0 };
                const effectPeaks = { shards: 0, shardBatches: 0, sphericalPulses: 0 };
                let forcedShatters = 0;
                const scanStamp = game.combatHud.stamp;
                for (let i = 0; i < 60 + steps / 2; i++) {
                    const start = cpuClock.now();
                    if (i % 60 === 0) game.fireWingRockets();
                    if (i % 240 === 0) {
                        game.state.charge = 100;
                        game.fireTempest();
                    }
                    if (i % 120 === 0) {
                        const index = game.asteroids.findIndex((rock) => !rock.dying);
                        if (index >= 0) {
                            const rock = game.asteroids[index];
                            game.hitAsteroid(index, rock.group.position.clone(), rock.hp + 1, true, true);
                            forcedShatters++;
                        }
                    }
                    // Actual RAF advances performance.now(), two physics steps, and all CPU render prep.
                    game.frame(1 / 60);
                    if (i >= 60) frameTimes.push(cpuClock.now() - start);
                    for (const key of Object.keys(peaks)) peaks[key] = Math.max(peaks[key], game[key].length);
                    effectPeaks.shards = Math.max(effectPeaks.shards, game.shardBatch.mesh.count);
                    effectPeaks.shardBatches = Math.max(effectPeaks.shardBatches, Number(game.shardBatch.mesh.visible));
                    effectPeaks.sphericalPulses = Math.max(effectPeaks.sphericalPulses, game.sphericalPulses.filter((pulse) => pulse.life > 0).length);
                    assert.equal(game.state.gameOver, false);
                    assert.ok(game.player.position.toArray().every(Number.isFinite));
                    assert.ok(game.player.velocity.toArray().every(Number.isFinite));
                }
                assert.equal(frameTimes.length, steps / 2);
                const scans = game.combatHud.stamp - scanStamp;
                assert.ok(scans > steps / 10, 'Fake wall time must advance enough to exercise 20 Hz HUD ranking');
                assert.ok(peaks.missiles > 0 && effectPeaks.shards > 0 && effectPeaks.sphericalPulses > 0);
                assert.equal(effectPeaks.shardBatches, 1, 'Scene model uses one shard batch, not one draw per shard');
                t.diagnostic(JSON.stringify({
                    scope: 'CPU only: actual animate at 60 Hz, world at 120 Hz, all CPU render prep; renderer/composer adapters, no GPU or browser',
                    sourceSha256: sourceHash, node: process.version, cpu: cpus()[0]?.model,
                    wave, initial, finalWave: game.state.wave, peaks, effectPeaks, forcedShatters, contactScans: scans,
                    workload: 'Invulnerable MK7 thrust/yaw, wing attempts each second, replenished Tempest each 4s, lethal asteroid hit each 2s',
                    frameCpu: summarizeTimings(frameTimes)
                }));
            });
        }
    }
});
