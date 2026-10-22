"use client";

import { useEffect, useRef } from "react";

/**
 * Ambient Three.js particle field for the login screen: soft graphite dots
 * with a few olive accents drifting slowly, with gentle mouse parallax.
 * Three.js is imported lazily so it never lands in the studio bundle.
 * Honors prefers-reduced-motion (renders one static frame) and pauses
 * while the tab is hidden.
 */
export default function ParticleField() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let disposed = false;
    let raf = 0;
    let teardown = () => {};

    (async () => {
      const THREE = await import("three");
      const mount = mountRef.current;
      if (disposed || !mount) return;

      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(mount.clientWidth, mount.clientHeight);
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 100);
      camera.position.z = 14;

      const group = new THREE.Group();
      scene.add(group);
      // Soft round sprite (plain PointsMaterial would render hard squares).
      const dotTexture = (() => {
        const c = document.createElement("canvas");
        c.width = c.height = 64;
        const g = c.getContext("2d")!;
        const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
        grad.addColorStop(0, "rgba(255,255,255,1)");
        grad.addColorStop(0.35, "rgba(255,255,255,.85)");
        grad.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = grad;
        g.fillRect(0, 0, 64, 64);
        return new THREE.CanvasTexture(c);
      })();
      const makeCloud = (count: number, color: number, size: number, opacity: number, spread: number) => {
        const geo = new THREE.BufferGeometry();
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          pos[i * 3] = (Math.random() - 0.5) * spread;
          pos[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.62;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
        }
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          color,
          size,
          map: dotTexture,
          transparent: true,
          opacity,
          depthWrite: false,
          sizeAttenuation: true,
        });
        const points = new THREE.Points(geo, mat);
        group.add(points);
        return points;
      };
      makeCloud(110, 0x39413c, 0.13, 0.5, 32);
      makeCloud(30, 0x7d9038, 0.2, 0.65, 27);

      let mouseX = 0;
      let mouseY = 0;
      const onMouse = (e: MouseEvent) => {
        mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      };
      const onResize = () => {
        if (!mount) return;
        camera.aspect = mount.clientWidth / mount.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mount.clientWidth, mount.clientHeight);
      };
      window.addEventListener("mousemove", onMouse);
      window.addEventListener("resize", onResize);

      const clock = new THREE.Clock();
      const renderFrame = () => {
        const t = clock.getElapsedTime();
        group.rotation.z = t * 0.012;
        group.position.y = Math.sin(t * 0.35) * 0.35;
        group.rotation.x += (mouseY * 0.06 - group.rotation.x) * 0.03;
        group.rotation.y += (mouseX * 0.09 - group.rotation.y) * 0.03;
        renderer.render(scene, camera);
      };
      const loop = () => {
        if (disposed) return;
        if (!document.hidden) renderFrame();
        raf = requestAnimationFrame(loop);
      };
      if (reduced) {
        renderFrame();
      } else {
        loop();
      }

      teardown = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("resize", onResize);
        renderer.dispose();
        mount.removeChild(renderer.domElement);
      };
    })();

    return () => {
      disposed = true;
      teardown();
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />;
}
