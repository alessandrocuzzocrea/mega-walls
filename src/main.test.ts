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
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    vi.resetModules();
  });

  it('should initialize the app and handle mode toggles', async () => {
    await import('./main');

    const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
    const deleteModeBtn = document.getElementById('delete-mode') as HTMLButtonElement;
    
    expect(wallModeBtn).toBeTruthy();
    expect(deleteModeBtn).toBeTruthy();
    
    // Initial state check
    expect(wallModeBtn?.textContent).toContain('OFF');
    expect(deleteModeBtn?.textContent).toContain('OFF');

    // Toggle Wall Mode ON
    wallModeBtn?.click();
    expect(wallModeBtn?.textContent).toContain('ON');
    expect(wallModeBtn?.classList.contains('active')).toBe(true);
    expect(deleteModeBtn?.classList.contains('active')).toBe(false);

    // Toggle Delete Mode ON (should turn OFF wall mode)
    deleteModeBtn?.click();
    expect(deleteModeBtn?.textContent).toContain('ON');
    expect(deleteModeBtn?.classList.contains('active')).toBe(true);
    expect(wallModeBtn?.textContent).toContain('OFF');
    expect(wallModeBtn?.classList.contains('active')).toBe(false);

    // Toggle Delete Mode OFF
    deleteModeBtn?.click();
    expect(deleteModeBtn?.textContent).toContain('OFF');
    expect(deleteModeBtn?.classList.contains('active')).toBe(false);

    // Test Floor Mode
    const floorModeBtn = document.getElementById('floor-mode') as HTMLButtonElement;
    const floorSubTools = document.getElementById('floor-sub-tools')!;
    
    expect(floorModeBtn).toBeTruthy();
    expect(floorSubTools.classList.contains('hidden')).toBe(true);

    floorModeBtn.click();
    expect(floorModeBtn.textContent).toContain('ON');
    expect(floorModeBtn.classList.contains('active')).toBe(true);
    expect(floorSubTools.classList.contains('hidden')).toBe(false);
    expect(wallModeBtn.classList.contains('active')).toBe(false);
    expect(deleteModeBtn.classList.contains('active')).toBe(false);

    // Check Sub-tools
    const rectBtn = document.getElementById('floor-rect') as HTMLButtonElement;
    const fillBtn = document.getElementById('floor-fill') as HTMLButtonElement;
    expect(rectBtn.classList.contains('active')).toBe(true);

    fillBtn.click();
    expect(fillBtn.classList.contains('active')).toBe(true);
    expect(rectBtn.classList.contains('active')).toBe(false);

    // Switching back to Wall Mode should hide floor tools
    wallModeBtn.click();
    expect(floorSubTools.classList.contains('hidden')).toBe(true);
    expect(floorModeBtn.textContent).toContain('OFF');
  });
});
