"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

function makeStandard(color: number, roughness = 0.55, metalness = 0.04) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function makeTurfTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 1024, 1024);
  gradient.addColorStop(0, "#fbfaf6");
  gradient.addColorStop(0.48, "#ebeae4");
  gradient.addColorStop(1, "#d4d2ca");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 3200; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const length = 4 + Math.random() * 16;
    ctx.strokeStyle = Math.random() > 0.5 ? "rgba(18,18,17,0.13)" : "rgba(255,255,255,0.32)";
    ctx.lineWidth = Math.random() * 1.2 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 6 - 3, y + length);
    ctx.stroke();
  }

  ctx.strokeStyle = "rgba(18,18,17,0.11)";
  ctx.lineWidth = 1.5;
  for (let y = -1024; y < 2048; y += 34) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1024, y + 260);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 5);
  texture.anisotropy = 8;
  return texture;
}

function makeBallMatcapTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createRadialGradient(86, 66, 8, 132, 132, 172);
  gradient.addColorStop(0, "#fffef9");
  gradient.addColorStop(0.4, "#f4f2ea");
  gradient.addColorStop(0.72, "#e4e1d8");
  gradient.addColorStop(1, "#c1beb6");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function addMarking(group: THREE.Group, width: number, depth: number, x: number, z: number) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), makeStandard(0x2b2925, 0.68));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.018, z);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function makeTubeBetween(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 24), material);
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function createFootball(radius: number, matcapTexture: THREE.Texture | null) {
  const football = new THREE.Group();
  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(radius, 96, 64),
    new THREE.MeshMatcapMaterial({ color: 0xffffff, matcap: matcapTexture ?? null }),
  );
  shell.castShadow = true;
  football.add(shell);

  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  const vertices = [
    [-1, goldenRatio, 0],
    [1, goldenRatio, 0],
    [-1, -goldenRatio, 0],
    [1, -goldenRatio, 0],
    [0, -1, goldenRatio],
    [0, 1, goldenRatio],
    [0, -1, -goldenRatio],
    [0, 1, -goldenRatio],
    [goldenRatio, 0, -1],
    [goldenRatio, 0, 1],
    [-goldenRatio, 0, -1],
    [-goldenRatio, 0, 1],
  ].map(([x, y, z]) => new THREE.Vector3(x, y, z).normalize());
  const faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const neighbors = Array.from({ length: vertices.length }, () => new Set<number>());
  const directedPoints = new Map<string, THREE.Vector3>();
  const directedKey = (from: number, to: number) => `${from}:${to}`;
  const getDirectedPoint = (from: number, to: number) => {
    const key = directedKey(from, to);
    const existing = directedPoints.get(key);
    if (existing) return existing;
    const point = vertices[from].clone().multiplyScalar(2).add(vertices[to]).divideScalar(3).normalize();
    directedPoints.set(key, point);
    return point;
  };

  faces.forEach(([a, b, c]) => {
    neighbors[a].add(b); neighbors[a].add(c);
    neighbors[b].add(a); neighbors[b].add(c);
    neighbors[c].add(a); neighbors[c].add(b);
    getDirectedPoint(a, b); getDirectedPoint(b, a);
    getDirectedPoint(b, c); getDirectedPoint(c, b);
    getDirectedPoint(c, a); getDirectedPoint(a, c);
  });

  const polygons: string[][] = faces.map(([a, b, c]) => [
    directedKey(a, b), directedKey(b, a),
    directedKey(b, c), directedKey(c, b),
    directedKey(c, a), directedKey(a, c),
  ]);
  const pentagons: string[][] = [];

  vertices.forEach((normal, vertexIndex) => {
    const reference = Math.abs(normal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    const tangentX = reference.clone().cross(normal).normalize();
    const tangentY = normal.clone().cross(tangentX).normalize();
    const ordered = [...neighbors[vertexIndex]]
      .map((neighbor) => {
        const point = getDirectedPoint(vertexIndex, neighbor);
        const tangent = point.clone().sub(normal.clone().multiplyScalar(point.dot(normal)));
        return {
          key: directedKey(vertexIndex, neighbor),
          angle: Math.atan2(tangent.dot(tangentY), tangent.dot(tangentX)),
        };
      })
      .sort((left, right) => left.angle - right.angle)
      .map(({ key }) => key);
    pentagons.push(ordered);
    polygons.push(ordered);
  });

  const seamEdges = new Map<string, [THREE.Vector3, THREE.Vector3]>();
  polygons.forEach((polygon) => {
    polygon.forEach((pointKey, index) => {
      const nextKey = polygon[(index + 1) % polygon.length];
      const key = pointKey < nextKey ? `${pointKey}|${nextKey}` : `${nextKey}|${pointKey}`;
      const start = directedPoints.get(pointKey);
      const end = directedPoints.get(nextKey);
      if (start && end && !seamEdges.has(key)) seamEdges.set(key, [start, end]);
    });
  });

  const seamPositions: number[] = [];
  seamEdges.forEach(([start, end]) => {
    const segments = 5;
    for (let index = 0; index < segments; index += 1) {
      const from = start.clone().lerp(end, index / segments).normalize().multiplyScalar(radius + 0.007);
      const to = start.clone().lerp(end, (index + 1) / segments).normalize().multiplyScalar(radius + 0.007);
      seamPositions.push(from.x, from.y, from.z, to.x, to.y, to.z);
    }
  });
  const seams = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(seamPositions, 3)),
    new THREE.LineBasicMaterial({ color: 0x6f6c65, transparent: true, opacity: 0.4, depthTest: true }),
  );
  seams.renderOrder = 3;
  football.add(seams);

  const pentagonPositions: number[] = [];
  pentagons.forEach((pentagon) => {
    const points = pentagon
      .map((key) => directedPoints.get(key))
      .filter((point): point is THREE.Vector3 => Boolean(point));
    const center = points.reduce((sum, point) => sum.add(point), new THREE.Vector3()).normalize().multiplyScalar(radius + 0.003);
    points.forEach((point, index) => {
      const next = points[(index + 1) % points.length];
      const edgeStart = point.clone().normalize().multiplyScalar(radius + 0.003);
      const edgeEnd = next.clone().normalize().multiplyScalar(radius + 0.003);
      pentagonPositions.push(center.x, center.y, center.z, edgeStart.x, edgeStart.y, edgeStart.z, edgeEnd.x, edgeEnd.y, edgeEnd.z);
    });
  });
  const pentagonPanels = new THREE.Mesh(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pentagonPositions, 3)),
    new THREE.MeshBasicMaterial({ color: 0x8e8b83, transparent: true, opacity: 0.045, depthWrite: false, side: THREE.DoubleSide }),
  );
  pentagonPanels.renderOrder = 2;
  football.add(pentagonPanels);

  return { football, shell };
}

function createReferenceTrail(origin: THREE.Vector3) {
  const trail = new THREE.Group();
  const direction = new THREE.Vector3(1, -0.09, 0.13).normalize();
  const depthAxis = new THREE.Vector3(-direction.z, 0, direction.x).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const lengthScale = 0.48;
  const startSpread = 0.82;
  const endSpread = 0.64;
  const depthSpread = 0.55;
  const mainStrokes = [
    [1.5, 0.2, 0.12, -0.03, 0.17],
    [1.88, 0.14, 0.03, 0.04, 0.22],
    [2.25, 0.09, -0.08, -0.02, 0.31],
    [2.72, 0.04, -0.2, 0.02, 0.4],
    [2.34, -0.01, -0.27, -0.05, 0.33],
    [2.86, -0.07, -0.36, 0.01, 0.39],
    [2.08, -0.12, -0.34, 0.05, 0.29],
    [1.74, -0.17, -0.39, -0.03, 0.22],
    [1.42, -0.22, -0.43, 0.03, 0.17],
    [2.46, 0.17, -0.02, 0.07, 0.24],
    [2.02, 0.24, 0.13, -0.06, 0.16],
  ] as const;

  mainStrokes.forEach(([length, startY, endY, depth, opacity], index) => {
    const start = origin.clone()
      .addScaledVector(direction, 0.08 + (index % 3) * 0.035)
      .addScaledVector(up, startY * startSpread)
      .addScaledVector(depthAxis, depth * depthSpread * 0.35);
    const end = origin.clone()
      .addScaledVector(direction, length * lengthScale)
      .addScaledVector(up, endY * endSpread)
      .addScaledVector(depthAxis, depth * depthSpread);
    const control = origin.clone()
      .addScaledVector(direction, length * lengthScale * 0.5)
      .addScaledVector(up, startY * startSpread * 0.58 + endY * endSpread * 0.22)
      .addScaledVector(depthAxis, depth * depthSpread * 0.62);
    const curve = new THREE.QuadraticBezierCurve3(start, control, end);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(curve.getPoints(18)),
      new THREE.LineBasicMaterial({ color: 0x1b1a17, transparent: true, opacity, depthTest: true }),
    );
    line.renderOrder = 4;
    trail.add(line);
  });

  const accentPositions: number[] = [];
  for (let index = 0; index < 14; index += 1) {
    const startY = Math.sin(index * 1.73) * 0.23;
    const endY = startY * 1.45 - 0.06 - (index % 3) * 0.025;
    const depth = Math.cos(index * 2.11) * 0.09;
    const length = (0.42 + (index % 5) * 0.13) * 0.72;
    const start = origin.clone()
      .addScaledVector(direction, 0.04 + (index % 4) * 0.028)
      .addScaledVector(up, startY * 0.55)
      .addScaledVector(depthAxis, depth * 0.22);
    const end = origin.clone()
      .addScaledVector(direction, length)
      .addScaledVector(up, endY * 0.66)
      .addScaledVector(depthAxis, depth * 0.6);
    accentPositions.push(start.x, start.y, start.z, end.x, end.y, end.z);
  }
  const accents = new THREE.LineSegments(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(accentPositions, 3)),
    new THREE.LineBasicMaterial({ color: 0x1b1a17, transparent: true, opacity: 0.23, depthTest: true }),
  );
  accents.renderOrder = 4;
  trail.add(accents);

  const particlePositions: number[] = [];
  for (let index = 0; index < 11; index += 1) {
    const distance = (0.38 + (index % 6) * 0.25) * 0.55;
    const point = origin.clone()
      .addScaledVector(direction, distance)
      .addScaledVector(up, Math.sin(index * 1.9) * (0.08 + distance * 0.04))
      .addScaledVector(depthAxis, Math.cos(index * 1.4) * 0.06);
    particlePositions.push(point.x, point.y, point.z);
  }
  const particles = new THREE.Points(
    new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3)),
    new THREE.PointsMaterial({ color: 0x1b1a17, size: 0.018, transparent: true, opacity: 0.2, sizeAttenuation: true }),
  );
  particles.renderOrder = 4;
  trail.add(particles);

  return trail;
}

function addGoal(group: THREE.Group) {
  const postMaterial = makeStandard(0x171613, 0.5, 0);
  const netMaterial = new THREE.LineBasicMaterial({ color: 0x171613, transparent: true, opacity: 0.32 });
  const x = 2.65;
  const z = -4.35;
  const width = 3.55;
  const height = 1.85;
  const depth = 1.08;

  group.add(makeTubeBetween(new THREE.Vector3(x - width / 2, 0, z), new THREE.Vector3(x - width / 2, height, z), 0.024, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(x + width / 2, 0, z), new THREE.Vector3(x + width / 2, height, z), 0.024, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(x - width / 2, height, z), new THREE.Vector3(x + width / 2, height, z), 0.024, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(x - width / 2, 0, z), new THREE.Vector3(x - width / 2, 0, z - depth), 0.018, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(x + width / 2, 0, z), new THREE.Vector3(x + width / 2, 0, z - depth), 0.018, postMaterial));

  const points: number[] = [];
  for (let i = 0; i <= 10; i += 1) {
    const px = x - width / 2 + (width * i) / 10;
    points.push(px, 0.06, z - depth, px, height, z);
  }
  for (let i = 0; i <= 7; i += 1) {
    const py = 0.08 + (height * i) / 7;
    points.push(x - width / 2, py, z - depth * 0.98, x + width / 2, py, z - depth * 0.98);
  }
  const net = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(points, 3)), netMaterial);
  group.add(net);
}

export function HeroMap() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mountElement = mountRef.current;
    if (!mountElement) return;
    const host: HTMLDivElement = mountElement;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xf8f7f2, 8.5, 18);

    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 60);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const pointer = { x: 0, y: 0 };
    let frame = 0;
    const ballPosition = new THREE.Vector3(3.36, 1.43, -3.36);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.className = "h-full w-full";
    host.appendChild(renderer.domElement);

    const rig = new THREE.Group();
    scene.add(rig);

    const turfTexture = makeTurfTexture();
    const fieldMaterial = new THREE.MeshStandardMaterial({
      color: 0xe8e7df,
      map: turfTexture ?? undefined,
      roughness: 0.86,
      metalness: 0,
    });
    const field = new THREE.Mesh(new THREE.PlaneGeometry(18, 11), fieldMaterial);
    field.rotation.x = -Math.PI / 2;
    field.receiveShadow = true;
    rig.add(field);

    addMarking(rig, 16.2, 0.028, 0.65, -3.72);
    addMarking(rig, 16.2, 0.028, 0.65, 3.72);
    addMarking(rig, 0.028, 7.45, -7.05, 0);
    addMarking(rig, 0.028, 7.45, 8.35, 0);
    addMarking(rig, 14.2, 0.022, 0.65, 0);
    addMarking(rig, 0.022, 1.8, 2.65, -4.17);

    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(0.84, 0.88, 72), makeStandard(0x2b2925, 0.72));
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(0.65, 0.022, 0);
    rig.add(centerCircle);

    addGoal(rig);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(10, 3.4), makeStandard(0xd8d7d0, 0.9));
    backWall.position.set(2.65, 1.7, -5.5);
    rig.add(backWall);

    const hatchMaterial = new THREE.LineBasicMaterial({ color: 0x171613, transparent: true, opacity: 0.11 });
    const hatchPoints: number[] = [];
    for (let i = 0; i < 42; i += 1) {
      const x = -2.2 + i * 0.16;
      hatchPoints.push(x, 0.2, -5.47, x + 2.9, 3.2, -5.47);
    }
    rig.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(hatchPoints, 3)), hatchMaterial));

    const sideNetMaterial = new THREE.LineBasicMaterial({ color: 0x171613, transparent: true, opacity: 0.22 });
    const sideNetPoints: number[] = [];
    for (let i = 0; i < 28; i += 1) {
      const z = -5 + i * 0.35;
      sideNetPoints.push(8.4, 0, z, 8.4, 2.7, z);
    }
    for (let i = 0; i < 9; i += 1) {
      const y = i * 0.34;
      sideNetPoints.push(8.4, y, -5.1, 8.4, y, 4.9);
    }
    rig.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(sideNetPoints, 3)), sideNetMaterial));

    const ballMatcapTexture = makeBallMatcapTexture();
    const shotTrail = createReferenceTrail(ballPosition);
    rig.add(shotTrail);

    const { football: ball } = createFootball(0.351, ballMatcapTexture);
    ball.position.copy(ballPosition);
    ball.rotation.set(-0.18, 0.5, -0.08);
    rig.add(ball);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x5c5750, 1.85));
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(-4.5, 6.8, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xffffff, 5.5, 14);
    rimLight.position.set(5, 2.6, -2.6);
    scene.add(rimLight);

    const warmLight = new THREE.PointLight(0xffffff, 2.2, 9);
    warmLight.position.set(-2, 2.2, 1.4);
    scene.add(warmLight);

    rig.position.set(2.1, -0.85, -0.75);
    rig.rotation.set(-0.08, -0.23, 0);
    camera.position.set(4.3, 2.95, 7.55);
    camera.lookAt(2.35, 0.72, -2.25);

    function resize() {
      const width = host.clientWidth || 1;
      const height = host.clientHeight || 1;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;

      if (width < 480) {
        rig.scale.setScalar(0.68);
        rig.position.set(0.4, 1.65, -2.1);
      } else if (width < 768) {
        rig.scale.setScalar(0.76);
        rig.position.set(1.2, 1.45, -1.75);
      } else if (width < 1024) {
        rig.scale.setScalar(0.88);
        rig.position.set(1.45, -0.25, -1.25);
      } else {
        rig.scale.setScalar(1);
        rig.position.set(2.1, -0.85, -0.75);
      }

      camera.updateProjectionMatrix();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    function animate() {
      rig.rotation.y += (-0.23 + pointer.x * 0.035 - rig.rotation.y) * 0.055;
      rig.rotation.x += (-0.08 + pointer.y * 0.018 - rig.rotation.x) * 0.055;
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    }

    resize();
    animate();
    window.addEventListener("resize", resize);
    host.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      host.removeEventListener("pointermove", handlePointerMove);
      turfTexture?.dispose();
      ballMatcapTexture?.dispose();
      rig.traverse((object) => {
        if (!(object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments || object instanceof THREE.Points)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-[#fbfaf6]" aria-hidden="true">
      <div
        ref={mountRef}
        className="absolute inset-0 h-full w-full opacity-100"
        style={{
          WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 17%, rgba(0,0,0,0.74) 43%, black 100%)",
          maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.05) 17%, rgba(0,0,0,0.74) 43%, black 100%)",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(252,251,247,1)_0%,rgba(252,251,247,0.97)_25%,rgba(252,251,247,0.6)_43%,rgba(252,251,247,0.1)_72%,rgba(252,251,247,0)_100%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_74%_33%,rgba(17,17,15,0.16),transparent_34%)]" />
    </div>
  );
}
