import './style.css';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';

const debug = false;
const showTestCube = false;
const loadStool = true;
const startOffset = 0.42; // Start at this fraction of the full animation
const endOffset = 0.91; // End at this fraction of the full animation
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
const baseAngle = Math.atan2(50, 50); // Base angle for position (50, 50)

// Calculate initial position based on startOffset
const initialProgress = startOffset;
const initialAngle = baseAngle + (initialProgress * Math.PI * 2);
const initialHeight = 50 - (initialProgress * 80);

camera.position.x = Math.cos(initialAngle) * radius;
camera.position.y = Math.sin(initialAngle) * radius;
camera.position.z = initialHeight;
camera.up.set(0, 0, 1); // Set Z as up instead of Y
camera.lookAt(0, 0, 0);

// Simple renderer
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);

// Debug: Add axis helper
if (debug) {
  const axesHelper = new THREE.AxesHelper(50);
  scene.add(axesHelper);
}

// Test cube (for development)
let cube, wireframe, outline;
if (showTestCube) {
  // White cube
  const geometry = new THREE.BoxGeometry(30, 30, 30);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
  cube = new THREE.Mesh(geometry, material);
  scene.add(cube);

  // Black edges
  const edges = new THREE.EdgesGeometry(geometry);
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
  wireframe = new THREE.LineSegments(edges, lineMaterial);
  scene.add(wireframe);

  // Thicker outline using backside rendering
  const outlineGeometry = new THREE.BoxGeometry(30.3, 30.3, 30.3);
  const outlineMaterial = new THREE.MeshBasicMaterial({
    color: 0x000000,
    side: THREE.BackSide
  });
  outline = new THREE.Mesh(outlineGeometry, outlineMaterial);
  scene.add(outline);
}

// Load stool model
if (loadStool) {
  const loader = new OBJLoader();
  loader.load('/models/hocker.obj', (object) => {
    // Apply IKEA line aesthetic to all meshes in the loaded object
    object.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // White material for the stool
        child.material = new THREE.MeshBasicMaterial({ color: 0xffffff });

        // Add black edges with angle threshold to hide tessellation
        const edges = new THREE.EdgesGeometry(child.geometry, 20); // Only show edges > 20 degrees
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
        const wireframe = new THREE.LineSegments(edges, lineMaterial);
        object.add(wireframe);
      }
    });

    scene.add(object);
    console.log('Stool loaded successfully');
    renderer.render(scene, camera); // Re-render after model loads
  },
  (progress) => {
    console.log('Loading progress:', progress);
  },
  (error) => {
    console.error('Error loading stool:', error);
  });
}

// Initial render
renderer.render(scene, camera);

// Rotate camera around the object based on scroll
window.addEventListener('scroll', () => {
  const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);

  // Transform scroll to animation progress: start at startOffset, end at endOffset
  const animationRange = endOffset - startOffset; // Animation range to cover
  const progress = startOffset + (scrollPercent * animationRange);

  // Turntable rotation around Z axis (vertical)
  const angle = baseAngle + (progress * Math.PI * 2);

  // Tilt camera down to look underneath
  const cameraHeight = 50 - (progress * 80);

  camera.position.x = Math.cos(angle) * radius;
  camera.position.y = Math.sin(angle) * radius;
  camera.position.z = cameraHeight;

  camera.lookAt(0, 0, 0);

  renderer.render(scene, camera);
});
