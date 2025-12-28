# Elite-Style 3D Radar Display - React JSX Component Specification

A comprehensive guide for recreating the iconic 3D radar visualization from Elite (1984) and Elite Dangerous as a React component for Three.js/React Three Fiber applications.

---

## Table of Contents

1. [Overview](#overview)
2. [Visual Anatomy](#visual-anatomy)
3. [Coordinate System](#coordinate-system)
4. [Component Architecture](#component-architecture)
5. [Core Implementation](#core-implementation)
6. [Contact Rendering](#contact-rendering)
7. [Props Interface](#props-interface)
8. [Styling & Theming](#styling--theming)
9. [Performance Considerations](#performance-considerations)
10. [Usage Example](#usage-example)

---

## Overview

The Elite radar is a **hemispherical 3D scanner** that displays nearby objects relative to the player's spacecraft. Unlike traditional 2D radar, this system conveys full spatial relationships in three dimensions within a compact visual footprint.

### Key Characteristics

- **Egocentric View**: The player is always at the center; the radar rotates with the ship's orientation
- **Hemisphere/Bowl Shape**: The radar dish is typically rendered as a concave hemisphere or truncated bowl
- **Vertical Stalks**: Each contact has a vertical line ("stalk") connecting it to the horizontal reference plane, indicating relative altitude
- **Distance as Radial Position**: Objects farther away appear closer to the edge of the radar
- **Holographic Aesthetic**: Traditionally rendered with a wireframe, semi-transparent, sci-fi appearance

---

## Visual Anatomy

### 1. The Radar Dish (Container)

```
        ╭─────────────────╮
       ╱                   ╲
      ╱    Radar Surface    ╲
     ╱                       ╲
    ╱   (Concave Hemisphere)  ╲
   ╱                           ╲
  ╰─────────────────────────────╯
         Equatorial Ring
```

- **Shape**: Hemispherical bowl or truncated sphere segment
- **Orientation**: Opens upward toward the viewer (typically positioned in the cockpit HUD)
- **Grid Lines**: Optional latitude/longitude lines for spatial reference
- **Equatorial Ring**: A bright ring at the "equator" representing the horizontal plane (y=0)

### 2. The Horizontal Reference Plane

The **equatorial disc** or ring represents the plane where y=0 relative to the player. This is the critical reference for understanding vertical positioning:

- Contacts **above** this plane are higher than the player
- Contacts **below** this plane are lower than the player

### 3. Contact Blips

Each detected object is rendered as a **blip** consisting of:

```
        ●  ← Contact marker (the actual blip)
        │
        │  ← Vertical stalk (height indicator)
        │
   ─────┼───── Horizontal plane intersection
        │
        ●  ← (if contact is below plane, stalk extends downward)
```

#### Blip Components

| Component | Description |
|-----------|-------------|
| **Marker** | The primary indicator (dot, square, triangle, etc.) showing actual 3D position |
| **Stalk** | Vertical line from the horizontal plane to the marker |
| **Base Point** | Where the stalk intersects the horizontal plane (shows 2D position) |

### 4. Center Point (Player Position)

- The exact center of the radar represents the player's ship
- Often marked with a small icon or crosshair
- All positions are relative to this point

---

## Coordinate System

### World-to-Radar Transformation

The radar uses a **normalized spherical coordinate system** mapped to the dish geometry.

```
Input:  World position of contact (x, y, z) relative to player
Output: Radar position (r, θ, φ) mapped to hemisphere surface
```

### Transformation Steps

#### Step 1: Calculate Relative Position

```javascript
const relativePos = {
  x: contact.position.x - player.position.x,
  y: contact.position.y - player.position.y,
  z: contact.position.z - player.position.z
};
```

#### Step 2: Apply Player Rotation (Optional - for ship-relative display)

```javascript
// If radar should rotate with ship orientation:
const localPos = relativePos.clone().applyQuaternion(player.quaternion.invert());
```

#### Step 3: Calculate Spherical Coordinates

```javascript
const distance = Math.sqrt(x*x + y*y + z*z);
const horizontalDist = Math.sqrt(x*x + z*z);

// Azimuth angle (horizontal rotation around Y axis)
const theta = Math.atan2(x, z);

// Elevation (vertical angle from horizontal plane)
const phi = Math.atan2(y, horizontalDist);
```

#### Step 4: Normalize to Radar Scale

```javascript
const maxRange = 5000; // Maximum radar range in world units
const radarRadius = 1; // Radar dish radius in component units

// Normalized distance (0 = center, 1 = edge)
const normalizedDist = Math.min(distance / maxRange, 1);

// Map to radar position
const radarX = normalizedDist * Math.sin(theta) * radarRadius;
const radarZ = normalizedDist * Math.cos(theta) * radarRadius;
const radarY = normalizedDist * Math.sin(phi) * radarRadius * 0.5; // Hemisphere height factor
```

### Stalk Calculation

The stalk connects the contact's actual position to its projection on the horizontal plane:

```javascript
// Contact's radar position
const contactPos = { x: radarX, y: radarY, z: radarZ };

// Base position (projection on y=0 plane)
const basePos = { x: radarX, y: 0, z: radarZ };

// Stalk is a line from basePos to contactPos
```

---

## Component Architecture

### Recommended File Structure

```
components/
└── Radar3D/
    ├── index.jsx           # Main component export
    ├── RadarDish.jsx       # Hemisphere mesh
    ├── RadarGrid.jsx       # Reference grid lines
    ├── RadarContact.jsx    # Individual contact blip
    ├── RadarStalk.jsx      # Vertical indicator line
    ├── useRadarTransform.js # Custom hook for coordinate math
    └── radarTheme.js       # Color/style constants
```

### Component Hierarchy

```
<Radar3D>
  ├── <RadarDish />           // The hemisphere container
  │   └── <RadarGrid />       // Optional grid overlay
  ├── <RadarCenter />         // Player position marker
  ├── <RadarContacts>         // Contact container
  │   └── {contacts.map → <RadarContact />}
  │       ├── <ContactMarker />
  │       └── <RadarStalk />
  └── <RadarRing />           // Equatorial reference ring
</Radar3D>
```

---

## Core Implementation

### Main Radar Component

```jsx
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function Radar3D({
  contacts = [],
  maxRange = 5000,
  radarRadius = 1,
  playerPosition = [0, 0, 0],
  playerQuaternion = [0, 0, 0, 1],
  shipRelative = true,
  theme = 'elite',
  ...props
}) {
  const groupRef = useRef();
  
  // Transform contacts to radar space
  const radarContacts = useMemo(() => {
    return contacts.map(contact => 
      transformToRadarSpace(contact, {
        playerPosition,
        playerQuaternion,
        maxRange,
        radarRadius,
        shipRelative
      })
    );
  }, [contacts, playerPosition, playerQuaternion, maxRange, radarRadius, shipRelative]);

  return (
    <group ref={groupRef} {...props}>
      {/* Radar Dish */}
      <RadarDish radius={radarRadius} />
      
      {/* Equatorial Ring */}
      <RadarRing radius={radarRadius} />
      
      {/* Grid Lines */}
      <RadarGrid radius={radarRadius} />
      
      {/* Center Marker */}
      <RadarCenter />
      
      {/* Contacts */}
      {radarContacts.map((contact, index) => (
        <RadarContact 
          key={contact.id || index}
          position={contact.radarPosition}
          basePosition={contact.basePosition}
          type={contact.type}
          selected={contact.selected}
        />
      ))}
    </group>
  );
}
```

### Radar Dish Component

```jsx
export function RadarDish({ radius = 1, segments = 32, color = '#00ff88' }) {
  return (
    <mesh rotation={[Math.PI, 0, 0]}>
      <sphereGeometry 
        args={[
          radius,           // radius
          segments,         // widthSegments
          segments / 2,     // heightSegments
          0,                // phiStart
          Math.PI * 2,      // phiLength
          0,                // thetaStart
          Math.PI / 2       // thetaLength (hemisphere)
        ]} 
      />
      <meshBasicMaterial 
        color={color}
        wireframe={true}
        transparent={true}
        opacity={0.3}
      />
    </mesh>
  );
}
```

### Equatorial Ring Component

```jsx
export function RadarRing({ radius = 1, color = '#00ff88' }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius * 0.98, radius, 64]} />
      <meshBasicMaterial 
        color={color}
        transparent={true}
        opacity={0.6}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
```

---

## Contact Rendering

### Contact Component with Stalk

```jsx
export function RadarContact({
  position,      // [x, y, z] - actual 3D position on radar
  basePosition,  // [x, 0, z] - projection on horizontal plane
  type = 'neutral',
  selected = false,
  size = 0.03
}) {
  const colors = {
    hostile: '#ff3333',
    friendly: '#33ff33',
    neutral: '#ffff33',
    station: '#ffffff',
    missile: '#ff00ff'
  };
  
  const color = colors[type] || colors.neutral;
  
  return (
    <group>
      {/* Vertical Stalk */}
      <RadarStalk 
        start={basePosition} 
        end={position} 
        color={color} 
      />
      
      {/* Base Point (on horizontal plane) */}
      <mesh position={basePosition}>
        <circleGeometry args={[size * 0.5, 8]} />
        <meshBasicMaterial 
          color={color} 
          transparent 
          opacity={0.4}
          side={THREE.DoubleSide}
        />
      </mesh>
      
      {/* Contact Marker */}
      <ContactMarker 
        position={position}
        type={type}
        size={size}
        selected={selected}
        color={color}
      />
    </group>
  );
}
```

### Stalk Implementation

```jsx
import { Line } from '@react-three/drei';

export function RadarStalk({ start, end, color = '#00ff88' }) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end]);
  
  return (
    <Line
      points={points}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.7}
      dashed={false}
    />
  );
}
```

### Contact Marker Variants

```jsx
export function ContactMarker({ position, type, size, selected, color }) {
  // Different shapes for different contact types
  const geometry = useMemo(() => {
    switch (type) {
      case 'hostile':
        // Solid square for enemies
        return <boxGeometry args={[size, size, size]} />;
      case 'friendly':
        // Hollow square (rendered as wireframe)
        return <boxGeometry args={[size, size, size]} />;
      case 'station':
        // Larger hollow square
        return <boxGeometry args={[size * 1.5, size * 1.5, size * 1.5]} />;
      case 'missile':
        // Triangle/arrow shape
        return <coneGeometry args={[size * 0.5, size, 3]} />;
      default:
        // Default: small sphere
        return <sphereGeometry args={[size * 0.5, 8, 8]} />;
    }
  }, [type, size]);

  const isWireframe = ['friendly', 'station'].includes(type);

  return (
    <mesh position={position}>
      {geometry}
      <meshBasicMaterial
        color={color}
        wireframe={isWireframe}
        transparent={!selected}
        opacity={selected ? 1 : 0.8}
      />
      
      {/* Selection indicator */}
      {selected && (
        <mesh>
          <ringGeometry args={[size * 1.2, size * 1.5, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.5} />
        </mesh>
      )}
    </mesh>
  );
}
```

---

## Props Interface

### TypeScript Interface

```typescript
interface Contact {
  id: string;
  position: [number, number, number];  // World position
  type: 'hostile' | 'friendly' | 'neutral' | 'station' | 'missile';
  selected?: boolean;
  velocity?: [number, number, number]; // For motion prediction
}

interface Radar3DProps {
  // Data
  contacts: Contact[];
  playerPosition: [number, number, number];
  playerQuaternion: [number, number, number, number];
  
  // Configuration
  maxRange: number;           // Maximum detection range (world units)
  radarRadius: number;        // Visual size of radar component
  shipRelative: boolean;      // Rotate with ship orientation?
  
  // Visual Options
  theme: 'elite' | 'modern' | 'custom';
  showGrid: boolean;
  gridDivisions: number;
  dishOpacity: number;
  
  // Callbacks
  onContactSelect?: (contact: Contact) => void;
  onContactHover?: (contact: Contact | null) => void;
}
```

---

## Styling & Theming

### Elite Classic Theme

```javascript
export const eliteClassicTheme = {
  dish: {
    color: '#00ff00',
    wireframe: true,
    opacity: 0.2
  },
  ring: {
    color: '#00ff00',
    opacity: 0.6
  },
  grid: {
    color: '#004400',
    opacity: 0.3
  },
  contacts: {
    hostile: '#ff0000',
    friendly: '#00ff00',
    neutral: '#ffff00',
    station: '#00ffff',
    default: '#ffffff'
  },
  stalk: {
    opacity: 0.6,
    lineWidth: 1
  }
};
```

### Elite Dangerous Theme

```javascript
export const eliteDangerousTheme = {
  dish: {
    color: '#ff6600',
    wireframe: true,
    opacity: 0.15
  },
  ring: {
    color: '#ff8800',
    opacity: 0.5
  },
  grid: {
    color: '#331100',
    opacity: 0.2
  },
  contacts: {
    hostile: '#ff3333',
    friendly: '#33ff66',
    neutral: '#ff9900',
    station: '#3399ff',
    default: '#ffffff'
  },
  stalk: {
    opacity: 0.5,
    lineWidth: 1.5
  }
};
```

---

## Performance Considerations

### Optimization Techniques

1. **Instanced Rendering** for contacts when count > 50:

```jsx
import { Instances, Instance } from '@react-three/drei';

function RadarContactsInstanced({ contacts }) {
  return (
    <Instances limit={1000}>
      <sphereGeometry args={[0.02, 8, 8]} />
      <meshBasicMaterial />
      
      {contacts.map((contact, i) => (
        <Instance 
          key={i}
          position={contact.radarPosition}
          color={contact.color}
        />
      ))}
    </Instances>
  );
}
```

2. **Throttled Updates** for position calculations:

```jsx
import { useThrottledCallback } from 'use-debounce';

const updateContacts = useThrottledCallback((contacts) => {
  setRadarContacts(transformContacts(contacts));
}, 50); // Update at most every 50ms
```

3. **Level of Detail** based on contact importance:

```jsx
const contactLOD = (contact, distance) => {
  if (contact.selected) return 'high';
  if (distance < 0.3) return 'high';
  if (distance < 0.7) return 'medium';
  return 'low';
};
```

4. **Shader-based Rendering** for advanced effects:

```glsl
// Fragment shader for holographic effect
varying vec2 vUv;
uniform float time;

void main() {
  float scanline = sin(vUv.y * 100.0 + time * 2.0) * 0.1 + 0.9;
  float alpha = 0.3 * scanline;
  gl_FragColor = vec4(0.0, 1.0, 0.5, alpha);
}
```

---

## Usage Example

### Complete Integration

```jsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Radar3D } from './components/Radar3D';

function CockpitHUD() {
  const [contacts, setContacts] = useState([
    { id: '1', position: [1000, 200, 500], type: 'hostile' },
    { id: '2', position: [-500, -100, 800], type: 'friendly' },
    { id: '3', position: [200, 0, -1200], type: 'station' },
  ]);
  
  const [playerState, setPlayerState] = useState({
    position: [0, 0, 0],
    quaternion: [0, 0, 0, 1]
  });

  return (
    <div className="radar-container" style={{ width: 300, height: 200 }}>
      <Canvas camera={{ position: [0, 2, 2], fov: 50 }}>
        <ambientLight intensity={0.1} />
        
        <Radar3D
          contacts={contacts}
          playerPosition={playerState.position}
          playerQuaternion={playerState.quaternion}
          maxRange={5000}
          radarRadius={1}
          shipRelative={true}
          theme="eliteDangerous"
          showGrid={true}
        />
        
        <OrbitControls 
          enableZoom={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2}
        />
      </Canvas>
    </div>
  );
}
```

---

## Additional Features to Consider

### 1. Range Rings
Concentric circles showing distance intervals (1km, 2km, etc.)

### 2. Heading Indicator
A marker showing the ship's forward direction on the radar

### 3. Velocity Vectors
Short lines extending from contacts showing their movement direction

### 4. Contact Trails
Fading trail showing recent movement path of tracked contacts

### 5. Zoom Levels
Multiple range scales (close/medium/far) switchable by the player

### 6. Target Lock Indicator
Special highlighting for the currently targeted contact

### 7. Scan Sweep Animation
Rotating line showing active scanner sweep (aesthetic effect)

---

## References

- Elite (1984) - Original radar implementation
- Elite Dangerous (2014) - Modern interpretation with enhanced visuals
- Three.js Documentation: https://threejs.org/docs/
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber
- Drei Helpers: https://github.com/pmndrs/drei

---

*This specification provides a foundation for implementing an Elite-style radar. Adjust values, colors, and behaviors to match your specific game's aesthetic and requirements.*
