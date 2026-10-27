<script>
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import * as THREE from 'three';

  // Each point: { number, x_ft, y_ft, quality, a_distance_ft?, b_distance_ft?, notes? }
  export let points = [];
  export let shapeType = 'rectangular';
  export let shallow = 0;
  export let deep = 0;
  export let abDistanceFt = null;  // distance between A and B stakes (from A at origin)

  const dispatch = createEventDispatcher();
  let selectedNumber = null;

  let container;
  let scene, camera, renderer, animId;
  let pointMeshes = [];  // { number, mesh, originalY, isObstacle }

  function build() {
    if (!container || !points || points.length === 0) {
      console.warn('PoolViewer: no container or points', { container: !!container, pointsLen: points?.length });
      return;
    }

    // Coerce: API returns Decimal as strings; Three.js needs numbers.
    const num = (v, d = 0) => {
      const n = parseFloat(v);
      return Number.isFinite(n) ? n : d;
    };
    const shallowN = num(shallow, 3.5);
    const deepN = num(deep, 8);
    const abN = num(abDistanceFt, 22);

    // Build polygon (close the loop)
    const validPts = points.filter(p => p.quality !== 'invalid');
    const xy = validPts.map(p => [num(p.x_ft), num(p.y_ft)]);
    if (xy.length < 3) {
      console.warn('PoolViewer: < 3 valid points', xy.length);
      return;
    }

    // Center the pool
    const cx = xy.reduce((s, [x, _]) => s + x, 0) / xy.length;
    const cy = xy.reduce((s, [_, y]) => s + y, 0) / xy.length;
    const centered = xy.map(([x, y]) => [x - cx, y - cy]);

    // Bounding box for camera fit
    const xs = centered.map(([x, _]) => x);
    const ys = centered.map(([_, y]) => y);
    const w = Math.max(...xs) - Math.min(...xs);
    const h = Math.max(...ys) - Math.min(...ys);
    const maxDim = Math.max(w, h, abN);

    // Brand-aware canvas colours: the brand pack writes --brand-* on :root.
    // A dark pack sets card/line/ink; a light pack leaves card/line unset,
    // so fall back to the previous light values and the look is unchanged.
    const brandColor = (name, fallback) => {
      const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      return !v || v === 'initial' ? fallback : new THREE.Color(v).getHex();
    };
    const canvasBg = brandColor('--brand-card', 0xf5f8fb);
    const canvasLine = brandColor('--brand-line', null);
    const canvasInk = brandColor('--brand-ink', 0x1d2a36);

    // Three.js scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(canvasBg);

    camera = new THREE.PerspectiveCamera(
      45, container.clientWidth / container.clientHeight, 0.1, 1000
    );

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Lights
    const amb = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(maxDim, maxDim * 2, maxDim);
    scene.add(dir);

    // Pool water surface (extruded shape)
    const shape = new THREE.Shape(centered);
    const extrudeSettings = {
      depth: shallowN + deepN / 2,
      bevelEnabled: false,
    };
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshPhongMaterial({
      color: 0x0aa3e6,
      transparent: true,
      opacity: 0.65,
      side: THREE.DoubleSide,
    });
    const pool = new THREE.Mesh(geometry, material);
    pool.rotation.x = -Math.PI / 2;
    pool.position.y = 0;
    scene.add(pool);

    // Perimeter line on top
    const linePts = centered.map(([x, y]) => new THREE.Vector3(x, 0.05, y));
    linePts.push(linePts[0]);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(linePts);
    const lineMat = new THREE.LineBasicMaterial({ color: canvasInk, linewidth: 2 });
    const line = new THREE.Line(lineGeom, lineMat);
    scene.add(line);

    // A-B stakes + line (in deck coordinates, before centering)
    // A is at (0, 0) in source coords, centered to (-cx, -cy)
    const aX = -cx;
    const aY = -cy;
    const bX = abN - cx;
    const bY = -cy;
    const stakeR = Math.max(0.6, maxDim * 0.015);
    const stakeH = stakeR * 3;

    // A stake: blue cone
    const aStake = new THREE.Mesh(
      new THREE.ConeGeometry(stakeR, stakeH, 8),
      new THREE.MeshPhongMaterial({ color: 0x3b82f6, emissive: 0x1d4ed8, emissiveIntensity: 0.3 })
    );
    aStake.position.set(aX, stakeH / 2, aY);
    scene.add(aStake);
    // A label sprite
    const stakeLabelScale = Math.max(1.6, stakeR * 4);
    const aLabel = makeLabelSprite('A', 0x3b82f6, aX, stakeH + 1.2, aY, stakeLabelScale, canvasBg);
    aLabel.userData = { number: 'A' };
    scene.add(aLabel);

    // B stake: red cone
    const bStake = new THREE.Mesh(
      new THREE.ConeGeometry(stakeR, stakeH, 8),
      new THREE.MeshPhongMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 0.3 })
    );
    bStake.position.set(bX, stakeH / 2, bY);
    scene.add(bStake);
    const bLabel = makeLabelSprite('B', 0xef4444, bX, stakeH + 1.2, bY, stakeLabelScale, canvasBg);
    bLabel.userData = { number: 'B' };
    scene.add(bLabel);

    // A-B line (red dashed) on the deck
    const abPts = [
      new THREE.Vector3(aX, 0.06, aY),
      new THREE.Vector3(bX, 0.06, bY),
    ];
    const abGeom = new THREE.BufferGeometry().setFromPoints(abPts);
    const abMat = new THREE.LineDashedMaterial({
      color: 0xef4444, dashSize: 0.6, gapSize: 0.4, linewidth: 2,
    });
    const abLine = new THREE.Line(abGeom, abMat);
    abLine.computeLineDistances();
    scene.add(abLine);

    // Numbered point markers on the deck (above pool, on top surface)
    pointMeshes = [];
    const markerR = Math.max(0.5, maxDim * 0.015);  // size scales with pool
    const numGeom = new THREE.SphereGeometry(markerR, 16, 12);
    for (const p of points) {
      const x = num(p.x_ft) - cx;
      const y = num(p.y_ft) - cy;
      const isObstacle = p.is_obstacle || (p.notes && p.notes.length > 0);
      const color =
        p.quality === 'invalid' ? 0x6b7280 :
        isObstacle              ? 0xfbbf24 :
        p.quality === 'marginal' ? 0xfb923c :
                                  0x0a8fd0;
      const mat = new THREE.MeshPhongMaterial({
        color, emissive: color, emissiveIntensity: 0.35,
      });
      const mesh = new THREE.Mesh(numGeom, mat);
      mesh.position.set(x, markerR + 0.05, y);  // sit just above the deck
      mesh.userData = { number: p.number };
      scene.add(mesh);
      pointMeshes.push({ number: p.number, mesh, originalColor: color });

      // Number label sprite above each marker (much bigger so it tappable on phone)
      const labelScale = Math.max(2.0, markerR * 5);
      const labelSprite = makeLabelSprite(String(p.number), canvasInk, x, markerR + 1.6, y, labelScale, canvasBg);
      labelSprite.userData = { number: p.number };
      scene.add(labelSprite);
    }

    // Grid floor
    const grid = new THREE.GridHelper(maxDim * 3, 30, canvasLine ?? 0xc9d6e0, canvasLine ?? 0xe3eaf0);
    grid.position.y = -0.1;
    scene.add(grid);

    // Raycaster for click selection. Hits both sphere markers and the
    // label sprites (numbers, "A", "B") so users can tap on a number
    // or directly on the marker.
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    // Orbit-control state. Declared up here so event handlers can close
    // over them without TDZ issues.
    let rotX = 1.30;  // ~74°: nearly straight down
    let rotY = 0;     // camera at +z, looking at -z
    let radius = maxDim * 1.8;
    let isDragging = false;
    let pendingDrag = false;
    let prevX = 0, prevY = 0;

    function updateCamera() {
      camera.position.x = radius * Math.cos(rotX) * Math.sin(rotY);
      camera.position.z = radius * Math.cos(rotX) * Math.cos(rotY);
      camera.position.y = radius * Math.sin(rotX);
      camera.lookAt(0, 0, 0);
    }

    function onDown(e) {
      isDragging = false;  // start as "not dragging"; promoted on move
      pendingDrag = true;
      prevX = e.touches ? e.touches[0].clientX : e.clientX;
      prevY = e.touches ? e.touches[0].clientY : e.clientY;
    }
    function onMove(e) {
      if (!pendingDrag) return;
      const x = e.touches ? e.touches[0].clientX : e.clientX;
      const y = e.touches ? e.touches[0].clientY : e.clientY;
      const dx = x - prevX;
      const dy = y - prevY;
      if (Math.abs(dx) + Math.abs(dy) > 4) isDragging = true;
      if (!isDragging) return;
      rotY -= dx * 0.005;
      rotX = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, rotX + dy * 0.005));
      prevX = x; prevY = y;
      updateCamera();
    }
    function onUp() { pendingDrag = false; isDragging = false; }
    function onWheel(e) {
      e.preventDefault();
      radius = Math.max(maxDim * 0.5, Math.min(maxDim * 5, radius + e.deltaY * 0.01));
      updateCamera();
    }

    function onClick(e) {
      if (isDragging) return;  // ignore drag-end as click
      const rect = renderer.domElement.getBoundingClientRect();
      const cx2 = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      const cy2 = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
      mouse.x = (cx2 / rect.width) * 2 - 1;
      mouse.y = -(cy2 / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const objs = [
        ...pointMeshes.map(m => m.mesh),
        ...scene.children.filter(c => c.isSprite),
      ];
      const hits = raycaster.intersectObjects(objs, false);
      if (hits.length) {
        const num = hits[0].object.userData?.number;
        if (num != null && typeof num === 'number') selectPoint(num);
      }
    }

    function animate() {
      animId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }

    const el = renderer.domElement;
    el.addEventListener('mousedown', onDown);
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseup', onUp);
    el.addEventListener('mouseleave', onUp);
    el.addEventListener('touchstart', onDown, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: true });
    el.addEventListener('touchend', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });
    el.addEventListener('click', onClick);

    updateCamera();
    animate();
  }

  // Build a 2D text label that always faces the camera.
  function makeLabelSprite(text, color, x, y, z, scale = 1.0, halo = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 96px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Halo in the canvas background colour so the label reads over grid
    // lines and the pool outline instead of dissolving into them.
    if (halo != null) {
      ctx.lineJoin = 'round';
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#' + halo.toString(16).padStart(6, '0');
      ctx.strokeText(text, 64, 64);
    }
    ctx.fillStyle = '#' + color.toString(16).padStart(6, '0');
    ctx.fillText(text, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(x, y, z);
    sprite.scale.set(scale, scale, scale);
    return sprite;
  }

  // Highlight / unhighlight a point's sphere on selection
  function selectPoint(num) {
    selectedNumber = num;
    for (const pm of pointMeshes) {
      const isSel = pm.number === num;
      pm.mesh.material.emissiveIntensity = isSel ? 0.9 : 0.35;
      pm.mesh.scale.setScalar(isSel ? 1.6 : 1.0);
    }
    dispatch('select', { number: num, point: points.find(p => p.number === num) });
  }

  function onResize() {
    if (!renderer || !container) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  let firstBuild = true;
  onMount(build);
  onDestroy(() => {
    cancelAnimationFrame(animId);
    if (renderer) renderer.dispose();
  });

  function rebuildIfNew() {
    if (!points || !container) return;
    if (points === lastPointsRef) return;
    lastPointsRef = points;
    if (firstBuild) { firstBuild = false; return; }
    cancelAnimationFrame(animId);
    if (renderer) {
      try { renderer.dispose(); } catch (e) {}
      renderer = null;
    }
    if (container) container.innerHTML = '';
    pointMeshes = [];
    selectedNumber = null;
    Promise.resolve().then(build);
  }
  let lastPointsRef = null;
  $: { void points; void container; rebuildIfNew(); }

  // Exported helper for keyboard / list-click "select this point"
  export function focusPoint(num) {
    selectPoint(num);
  }

  $: selectedPoint = selectedNumber == null
    ? null
    : points.find(p => p.number === selectedNumber) || null;
</script>

<div bind:this={container} class="w-full h-96 bg-ink-950 rounded-3xl overflow-hidden touch-none shadow-card"></div>

{#if selectedPoint}
  <div class="card mt-2 border border-pool-500/40">
    <div class="flex items-center justify-between">
      <h3 class="font-bold text-pool-500">Point #{selectedPoint.number}</h3>
      <button type="button" class="text-xs text-ink-100/60 hover:text-ink-100" on:click={() => { selectedNumber = null; selectPoint(null); }}>×</button>
    </div>
    <div class="grid grid-cols-2 gap-2 mt-2 text-sm">
      <div>
        <div class="text-ink-100/60 text-xs">A distance</div>
        <div class="font-mono font-bold text-blue-300">
          {selectedPoint.a_distance_ft != null
            ? selectedPoint.a_distance_ft
            : '—'} ft
        </div>
      </div>
      <div>
        <div class="text-ink-100/60 text-xs">B distance</div>
        <div class="font-mono font-bold text-red-300">
          {selectedPoint.b_distance_ft != null
            ? selectedPoint.b_distance_ft
            : '—'} ft
        </div>
      </div>
    </div>
    <div class="text-xs text-ink-100/60 mt-1">
      Quality: {selectedPoint.quality || 'unknown'}
      {#if selectedPoint.notes}
        · <span class="text-ink-100/80">{selectedPoint.notes}</span>
      {/if}
    </div>
  </div>
{/if}

<p class="text-sm text-ink-50/70 mt-2">
  Drag to rotate · scroll/pinch to zoom · tap a point to inspect. {points.length} points reconstructed.
</p>
