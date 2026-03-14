import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { FloorManager } from './FloorManager';

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
        Scene: class { 
            add = vi.fn((obj) => {
                if (obj.isGroup) {
                    this.children.push(obj);
                }
            }); 
            remove = vi.fn(); 
            children: any[] = []; 
        },
        Group: class { 
            add = vi.fn((obj) => {
                this.children.push(obj);
            }); 
            remove = vi.fn((obj) => {
                const idx = this.children.indexOf(obj);
                if (idx > -1) this.children.splice(idx, 1);
            }); 
            children: any[] = []; 
            isGroup = true;
        },
        Mesh: class { 
            position = new Vector3Mock();
            rotation = new Vector3Mock();
            geometry = { dispose: vi.fn() };
            material = { dispose: vi.fn() };
            userData: any = {};
            name = '';
            receiveShadow = false;
        },
        PlaneGeometry: class { constructor(_w: number, _d: number) {} },
        MeshStandardMaterial: class { 
            emissive = { set: vi.fn() }; 
            constructor(params: any) {
                Object.assign(this, params);
            }
            wireframe = false;
        },
        Vector3: Vector3Mock,
        Color: class { set = vi.fn(); constructor() {} },
        DoubleSide: 2,
    };
});

describe('FloorManager Overlaps', () => {
    let scene: any;
    let floorManager: FloorManager;

    beforeEach(() => {
        scene = new THREE.Scene();
        floorManager = new FloorManager(scene);
    });

    it('should NOT allow overlapping tiles (duplicate tiles)', () => {
        // Add tile at (0,0)
        floorManager.addTile(0, 0);
        const data1 = floorManager.getData();
        expect(data1.floors.length).toBe(1);
        expect(floorManager.getFloors().length).toBe(1);

        // Add another tile at (0,0) - should NOT be added as it's a complete duplicate
        floorManager.addTile(0, 0);
        
        const data2 = floorManager.getData();
        expect(data2.floors.length).toBe(1);
        expect(floorManager.getFloors().length).toBe(1);
    });

    it('should merge overlapping large floors', () => {
        // Add a 2x2 floor at (0,0) -> cells: (0,0), (1,0), (0,1), (1,1)
        floorManager.addFloor(0, 0, 2, 2);
        
        // Add another 2x2 floor at (1,0) -> cells: (1,0), (2,0), (1,1), (2,1)
        // Overlap: (1,0), (1,1)
        // New cells: (2,0), (2,1)
        floorManager.addFloor(1, 0, 2, 2);

        const data = floorManager.getData();
        // Total occupied cells should be 6
        
        let totalArea = 0;
        data.floors.forEach(f => totalArea += f.width * f.depth);
        
        expect(totalArea).toBe(6);
    });
});
