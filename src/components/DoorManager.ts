import * as THREE from 'three';

export interface DoorData {
    position: { x: number, z: number };
    angle: number;
}

export class DoorManager {
    private scene: THREE.Scene;
    private doors: THREE.Group;
    private doorDataList: DoorData[] = [];
    private doorHeight: number = 2.5;
    private doorWidth: number = 1.0;
    private doorThickness: number = 0.15;
    private isWireframe: boolean = false;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
        this.doors = new THREE.Group();
        this.scene.add(this.doors);
    }

    public addDoor(position: THREE.Vector3, angle: number) {
        const index = this.doorDataList.length;
        this.doorDataList.push({
            position: { x: position.x, z: position.z },
            angle
        });

        const doorModel = this.createDoorModel();
        doorModel.userData.dataIndex = index;
        doorModel.name = 'door';

        doorModel.position.copy(position);
        doorModel.position.y = 0; // The model itself will be offset correctly

        doorModel.rotation.y = angle;

        this.doors.add(doorModel);
    }

    private createDoorModel(): THREE.Group {
        const group = new THREE.Group();

        // Materials
        const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x4d2a15, wireframe: this.isWireframe }); // Dark wood
        const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513, wireframe: this.isWireframe }); // Lighter wood
        const handleMaterial = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2, wireframe: this.isWireframe }); // Gold/Brass

        const frameThickness = 0.1;
        const frameDepth = 0.22; // Slightly thicker than wall (0.2)

        // Frame - Left
        const leftFrameGeo = new THREE.BoxGeometry(frameThickness, this.doorHeight, frameDepth);
        const leftFrame = new THREE.Mesh(leftFrameGeo, frameMaterial);
        leftFrame.position.set(-this.doorWidth / 2 + frameThickness / 2, this.doorHeight / 2, 0);
        group.add(leftFrame);

        // Frame - Right
        const rightFrame = leftFrame.clone();
        rightFrame.position.set(this.doorWidth / 2 - frameThickness / 2, this.doorHeight / 2, 0);
        group.add(rightFrame);

        // Frame - Top
        const topFrameGeo = new THREE.BoxGeometry(this.doorWidth, frameThickness, frameDepth);
        const topFrame = new THREE.Mesh(topFrameGeo, frameMaterial);
        topFrame.position.set(0, this.doorHeight - frameThickness / 2, 0);
        group.add(topFrame);

        // Door Slab
        const slabWidth = this.doorWidth - frameThickness * 2;
        const slabHeight = this.doorHeight - frameThickness;
        const slabGeo = new THREE.BoxGeometry(slabWidth, slabHeight, this.doorThickness);
        const slab = new THREE.Mesh(slabGeo, doorMaterial);
        slab.position.set(0, slabHeight / 2, 0);
        group.add(slab);

        // Door Handle (Pivot/Front)
        const handleGeo = new THREE.SphereGeometry(0.04, 8, 8);
        const handle = new THREE.Mesh(handleGeo, handleMaterial);
        handle.position.set(slabWidth / 2 - 0.1, slabHeight / 2, this.doorThickness / 2 + 0.02);
        group.add(handle);

        // Door Handle (Back)
        const handleBack = handle.clone();
        handleBack.position.z = -this.doorThickness / 2 - 0.02;
        group.add(handleBack);

        return group;
    }

    public getData(): DoorData[] {
        return this.doorDataList;
    }

    public getDoors(): THREE.Object3D[] {
        return this.doors.children;
    }

    public removeDoor(door: THREE.Object3D) {
        const index = door.userData.dataIndex;
        if (index !== undefined) {
            this.removeDoorAtIndex(index);
        }
    }

    private removeDoorAtIndex(index: number) {
        const doorModel = this.doors.children.find(child => child.userData.dataIndex === index);
        if (doorModel) {
            doorModel.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
            this.doors.remove(doorModel);
        }

        this.doorDataList.splice(index, 1);

        // Re-index remaining doors
        this.doors.children.forEach(child => {
            if (child.userData.dataIndex > index) {
                child.userData.dataIndex--;
            }
        });
    }

    public setWireframe(enabled: boolean) {
        this.isWireframe = enabled;
        this.doors.children.forEach(door => {
            door.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    (child.material as THREE.MeshStandardMaterial).wireframe = enabled;
                }
            });
        });
    }

    public clearDoors() {
        this.doorDataList = [];
        while(this.doors.children.length > 0) {
            const door = this.doors.children[0];
            door.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });
            this.doors.remove(door);
        }
    }

    public resetAndLoad(data: DoorData[]) {
        this.clearDoors();
        data.forEach(door => {
            this.addDoor(
                new THREE.Vector3(door.position.x, 0, door.position.z),
                door.angle
            );
        });
    }
}
