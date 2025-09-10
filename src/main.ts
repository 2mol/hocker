import './style.css';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';

// -------------------- Config --------------------
const debug = false;
const showTestCube = false;
const loadStool = true;
const startOffset = 0.18; // fraction of full turntable sweep
const endOffset   = 0.91;

// -------------------- Canvas / Renderer --------------------
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: false, // post AA handles this (EffectComposer)
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);

// -------------------- Scene / Camera --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Z-up (CAD-style)
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.up.set(0, 0, 1);

// Turntable geometry
const radius = Math.hypot(50, 50);
const baseAngle = Math.atan2(50, 50);

// Initial camera position based on startOffset
{
  const initialProgress = startOffset;
  const initialAngle = baseAngle + initialProgress * Math.PI * 2;
  const initialHeight = 50 - initialProgress * 80;
  camera.position.set(
    Math.cos(initialAngle) * radius,
    Math.sin(initialAngle) * radius,
    initialHeight
  );
  camera.lookAt(0, 0, 0);
}

// -------------------- Postprocessing (SMAA) --------------------
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const smaaPass = new SMAAPass(
  window.innerWidth * renderer.getPixelRatio(),
  window.innerHeight * renderer.getPixelRatio()
);
composer.addPass(smaaPass);

const render = () => composer.render();

// -------------------- Utilities --------------------
const updateRendererSizes = () => {
  const dpr = Math.min(window.devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  smaaPass.setSize(
    window.innerWidth * dpr,
    window.innerHeight * dpr
  );
};

type LineMatWithRes = LineMaterial & { resolution: THREE.Vector2 };

// Keep track of LineMaterials to refresh their resolution on resize
const lineMaterials: LineMatWithRes[] = [];
const updateLineMaterialsResolution = () => {
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  for (const mat of lineMaterials) mat.resolution.set(w, h);
};

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  updateRendererSizes();
  updateLineMaterialsResolution();
  render();
});

// -------------------- Debug axes --------------------
if (debug) {
  const axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);
}

// -------------------- Optional test cube --------------------
if (showTestCube) {
  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const fill = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cube = new THREE.Mesh(geometry, fill);
  scene.add(cube);

  // Edges via Line2 (screen-space, crisp)
  const edges = new THREE.EdgesGeometry(geometry);
  const segGeom = new LineSegmentsGeometry().fromEdgesGeometry(edges);
  const segMat = new LineMaterial({
    color: 0x000000,
    linewidth: 1.25, // screen pixels
  }) as LineMatWithRes;
  segMat.resolution.set(renderer.domElement.width, renderer.domElement.height);
  lineMaterials.push(segMat);

  const wire = new LineSegments2(segGeom, segMat);
  wire.renderOrder = 2;
  scene.add(wire);

  // Backface outline "thick" silhouette
  const outlineGeom = new THREE.BoxGeometry(30.3, 30.3, 30.3);
  const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
  const outline = new THREE.Mesh(outlineGeom, outlineMat);
  outline.renderOrder = 0;
  scene.add(outline);

  // Avoid z-fighting on the white fills
  fill.polygonOffset = true;
  fill.polygonOffsetFactor = 1;
  fill.polygonOffsetUnits = 1;
}

// -------------------- Load model & apply "ink" edges --------------------
if (loadStool) {
  const loader = new OBJLoader();
  loader.load(
    '/models/hocker.obj',
    (object) => {
      object.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;

        // White fill
        const fill = new THREE.MeshBasicMaterial({ color: 0xffffff });
        fill.polygonOffset = true;
        fill.polygonOffsetFactor = 1;
        fill.polygonOffsetUnits = 1;
        child.material = fill;
        child.renderOrder = 1;

        // Angular edges only (hide tessellation)
        const edges = new THREE.EdgesGeometry(child.geometry, 11);
        const lineGeom = new LineSegmentsGeometry().fromEdgesGeometry(edges);
        const lineMat = new LineMaterial({
          color: 0x000000,
          linewidth: 1.25, // screen pixels; tweak 1.0–2.0
          // worldUnits: false (default) keeps stroke width stable on zoom
        }) as LineMatWithRes;

        // Important: inform LineMaterial of target resolution
        lineMat.resolution.set(renderer.domElement.width, renderer.domElement.height);
        lineMaterials.push(lineMat);

        const lineSegs = new LineSegments2(lineGeom, lineMat);
        lineSegs.renderOrder = 2;
        object.add(lineSegs);
      });

      scene.add(object);
      console.log('Stool loaded successfully');
      render();
    },
    (progress) => console.log('Loading progress:', progress),
    (error) => console.error('Error loading stool:', error)
  );
}

// -------------------- Initial render --------------------
updateRendererSizes();
updateLineMaterialsResolution();
render();

// -------------------- Scroll-driven turntable --------------------
window.addEventListener('scroll', () => {
  const maxScroll = Math.max(1, document.body.scrollHeight - window.innerHeight);
  const scrollPercent = window.scrollY / maxScroll;

  const animationRange = endOffset - startOffset;
  const progress = startOffset + scrollPercent * animationRange;

  const angle = baseAngle + progress * Math.PI * 2;
  const cameraHeight = 50 - progress * 80;

  camera.position.set(
    Math.cos(angle) * radius,
    Math.sin(angle) * radius,
    cameraHeight
  );
  camera.lookAt(0, 0, 0);

  render();
});
