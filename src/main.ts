import './style.css'
import * as THREE from 'three'
import { SceneManager } from './engine/SceneManager'
import { Grid } from './components/Grid'
import { Floor } from './components/Floor'
import { WallManager } from './components/WallManager'
import { DoorManager } from './components/DoorManager'
import { FloorManager } from './components/FloorManager'
import { InputManager } from './engine/InputManager'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div id="canvas-container"></div>
  <div id="ui-overlay">
    <div class="glass-panel">
      <h1>Mega-Walls Editor</h1>
      <button id="add-wall-mode" class="primary-btn">Wall Mode: OFF</button>
      <button id="room-mode-btn" class="room-btn">Room Tool: OFF</button>
      <button id="door-mode-btn" class="door-btn">Door Tool: OFF</button>
      <div class="tool-group">
        <button id="floor-mode" class="primary-btn">Floor Tool: OFF</button>
        <div id="floor-sub-tools" class="sub-tools hidden">
          <button id="floor-rect" class="mini-btn active">Rect</button>
          <button id="floor-fill" class="mini-btn">Fill</button>
        </div>
      </div>
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
const doorManager = new DoorManager(sceneManager.getScene());
const floorManager = new FloorManager(sceneManager.getScene());
const inputManager = new InputManager(sceneManager.getCamera());

// Interaction State
let isWallMode = false;
let isDoorMode = false;
let isDeleteMode = false;
let isFloorMode = false;
let isRoomMode = false;
let floorSubMode: 'rect' | 'fill' = 'rect';

let wallStartPoint: THREE.Vector3 | null = null;
let doorStartPoint: THREE.Vector3 | null = null;
let floorStartPoint: THREE.Vector3 | null = null;
let roomStartPoint: THREE.Vector3 | null = null;
let hoveredObject: THREE.Object3D | null = null;
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

const previewFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ 
        color: 0x646bff, 
        transparent: true, 
        opacity: 0.5,
        side: THREE.DoubleSide
    })
);
previewFloor.rotation.x = -Math.PI / 2;
previewFloor.visible = false;
sceneManager.getScene().add(previewFloor);

const cursor = new THREE.Mesh(
    new THREE.SphereGeometry(0.15, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 })
);
cursor.visible = false;
cursor.visible = false;
sceneManager.getScene().add(cursor);

// Door Preview
const previewDoor = new THREE.Group();
const pFrameMat = new THREE.MeshStandardMaterial({ color: 0x4d2a15, transparent: true, opacity: 0.5 });
const pSlabMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, transparent: true, opacity: 0.5 });
const pHandleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, transparent: true, opacity: 0.5 });

const pfGeo = new THREE.BoxGeometry(0.1, 2.5, 0.22);
const plf = new THREE.Mesh(pfGeo, pFrameMat);
plf.position.set(-0.45, 1.25, 0);
previewDoor.add(plf);
const prf = plf.clone();
prf.position.set(0.45, 1.25, 0);
previewDoor.add(prf);
const ptfGeo = new THREE.BoxGeometry(1, 0.1, 0.22);
const ptf = new THREE.Mesh(ptfGeo, pFrameMat);
ptf.position.set(0, 2.45, 0);
previewDoor.add(ptf);
const psGeo = new THREE.BoxGeometry(0.8, 2.4, 0.15);
const ps = new THREE.Mesh(psGeo, pSlabMat);
ps.position.set(0, 1.2, 0);
previewDoor.add(ps);
const phGeo = new THREE.SphereGeometry(0.04, 8, 8);
const ph = new THREE.Mesh(phGeo, pHandleMat);
ph.position.set(0.3, 1.2, 0.1);
previewDoor.add(ph);

previewDoor.visible = false;
sceneManager.getScene().add(previewDoor);

// Room Preview
const previewRoom = new THREE.Group();
const previewRoomWalls: THREE.Mesh[] = [];
for (let i = 0; i < 4; i++) {
    const w = new THREE.Mesh(
        new THREE.BoxGeometry(1, 2.5, 0.2),
        new THREE.MeshStandardMaterial({ 
            color: 0x10b981, 
            transparent: true, 
            opacity: 0.5,
            polygonOffset: true,
            polygonOffsetFactor: -1,
            polygonOffsetUnits: -1
        })
    );
    previewRoomWalls.push(w);
    previewRoom.add(w);
}
const previewRoomFloor = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ 
        color: 0x10b981, 
        transparent: true, 
        opacity: 0.3,
        side: THREE.DoubleSide
    })
);
previewRoomFloor.rotation.x = -Math.PI / 2;
previewRoomFloor.position.y = 0.01;
previewRoom.add(previewRoomFloor);
previewRoom.visible = false;
sceneManager.getScene().add(previewRoom);

// UI Elements
const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
const roomModeBtn = document.getElementById('room-mode-btn') as HTMLButtonElement;
const doorModeBtn = document.getElementById('door-mode-btn') as HTMLButtonElement;
const floorModeBtn = document.getElementById('floor-mode') as HTMLButtonElement;
const floorSubTools = document.getElementById('floor-sub-tools')!;
const floorRectBtn = document.getElementById('floor-rect') as HTMLButtonElement;
const floorFillBtn = document.getElementById('floor-fill') as HTMLButtonElement;
const deleteModeBtn = document.getElementById('delete-mode') as HTMLButtonElement;
const wireframeBtn = document.getElementById('toggle-wireframe') as HTMLButtonElement;
const jsonContent = document.getElementById('json-content')!;

// Navigation & Setup State
let currentGridSize = 20;

const STORAGE_KEY = 'mega-walls-room-data';

function updateJSONOverlay() {
    if (!jsonContent) return;
    const data = {
        walls: wallManager.getData(),
        doors: doorManager.getData(),
        ...floorManager.getData()
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
            }
            if (data.doors && Array.isArray(data.doors)) {
                doorManager.resetAndLoad(data.doors);
            }
            if (data.floors || data.tiles) {
                floorManager.resetAndLoad(
                    Array.isArray(data.floors) ? data.floors : [],
                    Array.isArray(data.tiles) ? data.tiles : []
                );
            }
            checkGridExpansion();
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
    
    if (isWallMode) {
        isRoomMode = false;
        roomModeBtn.textContent = 'Room Tool: OFF';
        roomModeBtn.classList.remove('active');
        isDoorMode = false;
        doorModeBtn.textContent = 'Door Tool: OFF';
        doorModeBtn.classList.remove('active');
        isFloorMode = false;
        floorModeBtn.textContent = 'Floor Tool: OFF';
        floorModeBtn.classList.remove('active');
        floorSubTools.classList.add('hidden');
    }

    cursor.visible = isWallMode;
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode && !isFloorMode && !isDoorMode && !isRoomMode);
    if (!isWallMode) {
        wallStartPoint = null;
        previewWall.visible = false;
        checkGridExpansion(); // Final check to contract if needed
    }
});

roomModeBtn.addEventListener('click', () => {
    isRoomMode = !isRoomMode;
    if (isRoomMode) {
        isWallMode = false;
        wallModeBtn.classList.remove('active');
        wallModeBtn.textContent = 'Wall Mode: OFF';
        isDoorMode = false;
        doorModeBtn.textContent = 'Door Tool: OFF';
        doorModeBtn.classList.remove('active');
        isFloorMode = false;
        floorModeBtn.classList.remove('active');
        floorModeBtn.textContent = 'Floor Tool: OFF';
        floorSubTools.classList.add('hidden');
        isDeleteMode = false;
        deleteModeBtn.classList.remove('active');
        deleteModeBtn.textContent = 'Delete Tool: OFF';
    }
    roomModeBtn.textContent = `Room Tool: ${isRoomMode ? 'ON' : 'OFF'}`;
    roomModeBtn.classList.toggle('active', isRoomMode);
    cursor.visible = isRoomMode;
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode && !isFloorMode && !isDoorMode && !isRoomMode);
    if (!isRoomMode) {
        roomStartPoint = null;
        previewRoom.visible = false;
    }
});

doorModeBtn.addEventListener('click', () => {
    isDoorMode = !isDoorMode;
    if (isDoorMode) {
        isWallMode = false;
        wallModeBtn.classList.remove('active');
        wallModeBtn.textContent = 'Wall Mode: OFF';
        isRoomMode = false;
        roomModeBtn.classList.remove('active');
        roomModeBtn.textContent = 'Room Tool: OFF';
        isFloorMode = false;
        floorModeBtn.classList.remove('active');
        floorModeBtn.textContent = 'Floor Tool: OFF';
        floorSubTools.classList.add('hidden');
        isDeleteMode = false;
        deleteModeBtn.classList.remove('active');
        deleteModeBtn.textContent = 'Delete Tool: OFF';
    }
    doorModeBtn.textContent = `Door Tool: ${isDoorMode ? 'ON' : 'OFF'}`;
    doorModeBtn.classList.toggle('active', isDoorMode);
    cursor.visible = isDoorMode;
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode && !isFloorMode && !isDoorMode && !isRoomMode);
    if (!isDoorMode) {
        doorStartPoint = null;
        previewDoor.visible = false;
    }
});

floorModeBtn.addEventListener('click', () => {
    isFloorMode = !isFloorMode;
    if (isFloorMode) {
        isWallMode = false;
        wallModeBtn.classList.remove('active');
        wallModeBtn.textContent = 'Wall Mode: OFF';
        isRoomMode = false;
        roomModeBtn.classList.remove('active');
        roomModeBtn.textContent = 'Room Tool: OFF';
        isDeleteMode = false;
        deleteModeBtn.classList.remove('active');
        deleteModeBtn.textContent = 'Delete Tool: OFF';
        floorSubTools.classList.remove('hidden');
    } else {
        floorSubTools.classList.add('hidden');
    }
    floorModeBtn.textContent = `Floor Tool: ${isFloorMode ? 'ON' : 'OFF'}`;
    floorModeBtn.classList.toggle('active', isFloorMode);
    cursor.visible = isFloorMode;
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode && !isFloorMode && !isDoorMode && !isRoomMode);
    if (!isFloorMode) {
        floorStartPoint = null;
        previewFloor.visible = false;
    }
});

floorRectBtn.addEventListener('click', () => {
    floorSubMode = 'rect';
    floorRectBtn.classList.add('active');
    floorFillBtn.classList.remove('active');
});

floorFillBtn.addEventListener('click', () => {
    floorSubMode = 'fill';
    floorFillBtn.classList.add('active');
    floorRectBtn.classList.remove('active');
});

deleteModeBtn.addEventListener('click', () => {
    isDeleteMode = !isDeleteMode;
    if (isDeleteMode) {
        isWallMode = false;
        wallModeBtn.classList.remove('active');
        wallModeBtn.textContent = 'Wall Mode: OFF';
        isRoomMode = false;
        roomModeBtn.classList.remove('active');
        roomModeBtn.textContent = 'Room Tool: OFF';
        isFloorMode = false;
        floorModeBtn.classList.remove('active');
        floorModeBtn.textContent = 'Floor Tool: OFF';
        floorSubTools.classList.add('hidden');
        cursor.visible = false;
        wallStartPoint = null;
        previewWall.visible = false;
    }
    deleteModeBtn.textContent = `Delete Tool: ${isDeleteMode ? 'ON' : 'OFF'}`;
    deleteModeBtn.classList.toggle('active', isDeleteMode);
    sceneManager.setControlsEnabled(!isWallMode && !isDeleteMode && !isDoorMode && !isFloorMode && !isRoomMode);
    
    if (!isDeleteMode && hoveredObject) {
        if (hoveredObject.name === 'wall') {
            wallManager.highlightWall(hoveredObject, false);
        } else {
            floorManager.highlightFloor(hoveredObject, false);
        }
        hoveredObject = null;
    }
});

wireframeBtn.addEventListener('click', () => {
    isWireframe = !isWireframe;
    wireframeBtn.textContent = `Wireframe: ${isWireframe ? 'ON' : 'OFF'}`;
    wireframeBtn.classList.toggle('active', isWireframe);
    
    wallManager.setWireframe(isWireframe);
    floorManager.setWireframe(isWireframe);
    floor.setWireframe(isWireframe);
    (previewWall.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
    (previewFloor.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
    previewRoomWalls.forEach(w => (w.material as THREE.MeshStandardMaterial).wireframe = isWireframe);
    (previewRoomFloor.material as THREE.MeshStandardMaterial).wireframe = isWireframe;
});

document.getElementById('clear-walls')?.addEventListener('click', () => {
    wallManager.clearWalls();
    doorManager.clearDoors();
    floorManager.clearFloors();
    checkGridExpansion();
    updateJSONOverlay();
});

// Mouse Interactions
container.addEventListener('mousedown', (event) => {
    if (isDeleteMode) {
        const targets = [...wallManager.getWalls(), ...doorManager.getDoors(), ...floorManager.getFloors()];
        const intersect = inputManager.getObjectAtMouse(event, targets);
        if (intersect) {
            if (intersect.object.name === 'wall') {
                wallManager.removeWall(intersect.object);
            } else if (intersect.object.name === 'door' || intersect.object.parent?.name === 'door') {
                // Find the door group
                let doorObj = intersect.object;
                while (doorObj.parent && doorObj.name !== 'door') doorObj = doorObj.parent;
                doorManager.removeDoor(doorObj);
            } else {
                floorManager.removeFloor(intersect.object);
            }
            checkGridExpansion();
            updateJSONOverlay();
            hoveredObject = null;
        }
        return;
    }

    if (isRoomMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            if (!roomStartPoint) {
                roomStartPoint = snappedPoint;
                checkGridExpansion(snappedPoint);
            }
        }
        return;
    }

    if (isFloorMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            if (floorSubMode === 'fill') {
                const success = floorManager.floodFill(snappedPoint, wallManager.getData());
                if (success) updateJSONOverlay();
            } else {
                if (!floorStartPoint) {
                    floorStartPoint = snappedPoint;
                } else {
                    const x = Math.min(floorStartPoint.x, snappedPoint.x);
                    const z = Math.min(floorStartPoint.z, snappedPoint.z);
                    const w = Math.abs(snappedPoint.x - floorStartPoint.x);
                    const d = Math.abs(snappedPoint.z - floorStartPoint.z);
                    if (w > 0 && d > 0) {
                        floorManager.addFloor(x, z, w, d);
                        updateJSONOverlay();
                    }
                    floorStartPoint = null;
                    previewFloor.visible = false;
                }
            }
        }
        return;
    }

    if (isDoorMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            // In one-click mode, we check if the preview is visible and has data
            if (previewDoor.visible && previewDoor.userData.placeData) {
                const { p1, p2, doorPos, angle } = previewDoor.userData.placeData;
                
                // Split walls at this location
                wallManager.splitWallAt(p1, p2);
                
                doorManager.addDoor(doorPos, angle);
                updateJSONOverlay();
                
                // Keep tool active, but the preview will refresh on next mousemove
            }
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
        const targets = [...wallManager.getWalls(), ...doorManager.getDoors(), ...floorManager.getFloors()];
        const intersect = inputManager.getObjectAtMouse(event, targets);
        if (intersect) {
            if (hoveredObject !== intersect.object) {
                // Clear old highlight
                if (hoveredObject) {
                    if (hoveredObject.name === 'wall') wallManager.highlightWall(hoveredObject, false);
                    else floorManager.highlightFloor(hoveredObject, false);
                }
                
                // Set new highlight
                hoveredObject = intersect.object;
                if (hoveredObject.name === 'wall') wallManager.highlightWall(hoveredObject, true);
                else floorManager.highlightFloor(hoveredObject, true);
            }
        } else if (hoveredObject) {
            if (hoveredObject.name === 'wall') wallManager.highlightWall(hoveredObject, false);
            else floorManager.highlightFloor(hoveredObject, false);
            hoveredObject = null;
        }
        return;
    }

    if (isRoomMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            cursor.position.copy(snappedPoint);
            cursor.visible = true;

            if (roomStartPoint) {
                updatePreviewRoom(roomStartPoint, snappedPoint);
                previewRoom.visible = true;
            } else {
                previewRoom.visible = false;
            }
            checkGridExpansion(snappedPoint);
        } else {
            cursor.visible = false;
        }
        return;
    }

    if (isFloorMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            cursor.position.copy(snappedPoint);
            cursor.visible = true;

            if (floorSubMode === 'rect' && floorStartPoint) {
                updatePreviewFloor(floorStartPoint, snappedPoint);
                previewFloor.visible = true;
            } else {
                previewFloor.visible = false;
            }
            checkGridExpansion(snappedPoint);
        } else {
            cursor.visible = false;
        }
        return;
    }

    if (isDoorMode) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            cursor.position.copy(snappedPoint);
            cursor.visible = true;

            updatePreviewDoor(point);
            checkGridExpansion(snappedPoint);
        } else {
            cursor.visible = false;
            previewDoor.visible = false;
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

container.addEventListener('mouseup', (event) => {
    if (isRoomMode && roomStartPoint) {
        const point = inputManager.getMousePosition(event);
        if (point) {
            const snappedPoint = inputManager.snapToGrid(point);
            const xMin = Math.min(roomStartPoint.x, snappedPoint.x);
            const xMax = Math.max(roomStartPoint.x, snappedPoint.x);
            const zMin = Math.min(roomStartPoint.z, snappedPoint.z);
            const zMax = Math.max(roomStartPoint.z, snappedPoint.z);

            const width = xMax - xMin;
            const depth = zMax - zMin;

            if (width > 0 && depth > 0) {
                // Add 4 walls
                const p1 = new THREE.Vector3(xMin, 0, zMin);
                const p2 = new THREE.Vector3(xMax, 0, zMin);
                const p3 = new THREE.Vector3(xMax, 0, zMax);
                const p4 = new THREE.Vector3(xMin, 0, zMax);

                wallManager.addWall(p1, p2);
                wallManager.addWall(p2, p3);
                wallManager.addWall(p3, p4);
                wallManager.addWall(p4, p1);

                // Add 1 floor
                floorManager.addFloor(xMin, zMin, width, depth);

                updateJSONOverlay();
            }
        }
        roomStartPoint = null;
        previewRoom.visible = false;
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

function updatePreviewFloor(start: THREE.Vector3, end: THREE.Vector3) {
    const w = Math.abs(end.x - start.x);
    const d = Math.abs(end.z - start.z);
    
    if (w < 0.1 || d < 0.1) {
        previewFloor.visible = false;
        return;
    }

    previewFloor.scale.set(w, d, 1);
    previewFloor.position.set(
        (start.x + end.x) / 2,
        0.01,
        (start.z + end.z) / 2
    );
}

function updatePreviewRoom(start: THREE.Vector3, end: THREE.Vector3) {
    const xMin = Math.min(start.x, end.x);
    const xMax = Math.max(start.x, end.x);
    const zMin = Math.min(start.z, end.z);
    const zMax = Math.max(start.z, end.z);

    const width = xMax - xMin;
    const depth = zMax - zMin;

    if (width < 0.1 || depth < 0.1) {
        previewRoom.visible = false;
        return;
    }

    // Points
    const p1 = new THREE.Vector3(xMin, 0, zMin);
    const p2 = new THREE.Vector3(xMax, 0, zMin);
    const p3 = new THREE.Vector3(xMax, 0, zMax);
    const p4 = new THREE.Vector3(xMin, 0, zMax);

    const points = [p1, p2, p2, p3, p3, p4, p4, p1];
    
    for (let i = 0; i < 4; i++) {
        const s = points[i * 2];
        const e = points[i * 2 + 1];
        const length = s.distanceTo(e);
        const wall = previewRoomWalls[i];
        
        wall.scale.x = length + 0.2;
        wall.position.copy(s.clone().add(e).multiplyScalar(0.5));
        wall.position.y = 1.25;
        const angle = Math.atan2(e.z - s.z, e.x - s.x);
        wall.rotation.y = -angle;
    }

    previewRoomFloor.scale.set(width, depth, 1);
    previewRoomFloor.position.set(xMin + width / 2, 0.01, zMin + depth / 2);
    
    previewRoom.visible = true;
}

function updatePreviewDoor(mousePoint: THREE.Vector3) {
    const walls = wallManager.getData();
    let bestDist = 0.5; // Snap distance threshold
    let bestSnapshot: any = null;

    for (const wall of walls) {
        const wallStart = new THREE.Vector3(wall.start.x, 0, wall.start.z);
        const wallEnd = new THREE.Vector3(wall.end.x, 0, wall.end.z);
        const wallDir = wallEnd.clone().sub(wallStart);
        const wallLen = wallDir.length();
        if (wallLen < 0.99) continue; // Too short for a door

        const wallDirNorm = wallDir.clone().normalize();
        
        // Project mouse point onto the infinite line of the wall
        const v = mousePoint.clone().sub(wallStart);
        const t = v.dot(wallDirNorm);
        
        // Clamp t to stay within wall boundaries, leaving 0.5 room on each side if possible
        // but for now let's just find the nearest valid 1-unit segment
        const safeT = Math.max(0, Math.min(wallLen - 1, Math.round(t - 0.5)));
        
        const p1 = wallStart.clone().add(wallDirNorm.clone().multiplyScalar(safeT));
        const p2 = wallStart.clone().add(wallDirNorm.clone().multiplyScalar(safeT + 1));
        const doorPos = p1.clone().add(p2).multiplyScalar(0.5);

        const dist = mousePoint.distanceTo(doorPos);
        if (dist < bestDist) {
            bestDist = dist;
            bestSnapshot = {
                p1: { x: p1.x, z: p1.z },
                p2: { x: p2.x, z: p2.z },
                doorPos,
                angle: -Math.atan2(wallDirNorm.z, wallDirNorm.x)
            };
        }
    }

    if (bestSnapshot) {
        previewDoor.position.copy(bestSnapshot.bestPos || bestSnapshot.doorPos);
        previewDoor.rotation.y = bestSnapshot.angle;
        previewDoor.visible = true;
        previewDoor.userData.placeData = bestSnapshot;
    } else {
        previewDoor.visible = false;
        previewDoor.userData.placeData = null;
    }
}

// Initial state
loadFromLocalStorage();
updateJSONOverlay();
