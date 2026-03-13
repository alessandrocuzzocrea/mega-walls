import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock requestAnimationFrame to avoid infinite loops
vi.stubGlobal('requestAnimationFrame', vi.fn());

// More robust Three.js mock with properties
class Vector3Mock {
    x = 0; y = 0; z = 0;
    set(x: number, y: number, z: number) { this.x = x ?? 0; this.y = y ?? 0; this.z = z ?? 0; return this; }
    copy(v: {x: number, y: number, z: number}) { this.x = v.x ?? 0; this.y = v.y ?? 0; this.z = v.z ?? 0; return this; }
    add(v: {x: number, y: number, z: number}) { this.x += v.x ?? 0; this.y += v.y ?? 0; this.z += v.z ?? 0; return this; }
    multiplyScalar(s: number) { this.x *= s; this.y *= s; this.z *= s; return this; }
    clone() { return new Vector3Mock().copy(this); }
    distanceTo() { return 1; }
    multiply() { return this; }
}

const mockThree = {
  Scene: class { 
    add = vi.fn(); 
    remove = vi.fn(); 
    children = []; 
    background = { set: vi.fn() };
  },
  DoubleSide: 2,
  PerspectiveCamera: class { 
    position = new Vector3Mock();
    lookAt = vi.fn();
    updateProjectionMatrix = vi.fn();
    aspect = 1;
  },
  WebGLRenderer: class { 
    setSize = vi.fn(); 
    setPixelRatio = vi.fn(); 
    render = vi.fn();
    domElement = document.createElement('div');
  },
  AmbientLight: class {},
  DirectionalLight: class { 
    position = new Vector3Mock();
  },
  GridHelper: class { 
    position = new Vector3Mock();
    visible = true;
  },
  Mesh: class { 
    position = new Vector3Mock();
    rotation = new Vector3Mock();
    scale = new Vector3Mock();
    material = { color: { set: vi.fn() }, emissive: { set: vi.fn() }, emissiveIntensity: 0 };
    geometry = { dispose: vi.fn(), parameters: { width: 1 } };
    visible = false;
    receiveShadow = false;
    userData: any = {};
    name = '';
    clone() { return new (this.constructor as any)(); }
  },
  BoxGeometry: class {},
  SphereGeometry: class {},
  PlaneGeometry: class {},
  MeshStandardMaterial: class {
    color = { set: vi.fn() };
    emissive = { set: vi.fn() };
    emissiveIntensity = 0;
  },
  MeshBasicMaterial: class {},
  Group: class { 
    add = vi.fn(); 
    remove = vi.fn(); 
    children: any[] = []; 
    clone() { return new (this.constructor as any)(); }
  },
  Vector3: Vector3Mock,
  Raycaster: class { 
    setFromCamera = vi.fn(); 
    intersectObject = vi.fn(() => null);
    intersectObjects = vi.fn(() => []);
    ray = { intersectPlane: vi.fn(() => new Vector3Mock()) }
  },
  Vector2: class { x = 0; y = 0; set = vi.fn() },
  Plane: class { intersectRay = vi.fn() },
  Color: class { set = vi.fn() }
};

vi.mock('three', () => mockThree);

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class { 
    enabled = true;
    enableDamping = false;
    update = vi.fn();
  }
}));

describe('Mega-Walls UI', () => {
  let mainModule: any;

  beforeEach(async () => {
    // Setup DOM
    document.body.innerHTML = '<div id="app"></div>';
    
    // Setup window dimensions to avoid NaN in raycasting/inputManager
    Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: 1024 });
    Object.defineProperty(window, 'innerHeight', { writable: true, configurable: true, value: 768 });
    
    localStorage.clear();
    
    // Reset modules ensures we get a fresh SceneManager and event listeners for each test
    vi.resetModules();
    mainModule = await import('./main');
  });

  it('should initialize the app and handle mode toggles', async () => {
    const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
    const deleteModeBtn = document.getElementById('delete-mode') as HTMLButtonElement;
    const floorModeBtn = document.getElementById('floor-mode') as HTMLButtonElement;
    const floorSubTools = document.getElementById('floor-sub-tools')!;
    
    expect(wallModeBtn).toBeTruthy();
    expect(deleteModeBtn).toBeTruthy();
    expect(floorModeBtn).toBeTruthy();

    // Initial state check
    expect(wallModeBtn.textContent).toContain('OFF');
    expect(deleteModeBtn.textContent).toContain('OFF');

    // Toggle Wall Mode ON
    wallModeBtn.click();
    expect(wallModeBtn.textContent).toContain('ON');
    expect(wallModeBtn.classList.contains('active')).toBe(true);

    // Toggle Delete Mode ON (should turn OFF wall mode)
    deleteModeBtn.click();
    expect(deleteModeBtn.textContent).toContain('ON');
    expect(wallModeBtn.textContent).toContain('OFF');

    // Test Floor Mode
    floorModeBtn.click();
    expect(floorModeBtn.textContent).toContain('ON');
    expect(floorSubTools.classList.contains('hidden')).toBe(false);

    // Switching back to Wall Mode should hide floor tools
    wallModeBtn.click();
    expect(floorSubTools.classList.contains('hidden')).toBe(true);
  });

  it('should manage cursor visibility correctly for all tools', async () => {
    const { cursor } = mainModule;
    
    const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
    const roomModeBtn = document.getElementById('room-mode-btn') as HTMLButtonElement;
    const doorModeBtn = document.getElementById('door-mode-btn') as HTMLButtonElement;
    const floorModeBtn = document.getElementById('floor-mode') as HTMLButtonElement;
    const deleteModeBtn = document.getElementById('delete-mode') as HTMLButtonElement;

    // Helper to simulate mouse move to trigger cursor logic
    const moveMouse = () => {
        const event = new MouseEvent('mousemove', { clientX: 100, clientY: 100 });
        const container = document.getElementById('canvas-container');
        container?.dispatchEvent(event);
    };

    // Initially cursor hidden
    expect(cursor.visible).toBe(false);

    // Wall Mode: Cursor visible
    wallModeBtn.click();
    moveMouse();
    expect(cursor.visible).toBe(true);

    // Delete Tool: Cursor HIDDEN
    deleteModeBtn.click();
    moveMouse();
    expect(cursor.visible).toBe(false);

    // Room Tool: Cursor visible
    roomModeBtn.click();
    moveMouse();
    expect(cursor.visible).toBe(true);

    // Toggle Room OFF: Cursor hidden
    roomModeBtn.click();
    moveMouse();
    expect(cursor.visible).toBe(false);
  });
});
