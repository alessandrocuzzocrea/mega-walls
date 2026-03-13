import './style.css'
import * as THREE from 'three'
import { SceneManager } from './engine/SceneManager'
import { Grid } from './components/Grid'
import { Floor } from './components/Floor'
import { WallManager } from './components/WallManager'
import { InputManager } from './engine/InputManager'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="canvas-container"></div>
  <div id="ui-overlay">
    <div class="glass-panel">
      <h1>Mega-Walls Editor</h1>
      <div class="control-group">
        <label>Grid Size</label>
        <input type="range" id="grid-size" min="10" max="50" value="20">
        <span id="grid-size-val">20</span>
      </div>
      <button id="add-wall-mode" class="primary-btn">Wall Mode: OFF</button>
      <button id="clear-walls" class="secondary-btn">Clear All</button>
      <div class="instructions">
        <p>1. Toggle Wall Mode</p>
        <p>2. Click to start wall</p>
        <p>3. Click to finish wall</p>
      </div>
    </div>
  </div>
`

const container = document.getElementById('canvas-container')!;
const sceneManager = new SceneManager(container);
const grid = new Grid(sceneManager.getScene());
const floor = new Floor(sceneManager.getScene());
const wallManager = new WallManager(sceneManager.getScene());
const inputManager = new InputManager(sceneManager.getCamera());

// Interaction State
let isWallMode = false;
let wallStartPoint: THREE.Vector3 | null = null;
const previewWall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2.5, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x646cff, transparent: true, opacity: 0.5 })
);
previewWall.visible = false;
sceneManager.getScene().add(previewWall);

// UI Event Listeners
const gridSizeInput = document.getElementById('grid-size') as HTMLInputElement;
const gridSizeVal = document.getElementById('grid-size-val')!;
const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;

gridSizeInput.addEventListener('input', () => {
    const size = parseInt(gridSizeInput.value);
    gridSizeVal.textContent = size.toString();
    grid.updateSize(size, size);
    floor.updateSize(size);
});

wallModeBtn.addEventListener('click', () => {
    isWallMode = !isWallMode;
    wallModeBtn.textContent = `Wall Mode: ${isWallMode ? 'ON' : 'OFF'}`;
    wallModeBtn.classList.toggle('active', isWallMode);
    if (!isWallMode) {
        wallStartPoint = null;
        previewWall.visible = false;
    }
});

document.getElementById('clear-walls')?.addEventListener('click', () => {
    wallManager.clearWalls();
});

// Mouse Interactions
container.addEventListener('mousedown', (event) => {
    if (!isWallMode) return;

    const point = inputManager.getMousePosition(event);
    if (point) {
        const snappedPoint = inputManager.snapToGrid(point);
        
        if (!wallStartPoint) {
            wallStartPoint = snappedPoint;
        } else {
            wallManager.addWall(wallStartPoint, snappedPoint);
            wallStartPoint = null;
            previewWall.visible = false;
        }
    }
});

container.addEventListener('mousemove', (event) => {
    if (!isWallMode || !wallStartPoint) {
        previewWall.visible = false;
        return;
    }

    const point = inputManager.getMousePosition(event);
    if (point) {
        const snappedPoint = inputManager.snapToGrid(point);
        updatePreviewWall(wallStartPoint, snappedPoint);
        previewWall.visible = true;
    }
});

function updatePreviewWall(start: THREE.Vector3, end: THREE.Vector3) {
    const length = start.distanceTo(end);
    if (length < 0.1) {
        previewWall.visible = false;
        return;
    }

    previewWall.scale.x = length;
    previewWall.position.copy(start.clone().add(end).multiplyScalar(0.5));
    previewWall.position.y = 1.25; // 2.5 height / 2

    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    previewWall.rotation.y = -angle;
}
