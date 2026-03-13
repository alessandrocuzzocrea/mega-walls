import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock requestAnimationFrame to avoid infinite loops
vi.stubGlobal('requestAnimationFrame', vi.fn());

// More robust Three.js mock with properties
class Vector3Mock {
    x = 0; y = 0; z = 0;
    set(x, y, z) { this.x = x ?? 0; this.y = y ?? 0; this.z = z ?? 0; return this; }
    copy(v) { this.x = v.x ?? 0; this.y = v.y ?? 0; this.z = v.z ?? 0; return this; }
    add(v) { this.x += v.x ?? 0; this.y += v.y ?? 0; this.z += v.z ?? 0; return this; }
    multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
    clone() { return new Vector3Mock().copy(this); }
    distanceTo() { return 1; }
    multiply() { return this; }
}

const mockThree = {
  Scene: class { add = vi.fn(); remove = vi.fn(); children = []; background = { set: vi.fn() } },
  PerspectiveCamera: class { 
    constructor() { this.position = new Vector3Mock(); }
    lookAt = vi.fn();
    updateProjectionMatrix = vi.fn();
  },
  WebGLRenderer: class { 
    setSize = vi.fn(); 
    setPixelRatio = vi.fn(); 
    render = vi.fn();
    domElement = document.createElement('div');
  },
  AmbientLight: class {},
  DirectionalLight: class { 
    constructor() { this.position = new Vector3Mock(); }
  },
  GridHelper: class { 
    constructor() { this.position = new Vector3Mock(); }
    visible = true;
  },
  Mesh: class { 
    constructor() {
        this.position = new Vector3Mock();
        this.rotation = new Vector3Mock();
        this.scale = new Vector3Mock();
        this.material = { color: { set: vi.fn() } };
        this.geometry = { dispose: vi.fn(), parameters: { width: 1 } };
    }
    visible = false;
    receiveShadow = false;
  },
  BoxGeometry: class {},
  SphereGeometry: class {},
  PlaneGeometry: class {},
  MeshStandardMaterial: class {},
  MeshBasicMaterial: class {},
  Group: class { add = vi.fn(); remove = vi.fn(); children = [] },
  Vector3: Vector3Mock,
  Raycaster: class { setFromCamera = vi.fn(); intersectObject = vi.fn(() => []) },
  Vector2: class { x = 0; y = 0; set = vi.fn() },
  Plane: class { intersectRay = vi.fn() },
  Color: class { set = vi.fn() }
};

vi.mock('three', () => mockThree);

// Mock OrbitControls
vi.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: class { 
    constructor() { this.enabled = true; }
    update = vi.fn();
  }
}));

describe('Mega-Walls UI', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize the app and toggle Wall Mode', async () => {
    await import('./main');

    const wallModeBtn = document.getElementById('add-wall-mode') as HTMLButtonElement;
    expect(wallModeBtn).toBeTruthy();
    expect(wallModeBtn?.textContent).toContain('OFF');

    // Click to toggle ON
    wallModeBtn?.click();
    expect(wallModeBtn?.textContent).toContain('ON');
    expect(wallModeBtn?.classList.contains('active')).toBe(true);

    // Click to toggle OFF
    wallModeBtn?.click();
    expect(wallModeBtn?.textContent).toContain('OFF');
    expect(wallModeBtn?.classList.contains('active')).toBe(false);
  });
});
