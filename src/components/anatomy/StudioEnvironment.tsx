import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/** Local studio IBL, built directly to avoid nested React portal renderer conflicts. */
export function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const studio = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(1, 1);
    const panels: [string, number, THREE.Vector3, THREE.Vector3][] = [
      ["#ffffff", 2, new THREE.Vector3(0, 5, 0), new THREE.Vector3(10, 10, 1)],
      ["#ffd9c4", 1.2, new THREE.Vector3(-5, 1, 1), new THREE.Vector3(20, 2, 1)],
      ["#d4e6ff", 1, new THREE.Vector3(5, 1, -1), new THREE.Vector3(20, 2, 1)],
    ];
    const materials = panels.map(([color, intensity, position, scale]) => {
      const material = new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(intensity), side: THREE.DoubleSide, toneMapped: false });
      const panel = new THREE.Mesh(geometry, material);
      panel.position.copy(position);
      panel.scale.copy(scale);
      panel.lookAt(0, 0, 0);
      studio.add(panel);
      return material;
    });
    const target = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
    const camera = new THREE.CubeCamera(0.1, 100, target);
    camera.update(gl, studio);
    const previous = scene.environment;
    scene.environment = target.texture;
    return () => {
      if (scene.environment === target.texture) scene.environment = previous;
      target.dispose();
      geometry.dispose();
      materials.forEach((material) => material.dispose());
    };
  }, [gl, scene]);
  return null;
}