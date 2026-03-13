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
        const index = this.wallDataList.length;
        this.wallDataList.push({
            start: { x: start.x, z: start.z },
            end: { x: end.x, z: end.z }
        });
        const length = start.distanceTo(end) + this.wallThickness;
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
        wall.position.copy(start.clone().add(end).multiplyScalar(0.5));
        wall.position.y = this.wallHeight / 2;

        // Rotate wall to align with start and end points
        const angle = Math.atan2(end.z - start.z, end.x - start.x);
        wall.rotation.y = -angle;

        this.walls.add(wall);
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
            // Remove from data list
            this.wallDataList.splice(index, 1);
            // Re-index remaining walls effectively
            this.walls.children.forEach(child => {
                if (child.userData.dataIndex > index) {
                    child.userData.dataIndex--;
                }
            });
        }
        
        const mesh = wall as THREE.Mesh;
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
        this.walls.remove(wall);
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
