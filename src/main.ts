import './style.css';
import * as THREE from 'three';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;

// Scene setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xffffff);

// Orthographic camera for IKEA manual look
const aspect = window.innerWidth / window.innerHeight;
const camera = new THREE.OrthographicCamera(-50 * aspect, 50 * aspect, 50, -50, 0.1, 1000);
camera.position.set(50, 50, 50);
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

// Rotate based on scroll
window.addEventListener('scroll', () => {
  const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  cube.rotation.y = scrollPercent * Math.PI * 2; // Full rotation over scroll
  wireframe.rotation.y = scrollPercent * Math.PI * 2;
  outline.rotation.y = scrollPercent * Math.PI * 2;
  renderer.render(scene, camera);
});