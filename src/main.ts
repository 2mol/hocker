import './style.css';
import * as THREE from 'three';

const debug = true;
const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Perspective camera 
// Using CAD convention: Z is up/down, X is left/right, Y is forward/back
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);

// Set up camera positioning
const radius = Math.sqrt(50 * 50 + 50 * 50); // Distance from origin
const initialAngle = Math.atan2(50, 50); // Angle for position (50, 50)

camera.position.x = Math.cos(initialAngle) * radius;
camera.position.y = Math.sin(initialAngle) * radius;
camera.position.z = 50;
camera.up.set(0, 0, 1); // Set Z as up instead of Y
camera.lookAt(0, 0, 0);

// Renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// White cube
const geometry = new THREE.BoxGeometry(30, 30, 30);
const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// Black edges
const edges = new THREE.EdgesGeometry(geometry);
const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
const wireframe = new THREE.LineSegments(edges, lineMaterial);
scene.add(wireframe);

// Debug: Add axis helper
if (debug) {
  const axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);
  // Red = X axis, Green = Y axis, Blue = Z axis
  
  // Simple HTML labels
  const overlay = document.createElement('div');
  overlay.innerHTML = `
    <div style="position: fixed; bottom: 20px; left: 20px; color: black; font-family: monospace;">
      Red=X, Green=Y, Blue=Z (CAD convention: Z is up)
    </div>
  `;
  document.body.appendChild(overlay);
}

// Thicker outline using backside rendering
const outlineGeometry = new THREE.BoxGeometry(30.3, 30.3, 30.3);
const outlineMaterial = new THREE.MeshBasicMaterial({ 
  color: 0x000000,
  side: THREE.BackSide 
});
const outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
scene.add(outline);

// Initial render
renderer.render(scene, camera);

// Rotate camera around the cube based on scroll
window.addEventListener('scroll', () => {
  const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  
  // Turntable rotation around Z axis (vertical)
  const angle = initialAngle + (scrollPercent * Math.PI * 2);
  
  // Tilt camera down to look underneath (1.5x speed)
  const heightRange = 80; // From +40 to -40
  const cameraHeight = 50 - (scrollPercent * heightRange);
  
  camera.position.x = Math.cos(angle) * radius;
  camera.position.y = Math.sin(angle) * radius;
  camera.position.z = cameraHeight;
  
  camera.lookAt(0, 0, 0);
  
  renderer.render(scene, camera);
});