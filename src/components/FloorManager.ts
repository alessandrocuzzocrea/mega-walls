import * as THREE from 'three';
import type { WallData } from './WallManager';

export interface FloorData {
    x: number;
    z: number;
    width: number;
    depth: number;
}

export interface TileData {
    x: number;
    z: number;
}

export class FloorManager {
    private scene: THREE.Scene;
    private floors: THREE.Group;
    private floorDataList: FloorData[] = [];
    private tileDataList: TileData[] = [];
    private isWireframe: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.floors = new THREE.Group();
        this.scene.add(this.floors);
    }

    public addFloor(x: number, z: number, width: number, depth: number) {
        if (this.isAreaOccupied(x, z, width, depth)) {
            console.warn('Cannot add floor: area already occupied', { x, z, width, depth });
            return;
        }
        if (width === 1 && depth === 1) {
            this.addTile(x, z);
            return;
        }
        const data: FloorData = { x, z, width, depth };
        this.floorDataList.push(data);
        this.createFloorMesh(data, this.floorDataList.length - 1, 'floor');
    }

    public addTile(x: number, z: number) {
        if (this.isAreaOccupied(x, z, 1, 1)) {
            console.warn('Cannot add tile: area already occupied', { x, z });
            return;
        }
        const data: TileData = { x, z };
        this.tileDataList.push(data);
        this.createFloorMesh({ x, z, width: 1, depth: 1 }, this.tileDataList.length - 1, 'tile');
    }

    private createFloorMesh(data: FloorData, index: number, type: 'floor' | 'tile') {
        const geometry = new THREE.PlaneGeometry(data.width, data.depth);
        const material = new THREE.MeshStandardMaterial({
            color: 0x8B4513,
            roughness: 0.8,
            metalness: 0.2,
            side: THREE.DoubleSide,
            wireframe: this.isWireframe
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        // Position is center of the plane
        mesh.position.set(data.x + data.width / 2, 0.005, data.z + data.depth / 2);
        mesh.receiveShadow = true;
        mesh.userData.dataIndex = index;
        mesh.userData.type = type;
        mesh.name = type;

        this.floors.add(mesh);
    }

    public isAreaOccupied(x: number, z: number, width: number, depth: number): boolean {
        // Check if any existing tile or floor overlaps with the new area
        // A floor covers [x, x + width] and [z, z + depth]
        
        const newX1 = x;
        const newX2 = x + width;
        const newZ1 = z;
        const newZ2 = z + depth;

        // Check against floorDataList
        for (const floor of this.floorDataList) {
            const fX1 = floor.x;
            const fX2 = floor.x + floor.width;
            const fZ1 = floor.z;
            const fZ2 = floor.z + floor.depth;

            // Simple rectangle intersection: 
            // result = (r1.x1 < r2.x2 && r1.x2 > r2.x1 && r1.y1 < r2.y2 && r1.y2 > r2.y1)
            // Using >= and <= because we don't want even touching overlaps? 
            // In floor tiles, they share edges but shouldn't overlap. 
            // So strictly < and > is usually for intersection.
            // However, our coordinates are integers (mostly).
            if (newX1 < fX2 && newX2 > fX1 && newZ1 < fZ2 && newZ2 > fZ1) {
                return true;
            }
        }

        // Check against tileDataList
        for (const tile of this.tileDataList) {
            const tX1 = tile.x;
            const tX2 = tile.x + 1;
            const tZ1 = tile.z;
            const tZ2 = tile.z + 1;

            if (newX1 < tX2 && newX2 > tX1 && newZ1 < tZ2 && newZ2 > tZ1) {
                return true;
            }
        }

        return false;
    }

    public floodFill(startPoint: THREE.Vector3, walls: WallData[]): boolean {
        // Simple grid-based flood fill to find enclosed area
        // We'll use a 1x1 unit grid for simplicity
        const startX = Math.floor(startPoint.x);
        const startZ = Math.floor(startPoint.z);

        // Define boundaries for search (avoid infinite loops)
        const minX = -100, maxX = 100;
        const minZ = -100, maxZ = 100;

        const visited = new Set<string>();
        const queue: { x: number, z: number }[] = [{ x: startX, z: startZ }];
        const resultCells: { x: number, z: number }[] = [];

        visited.add(`${startX},${startZ}`);

        while (queue.length > 0) {
            const current = queue.shift()!;
            resultCells.push(current);

            // If we hit boundaries, it's not enclosed
            if (current.x <= minX || current.x >= maxX || current.z <= minZ || current.z >= maxZ) {
                return false; 
            }

            const neighbors = [
                { x: current.x + 1, z: current.z },
                { x: current.x - 1, z: current.z },
                { x: current.x, z: current.z + 1 },
                { x: current.x, z: current.z - 1 }
            ];

            for (const neighbor of neighbors) {
                const key = `${neighbor.x},${neighbor.z}`;
                if (visited.has(key)) continue;

                // Check if there's a wall between current and neighbor
                if (this.isBlockedByWall(current, neighbor, walls)) {
                    continue;
                }

                visited.add(key);
                queue.push(neighbor);

                // Safety break for massive areas
                if (visited.size > 5000) return false;
            }
        }

        // If we finished the fill and didn't hit boundaries, we found a room
        // For simplicity, we'll add each cell as a 1x1 floor or merge them
        // Merging is better - for now let's just add them
        resultCells.forEach(cell => {
            this.addTile(cell.x, cell.z);
        });

        return true;
    }

    private isBlockedByWall(p1: { x: number, z: number }, p2: { x: number, z: number }, walls: WallData[]): boolean {
        // A wall blocks if it lies exactly between p1 and p2
        // Our cells are unit squares centered at integer coordinates? 
        // No, let's say cell (x,z) covers [x, x+1] and [z, z+1]
        // Center is (x+0.5, z+0.5)
        
        const midX = (p1.x + p2.x) / 2 + 0.5;
        const midZ = (p1.z + p2.z) / 2 + 0.5;

        for (const wall of walls) {
            // Horizontal or vertical wall check
            const isVertical = Math.abs(wall.start.x - wall.end.x) < 0.0001;
            const isHorizontal = Math.abs(wall.start.z - wall.end.z) < 0.0001;

            if (isVertical) {
                // If we are moving horizontally (dx != 0)
                if (p1.x !== p2.x) {
                    if (Math.abs(wall.start.x - midX) < 0.0001) {
                        const wallMinZ = Math.min(wall.start.z, wall.end.z);
                        const wallMaxZ = Math.max(wall.start.z, wall.end.z);
                        if (midZ > wallMinZ && midZ < wallMaxZ) return true;
                    }
                }
            } else if (isHorizontal) {
                // If we are moving vertically (dz != 0)
                if (p1.z !== p2.z) {
                    if (Math.abs(wall.start.z - midZ) < 0.0001) {
                        const wallMinX = Math.min(wall.start.x, wall.end.x);
                        const wallMaxX = Math.max(wall.start.x, wall.end.x);
                        if (midX > wallMinX && midX < wallMaxX) return true;
                    }
                }
            }
        }
        return false;
    }

    public getData() {
        return {
            floors: this.floorDataList,
            tiles: this.tileDataList
        };
    }

    public getFloors(): THREE.Object3D[] {
        return this.floors.children;
    }

    public highlightFloor(floor: THREE.Object3D | null, highlight: boolean) {
        if (!floor) return;
        const mesh = floor as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (highlight) {
            mat.emissive.set(0xff0000);
            mat.emissiveIntensity = 0.5;
        } else {
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0;
        }
    }

    public removeFloor(floor: THREE.Object3D) {
        const index = floor.userData.dataIndex;
        const type = floor.userData.type as 'floor' | 'tile';
        
        if (index === undefined) return;

        // Dispose mesh
        const mesh = floor as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.floors.remove(mesh);

        // Update data arrays
        if (type === 'floor') {
            this.floorDataList.splice(index, 1);
        } else {
            this.tileDataList.splice(index, 1);
        }

        // Re-index remaining floors/tiles of the same type
        this.floors.children.forEach(child => {
            if (child.userData.type === type && child.userData.dataIndex > index) {
                child.userData.dataIndex--;
            }
        });
    }

    public setWireframe(enabled: boolean) {
        this.isWireframe = enabled;
        this.floors.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            (mesh.material as THREE.MeshStandardMaterial).wireframe = enabled;
        });
    }

    public clearFloors() {
        this.floorDataList = [];
        this.tileDataList = [];
        while (this.floors.children.length > 0) {
            const floor = this.floors.children[0] as THREE.Mesh;
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            this.floors.remove(floor);
        }
    }

    public resetAndLoad(floors: FloorData[], tiles: TileData[] = []) {
        this.clearFloors();
        floors.forEach(floor => {
            this.addFloor(floor.x, floor.z, floor.width, floor.depth);
        });
        tiles.forEach(tile => {
            this.addTile(tile.x, tile.z);
        });
    }
}
