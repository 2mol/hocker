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
- GLB format from Fusion 360 (cleaner than OBJ, less tessellation)
- EdgesGeometry with 11° threshold to hide tessellation artifacts
- Simple white MeshBasicMaterial + black LineMaterial

## Solved: Thick, Crisp Lines with LineSegments2
**Final Solution:**
- Use `LineSegments2` with `LineMaterial` from three/addons
- **Critical**: Must set `resolution` on LineMaterial to renderer's buffer dimensions
- Dynamic pixel ratio: `Math.min(devicePixelRatio, 1.5)` for performance/quality balance
- LineWidth of 2 gives good visibility without being too thick
- Edge threshold of 11° hides tessellation while preserving important edges

**Key Learning:**
```typescript
// This is REQUIRED for LineSegments2 to render properly:
lineMat.resolution.set(renderer.domElement.width, renderer.domElement.height);
```
Without setting resolution, lines won't render at all or render incorrectly

## Maybe Some Day
- **SVG overlay** - Extract 3D edges and render as actual SVG on top. Would be truly crisp (real vectors!) but requires projecting 3D edges to 2D paths every frame. Insane but would look amazing.
- **Better export format from Fusion 360** - OBJ creates heavily tessellated meshes. glTF/GLB would be cleaner but wasn't in Fusion's export options. Maybe via plugin or newer version?

## Notes
- Keep skapa folder untouched as reference
- Build new webapp with identical dependencies and setup
- Model is exported from Fusion 360 once, then displayed in webapp
- Focus on IKEA manual aesthetic rendering using shaders from skapa