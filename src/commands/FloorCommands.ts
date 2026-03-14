import * as THREE from 'three';
import { ICommand } from './ICommand';
import { FloorManager } from '../components/FloorManager';

export class AddFloorCommand implements ICommand {
    name = 'Add Floor';
    private floorObject: THREE.Object3D | null = null;
    private floorManager: FloorManager;
    private x: number;
    private z: number;
    private w: number;
    private d: number;

    constructor(floorManager: FloorManager, x: number, z: number, w: number, d: number) {
        this.floorManager = floorManager;
        this.x = x;
        this.z = z;
        this.w = w;
        this.d = d;
    }

    execute() {
        this.floorObject = this.floorManager.addFloor(this.x, this.z, this.w, this.d);
    }

    undo() {
        if (this.floorObject) {
            this.floorManager.removeFloor(this.floorObject);
            this.floorObject = null;
        }
    }
}

export class RemoveFloorCommand implements ICommand {
    name = 'Remove Floor';
    private floorData;
    private floorManager: FloorManager;
    private floor: THREE.Object3D;

    constructor(floorManager: FloorManager, floor: THREE.Object3D) {
        this.floorManager = floorManager;
        this.floor = floor;
        const index = floor.userData.dataIndex;
        this.floorData = index === undefined ? null : floorManager.getData().floors[index] ?? null;
    }

    execute() {
        this.floorManager.removeFloor(this.floor);
    }

    undo() {
        if (this.floorData) {
            const restoredFloor = this.floorManager.addFloor(
                this.floorData.x,
                this.floorData.z,
                this.floorData.width,
                this.floorData.depth
            );
            if (restoredFloor) {
                this.floor = restoredFloor;
            }
        }
    }
}

export class FloodFillCommand implements ICommand {
    name = 'Flood Fill';
    private previousFloors;
    private floorManager: FloorManager;
    private point: THREE.Vector3;
    private walls: any[];

    constructor(floorManager: FloorManager, point: THREE.Vector3, walls: any[]) {
        this.floorManager = floorManager;
        this.point = point;
        this.walls = walls;
        this.previousFloors = floorManager.getData();
    }

    execute() {
        this.floorManager.floodFill(this.point, this.walls);
    }

    undo() {
        this.floorManager.resetAndLoad(this.previousFloors.floors);
    }
}
