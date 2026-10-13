import { useEffect, type MutableRefObject } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Body, type BodyProps } from "./Body";

/** returns a front-view snapshot of the body (data URL), whatever the user's orbit is */
export type CaptureFn = () => string;

function Capture({ apiRef }: { apiRef: MutableRefObject<CaptureFn | null> }) {
  const { gl, scene, size } = useThree();
  useEffect(() => {
    apiRef.current = () => {
      const cam = new THREE.PerspectiveCamera(30, size.width / size.height, 0.1, 50);
      cam.position.set(0, 0.92, 3.45);
      cam.lookAt(0, 0.9, 0);
      gl.render(scene, cam);
      return gl.domElement.toDataURL("image/png");
    };
    return () => {
      apiRef.current = null;
    };
  }, [gl, scene, size, apiRef]);
  return null;
}

/** phones: lighter rendering (no shadow maps, lower pixel ratio) to avoid running out of GPU memory */
const SMALL = typeof window !== "undefined" && window.matchMedia("(max-width: 768px)").matches;

export function Viewer({
  captureRef,
  ...props
}: BodyProps & { captureRef?: MutableRefObject<CaptureFn | null> }) {
  return (
    <Canvas
      shadows={!SMALL}
      dpr={[1, SMALL ? 1.5 : 2]}
      camera={{ position: SMALL ? [0, 0.92, 3.7] : [0, 0.82, 4.4], fov: 32 }}
    >
      {captureRef && <Capture apiRef={captureRef} />}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[2, 4, 3]}
        intensity={1.6}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#cfe3ff" />
      {/* rim lights keep the body outline readable on a dark page */}
      <directionalLight position={[-2.5, 2.5, -3]} intensity={2.4} color="#bcd4ff" />
      <directionalLight position={[2.5, 1.5, -3]} intensity={1.8} color="#ffd2c0" />
      <Environment resolution={128}>
        <Lightformer
          intensity={2}
          position={[0, 5, 0]}
          scale={[10, 10, 1]}
          rotation-x={Math.PI / 2}
        />
        <Lightformer
          intensity={1.2}
          color="#ffd9c4"
          position={[-5, 1, 1]}
          rotation-y={Math.PI / 2}
          scale={[20, 2, 1]}
        />
        <Lightformer
          intensity={1}
          color="#d4e6ff"
          position={[5, 1, -1]}
          rotation-y={-Math.PI / 2}
          scale={[20, 2, 1]}
        />
      </Environment>
      <Body {...props} />
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.4} far={1.5} />
      <OrbitControls
        target={SMALL ? [0, 0.88, 0] : [0, 0.76, 0]}
        enablePan
        screenSpacePanning
        minDistance={0.35}
        maxDistance={4.5}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI / 1.9}
      />
    </Canvas>
  );
}
