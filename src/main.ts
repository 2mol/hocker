import './style.css';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js';
import { LineMaterial } from 'three/addons/lines/LineMaterial.js';
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js';

// -------------------- Config --------------------
const debug = false;
const showTestCube = false;
const loadStool = true;
const startOffset = 0.18; // fraction of full turntable sweep
const endOffset   = 0.91;

// Feature toggles
const useScaledSilhouette = true; // fast & robust silhouette
const silhouetteScale = 1.21;     // 1.005–1.02 (increase for thicker outline)

// -------------------- Canvas / Renderer --------------------
const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true, // simple MSAA; no postprocessing
  powerPreference: 'high-performance',
});

// Your CSS sets the canvas size. Only set the internal buffer size here.
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // cap DPR for perf
renderer.setSize(window.innerWidth, window.innerHeight, false); // don't touch CSS size

// Color space (handles different three versions)
if ('outputColorSpace' in renderer) {
  // @ts-ignore
  renderer.outputColorSpace = THREE.SRGBColorSpace;
} else {
  // @ts-ignore
  renderer.outputEncoding = THREE.sRGBEncoding;
}

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

// -------------------- Render control --------------------
const render = () => renderer.render(scene, camera);

// -------------------- Resize --------------------
type LineMatWithRes = LineMaterial & { resolution: THREE.Vector2 };
const lineMaterials: LineMatWithRes[] = [];

function updateSizes() {
  const dpr = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false); // only buffer size
  // Update Line2 materials
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  for (const m of lineMaterials) m.resolution.set(w, h);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}

window.addEventListener('resize', () => {
  updateSizes();
  render();
});

// -------------------- Debug axes --------------------
if (debug) scene.add(new THREE.AxesHelper(50));

// -------------------- Fast silhouette helper --------------------
function addScaledOutlineClone(mesh: THREE.Mesh, scale = silhouetteScale, color = 0x000000) {
  const mat = new THREE.MeshBasicMaterial({
    color,
    side: THREE.BackSide,
    depthTest: true,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: 2,
    polygonOffsetUnits: 2,
  });
  const outline = new THREE.Mesh(mesh.geometry, mat);
  outline.renderOrder = 0;           // draw before fill+lines
  outline.scale.setScalar(scale);    // uniform “inflation”
  outline.userData.__isOutline = true; // mark so we never process it as a fill
  mesh.add(outline);
}

// -------------------- Optional test cube --------------------
if (showTestCube) {
  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const fill = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const cube = new THREE.Mesh(geometry, fill);
  cube.renderOrder = 1;
  scene.add(cube);

  if (useScaledSilhouette) addScaledOutlineClone(cube);

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

  fill.polygonOffset = true;
  fill.polygonOffsetFactor = 1;
  fill.polygonOffsetUnits = 1;
}

// -------------------- Load model & apply “ink” edges (TWO-PASS) --------------------
if (loadStool) {
  const loader = new OBJLoader();
  loader.load(
    '/models/hocker.obj',
    (object) => {
      // 1) Collect original meshes only (don’t mutate during traversal)
      const meshes: THREE.Mesh[] = [];
      object.traverse((node) => {
        // @ts-ignore isMesh is a runtime flag on three objects
        if ((node as any).isMesh && !(node as any).userData?.__isOutline) {
          meshes.push(node as THREE.Mesh);
        }
      });

      // 2) Process meshes after traversal
      for (const child of meshes) {
        // White fill
        const fill = new THREE.MeshBasicMaterial({ color: 0xffffff });
        fill.polygonOffset = true;
        fill.polygonOffsetFactor = 1;
        fill.polygonOffsetUnits = 1;
        child.material = fill;
        child.renderOrder = 1;

        // Fast silhouette (one extra draw per mesh)
        // if (useScaledSilhouette) addScaledOutlineClone(child);

        // Angular edges only (hide tessellation)
        const edges = new THREE.EdgesGeometry(child.geometry, 11); // 10–25 works; 20 hides most tessellation
        const lineGeom = new LineSegmentsGeometry().fromEdgesGeometry(edges);
        const lineMat = new LineMaterial({
          color: 0x000000,
          linewidth: 1.25, // screen pixels; tweak 1.0–2.0
        }) as LineMatWithRes;

        lineMat.resolution.set(renderer.domElement.width, renderer.domElement.height);
        lineMaterials.push(lineMat);

        const lineSegs = new LineSegments2(lineGeom, lineMat);
        lineSegs.renderOrder = 2; // draw after fills/silhouette
        // Attach as a sibling under the same parent, not during traversal
        (child.parent ?? object).add(lineSegs);
      }

      scene.add(object);
      console.log('Stool loaded successfully (meshes:', meshes.length, ')');
      render();
    },
    (progress) => console.log('Loading progress:', progress),
    (error) => console.error('Error loading stool:', error)
  );
}

// -------------------- Initial render --------------------
updateSizes();
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
