import * as THREE from 'three';

export class WallManager {
    private scene: THREE.Scene;
    private walls: THREE.Group;
    private wallHeight: number = 2.5;
    private wallThickness: number = 0.2;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.walls = new THREE.Group();
        this.scene.add(this.walls);
    }

    public addWall(start: THREE.Vector3, end: THREE.Vector3) {
        const length = start.distanceTo(end);
        const geometry = new THREE.BoxGeometry(length, this.wallHeight, this.wallThickness);
        const material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const wall = new THREE.Mesh(geometry, material);

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

    public clearWalls() {
        while(this.walls.children.length > 0) {
            const wall = this.walls.children[0] as THREE.Mesh;
            wall.geometry.dispose();
            (wall.material as THREE.Material).dispose();
            this.walls.remove(wall);
        }
    }
}
