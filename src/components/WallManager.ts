import * as THREE from 'three';

export interface WallData {
    start: { x: number, z: number };
    end: { x: number, z: number };
}

export class WallManager {
    private scene: THREE.Scene;
    private walls: THREE.Group;
    private wallDataList: WallData[] = [];
    private wallHeight: number = 2.5;
    private wallThickness: number = 0.2;
    private isWireframe: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.walls = new THREE.Group();
        this.scene.add(this.walls);
    }

    public addWall(start: THREE.Vector3, end: THREE.Vector3) {
        let mergedStart = { x: start.x, z: start.z };
        let mergedEnd = { x: end.x, z: end.z };
        let merged = true;

        while (merged) {
            merged = false;
            for (let i = 0; i < this.wallDataList.length; i++) {
                const other = this.wallDataList[i];
                
                // Vector for current segment
                const dx1 = mergedEnd.x - mergedStart.x;
                const dz1 = mergedEnd.z - mergedStart.z;
                // Vector for other segment
                const dx2 = other.end.x - other.start.x;
                const dz2 = other.end.z - other.start.z;
                
                // Check if collinear using cross product in 2D
                const crossProduct = dx1 * dz2 - dz1 * dx2;
                if (Math.abs(crossProduct) > 0.0001) continue;
                
                // Check for shared endpoints and merge
                let connected = false;
                if (this.pointsEqual(mergedStart, other.end)) {
                    mergedStart = { ...other.start };
                    connected = true;
                } else if (this.pointsEqual(mergedStart, other.start)) {
                    mergedStart = { ...other.end };
                    connected = true;
                } else if (this.pointsEqual(mergedEnd, other.start)) {
                    mergedEnd = { ...other.end };
                    connected = true;
                } else if (this.pointsEqual(mergedEnd, other.end)) {
                    mergedEnd = { ...other.start };
                    connected = true;
                }

                if (connected) {
                    this.removeWallAtIndex(i);
                    merged = true;
                    break;
                }
            }
        }

        const finalStart = new THREE.Vector3(mergedStart.x, 0, mergedStart.z);
        const finalEnd = new THREE.Vector3(mergedEnd.x, 0, mergedEnd.z);

        const index = this.wallDataList.length;
        this.wallDataList.push({
            start: mergedStart,
            end: mergedEnd
        });

        const length = finalStart.distanceTo(finalEnd) + this.wallThickness;
        const geometry = new THREE.BoxGeometry(length, this.wallHeight, this.wallThickness);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0xcccccc,
            emissive: new THREE.Color(0x000000),
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            wireframe: this.isWireframe
        });
        const wall = new THREE.Mesh(geometry, material);
        wall.userData.dataIndex = index;
        wall.name = 'wall';

        // Position wall at the center point between start and end
        wall.position.copy(finalStart.clone().add(finalEnd).multiplyScalar(0.5));
        wall.position.y = this.wallHeight / 2;

        // Rotate wall to align with start and end points
        const angle = Math.atan2(finalEnd.z - finalStart.z, finalEnd.x - finalStart.x);
        wall.rotation.y = -angle;

        this.walls.add(wall);
    }

    private pointsEqual(p1: { x: number, z: number }, p2: { x: number, z: number }): boolean {
        return Math.abs(p1.x - p2.x) < 0.0001 && Math.abs(p1.z - p2.z) < 0.0001;
    }

    private removeWallAtIndex(index: number) {
        const wallMesh = this.walls.children.find(child => child.userData.dataIndex === index) as THREE.Mesh;
        if (wallMesh) {
            wallMesh.geometry.dispose();
            (wallMesh.material as THREE.Material).dispose();
            this.walls.remove(wallMesh);
        }

        this.wallDataList.splice(index, 1);

        // Re-index remaining walls
        this.walls.children.forEach(child => {
            if (child.userData.dataIndex > index) {
                child.userData.dataIndex--;
            }
        });
    }

    public getExtents(): number {
        let maxExtent = 0;
        this.walls.children.forEach(child => {
            const wall = child as THREE.Mesh;
            const geo = wall.geometry as THREE.BoxGeometry;
            const size = geo.parameters.width;
            const pos = wall.position;
            const angle = Math.abs(wall.rotation.y);
            
            // Simplified extent check for snapped walls
            const extentX = Math.abs(pos.x) + (Math.abs(Math.cos(angle)) * size / 2);
            const extentZ = Math.abs(pos.z) + (Math.abs(Math.sin(angle)) * size / 2);
            maxExtent = Math.max(maxExtent, extentX, extentZ);
        });
        return maxExtent;
    }

    public getData(): WallData[] {
        return this.wallDataList;
    }

    public getWalls(): THREE.Object3D[] {
        return this.walls.children;
    }

    public highlightWall(wall: THREE.Object3D | null, highlight: boolean) {
        if (!wall) return;
        const mesh = wall as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (highlight) {
            mat.emissive.set(0xff0000);
            mat.emissiveIntensity = 0.5;
        } else {
            mat.emissive.set(0x000000);
            mat.emissiveIntensity = 0;
        }
    }

    public removeWall(wall: THREE.Object3D) {
        const index = wall.userData.dataIndex;
        if (index !== undefined) {
            this.removeWallAtIndex(index);
        }
    }

    public resetAndLoad(data: WallData[]) {
        this.clearWalls();
        data.forEach(wall => {
            this.addWall(
                new THREE.Vector3(wall.start.x, 0, wall.start.z),
                new THREE.Vector3(wall.end.x, 0, wall.end.z)
            );
        });
    }

    public setWireframe(enabled: boolean) {
        this.isWireframe = enabled;
        this.walls.children.forEach(child => {
            const mesh = child as THREE.Mesh;
            (mesh.material as THREE.MeshStandardMaterial).wireframe = enabled;
        });
    }

    public clearWalls() {
        this.wallDataList = [];
        while(this.walls.children.length > 0) {
            const wall = this.walls.children[0] as THREE.Mesh;
            wall.geometry.dispose();
            (wall.material as THREE.Material).dispose();
            this.walls.remove(wall);
        }
    }
}
