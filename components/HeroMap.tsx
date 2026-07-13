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
  gradient.addColorStop(0, "#fdfcf8");
  gradient.addColorStop(0.48, "#f0eee8");
  gradient.addColorStop(1, "#dddad2");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 1024);

  for (let i = 0; i < 5200; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    const length = 2 + Math.random() * 8;
    ctx.strokeStyle = Math.random() > 0.58 ? "rgba(18,18,17,0.12)" : "rgba(255,255,255,0.28)";
    ctx.lineWidth = Math.random() * 0.85 + 0.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.random() * 6 - 3, y + length);
    ctx.stroke();
  }

  for (let i = 0; i < 2600; i += 1) {
    const x = Math.random() * 1024;
    const y = Math.random() * 1024;
    ctx.fillStyle = `rgba(26,25,22,${0.025 + Math.random() * 0.07})`;
    ctx.fillRect(x, y, Math.random() * 1.2 + 0.35, Math.random() * 1.2 + 0.35);
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
  texture.repeat.set(5, 4);
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
    new THREE.LineBasicMaterial({ color: 0x55534e, transparent: true, opacity: 0.52, depthTest: true }),
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
  function addPencilStroke(points: THREE.Vector3[], opacity: number, seed: number) {
    const fragments = 4;
    const pointsPerFragment = points.length / fragments;

    for (let fragment = 0; fragment < fragments; fragment += 1) {
      const startIndex = Math.floor(fragment * pointsPerFragment) + (fragment > 0 ? 1 : 0);
      const endIndex = Math.min(points.length - 1, Math.ceil((fragment + 1) * pointsPerFragment) - (fragment < fragments - 1 ? 1 : 0));
      if (endIndex - startIndex < 2) continue;
      const graphiteVariation = 0.72 + Math.sin(seed * 1.91 + fragment * 2.37) * 0.14;
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(points.slice(startIndex, endIndex + 1)),
        new THREE.LineBasicMaterial({
          color: 0x35332e,
          transparent: true,
          opacity: opacity * graphiteVariation,
          depthTest: true,
          depthWrite: false,
        }),
      );
      line.renderOrder = 5;
      trail.add(line);
    }
  }

  function createPencilPoints({
    length,
    startY,
    endY,
    seed,
    frontDepth,
  }: {
    length: number;
    startY: number;
    endY: number;
    seed: number;
    frontDepth: number;
  }) {
    const start = origin.clone().add(new THREE.Vector3(0.035 + (seed % 3) * 0.018, startY, frontDepth));
    const controlOne = origin.clone().add(new THREE.Vector3(length * 0.25, startY - 0.025, frontDepth * 0.78));
    const controlTwo = origin.clone().add(new THREE.Vector3(length * 0.68, endY + 0.055, frontDepth * 0.3));
    const end = origin.clone().add(new THREE.Vector3(length, endY, 0.025 + (seed % 4) * 0.009));
    return new THREE.CubicBezierCurve3(start, controlOne, controlTwo, end).getPoints(34).map((point, pointIndex, points) => {
      const progress = pointIndex / (points.length - 1);
      const graphiteJitter = Math.sin((pointIndex + 1) * (2.17 + seed * 0.13)) * 0.007;
      const endFlutter = Math.max(0, (progress - 0.68) / 0.32);
      const flutter = Math.sin(endFlutter * Math.PI * 1.7 + seed * 0.83) * 0.025 * endFlutter;
      return point.clone().add(new THREE.Vector3(
        Math.cos(pointIndex * 1.73 + seed) * 0.0035,
        graphiteJitter + flutter,
        Math.sin(pointIndex * 1.31 + seed * 0.7) * 0.004 + Math.cos(endFlutter * Math.PI * 2 + seed) * 0.014 * endFlutter,
      ));
    });
  }

  const primaryCount = 12;
  for (let index = 0; index < primaryCount; index += 1) {
    const band = index / (primaryCount - 1) - 0.5;
    const points = createPencilPoints({
      length: 1.78 + (index % 5) * 0.31,
      startY: band * 0.37 + Math.sin(index * 1.41) * 0.02,
      endY: -0.13 + band * 0.58 - (index % 3) * 0.03,
      seed: index + 1,
      frontDepth: 0.365 - Math.abs(band) * 0.025,
    });
    const opacity = 0.27 + (index % 4) * 0.055;
    addPencilStroke(points, opacity, index + 1);

    if (index % 2 === 0) {
      const echo = points.map((point, pointIndex) => point.clone().add(new THREE.Vector3(
        0,
        Math.sin(pointIndex * 1.17 + index) * 0.006 + 0.009,
        0.006,
      )));
      addPencilStroke(echo, opacity * 0.28, index + 11);
    }
  }

  const filamentCount = 6;
  for (let index = 0; index < filamentCount; index += 1) {
    const band = index / (filamentCount - 1) - 0.5;
    const points = createPencilPoints({
      length: 1.02 + (index % 4) * 0.28,
      startY: band * 0.48 + Math.cos(index * 1.63) * 0.025,
      endY: -0.1 + band * 0.7,
      seed: index + 21,
      frontDepth: 0.38 - Math.abs(band) * 0.035,
    });
    addPencilStroke(points, 0.15 + (index % 3) * 0.035, index + 21);
  }

  for (let loopIndex = 0; loopIndex < 5; loopIndex += 1) {
    const radiusX = 0.16 + loopIndex * 0.035;
    const radiusY = 0.1 + loopIndex * 0.024;
    const phase = loopIndex * 0.74;
    const loopPoints = Array.from({ length: 30 }, (_, pointIndex) => {
      const progress = pointIndex / 29;
      const angle = progress * Math.PI * 1.82 + phase;
      const taper = 0.72 + progress * 0.28;
      return origin.clone().add(new THREE.Vector3(
        0.13 + Math.cos(angle) * radiusX * taper,
        -0.02 + Math.sin(angle) * radiusY * taper + Math.sin(pointIndex * 1.9 + loopIndex) * 0.006,
        0.405 + Math.cos(angle * 0.7) * 0.012 + loopIndex * 0.003,
      ));
    });
    addPencilStroke(loopPoints, 0.18 + loopIndex * 0.025, loopIndex + 41);
  }

  return trail;
}

function addGoal(group: THREE.Group) {
  const postMaterial = new THREE.MeshBasicMaterial({ color: 0x2c2a26 });
  const netMaterial = new THREE.LineBasicMaterial({ color: 0x34322d, transparent: true, opacity: 0.36 });
  const netEchoMaterial = new THREE.LineBasicMaterial({ color: 0x625f58, transparent: true, opacity: 0.15 });
  const x = 2.65;
  const z = -4.35;
  const width = 4.45;
  const height = 2.4;
  const depth = 1.16;
  const left = x - width / 2;
  const right = x + width / 2;

  group.add(makeTubeBetween(new THREE.Vector3(left, 0, z), new THREE.Vector3(left, height, z), 0.034, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(right, 0, z), new THREE.Vector3(right, height, z), 0.034, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(left, height, z), new THREE.Vector3(right, height, z), 0.034, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(left, 0, z), new THREE.Vector3(left, 0, z - depth), 0.022, postMaterial));
  group.add(makeTubeBetween(new THREE.Vector3(right, 0, z), new THREE.Vector3(right, 0, z - depth), 0.022, postMaterial));

  function netPoint(xProgress: number, yProgress: number, echo = false) {
    const edgeWeight = Math.sin(Math.PI * xProgress);
    const sag = edgeWeight * (0.07 + (1 - yProgress) * 0.1);
    const jitter = Math.sin(xProgress * 31.7 + yProgress * 18.3) * (echo ? 0.022 : 0.012);
    return new THREE.Vector3(
      left + width * xProgress + jitter,
      0.045 + height * yProgress + Math.sin(xProgress * 19 + yProgress * 7) * 0.012,
      z - depth * (1 - yProgress) - sag - (echo ? 0.018 : 0),
    );
  }

  for (let column = 0; column <= 16; column += 1) {
    const xProgress = column / 16;
    const points = Array.from({ length: 13 }, (_, row) => netPoint(xProgress, row / 12));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), netMaterial));

    if (column % 3 === 1) {
      const echoPoints = Array.from({ length: 13 }, (_, row) => netPoint(xProgress + 0.004, row / 12, true));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(echoPoints), netEchoMaterial));
    }
  }

  for (let row = 0; row <= 11; row += 1) {
    const yProgress = row / 11;
    const points = Array.from({ length: 21 }, (_, column) => netPoint(column / 20, yProgress));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), netMaterial));
  }

  for (const side of [left, right]) {
    for (let row = 1; row < 7; row += 1) {
      const y = (height * row) / 7;
      const sideLine = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(side, y, z),
          new THREE.Vector3(side, y * 0.74, z - depth),
        ]),
        netEchoMaterial,
      );
      group.add(sideLine);
    }
  }

  for (let column = 1; column < 10; column += 1) {
    const px = left + (width * column) / 10;
    group.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(px, height, z),
        new THREE.Vector3(px, height * 0.93, z - depth),
      ]),
      netEchoMaterial,
    ));
  }
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
    const ballPosition = new THREE.Vector3(3.7, 1.63, -3.36);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
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

    const centerCircle = new THREE.Mesh(new THREE.RingGeometry(1.1, 1.15, 96), makeStandard(0x2b2925, 0.72));
    centerCircle.rotation.x = -Math.PI / 2;
    centerCircle.position.set(-0.05, 0.022, -1.25);
    rig.add(centerCircle);

    addGoal(rig);

    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(14.2, 4.05), makeStandard(0xe4e2dc, 0.92));
    backWall.position.set(1, 2.02, -5.56);
    rig.add(backWall);

    const hatchMaterial = new THREE.LineBasicMaterial({ color: 0x34322e, transparent: true, opacity: 0.14 });
    const hatchPoints: number[] = [];
    for (let i = 0; i < 90; i += 1) {
      const x = -6 + i * 0.17;
      hatchPoints.push(x, 0.05, -5.53, x + 3.85, 4.02, -5.53);
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

    const { football: ball } = createFootball(0.4, ballMatcapTexture);
    ball.position.copy(ballPosition);
    ball.rotation.set(-0.18, 0.5, -0.08);
    rig.add(ball);
    const animationStart = performance.now();
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

    rig.position.set(-0.5, -0.95, 1.2);
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
        rig.scale.setScalar(1.05);
        rig.position.set(0.85, -0.65, -0.15);
      } else {
        rig.scale.setScalar(1.45);
        rig.position.set(-0.5, -0.95, 1.2);
      }

      camera.updateProjectionMatrix();
    }

    function handlePointerMove(event: PointerEvent) {
      const rect = host.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      pointer.y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    }

    function animate() {
      if (!prefersReducedMotion) {
        const elapsed = (performance.now() - animationStart) * 0.001;
        ball.rotation.x = -0.18 + elapsed * 0.015;
        ball.rotation.y = 0.5 + elapsed * 0.07;
      }
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
