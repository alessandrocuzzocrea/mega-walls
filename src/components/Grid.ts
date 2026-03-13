import * as THREE from 'three';

export class Grid {
    private gridHelper: THREE.GridHelper;
    private size: number;
    private divisions: number;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene, size: number = 20, divisions: number = 20) {
        this.scene = scene;
        this.size = size;
        this.divisions = divisions;
        
        this.gridHelper = new THREE.GridHelper(size, divisions, 0x888888, 0x444444);
        this.gridHelper.position.y = 0.01; // Slightly above ground to avoid z-fighting
        this.scene.add(this.gridHelper);
    }

    public updateSize(newSize: number, newDivisions: number) {
        this.scene.remove(this.gridHelper);
        this.size = newSize;
        this.divisions = newDivisions;
        this.gridHelper = new THREE.GridHelper(this.size, this.divisions, 0x888888, 0x444444);
        this.gridHelper.position.y = 0.01;
        this.scene.add(this.gridHelper);
    }
}
