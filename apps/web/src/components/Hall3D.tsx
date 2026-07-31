import { OrbitControls } from '@react-three/drei';
import { Canvas, useFrame, useThree, type ThreeEvent } from '@react-three/fiber';
import { allSeats, LIMITS, type HallGeometry, type Movie, type Seat, type SeatLayout, type SeatScore } from '@seated/core';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { drawArt } from '../poster';

export type HallMode = 'seat' | 'hall';

interface Props {
  layout: SeatLayout;
  hall: HallGeometry;
  scores: Record<string, SeatScore>;
  selected: string[];
  /** The seat the first-person camera sits in. */
  viewSeat: string | null;
  mode: HallMode;
  movie: Movie;
  /** Changes whenever "Face the screen" is pressed. */
  faceKey: number;
  onSeat: (id: string) => void;
}

const COLORS = {
  free: new THREE.Color('#9c2530'),
  best: new THREE.Color('#c8402f'),
  sold: new THREE.Color('#26262c'),
  selected: new THREE.Color('#8f73ff'),
};
const AISLE_MARGIN = 1.3;

/**
 * The hall in 3D, rebuilt in code from the same geometry the scores use:
 * screen at z = 0 facing +z, seats stepping up and back from it. Units are metres.
 */
export function Hall3D(props: Props) {
  return (
    <Canvas dpr={[1, 2]} camera={{ fov: 58, near: 0.1, far: 300 }}>
      <color attach="background" args={['#050507']} />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={['#8fa3ff', '#1a0c0c', 0.5]} />
      {/* Light thrown back off the screen onto the audience (it shines toward the origin, i.e. down and back). */}
      <directionalLight position={[0, props.hall.screenCentreY + 3, -12]} intensity={1.3} color="#cfd8ff" />
      {/* Dim house lights from above and behind, so seat tops and backs read from the audience side. */}
      <directionalLight position={[0, 30, props.hall.depth + 14]} intensity={1.1} color="#ffd9b8" />
      <Shell {...props} />
      <Screen hall={props.hall} movie={props.movie} />
      <Seats {...props} />
      <CameraRig {...props} />
    </Canvas>
  );
}

/** Floor steps, walls and ceiling. Walls face inward only, so the hall can be viewed from outside. */
function Shell({ layout, hall }: Props) {
  const { spec } = hall;
  const halfW = hall.seatingWidth / 2 + AISLE_MARGIN;
  const depth = hall.depth + 0.8;
  const topFloor = (layout.rows.length - 1) * spec.rake;
  const height = Math.max(spec.screenBottom + hall.screenHeight + 1.4, topFloor + 3.4);
  const frontEdge = hall.frontRowDistance - spec.rowDepth / 2;

  const sconces = useMemo(() => {
    const out: [number, number, number][] = [];
    for (let z = 3; z < depth - 1; z += 3.2) {
      const y = Math.max(0, ((z - hall.frontRowDistance) / spec.rowDepth) * spec.rake) + 2.3;
      out.push([-halfW + 0.06, y, z], [halfW - 0.06, y, z]);
    }
    return out;
  }, [depth, halfW, hall.frontRowDistance, spec.rake, spec.rowDepth]);

  return (
    <group>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, frontEdge / 2 - 0.5]}>
        <planeGeometry args={[halfW * 2, frontEdge + 1]} />
        <meshStandardMaterial color="#141218" roughness={1} />
      </mesh>
      {layout.rows.map((row, r) => {
        const top = r * spec.rake;
        const h = top + 1;
        const last = r === layout.rows.length - 1;
        const d = spec.rowDepth + (last ? 0.8 : 0);
        return (
          <mesh key={row.label} position={[0, top - h / 2, frontEdge + r * spec.rowDepth + d / 2]}>
            <boxGeometry args={[halfW * 2, h, d]} />
            <meshStandardMaterial color={r % 2 ? '#17141b' : '#1b171f'} roughness={1} />
          </mesh>
        );
      })}

      <mesh position={[-halfW, height / 2 - 0.5, depth / 2 - 0.5]} rotation-y={Math.PI / 2}>
        <planeGeometry args={[depth + 1, height + 1]} />
        <meshStandardMaterial color="#231418" roughness={0.95} />
      </mesh>
      <mesh position={[halfW, height / 2 - 0.5, depth / 2 - 0.5]} rotation-y={-Math.PI / 2}>
        <planeGeometry args={[depth + 1, height + 1]} />
        <meshStandardMaterial color="#231418" roughness={0.95} />
      </mesh>
      <mesh position={[0, height / 2 - 0.5, depth]} rotation-y={Math.PI}>
        <planeGeometry args={[halfW * 2, height + 1]} />
        <meshStandardMaterial color="#1a1014" roughness={0.95} />
      </mesh>
      <mesh position={[0, height / 2 - 0.5, -1]}>
        <planeGeometry args={[halfW * 2, height + 1]} />
        <meshStandardMaterial color="#08080a" roughness={1} />
      </mesh>
      <mesh position={[0, height, depth / 2 - 0.5]} rotation-x={Math.PI / 2}>
        <planeGeometry args={[halfW * 2, depth + 1]} />
        <meshStandardMaterial color="#0c0c10" roughness={1} />
      </mesh>

      {sconces.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.08, 0.5, 0.18]} />
          <meshBasicMaterial color="#ffb469" toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

function Screen({ hall, movie }: { hall: HallGeometry; movie: Movie }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1434;
    canvas.height = 600;
    drawArt(canvas, movie, true);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }, [movie]);
  useEffect(() => () => texture.dispose(), [texture]);

  const y = hall.spec.screenBottom + hall.screenHeight / 2;
  return (
    <group position={[0, y, 0]}>
      <mesh position={[0, 0, -0.05]}>
        <planeGeometry args={[hall.screenWidth + 0.5, hall.screenHeight + 0.5]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      <mesh>
        <planeGeometry args={[hall.screenWidth, hall.screenHeight]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Every seat as two instanced boxes (cushion and backrest), coloured by state. */
function Seats({ layout, hall, scores, selected, onSeat }: Props) {
  const seats = useMemo(() => allSeats(layout), [layout]);
  const cushions = useRef<THREE.InstancedMesh>(null);
  const backs = useRef<THREE.InstancedMesh>(null);
  const { gl } = useThree();
  const width = hall.spec.seatPitch * 0.88;

  useLayoutEffect(() => {
    const m = new THREE.Matrix4();
    seats.forEach((seat, i) => {
      const p = hall.positions[seat.id];
      cushions.current!.setMatrixAt(i, m.makeTranslation(p.x, p.floorY + 0.4, p.z + 0.05));
      backs.current!.setMatrixAt(i, m.makeTranslation(p.x, p.floorY + 0.72, p.z + 0.36));
    });
    for (const mesh of [cushions.current!, backs.current!]) {
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    }
  }, [seats, hall]);

  useLayoutEffect(() => {
    const chosen = new Set(selected);
    seats.forEach((seat, i) => {
      const color =
        chosen.has(seat.id) ? COLORS.selected
        : seat.status !== 'available' ? COLORS.sold
        : scores[seat.id].score >= LIMITS.bestZoneScore ? COLORS.best
        : COLORS.free;
      cushions.current!.setColorAt(i, color);
      backs.current!.setColorAt(i, color);
    });
    for (const mesh of [cushions.current!, backs.current!]) mesh.instanceColor!.needsUpdate = true;
  }, [seats, scores, selected]);

  const seatAt = (e: ThreeEvent<MouseEvent | PointerEvent>): Seat | undefined =>
    e.instanceId != null ? seats[e.instanceId] : undefined;

  const handlers = {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      // A drag to look around ends in a click event too; only a still tap picks a seat.
      if (e.delta > 5) return;
      const seat = seatAt(e);
      if (seat?.status === 'available') onSeat(seat.id);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      gl.domElement.style.cursor = seatAt(e)?.status === 'available' ? 'pointer' : 'grab';
    },
    onPointerOut: () => {
      gl.domElement.style.cursor = 'grab';
    },
  };

  return (
    <>
      <instancedMesh key={`c${seats.length}`} ref={cushions} args={[undefined, undefined, seats.length]} {...handlers}>
        <boxGeometry args={[width, 0.16, 0.5]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
      <instancedMesh key={`b${seats.length}`} ref={backs} args={[undefined, undefined, seats.length]} {...handlers}>
        <boxGeometry args={[width, 0.66, 0.14]} />
        <meshStandardMaterial roughness={0.85} />
      </instancedMesh>
    </>
  );
}

/**
 * Seat mode: the camera sits at the chosen seat's eye point facing the screen,
 * and dragging turns your head. Hall mode: a free orbit around the whole room.
 */
function CameraRig({ hall, layout, viewSeat, mode, faceKey }: Props) {
  const { camera, gl } = useThree();
  const look = useRef({ yaw: 0, pitch: 0, curYaw: 0, curPitch: 0 });
  const eye = useRef(new THREE.Vector3());
  const settled = useRef(false);

  const pos = viewSeat ? hall.positions[viewSeat] : undefined;
  const centre = useMemo(
    () => new THREE.Vector3(0, ((layout.rows.length - 1) * hall.spec.rake) / 2 + 1, hall.depth * 0.5),
    [hall, layout.rows.length],
  );

  // Facing the screen again: on request, and whenever the seat changes.
  useEffect(() => {
    look.current.yaw = 0;
    look.current.pitch = 0;
  }, [faceKey, viewSeat]);

  useEffect(() => {
    if (mode !== 'hall') return;
    camera.position.set(hall.seatingWidth * 0.45, centre.y + hall.depth * 0.42, hall.depth * 1.15);
    camera.lookAt(centre);
  }, [mode, camera, hall, centre]);

  // Drag to look around in seat mode.
  useEffect(() => {
    if (mode !== 'seat') return;
    const el = gl.domElement;
    let dragging = false;
    const down = (e: PointerEvent) => {
      dragging = true;
      el.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      // Grab-style: the view follows the drag, like pulling the scene around you.
      look.current.yaw = THREE.MathUtils.clamp(look.current.yaw + e.movementX * 0.004, -2.6, 2.6);
      look.current.pitch = THREE.MathUtils.clamp(look.current.pitch - e.movementY * 0.004, -0.7, 0.9);
    };
    const up = () => {
      dragging = false;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, [mode, gl]);

  useEffect(() => {
    settled.current = false;
  }, [mode]);

  useFrame((_, dt) => {
    if (mode !== 'seat' || !pos) return;
    const ease = settled.current ? 1 - Math.exp(-dt * 5) : 1;
    settled.current = true;

    eye.current.set(pos.x, pos.eyeY, pos.z);
    camera.position.lerp(eye.current, ease);

    const l = look.current;
    l.curYaw += (l.yaw - l.curYaw) * (1 - Math.exp(-dt * 12));
    l.curPitch += (l.pitch - l.curPitch) * (1 - Math.exp(-dt * 12));

    // Direction from the seat to the screen centre, plus however far the head is turned.
    const yaw = Math.atan2(-pos.x, pos.z) - l.curYaw;
    const pitch = Math.atan2(hall.screenCentreY - pos.eyeY, Math.hypot(pos.x, pos.z)) - l.curPitch;
    camera.lookAt(
      camera.position.x + Math.sin(yaw) * Math.cos(pitch),
      camera.position.y + Math.sin(pitch),
      camera.position.z - Math.cos(yaw) * Math.cos(pitch),
    );
  });

  return mode === 'hall' ? (
    <OrbitControls makeDefault target={centre} maxPolarAngle={Math.PI / 2.05} minDistance={4} maxDistance={hall.depth * 3} enablePan={false} />
  ) : null;
}
