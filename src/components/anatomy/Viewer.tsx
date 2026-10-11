import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Body, type BodyProps } from "./Body";

export function Viewer(props: BodyProps) {
  return (
    <Canvas shadows dpr={[1, 2]} camera={{ position: [0, 1.0, 3.6], fov: 32 }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[2, 4, 3]} intensity={1.6} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[-3, 2, -2]} intensity={0.8} color="#cfe3ff" />
      <Environment resolution={128}>
        <Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} rotation-x={Math.PI / 2} />
        <Lightformer intensity={1.2} color="#ffd9c4" position={[-5, 1, 1]} rotation-y={Math.PI / 2} scale={[20, 2, 1]} />
        <Lightformer intensity={1} color="#d4e6ff" position={[5, 1, -1]} rotation-y={-Math.PI / 2} scale={[20, 2, 1]} />
      </Environment>
      <Body {...props} />
      <ContactShadows position={[0, 0, 0]} opacity={0.35} scale={3} blur={2.4} far={1.5} />
      <OrbitControls target={[0, 0.95, 0]} enablePan={false} minDistance={1.2} maxDistance={4.5} minPolarAngle={0.3} maxPolarAngle={Math.PI / 1.9} />
    </Canvas>
  );
}
