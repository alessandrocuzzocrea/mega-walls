import * as THREE from 'three';

export class Floor {
    private mesh: THREE.Mesh;
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene, size: number = 20) {
        this.scene = scene;
        const geometry = new THREE.PlaneGeometry(size, size);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x333333,
            roughness: 0.8,
            metalness: 0.2
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2; // Rotate to be flat on the ground
        this.mesh.receiveShadow = true;
        this.scene.add(this.mesh);
    }

    public updateSize(size: number) {
        this.mesh.geometry.dispose();
        this.mesh.geometry = new THREE.PlaneGeometry(size, size);
    }

    public setWireframe(enabled: boolean) {
        (this.mesh.material as THREE.MeshStandardMaterial).wireframe = enabled;
    }
}
