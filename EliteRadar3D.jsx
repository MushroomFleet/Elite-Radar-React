import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line, Ring } from '@react-three/drei';
import * as THREE from 'three';

// ============================================================================
// THEME CONFIGURATIONS
// ============================================================================

const themes = {
  eliteClassic: {
    dish: { color: '#00ff00', opacity: 0.15 },
    ring: { color: '#00ff44', opacity: 0.6 },
    grid: { color: '#00aa00', opacity: 0.25 },
    center: { color: '#00ff00' },
    stalk: { opacity: 0.6 },
    contacts: {
      hostile: '#ff3333',
      friendly: '#33ff88',
      neutral: '#ffff33',
      station: '#00ffff',
      missile: '#ff00ff',
      default: '#ffffff'
    },
    scanline: '#00ff00',
    glow: '#00ff44'
  },
  eliteDangerous: {
    dish: { color: '#ff6600', opacity: 0.12 },
    ring: { color: '#ff8800', opacity: 0.5 },
    grid: { color: '#663300', opacity: 0.2 },
    center: { color: '#ff8800' },
    stalk: { opacity: 0.5 },
    contacts: {
      hostile: '#ff4444',
      friendly: '#44ff66',
      neutral: '#ff9900',
      station: '#4499ff',
      missile: '#ff44ff',
      default: '#ffffff'
    },
    scanline: '#ff6600',
    glow: '#ff8800'
  }
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function transformToRadarSpace(contact, options) {
  const {
    playerPosition = [0, 0, 0],
    playerQuaternion = [0, 0, 0, 1],
    maxRange = 5000,
    radarRadius = 1,
    shipRelative = true
  } = options;

  // Calculate relative position
  let relX = contact.position[0] - playerPosition[0];
  let relY = contact.position[1] - playerPosition[1];
  let relZ = contact.position[2] - playerPosition[2];

  // Apply player rotation if ship-relative
  if (shipRelative) {
    const quat = new THREE.Quaternion(...playerQuaternion).invert();
    const vec = new THREE.Vector3(relX, relY, relZ).applyQuaternion(quat);
    relX = vec.x;
    relY = vec.y;
    relZ = vec.z;
  }

  // Calculate distance and normalize
  const distance = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
  const normalizedDist = Math.min(distance / maxRange, 1);

  // Calculate angles
  const horizontalDist = Math.sqrt(relX * relX + relZ * relZ);
  const theta = Math.atan2(relX, relZ); // Azimuth
  const phi = Math.atan2(relY, horizontalDist); // Elevation

  // Map to radar coordinates
  const radarHorizontalDist = normalizedDist * radarRadius;
  const radarX = radarHorizontalDist * Math.sin(theta);
  const radarZ = radarHorizontalDist * Math.cos(theta);
  const radarY = normalizedDist * Math.sin(phi) * radarRadius * 0.5;

  return {
    ...contact,
    radarPosition: [radarX, radarY, radarZ],
    basePosition: [radarX, 0, radarZ],
    normalizedDistance: normalizedDist,
    isAbove: relY > 0
  };
}

// ============================================================================
// RADAR DISH COMPONENT
// ============================================================================

function RadarDish({ radius = 1, theme }) {
  const meshRef = useRef();
  
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(
      radius,
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
  }, [radius]);

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[Math.PI, 0, 0]}>
      <meshBasicMaterial
        color={theme.dish.color}
        wireframe={true}
        transparent={true}
        opacity={theme.dish.opacity}
        depthWrite={false}
      />
    </mesh>
  );
}

// ============================================================================
// EQUATORIAL RING COMPONENT
// ============================================================================

function EquatorialRing({ radius = 1, theme }) {
  const points = useMemo(() => {
    const pts = [];
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      ));
    }
    return pts;
  }, [radius]);

  return (
    <Line
      points={points}
      color={theme.ring.color}
      lineWidth={2}
      transparent
      opacity={theme.ring.opacity}
    />
  );
}

// ============================================================================
// RADAR GRID COMPONENT
// ============================================================================

function RadarGrid({ radius = 1, divisions = 4, theme }) {
  const lines = useMemo(() => {
    const result = [];
    
    // Radial lines (spokes)
    const spokeCount = 8;
    for (let i = 0; i < spokeCount; i++) {
      const angle = (i / spokeCount) * Math.PI * 2;
      result.push({
        points: [
          new THREE.Vector3(0, 0, 0),
          new THREE.Vector3(
            Math.cos(angle) * radius,
            0,
            Math.sin(angle) * radius
          )
        ],
        key: `spoke-${i}`
      });
    }
    
    // Concentric range rings
    for (let i = 1; i < divisions; i++) {
      const ringRadius = (i / divisions) * radius;
      const pts = [];
      const segments = 32;
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        pts.push(new THREE.Vector3(
          Math.cos(angle) * ringRadius,
          0,
          Math.sin(angle) * ringRadius
        ));
      }
      result.push({ points: pts, key: `ring-${i}` });
    }
    
    return result;
  }, [radius, divisions]);

  return (
    <group>
      {lines.map(line => (
        <Line
          key={line.key}
          points={line.points}
          color={theme.grid.color}
          lineWidth={1}
          transparent
          opacity={theme.grid.opacity}
        />
      ))}
    </group>
  );
}

// ============================================================================
// CENTER MARKER COMPONENT
// ============================================================================

function CenterMarker({ theme }) {
  const groupRef = useRef();
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Center cross */}
      <Line
        points={[[-0.03, 0, 0], [0.03, 0, 0]]}
        color={theme.center.color}
        lineWidth={2}
      />
      <Line
        points={[[0, 0, -0.03], [0, 0, 0.03]]}
        color={theme.center.color}
        lineWidth={2}
      />
      {/* Small center dot */}
      <mesh>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={theme.center.color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// SCAN SWEEP COMPONENT
// ============================================================================

function ScanSweep({ radius = 1, theme }) {
  const lineRef = useRef();
  const [angle, setAngle] = useState(0);
  
  useFrame((state, delta) => {
    setAngle(prev => (prev + delta * 1.5) % (Math.PI * 2));
  });

  const points = useMemo(() => [
    new THREE.Vector3(0, 0.001, 0),
    new THREE.Vector3(
      Math.cos(angle) * radius,
      0.001,
      Math.sin(angle) * radius
    )
  ], [angle, radius]);

  return (
    <Line
      ref={lineRef}
      points={points}
      color={theme.scanline}
      lineWidth={1.5}
      transparent
      opacity={0.4}
    />
  );
}

// ============================================================================
// RADAR STALK COMPONENT
// ============================================================================

function RadarStalk({ start, end, color, opacity = 0.6 }) {
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
      opacity={opacity}
      dashed={false}
    />
  );
}

// ============================================================================
// CONTACT MARKER COMPONENT
// ============================================================================

function ContactMarker({ position, type, size = 0.025, selected, color }) {
  const meshRef = useRef();
  const [hovered, setHovered] = useState(false);
  
  useFrame((state) => {
    if (meshRef.current && selected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
    }
  });

  const geometry = useMemo(() => {
    switch (type) {
      case 'hostile':
        // Filled square for enemies
        return <boxGeometry args={[size, size, size]} />;
      case 'friendly':
        // Hollow appearance (wireframe)
        return <boxGeometry args={[size, size, size]} />;
      case 'station':
        // Larger marker
        return <boxGeometry args={[size * 1.8, size * 1.8, size * 1.8]} />;
      case 'missile':
        // Triangle/cone shape
        return <coneGeometry args={[size * 0.6, size * 1.2, 3]} />;
      default:
        // Sphere for neutral/unknown
        return <sphereGeometry args={[size * 0.6, 8, 8]} />;
    }
  }, [type, size]);

  const isWireframe = ['friendly', 'station'].includes(type);
  const actualSize = hovered ? size * 1.3 : size;

  return (
    <mesh
      ref={meshRef}
      position={position}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      {geometry}
      <meshBasicMaterial
        color={color}
        wireframe={isWireframe}
        transparent={!selected}
        opacity={selected ? 1 : 0.85}
      />
    </mesh>
  );
}

// ============================================================================
// BASE POINT COMPONENT
// ============================================================================

function BasePoint({ position, color, size = 0.015 }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[size, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={0.4}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// ============================================================================
// RADAR CONTACT COMPONENT
// ============================================================================

function RadarContact({ contact, theme }) {
  const { radarPosition, basePosition, type, selected } = contact;
  const color = theme.contacts[type] || theme.contacts.default;

  return (
    <group>
      {/* Vertical Stalk */}
      <RadarStalk
        start={basePosition}
        end={radarPosition}
        color={color}
        opacity={theme.stalk.opacity}
      />
      
      {/* Base Point on horizontal plane */}
      <BasePoint position={basePosition} color={color} />
      
      {/* Contact Marker */}
      <ContactMarker
        position={radarPosition}
        type={type}
        selected={selected}
        color={color}
      />
    </group>
  );
}

// ============================================================================
// HEADING INDICATOR COMPONENT
// ============================================================================

function HeadingIndicator({ radius = 1, theme }) {
  const points = useMemo(() => [
    new THREE.Vector3(0, 0.002, 0),
    new THREE.Vector3(0, 0.002, -radius * 0.15)
  ], [radius]);

  return (
    <group>
      <Line
        points={points}
        color={theme.center.color}
        lineWidth={2}
      />
      {/* Small arrow head */}
      <mesh position={[0, 0.002, -radius * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.02, 0.04, 3]} />
        <meshBasicMaterial color={theme.center.color} />
      </mesh>
    </group>
  );
}

// ============================================================================
// MAIN RADAR SCENE COMPONENT
// ============================================================================

function RadarScene({
  contacts = [],
  maxRange = 5000,
  radarRadius = 1,
  playerPosition = [0, 0, 0],
  playerQuaternion = [0, 0, 0, 1],
  shipRelative = true,
  themeName = 'eliteClassic',
  showGrid = true,
  showScanSweep = true,
  gridDivisions = 4
}) {
  const groupRef = useRef();
  const theme = themes[themeName] || themes.eliteClassic;

  // Transform all contacts to radar space
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

  // Gentle auto-rotation for display purposes
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Radar Dish (Hemisphere) */}
      <RadarDish radius={radarRadius} theme={theme} />
      
      {/* Equatorial Ring */}
      <EquatorialRing radius={radarRadius} theme={theme} />
      
      {/* Grid Lines */}
      {showGrid && (
        <RadarGrid
          radius={radarRadius}
          divisions={gridDivisions}
          theme={theme}
        />
      )}
      
      {/* Scan Sweep Line */}
      {showScanSweep && (
        <ScanSweep radius={radarRadius} theme={theme} />
      )}
      
      {/* Center Marker (Player Position) */}
      <CenterMarker theme={theme} />
      
      {/* Heading Indicator */}
      <HeadingIndicator radius={radarRadius} theme={theme} />
      
      {/* All Contacts */}
      {radarContacts.map((contact, index) => (
        <RadarContact
          key={contact.id || index}
          contact={contact}
          theme={theme}
        />
      ))}
    </group>
  );
}

// ============================================================================
// DEMO CONTACTS DATA
// ============================================================================

const demoContacts = [
  { id: 'hostile-1', position: [2000, 800, 1500], type: 'hostile' },
  { id: 'hostile-2', position: [-1500, 400, 2000], type: 'hostile' },
  { id: 'friendly-1', position: [1000, -300, -800], type: 'friendly' },
  { id: 'friendly-2', position: [-500, 200, -1200], type: 'friendly' },
  { id: 'neutral-1', position: [3000, 100, 500], type: 'neutral' },
  { id: 'neutral-2', position: [-2500, -600, -500], type: 'neutral' },
  { id: 'station-1', position: [0, 0, -4000], type: 'station', selected: true },
  { id: 'missile-1', position: [800, 1200, 400], type: 'missile' },
  { id: 'missile-2', position: [-600, -400, 800], type: 'missile' },
];

// ============================================================================
// MAIN EXPORTED COMPONENT
// ============================================================================

export default function EliteRadar3D() {
  const [themeName, setThemeName] = useState('eliteClassic');
  const [contacts, setContacts] = useState(demoContacts);
  
  // Animate contacts for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setContacts(prev => prev.map(contact => ({
        ...contact,
        position: [
          contact.position[0] + (Math.random() - 0.5) * 100,
          contact.position[1] + (Math.random() - 0.5) * 50,
          contact.position[2] + (Math.random() - 0.5) * 100
        ]
      })));
    }, 500);
    
    return () => clearInterval(interval);
  }, []);

  const theme = themes[themeName];

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: themeName === 'eliteClassic' 
        ? 'radial-gradient(ellipse at center, #0a1a0a 0%, #000800 50%, #000000 100%)'
        : 'radial-gradient(ellipse at center, #1a0f05 0%, #0a0500 50%, #000000 100%)',
      position: 'relative',
      fontFamily: "'Courier New', monospace"
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: theme.ring.color,
        fontSize: '14px',
        letterSpacing: '4px',
        textTransform: 'uppercase',
        textShadow: `0 0 10px ${theme.glow}`,
        zIndex: 10
      }}>
        ◆ Scanner Display ◆
      </div>
      
      {/* Theme Toggle */}
      <div style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 10
      }}>
        <button
          onClick={() => setThemeName(t => t === 'eliteClassic' ? 'eliteDangerous' : 'eliteClassic')}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.ring.color}`,
            color: theme.ring.color,
            padding: '8px 16px',
            cursor: 'pointer',
            fontFamily: "'Courier New', monospace",
            fontSize: '11px',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            transition: 'all 0.3s ease',
            textShadow: `0 0 5px ${theme.glow}`
          }}
        >
          {themeName === 'eliteClassic' ? 'Classic' : 'Dangerous'}
        </button>
      </div>
      
      {/* Legend */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '10px',
        letterSpacing: '1px'
      }}>
        {[
          { type: 'hostile', label: 'HOSTILE' },
          { type: 'friendly', label: 'FRIENDLY' },
          { type: 'neutral', label: 'NEUTRAL' },
          { type: 'station', label: 'STATION' },
          { type: 'missile', label: 'MISSILE' }
        ].map(({ type, label }) => (
          <div key={type} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme.contacts[type]
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              background: theme.contacts[type],
              boxShadow: `0 0 6px ${theme.contacts[type]}`
            }} />
            {label}
          </div>
        ))}
      </div>
      
      {/* Range Info */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        zIndex: 10,
        color: theme.grid.color,
        fontSize: '10px',
        letterSpacing: '1px',
        textAlign: 'right'
      }}>
        <div>RANGE: 5.0 KM</div>
        <div>CONTACTS: {contacts.length}</div>
      </div>
      
      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [0, 2.5, 2], fov: 45 }}
        style={{ background: 'transparent' }}
      >
        <RadarScene
          contacts={contacts}
          maxRange={5000}
          radarRadius={1}
          playerPosition={[0, 0, 0]}
          playerQuaternion={[0, 0, 0, 1]}
          shipRelative={true}
          themeName={themeName}
          showGrid={true}
          showScanSweep={true}
          gridDivisions={4}
        />
      </Canvas>
      
      {/* Scanline overlay effect */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: `repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0,0,0,0.1) 2px,
          rgba(0,0,0,0.1) 4px
        )`,
        pointerEvents: 'none',
        zIndex: 5
      }} />
      
      {/* Vignette */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
        zIndex: 6
      }} />
    </div>
  );
}
