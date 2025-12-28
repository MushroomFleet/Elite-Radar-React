import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Line } from '@react-three/drei';
import * as THREE from 'three';

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

function transformToRadarSpace(contact, options) {
  const { maxRange = 5000, radarRadius = 1 } = options;
  let [relX, relY, relZ] = contact.position;

  const distance = Math.sqrt(relX * relX + relY * relY + relZ * relZ);
  const normalizedDist = Math.min(distance / maxRange, 1);
  const horizontalDist = Math.sqrt(relX * relX + relZ * relZ);
  const theta = Math.atan2(relX, relZ);
  const phi = Math.atan2(relY, horizontalDist);

  const radarHorizontalDist = normalizedDist * radarRadius;
  const radarX = radarHorizontalDist * Math.sin(theta);
  const radarZ = radarHorizontalDist * Math.cos(theta);
  const radarY = normalizedDist * Math.sin(phi) * radarRadius * 0.5;

  return {
    ...contact,
    radarPosition: [radarX, radarY, radarZ],
    basePosition: [radarX, 0, radarZ],
    normalizedDistance: normalizedDist
  };
}

function RadarDish({ radius = 1, theme }) {
  const geometry = useMemo(() => {
    return new THREE.SphereGeometry(radius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
  }, [radius]);

  return (
    <mesh geometry={geometry} rotation={[Math.PI, 0, 0]}>
      <meshBasicMaterial color={theme.dish.color} wireframe transparent opacity={theme.dish.opacity} depthWrite={false} />
    </mesh>
  );
}

function EquatorialRing({ radius = 1, theme }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 64; i++) {
      const angle = (i / 64) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);

  return <Line points={points} color={theme.ring.color} lineWidth={2} transparent opacity={theme.ring.opacity} />;
}

function RadarGrid({ radius = 1, divisions = 4, theme }) {
  const lines = useMemo(() => {
    const result = [];
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      result.push({
        points: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius)],
        key: `spoke-${i}`
      });
    }
    for (let i = 1; i < divisions; i++) {
      const ringRadius = (i / divisions) * radius;
      const pts = [];
      for (let j = 0; j <= 32; j++) {
        const angle = (j / 32) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(angle) * ringRadius, 0, Math.sin(angle) * ringRadius));
      }
      result.push({ points: pts, key: `ring-${i}` });
    }
    return result;
  }, [radius, divisions]);

  return (
    <group>
      {lines.map(line => (
        <Line key={line.key} points={line.points} color={theme.grid.color} lineWidth={1} transparent opacity={theme.grid.opacity} />
      ))}
    </group>
  );
}

function CenterMarker({ theme }) {
  const groupRef = useRef();
  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = state.clock.elapsedTime * 0.5;
  });

  return (
    <group ref={groupRef}>
      <Line points={[[-0.03, 0, 0], [0.03, 0, 0]]} color={theme.center.color} lineWidth={2} />
      <Line points={[[0, 0, -0.03], [0, 0, 0.03]]} color={theme.center.color} lineWidth={2} />
      <mesh>
        <sphereGeometry args={[0.015, 8, 8]} />
        <meshBasicMaterial color={theme.center.color} />
      </mesh>
    </group>
  );
}

function ScanSweep({ radius = 1, theme }) {
  const [angle, setAngle] = useState(0);
  useFrame((state, delta) => setAngle(prev => (prev + delta * 1.5) % (Math.PI * 2)));

  const points = useMemo(() => [
    new THREE.Vector3(0, 0.001, 0),
    new THREE.Vector3(Math.cos(angle) * radius, 0.001, Math.sin(angle) * radius)
  ], [angle, radius]);

  return <Line points={points} color={theme.scanline} lineWidth={1.5} transparent opacity={0.4} />;
}

function RadarStalk({ start, end, color, opacity = 0.6 }) {
  const points = useMemo(() => [new THREE.Vector3(...start), new THREE.Vector3(...end)], [start, end]);
  return <Line points={points} color={color} lineWidth={1} transparent opacity={opacity} />;
}

function ContactMarker({ position, type, size = 0.025, selected, color }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current && selected) {
      meshRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5) * 0.2);
    }
  });

  const isWireframe = ['friendly', 'station'].includes(type);

  return (
    <mesh ref={meshRef} position={position}>
      {type === 'hostile' && <boxGeometry args={[size, size, size]} />}
      {type === 'friendly' && <boxGeometry args={[size, size, size]} />}
      {type === 'station' && <boxGeometry args={[size * 1.8, size * 1.8, size * 1.8]} />}
      {type === 'missile' && <coneGeometry args={[size * 0.6, size * 1.2, 3]} />}
      {type === 'neutral' && <sphereGeometry args={[size * 0.6, 8, 8]} />}
      <meshBasicMaterial color={color} wireframe={isWireframe} transparent={!selected} opacity={selected ? 1 : 0.85} />
    </mesh>
  );
}

function BasePoint({ position, color, size = 0.015 }) {
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[size, 6]} />
      <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RadarContact({ contact, theme }) {
  const { radarPosition, basePosition, type, selected } = contact;
  const color = theme.contacts[type] || theme.contacts.default;

  return (
    <group>
      <RadarStalk start={basePosition} end={radarPosition} color={color} opacity={theme.stalk.opacity} />
      <BasePoint position={basePosition} color={color} />
      <ContactMarker position={radarPosition} type={type} selected={selected} color={color} />
    </group>
  );
}

function HeadingIndicator({ radius = 1, theme }) {
  return (
    <group>
      <Line points={[[0, 0.002, 0], [0, 0.002, -radius * 0.15]]} color={theme.center.color} lineWidth={2} />
      <mesh position={[0, 0.002, -radius * 0.15]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.02, 0.04, 3]} />
        <meshBasicMaterial color={theme.center.color} />
      </mesh>
    </group>
  );
}

function RadarScene({ contacts = [], maxRange = 5000, radarRadius = 1, themeName = 'eliteClassic' }) {
  const groupRef = useRef();
  const theme = themes[themeName];

  const radarContacts = useMemo(() => {
    return contacts.map(contact => transformToRadarSpace(contact, { maxRange, radarRadius }));
  }, [contacts, maxRange, radarRadius]);

  useFrame((state) => {
    if (groupRef.current) groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.1;
  });

  return (
    <group ref={groupRef}>
      <RadarDish radius={radarRadius} theme={theme} />
      <EquatorialRing radius={radarRadius} theme={theme} />
      <RadarGrid radius={radarRadius} divisions={4} theme={theme} />
      <ScanSweep radius={radarRadius} theme={theme} />
      <CenterMarker theme={theme} />
      <HeadingIndicator radius={radarRadius} theme={theme} />
      {radarContacts.map((contact, index) => (
        <RadarContact key={contact.id || index} contact={contact} theme={theme} />
      ))}
    </group>
  );
}

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

export default function EliteRadar3D() {
  const [themeName, setThemeName] = useState('eliteClassic');
  const [contacts, setContacts] = useState(demoContacts);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setContacts(prev => prev.map(contact => ({
        ...contact,
        position: [
          contact.position[0] + (Math.random() - 0.5) * 80,
          contact.position[1] + (Math.random() - 0.5) * 40,
          contact.position[2] + (Math.random() - 0.5) * 80
        ]
      })));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const theme = themes[themeName];
  const isClassic = themeName === 'eliteClassic';

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: isClassic 
        ? 'radial-gradient(ellipse at center, #0a1a0a 0%, #000800 50%, #000000 100%)'
        : 'radial-gradient(ellipse at center, #1a0f05 0%, #0a0500 50%, #000000 100%)',
      position: 'relative',
      fontFamily: "'Courier New', monospace",
      overflow: 'hidden'
    }}>
      <div style={{
        position: 'absolute',
        top: 16,
        left: 0,
        right: 0,
        textAlign: 'center',
        color: theme.ring.color,
        fontSize: 12,
        letterSpacing: 4,
        textTransform: 'uppercase',
        textShadow: `0 0 10px ${theme.glow}`,
        zIndex: 10
      }}>
        ◆ Scanner Display ◆
      </div>
      
      <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
        <button
          onClick={() => setThemeName(t => t === 'eliteClassic' ? 'eliteDangerous' : 'eliteClassic')}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.ring.color}`,
            color: theme.ring.color,
            padding: '6px 14px',
            cursor: 'pointer',
            fontFamily: "'Courier New', monospace",
            fontSize: 10,
            letterSpacing: 2,
            textTransform: 'uppercase',
            textShadow: `0 0 5px ${theme.glow}`,
            transition: 'all 0.3s'
          }}
        >
          {isClassic ? '◀ Classic' : 'Dangerous ▶'}
        </button>
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        zIndex: 10,
        display: 'flex',
        flexDirection: 'column',
        gap: 5,
        fontSize: 9,
        letterSpacing: 1
      }}>
        {[
          { type: 'hostile', label: 'HOSTILE' },
          { type: 'friendly', label: 'FRIENDLY' },
          { type: 'neutral', label: 'NEUTRAL' },
          { type: 'station', label: 'STATION' },
          { type: 'missile', label: 'MISSILE' }
        ].map(({ type, label }) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.contacts[type] }}>
            <span style={{
              width: 7,
              height: 7,
              background: theme.contacts[type],
              boxShadow: `0 0 6px ${theme.contacts[type]}`
            }} />
            {label}
          </div>
        ))}
      </div>
      
      <div style={{
        position: 'absolute',
        bottom: 16,
        right: 16,
        zIndex: 10,
        color: theme.grid.color,
        fontSize: 9,
        letterSpacing: 1,
        textAlign: 'right'
      }}>
        <div>RANGE: 5.0 KM</div>
        <div>CONTACTS: {contacts.length}</div>
      </div>
      
      <Canvas camera={{ position: [0, 2.5, 2], fov: 45 }} style={{ background: 'transparent' }}>
        <RadarScene contacts={contacts} maxRange={5000} radarRadius={1} themeName={themeName} />
      </Canvas>
      
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
        pointerEvents: 'none',
        zIndex: 5
      }} />
      
      <div style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.6) 100%)',
        pointerEvents: 'none',
        zIndex: 6
      }} />
    </div>
  );
}
