import "./style.css";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { LineSegments2 } from "three/addons/lines/LineSegments2.js";
import { LineMaterial } from "three/addons/lines/LineMaterial.js";
import { LineSegmentsGeometry } from "three/addons/lines/LineSegmentsGeometry.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

// -------------------- Config --------------------
const debug = false;
const loadStool = true;
const startOffset = 0.18; // fraction of full turntable sweep
const endOffset = 0.91;

// -------------------- Canvas / Renderer --------------------
const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});

renderer.outputColorSpace = THREE.SRGBColorSpace;

// -------------------- Scene / Camera --------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xfafafa);

// Z-up (CAD-style)
const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.up.set(0, 0, 1);
const target = new THREE.Vector3(0, 0, -25);

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
  camera.lookAt(target);
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
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", () => {
  updateSizes();
  render();
});

// -------------------- Debug axes --------------------
if (debug) scene.add(new THREE.AxesHelper(50));

// -------------------- Load model & apply "ink" edges --------------------
if (loadStool) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    "/models/hocker.glb",
    (gltf) => {
      const root = gltf.scene;

      // collect meshes
      const meshes: THREE.Mesh[] = [];
      root.traverse((n) => {
        const m = n as unknown as THREE.Mesh;
        if (
          (m as any).isMesh &&
          !(m.userData && (m.userData as any).__isOutline)
        )
          meshes.push(m);
      });

      // materials + edges
      for (const child of meshes) {
        // White fill
        const fill = new THREE.MeshBasicMaterial({ color: 0xffffff });
        fill.polygonOffset = true;
        fill.polygonOffsetFactor = 1;
        fill.polygonOffsetUnits = 1;
        child.material = fill;
        child.renderOrder = 1;

        const thresholdDeg = 11;
        const edges = new THREE.EdgesGeometry(
          child.geometry as THREE.BufferGeometry,
          thresholdDeg
        );
        const edgeVerts = edges.getAttribute("position")?.count ?? 0;
        console.log(`edges(${child.name || "mesh"}) verts:`, edgeVerts);

        const lineGeom = new LineSegmentsGeometry().fromEdgesGeometry(edges);

        const lineMat = new LineMaterial({
          color: 0x000000,
          linewidth: 0.5,
        }) as LineMatWithRes;

        lineMat.resolution.set(
          renderer.domElement.width,
          renderer.domElement.height
        );
        lineMaterials.push(lineMat);

        const lineSegs = new LineSegments2(lineGeom, lineMat);
        lineSegs.renderOrder = 2;

        child.add(lineSegs);
      }
      scene.add(root);
      render();
    },
    (xhr) =>
      console.log(
        "Loading progress:",
        xhr.total ? (xhr.loaded / xhr.total) * 100 : xhr.loaded
      ),
    (err) => console.error("Error loading file:", err)
  );
}

// -------------------- Initial render --------------------
function resizeToCanvas() {
  const { clientWidth: cssW, clientHeight: cssH } = canvas;
  const dpr = Math.min(window.devicePixelRatio, 1.5);

  renderer.setPixelRatio(dpr);
  renderer.setSize(cssW, cssH, /* updateStyle */ false);

  camera.aspect = cssW / cssH;
  camera.updateProjectionMatrix();

  // Update Line2 materials with actual buffer size (in device pixels)
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  for (const m of lineMaterials) m.resolution.set(w, h);
}
resizeToCanvas();
render();

const ro = new ResizeObserver(() => {
  resizeToCanvas();
  render();
});
ro.observe(canvas);

// -------------------- Scroll-driven turntable --------------------
window.addEventListener("scroll", () => {
  const maxScroll = Math.max(
    1,
    document.body.scrollHeight - window.innerHeight
  );
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
  camera.lookAt(target);

  render();
});

// --- Scroll hint logic ---
const scrollHint = document.getElementById("scrollHint")!;

function hideScrollHint() {
  if (!scrollHint) return;
  scrollHint.classList.add("is-hidden");
  // remove listener(s) after first hide
  window.removeEventListener("scroll", onSomeScroll, { passive: true } as any);
}

function onSomeScroll() {
  // hide as soon as the page moves a bit
  if (window.scrollY > 200) hideScrollHint();
}

scrollHint?.classList.remove("is-hidden");
window.addEventListener("scroll", onSomeScroll, { passive: true });
