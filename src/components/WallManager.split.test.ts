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
        sub(v: {x: number, y: number, z: number}) { this.x -= v.x ?? 0; this.y -= v.y ?? 0; this.z -= v.z ?? 0; return this; }
        dot(v: {x: number, y: number, z: number}) { return this.x * v.x + this.y * v.y + this.z * v.z; }
        crossVectors(a: any, b: any) {
            this.x = a.y * b.z - a.z * b.y;
            this.y = a.z * b.x - a.x * b.z;
            this.z = a.x * b.y - a.y * b.x;
            return this;
        }
        length() { return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z); }
        normalize() { const l = this.length(); if (l > 0) { this.x /= l; this.y /= l; this.z /= l; } return this; }
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
            geometry = { dispose: vi.fn(), parameters: { width: 1 } };
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

describe('WallManager Splitting', () => {
    let scene: any;
    let wallManager: WallManager;

    beforeEach(() => {
        scene = new THREE.Scene();
        wallManager = new WallManager(scene);
    });

    it('should split a wall in the middle', () => {
        // Wall from (0,0) to (10,0)
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0));
        expect(wallManager.getData().length).toBe(1);

        // Split with a door segment (4,0) to (5,0)
        wallManager.splitWallAt({ x: 4, z: 0 }, { x: 5, z: 0 });
        
        const data = wallManager.getData();
        expect(data.length).toBe(2);
        
        // Should have (0,0)-(4,0) and (5,0)-(10,0)
        // Note: they might be in any order or merged if not careful, but splitting should work.
        const hasStart = data.some(w => w.start.x === 0 && w.end.x === 4);
        const hasEnd = data.some(w => w.start.x === 5 && w.end.x === 10);
        
        expect(hasStart).toBe(true);
        expect(hasEnd).toBe(true);
    });

    it('should split a wall at the start', () => {
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0));
        // Split (0,0) to (1,0)
        wallManager.splitWallAt({ x: 0, z: 0 }, { x: 1, z: 0 });
        
        const data = wallManager.getData();
        expect(data.length).toBe(1);
        expect(data[0].start.x).toBe(1);
        expect(data[0].end.x).toBe(5);
    });

    it('should split a wall at the end', () => {
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0));
        // Split (4,0) to (5,0)
        wallManager.splitWallAt({ x: 4, z: 0 }, { x: 5, z: 0 });
        
        const data = wallManager.getData();
        expect(data.length).toBe(1);
        expect(data[0].start.x).toBe(0);
        expect(data[0].end.x).toBe(4);
    });

    it('should split a vertical wall', () => {
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 5));
        // Split (0,2) to (0,3)
        wallManager.splitWallAt({ x: 0, z: 2 }, { x: 0, z: 3 });
        
        const data = wallManager.getData();
        expect(data.length).toBe(2);
        const hasStart = data.some(w => w.start.z === 0 && w.end.z === 2);
        const hasEnd = data.some(w => w.start.z === 3 && w.end.z === 5);
        expect(hasStart).toBe(true);
        expect(hasEnd).toBe(true);
    });

    it('should remove a wall entirely if overtaken by door', () => {
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0));
        // Split (0,0) to (1,0)
        wallManager.splitWallAt({ x: 0, z: 0 }, { x: 1, z: 0 });
        
        expect(wallManager.getData().length).toBe(0);
    });

    it('should split a diagonal wall', () => {
        // Wall from (0,0,0) to (2,0,2) -> length is sqrt(8) ~ 2.82
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(2, 0, 2));
        
        // Split center segment: from (0.5, 0, 0.5) to (1.5, 0, 1.5)
        // This is a 1-unit segment in the middle
        wallManager.splitWallAt({ x: 0.5, z: 0.5 }, { x: 1.5, z: 1.5 });
        
        const data = wallManager.getData();
        expect(data.length).toBe(2);
        
        const eps = 0.001;
        const hasStart = data.some(w => 
            Math.abs(w.start.x - 0) < eps && Math.abs(w.end.x - 0.5) < eps
        );
        const hasEnd = data.some(w => 
            Math.abs(w.start.x - 1.5) < eps && Math.abs(w.end.x - 2) < eps
        );
        
        expect(hasStart).toBe(true);
        expect(hasEnd).toBe(true);
    });

    it('should split a wall drawn through an existing door', () => {
        // Simulate: door at (2.5, 0, 0) with angle 0 (horizontal)
        // Door segment runs from (2, 0) to (3, 0)
        const doorAngle = 0;
        const doorPos = { x: 2.5, z: 0 };
        const dx = Math.cos(doorAngle) * 0.5;
        const dz = -Math.sin(doorAngle) * 0.5;
        const doorP1 = { x: doorPos.x - dx, z: doorPos.z - dz };
        const doorP2 = { x: doorPos.x + dx, z: doorPos.z + dz };

        // Wall from (0,0) to (5,0) - runs right through the door
        wallManager.addWall(new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0));
        expect(wallManager.getData().length).toBe(1);

        // Split wall at door segment
        wallManager.splitWallAt(doorP1, doorP2);

        const data = wallManager.getData();
        expect(data.length).toBe(2);

        // Should have (0,0)-(2,0) and (3,0)-(5,0)
        const hasLeft = data.some(w => 
            Math.abs(w.start.x) < 0.001 && Math.abs(w.end.x - 2) < 0.001
        );
        const hasRight = data.some(w => 
            Math.abs(w.start.x - 3) < 0.001 && Math.abs(w.end.x - 5) < 0.001
        );
        expect(hasLeft).toBe(true);
        expect(hasRight).toBe(true);
    });
});

