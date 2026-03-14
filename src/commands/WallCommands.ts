import * as THREE from 'three';
import { ICommand } from './ICommand';
import { WallManager } from '../components/WallManager';

export class AddWallCommand implements ICommand {
    name = 'Add Wall';
    private wallObject: THREE.Object3D | null = null;
    private wallManager: WallManager;
    private start: THREE.Vector3;
    private end: THREE.Vector3;

    constructor(wallManager: WallManager, start: THREE.Vector3, end: THREE.Vector3) {
        this.wallManager = wallManager;
        this.start = start;
        this.end = end;
    }

    execute() {
        this.wallObject = this.wallManager.addWall(this.start, this.end);
    }

    undo() {
        if (this.wallObject) {
            this.wallManager.removeWall(this.wallObject);
            this.wallObject = null;
        }
    }
}

export class RemoveWallCommand implements ICommand {
    name = 'Remove Wall';
    private wallData;
    private wallManager: WallManager;
    private wall: THREE.Object3D;

    constructor(wallManager: WallManager, wall: THREE.Object3D) {
        this.wallManager = wallManager;
        this.wall = wall;
        const index = wall.userData.dataIndex;
        this.wallData = index === undefined ? null : wallManager.getData()[index] ?? null;
    }

    execute() {
        this.wallManager.removeWall(this.wall);
    }

    undo() {
        if (this.wallData) {
            const start = new THREE.Vector3(this.wallData.start.x, 0, this.wallData.start.z);
            const end = new THREE.Vector3(this.wallData.end.x, 0, this.wallData.end.z);
            this.wall = this.wallManager.addWall(start, end);
        }
    }
}
