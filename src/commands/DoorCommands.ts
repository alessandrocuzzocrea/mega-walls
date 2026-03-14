import * as THREE from 'three';
import { ICommand } from './ICommand';
import { DoorManager } from '../components/DoorManager';

export class AddDoorCommand implements ICommand {
    name = 'Add Door';
    private doorObject: THREE.Object3D | null = null;
    private doorManager: DoorManager;
    private position: THREE.Vector3;
    private angle: number;

    constructor(doorManager: DoorManager, position: THREE.Vector3, angle: number) {
        this.doorManager = doorManager;
        this.position = position;
        this.angle = angle;
    }

    execute() {
        this.doorObject = this.doorManager.addDoor(this.position, this.angle);
    }

    undo() {
        if (this.doorObject) {
            this.doorManager.removeDoor(this.doorObject);
            this.doorObject = null;
        }
    }
}

export class RemoveDoorCommand implements ICommand {
    name = 'Remove Door';
    private doorData;
    private doorManager: DoorManager;
    private door: THREE.Object3D;

    constructor(doorManager: DoorManager, door: THREE.Object3D) {
        this.doorManager = doorManager;
        this.door = door;
        const index = door.userData.dataIndex;
        this.doorData = index === undefined ? null : doorManager.getData()[index] ?? null;
    }

    execute() {
        this.doorManager.removeDoor(this.door);
    }

    undo() {
        if (this.doorData) {
            const pos = new THREE.Vector3(this.doorData.position.x, 0, this.doorData.position.z);
            this.door = this.doorManager.addDoor(pos, this.doorData.angle);
        }
    }
}
