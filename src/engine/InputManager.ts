import * as THREE from 'three';

export class InputManager {
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;
    private camera: THREE.Camera;
    private gridPlane: THREE.Plane;

    constructor(camera: THREE.Camera) {
        this.camera = camera;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.gridPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    }

    public getMousePosition(event: MouseEvent): THREE.Vector3 | null {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersectPoint = new THREE.Vector3();
        
        if (this.raycaster.ray.intersectPlane(this.gridPlane, intersectPoint)) {
            return intersectPoint;
        }

        return null;
    }

    public snapToGrid(point: THREE.Vector3, gridSize: number = 1): THREE.Vector3 {
        return new THREE.Vector3(
            Math.round(point.x / gridSize) * gridSize,
            0,
            Math.round(point.z / gridSize) * gridSize
        );
    }
}
