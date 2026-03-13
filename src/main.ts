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
      <button id="add-wall-mode" class="primary-btn">Wall Mode: OFF</button>
      <button id="delete-mode" class="danger-btn">Delete Tool: OFF</button>
      <button id="toggle-wireframe" class="secondary-btn">Wireframe: OFF</button>
      <button id="clear-walls" class="secondary-btn">Clear All</button>
      <div class="instructions">
        <p>• Scroll to Zoom</p>
        <p>• Left Click to Draw/Delete</p>
        <p>• Right Click to Orbit</p>
      </div>
    </div>
  </div>
  <div id="json-overlay" class="glass-panel">
    <label>Serialized Data (JSON)</label>
    <pre id="json-content">{}</pre>
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
let isDeleteMode = false;
let wallStartPoint: THREE.Vector3 | null = null;
let hoveredWall: THREE.Object3D | null = null;
let isWireframe = false;

// Visual Helpers
const previewWall = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2.5, 0.2),
    new THREE.MeshStandardMaterial({ 
        color: 0x646cff, 
        transparent: true, 
        opacity: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -1, // Preview slightly in front
        polygonOffsetUnits: -1
    })
);
previewWall.visible = false;
sceneManager.getScene().add(previewWall);

const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
);
cursor.visible = false;
sceneManager.getScene().add(cursor);

// UI Elements
const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
const deleteModeBtn = document.getElementById('delete-mode') as HTMLButtonElement;
const wireframeBtn = document.getElementById('toggle-wireframe') as HTMLButtonElement;
const jsonContent = document.getElementById('json-content')!;

// Navigation & Setup State
let currentGridSize = 20;

const STORAGE_KEY = 'mega-walls-room-data';

function updateJSONOverlay() {
    if (!jsonContent) return;
    const data = {
        walls: wallManager.getData()
    };
    const jsonString = JSON.stringify(data, null, 2);
    jsonContent.textContent = jsonString;
    localStorage.setItem(STORAGE_KEY, jsonString);
}

function loadFromLocalStorage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            const data = JSON.parse(saved);
            if (data.walls && Array.isArray(data.walls)) {
                wallManager.resetAndLoad(data.walls);
                checkGridExpansion();
                updateJSONOverlay();
            }
        } catch (e) {
            console.error('Failed to load from localStorage', e);
        }
    }
}

function updateApplicationSize(newSize: number) {
    currentGridSize = newSize;
    grid.updateSize(currentGridSize, currentGridSize);
    floor.updateSize(currentGridSize);
    updateJSONOverlay();
}

function checkGridExpansion(point?: THREE.Vector3) {
    const wallExtent = wallManager.getExtents();
    const cursorExtent = point ? Math.max(Math.abs(point.x), Math.abs(point.z)) : 0;
    
    // We want the grid to be at least large enough to contain all walls AND the current cursor
    const maxExtent = Math.max(wallExtent, cursorExtent);
    const requiredSize = (maxExtent * 2) + 2; // +2 for padding
    
    // Min size of 20, Max size of 200 for safety (can be adjusted)
    const minSize = 20;
    const maxSize = 200; // Increased limit for "infinite" feel
    
    let targetSize = Math.max(minSize, Math.ceil(requiredSize / 10) * 10);
    targetSize = Math.min(targetSize, maxSize);

    if (targetSize !== currentGridSize) {
        updateApplicationSize(targetSize);
    }
}

// UI Event Listeners
wallModeBtn.addEventListener('click', () => {
    isWallMode = !isWallMode;
    if (isWallMode) {
        isDeleteMode = false;
        deleteModeBtn.classList.remove('active');
        deleteModeBtn.textContent = 'Delete Tool: OFF';
    }
    wallModeBtn.textContent = `Wall Mode: ${isWallMode ? 'ON' : 'OFF'}`;
    wallModeBtn.classList.toggle('active', isWallMode);
    cursor.visible = isWallMode;
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode);
    if (!isWallMode) {
        wallStartPoint = null;
        previewWall.visible = false;
        checkGridExpansion(); // Final check to contract if needed
    }
});

deleteModeBtn.addEventListener('click', () => {
    isDeleteMode = !isDeleteMode;
    if (isDeleteMode) {
        isWallMode = false;
        wallModeBtn.classList.remove('active');
        wallModeBtn.textContent = 'Wall Mode: OFF';
        cursor.visible = false;
        wallStartPoint = null;
        previewWall.visible = false;
    }
    deleteModeBtn.textContent = `Delete Tool: ${isDeleteMode ? 'ON' : 'OFF'}`;
    deleteModeBtn.classList.toggle('active', isDeleteMode);
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode);
    
    if (!isDeleteMode && hoveredWall) {
        wallManager.highlightWall(hoveredWall, false);
        hoveredWall = null;
    }
});

wireframeBtn.addEventListener('click', () => {
    isWireframe = !isWireframe;
    wireframeBtn.textContent = `Wireframe: ${isWireframe ? 'ON' : 'OFF'}`;
    wireframeBtn.classList.toggle('active', isWireframe);
    
    wallManager.setWireframe(isWireframe);
    floor.setWireframe(isWireframe);
    (previewWall.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
});

document.getElementById('clear-walls')?.addEventListener('click', () => {
    wallManager.clearWalls();
    checkGridExpansion();
    updateJSONOverlay();
});

// Mouse Interactions
container.addEventListener('mousedown', (event) => {
    if (isDeleteMode) {
        const intersect = inputManager.getObjectAtMouse(event, wallManager.getWalls());
        if (intersect) {
            wallManager.removeWall(intersect.object);
            checkGridExpansion();
            updateJSONOverlay();
            hoveredWall = null;
        }
        return;
    }

    if (!isWallMode) return;
    
    const point = inputManager.getMousePosition(event);
    if (point) {
        const snappedPoint = inputManager.snapToGrid(point);
        
        if (!wallStartPoint) {
            wallStartPoint = snappedPoint;
            cursor.material.color.set(0x646cff);
            checkGridExpansion(snappedPoint);
        } else {
            wallManager.addWall(wallStartPoint, snappedPoint);
            checkGridExpansion(snappedPoint);
            updateJSONOverlay();
            wallStartPoint = null;
            previewWall.visible = false;
            cursor.material.color.set(0xffffff);
        }
    }
});

container.addEventListener('mousemove', (event) => {
    if (isDeleteMode) {
        const intersect = inputManager.getObjectAtMouse(event, wallManager.getWalls());
        if (intersect) {
            if (hoveredWall !== intersect.object) {
                wallManager.highlightWall(hoveredWall, false);
                hoveredWall = intersect.object;
                wallManager.highlightWall(hoveredWall, true);
            }
        } else if (hoveredWall) {
            wallManager.highlightWall(hoveredWall, false);
            hoveredWall = null;
        }
        return;
    }

    if (!isWallMode) {
        cursor.visible = false;
        return;
    }

    const point = inputManager.getMousePosition(event);
    if (point) {
        const snappedPoint = inputManager.snapToGrid(point);
        cursor.position.copy(snappedPoint);
        cursor.visible = true;

        if (wallStartPoint) {
            updatePreviewWall(wallStartPoint, snappedPoint);
            previewWall.visible = true;
        } else {
            previewWall.visible = false;
        }
        checkGridExpansion(snappedPoint);
    } else {
        cursor.visible = false;
    }
});

function updatePreviewWall(start: THREE.Vector3, end: THREE.Vector3) {
    const length = start.distanceTo(end);
    if (length < 0.1) {
        previewWall.visible = false;
        return;
    }

    const thickness = 0.2;
    previewWall.scale.x = length + thickness;
    previewWall.position.copy(start.clone().add(end).multiplyScalar(0.5));
    previewWall.position.y = 1.25; // 2.5 height / 2

    const angle = Math.atan2(end.z - start.z, end.x - start.x);
    previewWall.rotation.y = -angle;
}

// Initial state
loadFromLocalStorage();
updateJSONOverlay();
