import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { WallManager } from './WallManager';

vi.mock('three', () => {
    class Vector3Mock {
        x = 0; y = 0; z = 0;
        constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z; }
        set(x: number, y: number, z: number) { this.x = x ?? 0; this.y = y ?? 0; this.z = z ?? 0; return this; }
        copy(v: {x: number, y: number, z: number}) { this.x = v.x ?? 0; this.y = v.y ?? 0; this.z = v.z ?? 0; return this; }
        add(v: {x: number, y: number, z: number}) { this.x += v.x ?? 0; this.y += v.y ?? 0; this.z += v.z ?? 0; return this; }
        multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this; }
        clone() { return new Vector3Mock(this.x, this.y, this.z); }
        distanceTo(v: {x: number, y: number, z: number}) { 
            return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2) + Math.pow(this.z - v.z, 2)); 
        }
    }

    return {
        Scene: class { add = vi.fn(); remove = vi.fn(); children = []; },
        Group: class { add = vi.fn(); remove = vi.fn(); children = []; },
        Mesh: class { 
            position = new Vector3Mock();
            rotation = new Vector3Mock();
            geometry = { dispose: vi.fn() };
            material = { dispose: vi.fn() };
            userData: any = {};
            name = '';
        },
        BoxGeometry: class { parameters = { width: 1 }; constructor() {} },
        MeshStandardMaterial: class { emissive = { set: vi.fn() }; constructor() {} },
        Vector3: Vector3Mock,
        Color: class { set = vi.fn(); constructor() {} },
    };
});

describe('WallManager Merging', () => {
    let scene: any;
    let wallManager: WallManager;

    beforeEach(() => {
        scene = new THREE.Scene();
        wallManager = new WallManager(scene);
    });

    it('should merge two straight walls', () => {
        // Wall 1: (0,0) to (0,1)
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        expect(wallManager.getData().length).toBe(1);

        // Wall 2: (0,1) to (0,2) - should merge with Wall 1
        wallManager.addWall(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 2));
        const data = wallManager.getData();
        
        expect(data.length).toBe(1);
        expect(data[0].start).toEqual({ x: 0, z: 0 });
        expect(data[0].end).toEqual({ x: 0, z: 2 });
    });

    it('should merge walls added in reverse order', () => {
        // Wall 1: (0,1) to (0,2)
        wallManager.addWall(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 2));
        // Wall 2: (0,0) to (0,1)
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        
        const data = wallManager.getData();
        expect(data.length).toBe(1);
        // It should merge (0,0)-(0,1) and (0,1)-(0,2) into (0,0)-(0,2)
        expect(data[0].start).toEqual({ x: 0, z: 0 });
        expect(data[0].end).toEqual({ x: 0, z: 2 });
    });

    it('should merge multiple segments into one', () => {
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        wallManager.addWall(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 2));
        wallManager.addWall(new THREE.Vector3(0, 0, 2), new THREE.Vector3(0, 0, 3));
        
        const data = wallManager.getData();
        expect(data.length).toBe(1);
        expect(data[0].start).toEqual({ x: 0, z: 0 });
        expect(data[0].end).toEqual({ x: 0, z: 3 });
    });

    it('should not merge non-collinear walls', () => {
        // Wall 1: (0,0) to (0,1)
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        // Wall 2: (0,1) to (1,1) - L shape, should NOT merge
        wallManager.addWall(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 1));
        
        expect(wallManager.getData().length).toBe(2);
    });

    it('should not merge parallel but not connected walls', () => {
        // Wall 1: (0,0) to (0,1)
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
        // Wall 2: (1,0) to (1,1) - Parallel, but separate, should NOT merge
        wallManager.addWall(new THREE.Vector3(1, 0, 0), new THREE.Vector3(1, 0, 1));
        
        expect(wallManager.getData().length).toBe(2);
    });
});
