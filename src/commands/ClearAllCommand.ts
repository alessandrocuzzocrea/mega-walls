import { ICommand } from './ICommand';
import { WallManager } from '../components/WallManager';
import { DoorManager } from '../components/DoorManager';
import { FloorManager } from '../components/FloorManager';

export class ClearAllCommand implements ICommand {
    name = 'Clear All';
    private walls: any[];
    private doors: any[];
    private floors;
    private wallManager: WallManager;
    private doorManager: DoorManager;
    private floorManager: FloorManager;

    constructor(wallManager: WallManager, doorManager: DoorManager, floorManager: FloorManager) {
        this.wallManager = wallManager;
        this.doorManager = doorManager;
        this.floorManager = floorManager;
        this.walls = wallManager.getData();
        this.doors = doorManager.getData();
        this.floors = floorManager.getData();
    }

    execute() {
        this.wallManager.clearWalls();
        this.doorManager.clearDoors();
        this.floorManager.clearFloors();
    }

    toString() {
        return this.name;
    }

    undo() {
        this.wallManager.resetAndLoad(this.walls);
        this.doorManager.resetAndLoad(this.doors);
        this.floorManager.resetAndLoad(this.floors.floors);
    }
}
