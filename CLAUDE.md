# Hocker Project Context

## Project Goal
Create a mini webapp similar to skapa that displays a 3D model exported from Fusion 360 (export happens once, then we display it in the webapp with the IKEA manual aesthetic).

## Project Structure
- `/skapa/` - Reference codebase from Nicolas Mattia (DO NOT MODIFY)
  - A parametric 3D printing app for IKEA SKÅDIS
  - Uses Three.js, Manifold-3d, and Vite
  - TypeScript setup with Twrl for JSX

## Tech Stack (Based on skapa)
- **Build Tool**: Vite
- **Language**: TypeScript 5.7
- **3D Rendering**: Three.js 0.173
- **3D Operations**: Manifold-3d 3.0
- **3D Export**: @jscadui/3mf-export
- **UI**: Twrl (JSX)
- **Compression**: fflate

## Development Commands
- `npm run dev` - Start development server
- `npm run tsc` - TypeScript type checking
- `npm run build` - Production build
- `npm run format` - Format code with Prettier

## Key Features to Implement
- Display 3D model exported from Fusion 360
- IKEA manual-style rendering (outline shader, thickened lines)
- 3D model viewer with rotation controls
- Export to 3MF format for 3D printing

## Development Principles
**ALWAYS FOLLOW KISS/YAGNI**
- Keep It Simple, Stupid - Don't overcomplicate
- You Aren't Gonna Need It - Don't add features that aren't needed
- Example: No animations/rotations unless specifically requested
- Build only what's asked for, nothing more

## Current Setup Notes
**Camera & Coordinate System:**
- Using CAD convention: Z-up (camera.up set to (0,0,1))
- Perspective camera (was orthographic, changed for better depth)
- Camera orbits around stationary object (much cleaner than rotating object)
- Scroll-based camera animation with startOffset/endOffset parameters
- Initial position must match scroll=0 position to avoid jumps

**Model Loading:**
- OBJ format from Fusion 360 (no materials needed, delete .mtl)
- EdgesGeometry with 20° threshold to hide tessellation artifacts
- Simple white MeshBasicMaterial + black LineBasicMaterial

**Wrong Approach for OBJ Models:**
- Complex shader pipeline (outline/thicken passes) - detects ALL tessellation edges, not just outlines
- FXAA post-processing - made lines blurrier, wrong tool for the job

**Currently Simplified (but revisitable):**
- Just using `antialias: true` for now
- Basic EdgesGeometry with angle threshold
- Goal: Still pursuing SVG-like crispness

## Notes
- Keep skapa folder untouched as reference
- Build new webapp with identical dependencies and setup
- Model is exported from Fusion 360 once, then displayed in webapp
- Focus on IKEA manual aesthetic rendering using shaders from skapa