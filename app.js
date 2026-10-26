/* =========================================================================
       1. APPLICATION STATE & 3 INSTANT STAGE PRESETS
       ========================================================================= */
    const VALID_BODY_PARTS = [
      'Head', 'Neck', 'Chest', 'Abdomen', 'LeftArm', 'RightArm', 'LeftHand', 'RightHand', 'Legs'
    ];
    const VALID_SHADERS = [
      'RUST_METAL', 'SAND_STATIC', 'WATER', 'GLASS_FRACTURE', 'SMOKE_VOID', 'NORMAL'
    ];

    const PRESETS = {
      1: {
        patient_quote: "My chest feels like it's caving in under heavy rusted iron, my head won't stop buzzing with electrical static, and my left hand feels completely hollow and numb.",
        overall_homunculus_archetype: "The Iron Chest (Armored Pressure Vessel)",
        distortion_index: 86,
        regions: [
          {
            body_part: "Chest",
            scale_multiplier: 1.85,
            material_shader: "RUST_METAL",
            intensity_score: 9,
            patient_metaphor: "Caving in under heavy rusted iron",
            clinical_translation: "A metaphor for chest pressure or tightness; the visualization cannot determine its cause."
          },
          {
            body_part: "Head",
            scale_multiplier: 1.95,
            material_shader: "SAND_STATIC",
            intensity_score: 9,
            patient_metaphor: "Non-stop buzzing with electrical static",
            clinical_translation: "A metaphor for buzzing, overload, or head discomfort; this is not a clinical interpretation."
          },
          {
            body_part: "LeftHand",
            scale_multiplier: 0.65,
            material_shader: "SMOKE_VOID",
            intensity_score: 7,
            patient_metaphor: "Completely hollow and numb",
            clinical_translation: "A metaphor for numbness or reduced sensation; new or severe numbness needs real medical assessment."
          }
        ],
        psychological_blindspot: "Possible reflection: the speaker uses an image of crushing weight. Ask what, if anything, that metaphor means to them.",
        clinician_questions: [
          "Does the crushing iron weight in your chest intensify when suppressing unspoken grief or obligations?",
          "When the cranial static spikes, do you experience peripheral numbness or visual derealization?"
        ]
      },
      2: {
        patient_quote: "My skull feels like fragile glass fracturing into sharp crimson shards, my neck is locked in rusted iron, and my right arm is vibrating with phantom static.",
        overall_homunculus_archetype: "Glass Migraine & Phantom Static",
        distortion_index: 91,
        regions: [
          {
            body_part: "Head",
            scale_multiplier: 2.25,
            material_shader: "GLASS_FRACTURE",
            intensity_score: 10,
            patient_metaphor: "Fragile glass fracturing into sharp shards",
            clinical_translation: "A metaphor for sharp head discomfort and sensory sensitivity; no diagnosis is inferred."
          },
          {
            body_part: "Neck",
            scale_multiplier: 1.55,
            material_shader: "RUST_METAL",
            intensity_score: 8,
            patient_metaphor: "Locked in rigid rusted iron brace",
            clinical_translation: "A metaphor for neck stiffness or tension; the cause cannot be determined here."
          },
          {
            body_part: "RightArm",
            scale_multiplier: 1.65,
            material_shader: "SAND_STATIC",
            intensity_score: 8,
            patient_metaphor: "Vibrating with phantom electrical static",
            clinical_translation: "A metaphor for arm buzzing or tingling; the cause cannot be determined here."
          }
        ],
        psychological_blindspot: "Possible reflection: the speaker describes fragility or sharpness. Do not assume a trauma history from this phrase.",
        clinician_questions: [
          "What specific environmental triggers precede the sensation of cranial glass fracturing?",
          "Does the right-arm static correlate with flashbacks or defensive startle responses?"
        ]
      },
      3: {
        patient_quote: "My chest feels submerged in deep freezing ocean water, my abdomen has dissolved into a hollow smoke void, and my legs are weighed down like corroded iron.",
        overall_homunculus_archetype: "Submerged Burnout (Abyssal Vessel)",
        distortion_index: 82,
        regions: [
          {
            body_part: "Chest",
            scale_multiplier: 1.75,
            material_shader: "WATER",
            intensity_score: 8,
            patient_metaphor: "Submerged in deep freezing ocean water",
            clinical_translation: "A metaphor for chest heaviness or feeling submerged; this is not a diagnosis."
          },
          {
            body_part: "Abdomen",
            scale_multiplier: 0.60,
            material_shader: "SMOKE_VOID",
            intensity_score: 8,
            patient_metaphor: "Dissolved into a hollow smoke void",
            clinical_translation: "A metaphor for abdominal emptiness or disconnection; the tool cannot infer a psychological condition."
          },
          {
            body_part: "Legs",
            scale_multiplier: 1.65,
            material_shader: "RUST_METAL",
            intensity_score: 8,
            patient_metaphor: "Weighed down like corroded iron anchors",
            clinical_translation: "A metaphor for heavy legs or fatigue; persistent or severe symptoms merit professional assessment."
          }
        ],
        psychological_blindspot: "Possible reflection: the speaker uses images of submersion and emptiness. Their meaning is personal and needs clarification.",
        clinician_questions: [
          "How long have you felt disconnected from hunger or gut emotions in your abdomen?",
          "Does the sensation of being underwater worsen when asked to perform socially?"
        ]
      }
    };

    const state = {
      isLeftEyeActive: false,
      isAutoRotating: true,
      showHudCallouts: true,
      audioEnabled: true,
      liveCamActive: false,
      somaticData: JSON.parse(JSON.stringify(PRESETS[1]))
    };

    /* =========================================================================
       2. PROCEDURAL 3D ARTICULATED HUMANOID (DECOUPLED HIERARCHY AT 60 FPS)
       ========================================================================= */
    let scene, camera, renderer, controls;
    let mannequinRoot, floorGrid, floorGridCenterMat, floorGridLinesMat, pedestalMesh;
    let ambientLight, mainDirLight, crimsonRimLight, cyanRimLight;

    const bodyNodes = {};         // Region name -> THREE.Group (scaled independently via lerp)
    const bodyMeshes = {};        // Region name -> Array of THREE.Mesh (for shader assignment)
    const staticParticles = {};   // Region name -> THREE.Points (visible when SAND_STATIC is active)
    const activeRegionState = {}; // Region name -> { scale: 1.0, shader: 'NORMAL' }

    // Pointer delta tracking so OrbitControls dragging doesn't trigger limb clicks
    const pointerDownPos = { x: 0, y: 0 };

    // Symbolic Homunculus Materials Library
    const materials = {};

    function initThreeEngine() {
      if (!window.THREE) throw new Error('Three.js did not load. Check your internet connection and refresh.');
      const container = document.getElementById('threeCanvasContainer');
      const width = container.clientWidth || 600;
      const height = container.clientHeight || 550;

      // 1. Scene & Camera
      scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf1f5f9); // Right-eye clinical light slate default

      camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
      camera.position.set(0, 1.15, 3.45);

      // 2. WebGL Renderer
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      container.appendChild(renderer.domElement);

      // 3. OrbitControls
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2 + 0.08;
      controls.minDistance = 1.6;
      controls.maxDistance = 5.5;
      controls.target.set(0, 0.92, 0);

      // 4. Studio & Manga Rim Lighting
      ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
      scene.add(ambientLight);

      mainDirLight = new THREE.DirectionalLight(0xffffff, 1.15);
      mainDirLight.position.set(3, 5, 4);
      scene.add(mainDirLight);

      crimsonRimLight = new THREE.DirectionalLight(0xe11d48, 0.2);
      crimsonRimLight.position.set(-3.5, 2.5, -2.5);
      scene.add(crimsonRimLight);

      cyanRimLight = new THREE.DirectionalLight(0x06b6d4, 0.5);
      cyanRimLight.position.set(3.5, 1.5, -2.5);
      scene.add(cyanRimLight);

      // 5. Build Symbolic Shaders / Materials
      initSymbolicMaterials();

      // 6. Build Decoupled Articulated Humanoid & Static Particle Halos
      buildArticulatedHumanoid();

      // 7. Build Pedestal & Cortical Grid
      buildStageEnvironment();

      // 8. Build Floating HTML Callout Badges
      initHudCalloutDOM();

      // 9. Listeners (PointerDown + PointerUp delta check to separate drag from click)
      window.addEventListener('resize', onViewportResize);
      renderer.domElement.addEventListener('pointerdown', (e) => {
        pointerDownPos.x = e.clientX;
        pointerDownPos.y = e.clientY;
      });
      renderer.domElement.addEventListener('pointerup', onLimbRaycastClick);

      // 10. Start Live Render Loop
      requestAnimationFrame(animateLoop);
    }

    function initSymbolicMaterials() {
      // Clinical Right-Eye Material (Clean Alabaster Matte)
      materials.CLINICAL = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.32,
        metalness: 0.08
      });

      // Normal Left-Eye Unaffected Material (Dark Charcoal)
      materials.NORMAL = new THREE.MeshStandardMaterial({
        color: 0x262632,
        roughness: 0.55,
        metalness: 0.25
      });

      // 1. RUST_METAL (Repressed Trauma / Crushing Weight / Guarding)
      materials.RUST_METAL = new THREE.MeshStandardMaterial({
        color: 0x4a2016,
        roughness: 0.78,
        metalness: 0.92,
        emissive: 0x2a0808,
        emissiveIntensity: 0.45
      });

      // 2. SAND_STATIC (Anxiety / Sensory Overload / Hyperarousal)
      materials.SAND_STATIC = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xe11d48,
        emissiveIntensity: 0.85,
        wireframe: true
      });

      // 3. WATER (Deep Grief / Drowning / Depression)
      materials.WATER = new THREE.MeshPhysicalMaterial({
        color: 0x06b6d4,
        emissive: 0x083344,
        emissiveIntensity: 0.4,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.82,
        transparent: true,
        opacity: 0.88
      });

      // 4. GLASS_FRACTURE (Acute Sharp Pain / Fragility)
      materials.GLASS_FRACTURE = new THREE.MeshPhysicalMaterial({
        color: 0xffe4e6,
        emissive: 0xe11d48,
        emissiveIntensity: 0.7,
        roughness: 0.05,
        metalness: 0.95,
        wireframe: true
      });

      // 5. SMOKE_VOID (Burnout / Numbness / Dissociation)
      materials.SMOKE_VOID = new THREE.MeshStandardMaterial({
        color: 0x09090f,
        emissive: 0x181824,
        roughness: 0.9,
        metalness: 0.1,
        transparent: true,
        opacity: 0.24
      });
    }

    function registerPartMesh(regionKey, geometry, yOffset, scaleVec) {
      const mesh = new THREE.Mesh(geometry, materials.CLINICAL);
      mesh.position.y = yOffset;
      if (scaleVec) mesh.scale.copy(scaleVec);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { bodyPart: regionKey };

      if (!bodyMeshes[regionKey]) bodyMeshes[regionKey] = [];
      bodyMeshes[regionKey].push(mesh);
      return mesh;
    }

    function createStaticParticleCloud(radius, height) {
      const count = 90;
      const geom = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const r = radius * (0.85 + Math.random() * 0.55);
        positions[i * 3] = Math.cos(angle) * r;
        positions[i * 3 + 1] = (Math.random() - 0.5) * height;
        positions[i * 3 + 2] = Math.sin(angle) * r;
      }
      geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const mat = new THREE.PointsMaterial({
        color: 0xf43f5e,
        size: 0.028,
        transparent: true,
        opacity: 0.9
      });
      const points = new THREE.Points(geom, mat);
      points.visible = false;
      return points;
    }

    function buildArticulatedHumanoid() {
      mannequinRoot = new THREE.Group();
      scene.add(mannequinRoot);

      const pelvisAnchor = new THREE.Group();
      pelvisAnchor.position.set(0, 0.88, 0);
      mannequinRoot.add(pelvisAnchor);

      // 1. Abdomen
      const abdomenGroup = new THREE.Group();
      abdomenGroup.position.set(0, 0, 0);
      const abdomenMesh = registerPartMesh("Abdomen", new THREE.CylinderGeometry(0.145, 0.13, 0.24, 20), 0.12);
      abdomenGroup.add(abdomenMesh);
      const abdomenPts = createStaticParticleCloud(0.22, 0.26);
      abdomenPts.position.y = 0.12;
      abdomenGroup.add(abdomenPts);
      staticParticles["Abdomen"] = abdomenPts;
      pelvisAnchor.add(abdomenGroup);
      bodyNodes["Abdomen"] = abdomenGroup;

      // 2. Chest (Thorax)
      const chestGroup = new THREE.Group();
      chestGroup.position.set(0, 0.24, 0);
      const chestMesh = registerPartMesh("Chest", new THREE.CylinderGeometry(0.21, 0.15, 0.34, 24), 0.17, new THREE.Vector3(1.12, 1, 0.82));
      chestGroup.add(chestMesh);
      const chestPts = createStaticParticleCloud(0.28, 0.36);
      chestPts.position.y = 0.17;
      chestGroup.add(chestPts);
      staticParticles["Chest"] = chestPts;
      pelvisAnchor.add(chestGroup);
      bodyNodes["Chest"] = chestGroup;

      // 3. Neck
      const neckGroup = new THREE.Group();
      neckGroup.position.set(0, 0.58, 0);
      const neckMesh = registerPartMesh("Neck", new THREE.CylinderGeometry(0.065, 0.075, 0.11, 16), 0.055);
      neckGroup.add(neckMesh);
      const neckPts = createStaticParticleCloud(0.12, 0.12);
      neckPts.position.y = 0.055;
      neckGroup.add(neckPts);
      staticParticles["Neck"] = neckPts;
      pelvisAnchor.add(neckGroup);
      bodyNodes["Neck"] = neckGroup;

      // 4. Head (Cranium)
      const headGroup = new THREE.Group();
      headGroup.position.set(0, 0.69, 0);
      const headMesh = registerPartMesh("Head", new THREE.SphereGeometry(0.145, 28, 24), 0.15, new THREE.Vector3(0.95, 1.22, 1.04));
      headGroup.add(headMesh);
      const headPts = createStaticParticleCloud(0.22, 0.32);
      headPts.position.y = 0.15;
      headGroup.add(headPts);
      staticParticles["Head"] = headPts;
      pelvisAnchor.add(headGroup);
      bodyNodes["Head"] = headGroup;

      // 5. LeftArm
      const leftArmGroup = new THREE.Group();
      leftArmGroup.position.set(0.26, 0.53, 0);
      leftArmGroup.rotation.z = 0.12;
      const lShoulder = registerPartMesh("LeftArm", new THREE.SphereGeometry(0.062, 16, 16), 0);
      const lArmMesh = registerPartMesh("LeftArm", new THREE.CylinderGeometry(0.052, 0.042, 0.38, 16), -0.19);
      leftArmGroup.add(lShoulder, lArmMesh);
      const lArmPts = createStaticParticleCloud(0.1, 0.38);
      lArmPts.position.y = -0.19;
      leftArmGroup.add(lArmPts);
      staticParticles["LeftArm"] = lArmPts;
      pelvisAnchor.add(leftArmGroup);
      bodyNodes["LeftArm"] = leftArmGroup;

      // 6. LeftHand (Independent sibling)
      const leftHandGroup = new THREE.Group();
      leftHandGroup.position.set(0.31, 0.14, 0);
      const lHandMesh = registerPartMesh("LeftHand", new THREE.SphereGeometry(0.058, 18, 18), -0.05, new THREE.Vector3(0.85, 1.45, 0.55));
      leftHandGroup.add(lHandMesh);
      const lHandPts = createStaticParticleCloud(0.11, 0.16);
      lHandPts.position.y = -0.05;
      leftHandGroup.add(lHandPts);
      staticParticles["LeftHand"] = lHandPts;
      pelvisAnchor.add(leftHandGroup);
      bodyNodes["LeftHand"] = leftHandGroup;

      // 7. RightArm
      const rightArmGroup = new THREE.Group();
      rightArmGroup.position.set(-0.26, 0.53, 0);
      rightArmGroup.rotation.z = -0.12;
      const rShoulder = registerPartMesh("RightArm", new THREE.SphereGeometry(0.062, 16, 16), 0);
      const rArmMesh = registerPartMesh("RightArm", new THREE.CylinderGeometry(0.052, 0.042, 0.38, 16), -0.19);
      rightArmGroup.add(rShoulder, rArmMesh);
      const rArmPts = createStaticParticleCloud(0.1, 0.38);
      rArmPts.position.y = -0.19;
      rightArmGroup.add(rArmPts);
      staticParticles["RightArm"] = rArmPts;
      pelvisAnchor.add(rightArmGroup);
      bodyNodes["RightArm"] = rightArmGroup;

      // 8. RightHand (Independent sibling)
      const rightHandGroup = new THREE.Group();
      rightHandGroup.position.set(-0.31, 0.14, 0);
      const rHandMesh = registerPartMesh("RightHand", new THREE.SphereGeometry(0.058, 18, 18), -0.05, new THREE.Vector3(0.85, 1.45, 0.55));
      rightHandGroup.add(rHandMesh);
      const rHandPts = createStaticParticleCloud(0.11, 0.16);
      rHandPts.position.y = -0.05;
      rightHandGroup.add(rHandPts);
      staticParticles["RightHand"] = rHandPts;
      pelvisAnchor.add(rightHandGroup);
      bodyNodes["RightHand"] = rightHandGroup;

      // 9. Legs (Bilateral Lower Extremities)
      const legsGroup = new THREE.Group();
      legsGroup.position.set(0, 0, 0);
      const lLegMesh = registerPartMesh("Legs", new THREE.CylinderGeometry(0.068, 0.048, 0.82, 16), -0.42);
      lLegMesh.position.x = 0.11;
      const rLegMesh = registerPartMesh("Legs", new THREE.CylinderGeometry(0.068, 0.048, 0.82, 16), -0.42);
      rLegMesh.position.x = -0.11;
      legsGroup.add(lLegMesh, rLegMesh);
      const legsPts = createStaticParticleCloud(0.25, 0.8);
      legsPts.position.y = -0.42;
      legsGroup.add(legsPts);
      staticParticles["Legs"] = legsPts;
      pelvisAnchor.add(legsGroup);
      bodyNodes["Legs"] = legsGroup;

      VALID_BODY_PARTS.forEach(part => {
        const node = bodyNodes[part];
        node.userData.targetScale = new THREE.Vector3(1, 1, 1);
        node.userData.basePos = node.position.clone();
        node.userData.anchorPos = node.position.clone();
        activeRegionState[part] = { scale: 1.0, shader: 'NORMAL' };
      });
    }

    function buildStageEnvironment() {
      floorGrid = new THREE.GridHelper(6, 24, 0x94a3b8, 0xe2e8f0);
      floorGrid.position.y = 0.01;
      if (Array.isArray(floorGrid.material)) {
        floorGridCenterMat = floorGrid.material[0];
        floorGridLinesMat = floorGrid.material[1];
      } else {
        floorGridCenterMat = floorGrid.material;
        floorGridLinesMat = floorGrid.material;
      }
      scene.add(floorGrid);

      const pedGeom = new THREE.CylinderGeometry(0.75, 0.82, 0.04, 36);
      const pedMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6, metalness: 0.2 });
      pedestalMesh = new THREE.Mesh(pedGeom, pedMat);
      pedestalMesh.position.y = -0.01;
      scene.add(pedestalMesh);
    }

    /* =========================================================================
       3. FLOATING 2D-PROJECTED ANATOMICAL HUD CALLOUT BADGES
       ========================================================================= */
    const hudElements = {};
    function initHudCalloutDOM() {
      const container = document.getElementById('hudCalloutsContainer');
      container.replaceChildren();
      VALID_BODY_PARTS.forEach(part => {
        const el = document.createElement('div');
        el.className = "absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded border text-[9px] font-mono font-bold uppercase tracking-wider transition-opacity duration-200 pointer-events-none whitespace-nowrap hidden";
        container.appendChild(el);
        hudElements[part] = el;
      });
    }

    function updateHudCallouts() {
      const container = document.getElementById('threeCanvasContainer');
      if (!container) return;
      const width = container.clientWidth;
      const height = container.clientHeight;

      VALID_BODY_PARTS.forEach(part => {
        const el = hudElements[part];
        const info = activeRegionState[part];
        if (!state.showHudCallouts || Math.abs(info.scale - 1.0) < 0.05) {
          el.classList.add('hidden');
          return;
        }

        const node = bodyNodes[part];
        const worldPos = new THREE.Vector3();
        node.getWorldPosition(worldPos);
        if (part === 'Head') worldPos.y += 0.22 * node.scale.y;
        if (part === 'Chest') worldPos.y += 0.16 * node.scale.y;
        if (part === 'Legs') worldPos.y -= 0.4;

        worldPos.project(camera);

        if (worldPos.z < 1) {
          const x = (worldPos.x * 0.5 + 0.5) * width;
          const y = (-(worldPos.y * 0.5) + 0.5) * height;
          el.style.left = `${x}px`;
          el.style.top = `${y}px`;
          el.classList.remove('hidden');

          if (state.isLeftEyeActive) {
            el.className = "absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-void/90 border border-crimson text-white text-[9px] font-mono font-bold uppercase shadow-lg pointer-events-none whitespace-nowrap";
            el.textContent = `${part} ${info.scale.toFixed(2)}x [${info.shader}]`;
          } else {
            el.className = "absolute transform -translate-x-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-white/90 border border-slate-300 text-slate-700 text-[9px] font-mono font-semibold uppercase shadow pointer-events-none whitespace-nowrap";
            el.textContent = `${part} // 1.0x`;
          }
        } else {
          el.classList.add('hidden');
        }
      });
    }

    function toggleCalloutLabels() {
      state.showHudCallouts = !state.showHudCallouts;
      showToast(`HUD Anatomical Tags: ${state.showHudCallouts ? 'VISIBLE' : 'HIDDEN'}`);
    }

    /* =========================================================================
       4. 60 FPS RENDER LOOP (DECOUPLED KINEMATIC ANCHORS & SHADER ANIMATION)
       ========================================================================= */
    const clock = window.THREE ? new THREE.Clock() : { getElapsedTime: () => 0 };

    function animateLoop() {
      requestAnimationFrame(animateLoop);
      const elapsed = clock.getElapsedTime();

      if (state.isAutoRotating && mannequinRoot) {
        mannequinRoot.rotation.y += 0.0055;
      }

      VALID_BODY_PARTS.forEach(part => {
        const node = bodyNodes[part];
        const info = activeRegionState[part];
        const targetScalar = state.isLeftEyeActive ? info.scale : 1.0;
        node.userData.targetScale.set(targetScalar, targetScalar, targetScalar);
        node.scale.lerp(node.userData.targetScale, 0.09);
      });

      const abdS = bodyNodes["Abdomen"].scale.y;
      const chestS = bodyNodes["Chest"].scale.y;
      const chestW = bodyNodes["Chest"].scale.x;
      const neckS = bodyNodes["Neck"].scale.y;
      const lArmS = bodyNodes["LeftArm"].scale.y;
      const rArmS = bodyNodes["RightArm"].scale.y;

      const chestBaseY = 0.24 * abdS;
      const neckBaseY = chestBaseY + 0.34 * chestS;
      const headBaseY = neckBaseY + 0.11 * neckS;
      const shoulderY = chestBaseY + 0.29 * chestS;
      const shoulderX = 0.26 * chestW;

      bodyNodes["Abdomen"].userData.anchorPos.set(0, 0, 0);
      bodyNodes["Chest"].userData.anchorPos.set(0, chestBaseY, 0);
      bodyNodes["Neck"].userData.anchorPos.set(0, neckBaseY, 0);
      bodyNodes["Head"].userData.anchorPos.set(0, headBaseY, 0);
      bodyNodes["LeftArm"].userData.anchorPos.set(shoulderX, shoulderY, 0);
      bodyNodes["RightArm"].userData.anchorPos.set(-shoulderX, shoulderY, 0);
      bodyNodes["LeftHand"].userData.anchorPos.set(shoulderX + 0.048 * lArmS, shoulderY - 0.39 * lArmS, 0);
      bodyNodes["RightHand"].userData.anchorPos.set(-shoulderX - 0.048 * rArmS, shoulderY - 0.39 * rArmS, 0);
      bodyNodes["Legs"].userData.anchorPos.set(0, 0, 0);

      VALID_BODY_PARTS.forEach((part, idx) => {
        const node = bodyNodes[part];
        const info = activeRegionState[part];
        const pts = staticParticles[part];
        const anchor = node.userData.anchorPos;

        if (state.isLeftEyeActive) {
          const shader = info.shader;

          if (pts) {
            pts.visible = (shader === 'SAND_STATIC');
            if (pts.visible) {
              pts.rotation.y = elapsed * 6.0;
              pts.position.x = (Math.random() - 0.5) * 0.02;
            }
          }

          if (shader === 'SAND_STATIC') {
            node.position.x = anchor.x + (Math.random() - 0.5) * 0.026;
            node.position.y = THREE.MathUtils.lerp(node.position.y, anchor.y, 0.15);
            node.position.z = anchor.z + (Math.random() - 0.5) * 0.026;
          } else if (shader === 'WATER') {
            node.position.x = anchor.x;
            node.position.y = anchor.y + Math.sin(elapsed * 2.8 + idx) * 0.022;
            node.position.z = anchor.z;
          } else if (shader === 'RUST_METAL') {
            node.position.x = anchor.x;
            node.position.y = THREE.MathUtils.lerp(node.position.y, anchor.y - 0.032, 0.12);
            node.position.z = anchor.z;
          } else if (shader === 'GLASS_FRACTURE') {
            materials.GLASS_FRACTURE.emissiveIntensity = 0.55 + Math.abs(Math.sin(elapsed * 7.0)) * 0.65;
            node.position.lerp(anchor, 0.15);
          } else {
            node.position.lerp(anchor, 0.15);
          }
        } else {
          if (pts) pts.visible = false;
          node.position.lerp(anchor, 0.15);
        }
      });

      controls.update();
      renderer.render(scene, camera);
      updateHudCallouts();
    }

    function onViewportResize() {
      const container = document.getElementById('threeCanvasContainer');
      if (!container || !renderer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }

    /* =========================================================================
       5. RIGHT EYE vs. LEFT EYE DUAL-MODE CONTROLLER
       ========================================================================= */
    function toggleEyeMode(triggerSource = 'TOGGLE') {
      state.isLeftEyeActive = !state.isLeftEyeActive;
      syncEyeModeVisuals();
      playSomaticToggleSound(state.isLeftEyeActive);

      if (triggerSource === 'WEBCAM_OCCLUSION') {
        showToast(state.isLeftEyeActive ? "Right Eye Covered: Left Eye Homunculus Active" : "Right Eye Uncovered: Clinical View Restored");
      } else {
        showToast(state.isLeftEyeActive ? "LEFT EYE ENGAGED: Somatic Homunculus Projected" : "RIGHT EYE ENGAGED: Neutral 1.0x View");
      }
    }

    function syncEyeModeVisuals() {
      const body = document.getElementById('bodyElement');
      const scanlines = document.getElementById('scanlineOverlay');
      const modeBadge = document.getElementById('modeBadge');
      const eyeDot = document.getElementById('eyeSwitchDot');
      const eyeBtnText = document.getElementById('eyeButtonText');
      const masterBtn = document.getElementById('masterEyeToggle');
      const viewportHeader = document.getElementById('viewportModeHeader');
      const brandIconBox = document.getElementById('brandIconBox');

      if (state.isLeftEyeActive) {
        body.classList.add('left-eye-mode', 'manga-screentone');
        body.classList.remove('clinical-grid');
        scanlines.style.opacity = '0.75';

        modeBadge.textContent = "LEFT EYE // HOMUNCULUS FILTER";
        modeBadge.className = "text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border border-crimson bg-crimson/20 text-crimson shadow-[0_0_12px_rgba(225,29,72,0.4)]";

        brandIconBox.className = "w-9 h-9 rounded-xl bg-crimson/20 border border-crimson flex items-center justify-center text-crimson shadow-[0_0_15px_rgba(225,29,72,0.4)] transition-all duration-300";

        eyeDot.className = "w-2.5 h-2.5 rounded-full bg-white animate-ping";
        eyeBtnText.textContent = "OPEN RIGHT EYE (RETURN NEUTRAL)";
        masterBtn.className = "relative px-3.5 sm:px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2.5 shadow-lg shadow-crimson/40 bg-crimson text-white border border-rose-400";

        viewportHeader.textContent = `LEFT EYE // SYMBOLIC MORPH (${state.somaticData.distortion_index}% DISTORTION)`;

        scene.background = new THREE.Color(0x070709);
        ambientLight.intensity = 0.38;
        mainDirLight.intensity = 0.75;
        crimsonRimLight.intensity = 2.6;
        cyanRimLight.intensity = 1.2;
        if (floorGridCenterMat) floorGridCenterMat.color.setHex(0xe11d48);
        if (floorGridLinesMat) floorGridLinesMat.color.setHex(0x4c0519);
        pedestalMesh.material.color.setHex(0x14141d);

        VALID_BODY_PARTS.forEach(part => {
          const shaderKey = activeRegionState[part].shader || 'NORMAL';
          const mat = materials[shaderKey] || materials.NORMAL;
          bodyMeshes[part].forEach(m => { m.material = mat; });
        });

      } else {
        body.classList.remove('left-eye-mode', 'manga-screentone');
        body.classList.add('clinical-grid');
        scanlines.style.opacity = '0';

        modeBadge.textContent = "RIGHT EYE // NEUTRAL 1.0x";
        modeBadge.className = "text-[10px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-500/10 text-emerald-600";

        brandIconBox.className = "w-9 h-9 rounded-xl bg-sky-500/10 border border-sky-500/40 flex items-center justify-center text-sky-600 transition-all duration-300";

        eyeDot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400";
        eyeBtnText.textContent = "COVER RIGHT EYE (TOGGLE LEFT EYE)";
        masterBtn.className = "relative px-3.5 sm:px-4 py-2 rounded-xl font-mono text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center gap-2.5 shadow-md bg-slate-900 text-white hover:bg-crimson border border-slate-700";

        viewportHeader.textContent = "3D BODY METAPHOR // RIGHT EYE (1.0x)";

        scene.background = new THREE.Color(0xf1f5f9);
        ambientLight.intensity = 0.9;
        mainDirLight.intensity = 1.15;
        crimsonRimLight.intensity = 0.15;
        cyanRimLight.intensity = 0.5;
        if (floorGridCenterMat) floorGridCenterMat.color.setHex(0x94a3b8);
        if (floorGridLinesMat) floorGridLinesMat.color.setHex(0xe2e8f0);
        pedestalMesh.material.color.setHex(0xcbd5e1);

        VALID_BODY_PARTS.forEach(part => {
          bodyMeshes[part].forEach(m => { m.material = materials.CLINICAL; });
        });
      }
    }

    window.addEventListener('keydown', (e) => {
      const dossierOpen = !document.getElementById('dossierModal').classList.contains('hidden');

      if (e.code === 'Escape' && dossierOpen) {
        closeDossierModal();
        return;
      }
      if (dossierOpen) return;

      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable) return;
      if (e.code === 'Space' && !e.repeat) {
        if (e.target instanceof Element && e.target.closest('button, a, [role="button"]')) return;
        e.preventDefault();
        toggleEyeMode('SPACEBAR');
      }
    });

    /* =========================================================================
       6. SYMMETRIC LIVE WEBCAM "COVER RIGHT EYE" LUMINANCE OCCLUSION DETECTOR
       ========================================================================= */
    let webcamStream = null;
    let camMonitorInterval = null;
    let baselineLuma = null;
    let occlusionCooldown = false;
    let isHandCoveringEye = false;

    async function toggleLiveEyeSensor() {
      const wrapper = document.getElementById('miniCamWrapper');
      const video = document.getElementById('topWebcamVideo');
      const statusText = document.getElementById('camStatusText');
      const simBtn = document.getElementById('simulateCoverBtn');

      if (!state.liveCamActive) {
        try {
          webcamStream = await navigator.mediaDevices.getUserMedia({
            video: { width: 160, height: 120, facingMode: 'user' }
          });
          video.srcObject = webcamStream;
          state.liveCamActive = true;
          wrapper.classList.remove('hidden');
          simBtn.classList.remove('hidden');
          statusText.textContent = "Brightness Demo: ARMED";
          statusText.classList.add('text-emerald-500');
          baselineLuma = null;
          isHandCoveringEye = false;

          camMonitorInterval = setInterval(checkRightEyeOcclusion, 120);
          showToast("Experimental brightness sensor armed. Lighting changes can trigger it; manual controls remain available.");
        } catch (err) {
          state.liveCamActive = false;
          wrapper.classList.add('hidden');
          simBtn.classList.remove('hidden');
          statusText.textContent = 'Manual demo only';
          statusText.classList.remove('text-emerald-500');
          showToast('Camera unavailable. Use Cover Test or Space; the camera detector is only a brightness heuristic.');
        }
      } else {
        stopLiveEyeSensor();
      }
    }

    function stopLiveEyeSensor() {
      state.liveCamActive = false;
      isHandCoveringEye = false;
      if (camMonitorInterval) clearInterval(camMonitorInterval);
      if (webcamStream) {
        webcamStream.getTracks().forEach(t => t.stop());
        webcamStream = null;
      }
      document.getElementById('miniCamWrapper').classList.add('hidden');
      document.getElementById('simulateCoverBtn').classList.add('hidden');
      const statusText = document.getElementById('camStatusText');
      statusText.textContent = "Camera Demo: OFF";
      statusText.classList.remove('text-emerald-500');
      showToast("Camera brightness demo disabled.");
    }

    function checkRightEyeOcclusion() {
      const video = document.getElementById('topWebcamVideo');
      const canvas = document.getElementById('hiddenCamCanvas');
      const roiBox = document.getElementById('eyeRoiBox');
      if (!video || video.readyState < 2 || !state.liveCamActive) return;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;
      try { ctx.drawImage(video, 0, 0, 64, 48); } catch (_) { return; }
      let imgData;
      try { imgData = ctx.getImageData(8, 8, 22, 18).data; } catch (_) { return; }
      let sumLuma = 0;
      const pixelCount = imgData.length / 4;
      for (let i = 0; i < imgData.length; i += 4) {
        sumLuma += (0.299 * imgData[i] + 0.587 * imgData[i + 1] + 0.114 * imgData[i + 2]);
      }
      const avgLuma = sumLuma / pixelCount;

      if (baselineLuma === null) {
        baselineLuma = avgLuma;
        return;
      }

      const dropRatio = avgLuma / Math.max(baselineLuma, 1);

      if (dropRatio < 0.68) {
        roiBox.className = "absolute top-1 left-1 w-5 h-4 border-2 border-crimson bg-crimson/40 transition-colors pointer-events-none";
        if (!isHandCoveringEye && !occlusionCooldown) {
          isHandCoveringEye = true;
          occlusionCooldown = true;
          if (!state.isLeftEyeActive) toggleEyeMode('WEBCAM_OCCLUSION');
          setTimeout(() => { occlusionCooldown = false; }, 900);
        }
      } else if (dropRatio > 0.78) {
        roiBox.className = "absolute top-1 left-1 w-5 h-4 border border-emerald-400 bg-emerald-400/10 transition-colors pointer-events-none";
        if (isHandCoveringEye && !occlusionCooldown) {
          isHandCoveringEye = false;
          occlusionCooldown = true;
          if (state.isLeftEyeActive) toggleEyeMode('WEBCAM_OCCLUSION');
          setTimeout(() => { occlusionCooldown = false; }, 900);
        }
        baselineLuma = baselineLuma * 0.95 + avgLuma * 0.05;
      }
    }

    function triggerManualOcclusion() {
      toggleEyeMode('MANUAL_COVER_TEST');
      showToast('Manual cover test toggled the visual mode; this is a demo control, not eye tracking.');
    }

    /* =========================================================================
       7. LOCAL SOMATIC METAPHOR ENGINE (NO EXTERNAL AI API)
       ========================================================================= */
    function processSomaticInput() {
      const inputEl = document.getElementById('patientInput');
      const rawText = inputEl.value.trim();
      if (!rawText) {
        showToast('Please type or dictate a body sensation or metaphor first.');
        inputEl.focus();
        return;
      }
      if (rawText.length > 1200) {
        showToast('Please keep the description under 1,200 characters.');
        return;
      }

      const analyzeBtn = document.getElementById('analyzeBtn');
      const latencyBadge = document.getElementById('engineLatencyBadge');
      const aiSyncStatus = document.getElementById('aiSyncStatus');
      if (analyzeBtn.disabled) return;

      analyzeBtn.disabled = true;
      analyzeBtn.setAttribute('aria-busy', 'true');
      analyzeBtn.classList.add('opacity-70', 'cursor-wait');
      try {
        const result = runInstantSemanticAnalyzer(rawText);
        applySomaticDataset(result);
        if (!state.isLeftEyeActive) toggleEyeMode('AUTO_ANALYZE');
        latencyBadge.textContent = 'Local heuristic active';
        aiSyncStatus.textContent = 'Local keyword-based demo mapping • no API calls';
        showToast('Local visualization updated. The mapping is heuristic, not a diagnosis.');
      } catch (err) {
        console.error('Local analysis failed.', err);
        showToast('Could not analyze this description. Please try again.');
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.removeAttribute('aria-busy');
        analyzeBtn.classList.remove('opacity-70', 'cursor-wait');
      }
    }

    function runInstantSemanticAnalyzer(quote) {
      const lower = quote.toLowerCase();
      const regions = [];
      let score = 52;

      const rules = [
        {
          keywords: ['chest', 'heart', 'lungs', 'rib', 'thorax', 'breathing'],
          part: 'Chest',
          defaultShader: lower.includes('water') || lower.includes('drown') || lower.includes('submerged') ? 'WATER' : 'RUST_METAL',
          scale: 1.85,
          metaphor: "Crushing thoracic weight and constriction",
          clinical: "A neutral restatement of chest pressure or tightness; this tool cannot identify a cause."
        },
        {
          keywords: ['head', 'skull', 'brain', 'migraine', 'temple'],
          part: 'Head',
          defaultShader: lower.includes('glass') || lower.includes('shard') || lower.includes('sharp') || lower.includes('fractur') ? 'GLASS_FRACTURE' : 'SAND_STATIC',
          scale: 2.05,
          metaphor: "High-frequency cranial static and pressure",
          clinical: "A metaphor for buzzing, overload, or head discomfort; this is not a clinical interpretation."
        },
        {
          keywords: ['neck', 'throat', 'cervical'],
          part: 'Neck',
          defaultShader: 'RUST_METAL',
          scale: 1.55,
          metaphor: "Rigid constricted neck lock",
          clinical: "A neutral restatement of neck or throat tension; this tool cannot identify a cause."
        },
        {
          keywords: ['stomach', 'gut', 'abdomen', 'belly', 'nausea'],
          part: 'Abdomen',
          defaultShader: 'SMOKE_VOID',
          scale: 0.62,
          metaphor: "Hollow visceral emptiness",
          clinical: "A neutral restatement of abdominal emptiness or nausea; this tool cannot identify a cause."
        },
        {
          keywords: ['left hand', 'right hand', 'hand', 'fingers', 'palm'],
          part: (lower.includes('right hand') || lower.includes('right fingers') || lower.includes('right palm')) ? 'RightHand' : 'LeftHand',
          defaultShader: lower.includes('static') || lower.includes('buzz') ? 'SAND_STATIC' : 'SMOKE_VOID',
          scale: lower.includes('numb') || lower.includes('hollow') ? 0.65 : 1.75,
          metaphor: "Distal numbness and sensory detachment",
          clinical: "A neutral restatement of numbness or tingling; this tool cannot identify a cause."
        },
        {
          keywords: ['left arm', 'right arm', 'left shoulder', 'right shoulder', 'arm', 'shoulder'],
          part: (lower.includes('left arm') || lower.includes('left shoulder')) ? 'LeftArm' : 'RightArm',
          defaultShader: 'SAND_STATIC',
          scale: 1.65,
          metaphor: "Phantom electrical current along limb",
          clinical: "A metaphor for arm buzzing or tingling; the cause cannot be determined here."
        },
        {
          keywords: ['leg', 'legs', 'feet', 'knees'],
          part: 'Legs',
          defaultShader: 'RUST_METAL',
          scale: 1.65,
          metaphor: "Immobilized leaden lower extremities",
          clinical: "A neutral restatement of heaviness or fatigue; this tool cannot identify a cause."
        }
      ];

      rules.forEach(rule => {
        if (rule.keywords.some(k => lower.includes(k))) {
          regions.push({
            body_part: rule.part,
            scale_multiplier: rule.scale,
            material_shader: rule.defaultShader,
            intensity_score: 8,
            patient_metaphor: rule.metaphor,
            clinical_translation: rule.clinical
          });
          score += 12;
        }
      });

      if (regions.length === 0) {
        return {
          patient_quote: quote,
          overall_homunculus_archetype: 'Unmapped Metaphor',
          distortion_index: 0,
          regions: [],
          psychological_blindspot: 'No body-region keyword matched this description. Nothing is inferred; try naming the body area or use a preset to explore the interface.',
          clinician_questions: [
            'Which body area, if any, is this description about?',
            'What does this metaphor mean to you, in your own words?'
          ]
        };
      }

      return {
        patient_quote: quote,
        overall_homunculus_archetype: 'The Somatic Metaphor Sketch',
        distortion_index: Math.min(score, 96),
        regions,
        psychological_blindspot: 'Possible reflection only: ask what these metaphors mean to the speaker. Do not assume hidden emotions, trauma, or a medical cause.',
        clinician_questions: [
          'What does this body metaphor mean to you, in your own words?',
          'Is the sensation new, changing, or affecting everyday activities?'
        ]
      };
    }

    /* =========================================================================
       8. APPLY DATASET TO 3D HOMUNCULUS & CLINICAL BRIDGE UI
       ========================================================================= */
    function safeDisplayText(value, fallback = '', maxLength = 500) {
      if (typeof value !== 'string') return fallback;
      return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, maxLength) || fallback;
    }

    function sanitizeSomaticDataset(rawData) {
      const source = rawData && typeof rawData === 'object' && !Array.isArray(rawData) ? rawData : {};
      const seen = new Set();
      const regions = (Array.isArray(source.regions) ? source.regions : []).slice(0, VALID_BODY_PARTS.length)
        .filter(r => r && typeof r === 'object' && VALID_BODY_PARTS.includes(r.body_part) && !seen.has(r.body_part) && seen.add(r.body_part))
        .map(r => {
          const rawScale = Number(r.scale_multiplier);
          const rawIntensity = Number(r.intensity_score);
          return {
            body_part: r.body_part,
            scale_multiplier: Number.isFinite(rawScale) ? Math.min(2.5, Math.max(0.5, rawScale)) : 1,
            material_shader: VALID_SHADERS.includes(r.material_shader) ? r.material_shader : 'NORMAL',
            intensity_score: Number.isFinite(rawIntensity) ? Math.min(10, Math.max(0, Math.round(rawIntensity))) : 5,
            patient_metaphor: safeDisplayText(r.patient_metaphor, 'User-described body metaphor', 240),
            clinical_translation: safeDisplayText(r.clinical_translation, 'A possible neutral rephrasing only; cause is not determined.', 500)
          };
        });
      const score = Number(source.distortion_index);
      const questions = (Array.isArray(source.clinician_questions) ? source.clinician_questions : [])
        .filter(q => typeof q === 'string').slice(0, 6)
        .map(q => safeDisplayText(q, '', 240)).filter(Boolean);
      return {
        patient_quote: safeDisplayText(source.patient_quote, '', 1200),
        overall_homunculus_archetype: safeDisplayText(source.overall_homunculus_archetype, 'Somatic Metaphor Sketch', 100),
        distortion_index: Number.isFinite(score) ? Math.round(Math.min(100, Math.max(0, score))) : 0,
        regions,
        psychological_blindspot: safeDisplayText(source.psychological_blindspot, 'Ask what this metaphor means to the person; do not assume an explanation.', 600),
        clinician_questions: questions.length ? questions : ['What does this metaphor mean to you?', 'Is there anything you want someone to understand about this sensation?']
      };
    }

    function applySomaticDataset(rawData) {
      const data = sanitizeSomaticDataset(rawData);
      state.somaticData = data;

      VALID_BODY_PARTS.forEach(part => {
        activeRegionState[part] = { scale: 1.0, shader: 'NORMAL' };
      });

      data.regions.forEach(r => {
        activeRegionState[r.body_part] = { scale: r.scale_multiplier, shader: r.material_shader };
      });

      syncEyeModeVisuals();
      renderClinicalBridgeUI();
      if (data.regions.length > 0) {
        document.getElementById('overrideRegionSelect').value = data.regions[0].body_part;
      }
      syncOverrideControls();
    }

    function renderClinicalBridgeUI() {
      const data = state.somaticData;
      document.getElementById('hudArchetypeBanner').textContent = data.overall_homunculus_archetype;
      document.getElementById('activeArchetypeSub').textContent = data.overall_homunculus_archetype;
      document.getElementById('distortionScoreBadge').textContent = `${data.distortion_index} / 100`;
      document.getElementById('distortionMeterBar').style.width = `${data.distortion_index}%`;
      document.getElementById('regionCountBadge').textContent = `${data.regions.length} Mapped Regions`;
      document.getElementById('blindspotBoxText').textContent = data.psychological_blindspot;

      const listEl = document.getElementById('regionsTranslationList');
      listEl.replaceChildren();
      if (!data.regions.length) {
        const empty = document.createElement('div');
        empty.className = 'p-4 rounded-xl theme-card border text-center text-xs font-mono theme-text-muted';
        empty.textContent = 'All regions are at the neutral 1.00x baseline. Describe a metaphor or adjust a slider to explore a visual mapping.';
        listEl.appendChild(empty);
      } else {
        data.regions.forEach(r => {
          const card = document.createElement('div');
          card.dataset.regionCard = r.body_part;
          card.tabIndex = 0;
          card.setAttribute('role', 'button');
          card.setAttribute('aria-label', `Inspect ${r.body_part}`);
          card.className = 'p-3 rounded-xl theme-card border hover:border-crimson cursor-pointer transition';
          card.addEventListener('click', () => selectRegionForOverride(r.body_part));
          card.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              selectRegionForOverride(r.body_part);
            }
          });

          const top = document.createElement('div');
          top.className = 'flex items-center justify-between gap-2 mb-1.5';
          const name = document.createElement('span');
          name.className = 'text-xs font-mono font-bold theme-text-primary flex items-center gap-1.5';
          const dot = document.createElement('span');
          dot.className = 'w-2 h-2 rounded-full bg-crimson shrink-0';
          const nameText = document.createElement('span');
          nameText.textContent = r.body_part;
          name.append(dot, nameText);
          const badges = document.createElement('div');
          badges.className = 'flex items-center gap-1 font-mono text-[10px] shrink-0';
          const scaleBadge = document.createElement('span');
          scaleBadge.className = 'px-1.5 py-0.5 rounded bg-crimson/15 text-crimson font-bold border border-crimson/30';
          scaleBadge.textContent = `${r.scale_multiplier.toFixed(2)}x`;
          const shaderBadge = document.createElement('span');
          shaderBadge.className = 'px-1.5 py-0.5 rounded theme-panel border theme-text-secondary';
          shaderBadge.textContent = r.material_shader;
          badges.append(scaleBadge, shaderBadge);
          top.append(name, badges);

          const metaphor = document.createElement('div');
          metaphor.className = 'text-[11px] theme-text-secondary mb-1.5';
          const metaphorLabel = document.createElement('span');
          metaphorLabel.className = 'text-[9px] font-mono uppercase text-crimson font-bold block';
          metaphorLabel.textContent = 'Metaphor (user wording / model summary):';
          const metaphorText = document.createElement('p');
          metaphorText.className = 'mt-0.5';
          metaphorText.textContent = `“${r.patient_metaphor}”`;
          metaphor.append(metaphorLabel, metaphorText);

          const translation = document.createElement('div');
          translation.className = 'text-[11px] theme-text-primary pt-1.5 border-t border-slate-300/50 dark:border-zinc-800';
          const translationLabel = document.createElement('span');
          translationLabel.className = 'text-[9px] font-mono uppercase text-emerald-500 font-bold block';
          translationLabel.textContent = 'Possible neutral phrasing (not a diagnosis):';
          const translationText = document.createElement('p');
          translationText.className = 'mt-0.5';
          translationText.textContent = r.clinical_translation;
          translation.append(translationLabel, translationText);
          card.append(top, metaphor, translation);
          listEl.appendChild(card);
        });
      }

      const qList = document.getElementById('clinicianQuestionsList');
      qList.replaceChildren();
      data.clinician_questions.forEach(q => {
        const li = document.createElement('li');
        li.textContent = q;
        qList.appendChild(li);
      });
      if (window.lucide?.createIcons) lucide.createIcons();
    }

    function loadPreset(presetId) {
      const preset = PRESETS[presetId];
      if (!preset) return;
      const cloned = JSON.parse(JSON.stringify(preset));
      document.getElementById('patientInput').value = cloned.patient_quote;
      applySomaticDataset(cloned);

      if (!state.isLeftEyeActive) {
        toggleEyeMode('PRESET_CLICK');
      } else {
        playSomaticToggleSound(true);
        showToast(`Loaded Preset 0${presetId}: ${cloned.overall_homunculus_archetype}`);
      }
    }

    /* =========================================================================
       9. LIVE Live SOMATIC OVERRIDE CONTROLS & DECOUPLED RAYCAST SELECTION
       ========================================================================= */
    function syncOverrideControls() {
      const region = document.getElementById('overrideRegionSelect').value;
      const info = activeRegionState[region] || { scale: 1.0, shader: 'NORMAL' };

      document.getElementById('overrideShaderSelect').value = info.shader;
      document.getElementById('overrideScaleSlider').value = info.scale;
      document.getElementById('overrideScaleValue').textContent = `${Number(info.scale).toFixed(2)}x`;
      document.getElementById('overrideSliderLabel').textContent = `${region} Scale Multiplier`;
    }

    function applyManualOverride() {
      const region = document.getElementById('overrideRegionSelect').value;
      const shader = document.getElementById('overrideShaderSelect').value;
      const scale = parseFloat(document.getElementById('overrideScaleSlider').value);

      document.getElementById('overrideScaleValue').textContent = `${scale.toFixed(2)}x`;
      activeRegionState[region] = { scale, shader };

      const existingIdx = state.somaticData.regions.findIndex(r => r.body_part === region);
      if (Math.abs(scale - 1.0) < 0.03 && shader === 'NORMAL') {
        if (existingIdx !== -1) state.somaticData.regions.splice(existingIdx, 1);
      } else if (existingIdx !== -1) {
        state.somaticData.regions[existingIdx].scale_multiplier = scale;
        state.somaticData.regions[existingIdx].material_shader = shader;
      } else {
        state.somaticData.regions.push({
          body_part: region,
          scale_multiplier: scale,
          material_shader: shader,
          intensity_score: Math.min(10, Math.round(scale * 4)),
          patient_metaphor: `Manual somatic modulation (${shader})`,
          clinical_translation: `Manual visual scale adjustment (${scale.toFixed(2)}x) for ${region}; not a clinical measurement.`
        });
      }

      const activeCount = state.somaticData.regions.length;
      const totalDeviation = state.somaticData.regions.reduce((acc, r) => acc + Math.abs(r.scale_multiplier - 1.0), 0);
      state.somaticData.distortion_index = activeCount === 0 ? 0 : Math.min(99, Math.round(45 + totalDeviation * 28));

      renderClinicalBridgeUI();

      if (!state.isLeftEyeActive) {
        toggleEyeMode('MANUAL_SLIDER');
      } else {
        syncEyeModeVisuals();
      }
    }

    function selectRegionForOverride(partName) {
      if (!VALID_BODY_PARTS.includes(partName)) return;
      document.getElementById('overrideRegionSelect').value = partName;
      syncOverrideControls();

      const card = document.querySelector(`[data-region-card="${partName}"]`);
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        card.classList.add('ring-2', 'ring-crimson');
        setTimeout(() => card.classList.remove('ring-2', 'ring-crimson'), 1200);
      }
    }

    function resetAllLimbs() {
      VALID_BODY_PARTS.forEach(part => {
        activeRegionState[part] = { scale: 1.0, shader: 'NORMAL' };
      });
      state.somaticData = {
        patient_quote: "Baseline 1.0x Somatosensory Reference State.",
        overall_homunculus_archetype: "Neutral Cortical Baseline (1.0x)",
        distortion_index: 0,
        regions: [],
        psychological_blindspot: "No mapped regions are currently active. This is only the neutral visual baseline, not a health assessment.",
        clinician_questions: [
          "Ask the patient to describe any emerging physical heaviness, tightness, or sensory static."
        ]
      };
      document.getElementById('patientInput').value = '';
      syncOverrideControls();
      syncEyeModeVisuals();
      renderClinicalBridgeUI();
      showToast('All regions and the illustrative score reset to the neutral baseline.');
    }

    const raycaster = window.THREE ? new THREE.Raycaster() : null;
    const pointer = window.THREE ? new THREE.Vector2() : { x: 0, y: 0 };

    function onLimbRaycastClick(event) {
      const dx = event.clientX - pointerDownPos.x;
      const dy = event.clientY - pointerDownPos.y;
      if (Math.hypot(dx, dy) > 5) return;

      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      if (!raycaster || !mannequinRoot) return;
      raycaster.setFromCamera(pointer, camera);
      const intersects = raycaster.intersectObjects(mannequinRoot.children, true);
      for (const hit of intersects) {
        const part = hit.object?.userData?.bodyPart;
        if (part) {
          selectRegionForOverride(part);
          showToast(`Inspecting ${part} (${activeRegionState[part].scale.toFixed(2)}x • ${activeRegionState[part].shader})`);
          break;
        }
      }
    }

    /* =========================================================================
       10. VOICE MICROPHONE WITH RACE-FREE STAGE DICTATION FALLBACK
       ========================================================================= */
    let recognition = null;
    let isDictating = false;
    let isFallbackTyping = false;
    let fallbackTypingTimer = null;

    async function toggleVoiceInput() {
      if (isDictating || isFallbackTyping) {
        stopVoiceInput();
        return;
      }

      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      // Browser SpeechRecognition commonly uses a remote service by default. This public
      // release permits it only if the browser exposes an on-device availability check.
      if (!SpeechRec || typeof SpeechRec.available !== 'function') {
        runStageSafeDictationFallback();
        return;
      }

      try {
        const availability = await SpeechRec.available({
          langs: ['en-US'],
          processLocally: true
        });
        if (availability !== 'available') {
          runStageSafeDictationFallback();
          return;
        }

        recognition = new SpeechRec();
        if (!('processLocally' in recognition)) {
          recognition = null;
          runStageSafeDictationFallback();
          return;
        }
        recognition.processLocally = true;
        recognition.lang = 'en-US';
        recognition.interimResults = true;
        recognition.continuous = false;

        recognition.onstart = () => {
          setVoiceUIState(true, 'Listening on device...');
        };

        recognition.onresult = (event) => {
          let transcript = '';
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          document.getElementById('patientInput').value = transcript;
        };

        recognition.onerror = () => {
          runStageSafeDictationFallback();
        };

        recognition.onend = () => {
          if (isFallbackTyping) return;
          if (isDictating) {
            stopVoiceInput();
            processSomaticInput();
          }
        };

        recognition.start();
      } catch (_) {
        // Fail closed: do not fall back to a browser-managed cloud speech service.
        runStageSafeDictationFallback();
      }
    }

    function runStageSafeDictationFallback() {
      isFallbackTyping = false;
      clearInterval(fallbackTypingTimer);
      setVoiceUIState(false, '');
      showToast('Private on-device speech recognition is unavailable. No voice was sent; type your description or choose a preset instead.');
    }

    function setVoiceUIState(active, statusLabel) {
      isDictating = active;
      const waveBox = document.getElementById('voiceWaveformBox');
      const micBtn = document.getElementById('micBtn');
      const micBtnLabel = document.getElementById('micBtnLabel');
      const labelEl = document.getElementById('voiceStatusLabel');

      if (active) {
        waveBox.classList.remove('hidden');
        labelEl.textContent = statusLabel;
        micBtn.classList.add('border-crimson', 'text-crimson');
        micBtnLabel.textContent = "Stop";
      } else {
        waveBox.classList.add('hidden');
        micBtn.classList.remove('border-crimson', 'text-crimson');
        micBtnLabel.textContent = "Speak";
      }
    }

    function stopVoiceInput() {
      isFallbackTyping = false;
      clearInterval(fallbackTypingTimer);
      if (recognition) {
        try { recognition.stop(); } catch (e) {}
      }
      setVoiceUIState(false, "");
    }

    /* =========================================================================
       11. WEB AUDIO API LOW-FREQUENCY SOMATIC SOUND SYNTHESIZER
       ========================================================================= */
    let audioCtx = null;

    function ensureAudioContext() {
      if (!audioCtx) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    }

    function playSomaticToggleSound(enteringLeftEye) {
      if (!state.audioEnabled) return;
      ensureAudioContext();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const filter = audioCtx.createBiquadFilter();
      const gain = audioCtx.createGain();

      osc1.type = enteringLeftEye ? 'sawtooth' : 'sine';
      osc2.type = 'triangle';

      if (enteringLeftEye) {
        osc1.frequency.setValueAtTime(155, now);
        osc1.frequency.exponentialRampToValueAtTime(42, now + 0.55);
        osc2.frequency.setValueAtTime(77.5, now);
        osc2.frequency.exponentialRampToValueAtTime(28, now + 0.55);
        filter.frequency.setValueAtTime(420, now);
        filter.frequency.exponentialRampToValueAtTime(95, now + 0.55);
      } else {
        osc1.frequency.setValueAtTime(220, now);
        osc1.frequency.exponentialRampToValueAtTime(440, now + 0.3);
        osc2.frequency.setValueAtTime(330, now);
        osc2.frequency.exponentialRampToValueAtTime(660, now + 0.3);
        filter.frequency.setValueAtTime(900, now);
      }

      gain.gain.setValueAtTime(0.16, now);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + (enteringLeftEye ? 0.6 : 0.35));

      osc1.connect(filter);
      osc2.connect(filter);
      filter.connect(gain);
      gain.connect(audioCtx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.65);
      osc2.stop(now + 0.65);
    }

    function toggleAudioDrone() {
      state.audioEnabled = !state.audioEnabled;
      const icon = document.getElementById('audioIcon');
      const label = document.getElementById('audioLabel');
      icon.setAttribute('data-lucide', state.audioEnabled ? 'volume-2' : 'volume-x');
      label.textContent = state.audioEnabled ? 'Audio SFX' : 'Muted';
      if (window.lucide?.createIcons) lucide.createIcons();
      if (state.audioEnabled) playSomaticToggleSound(state.isLeftEyeActive);
      showToast(`Somatic Sound Engine: ${state.audioEnabled ? 'ENABLED' : 'MUTED'}`);
    }

    /* =========================================================================
       12. MODALS, CAMERA UTILITIES & DOSSIER EXPORT
       ========================================================================= */
    function openDossierModal() {
      const data = state.somaticData;
      document.getElementById('dossierTimestamp').textContent = new Date().toISOString().slice(0, 10);
      document.getElementById('dossierArchetype').textContent = data.overall_homunculus_archetype;
      document.getElementById('dossierIndex').textContent = `${data.distortion_index} / 100 (illustrative UI score)`;
      document.getElementById('dossierRegionCount').textContent = `${data.regions.length} Mapped Regions`;
      document.getElementById('dossierQuote').textContent = `“${data.patient_quote}”`;
      document.getElementById('dossierBlindspot').textContent = data.psychological_blindspot;

      const tbody = document.getElementById('dossierTableBody');
      tbody.replaceChildren();
      if (!data.regions.length) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 5;
        td.className = 'p-4 text-center font-mono text-slate-400';
        td.textContent = 'All regions at the neutral 1.00x baseline.';
        tr.appendChild(td);
        tbody.appendChild(tr);
      } else {
        data.regions.forEach(r => {
          const tr = document.createElement('tr');
          const values = [r.body_part, `${r.scale_multiplier.toFixed(2)}x`, r.material_shader, `“${r.patient_metaphor}”`, r.clinical_translation];
          values.forEach((value, index) => {
            const td = document.createElement('td');
            td.className = ['p-3 font-mono font-bold', 'p-3 font-mono text-crimson font-bold', 'p-3 font-mono text-slate-600', 'p-3 italic text-slate-700', 'p-3 text-slate-900 font-medium'][index];
            td.textContent = value;
            tr.appendChild(td);
          });
          tbody.appendChild(tr);
        });
      }

      const qList = document.getElementById('dossierQuestions');
      qList.replaceChildren();
      data.clinician_questions.forEach(q => {
        const li = document.createElement('li');
        li.textContent = q;
        qList.appendChild(li);
      });
      document.getElementById('dossierModal').classList.remove('hidden');
      if (window.lucide?.createIcons) lucide.createIcons();
    }

    function closeDossierModal() {
      document.getElementById('dossierModal').classList.add('hidden');
    }

    function toggleAutoRotate() {
      state.isAutoRotating = !state.isAutoRotating;
      showToast(`3D Turntable Rotation: ${state.isAutoRotating ? 'ON' : 'PAUSED'}`);
    }

    function resetCameraView() {
      camera.position.set(0, 1.15, 3.45);
      controls.target.set(0, 0.92, 0);
      controls.update();
      showToast("Camera orbit reset to anterior view.");
    }

    let toastTimeout = null;
    function showToast(message) {
      const toast = document.getElementById('toast');
      document.getElementById('toastMessage').textContent = message;
      toast.classList.remove('translate-y-24', 'opacity-0');
      clearTimeout(toastTimeout);
      toastTimeout = setTimeout(() => {
        toast.classList.add('translate-y-24', 'opacity-0');
      }, 2600);
    }

    /* =========================================================================
       13. INITIALIZATION ON WINDOW LOAD
       ========================================================================= */
    function installActionHandlers() {
      const clickActions = {
        toggleLiveEyeSensor,
        triggerManualOcclusion,
        toggleAudioDrone,
        toggleEyeMode,
        toggleVoiceInput,
        processSomaticInput,
        loadPreset,
        resetAllLimbs,
        toggleCalloutLabels,
        toggleAutoRotate,
        resetCameraView,
        openDossierModal,
        closeDossierModal,
        printPage: () => window.print(),
      };
      const changeActions = { syncOverrideControls, applyManualOverride };
      const inputActions = { applyManualOverride };

      document.addEventListener('click', (event) => {
        const target = event.target instanceof Element ? event.target.closest('[data-action]') : null;
        if (!target) return;
        const action = clickActions[target.dataset.action];
        if (typeof action !== 'function') return;
        if (target.dataset.actionArg !== undefined) action(target.dataset.actionArg);
        else action();
      });
      document.addEventListener('change', (event) => {
        const target = event.target;
        const action = changeActions[target?.dataset?.changeAction];
        if (typeof action === 'function') action();
      });
      document.addEventListener('input', (event) => {
        const target = event.target;
        const action = inputActions[target?.dataset?.inputAction];
        if (typeof action === 'function') action();
      });
    }
    installActionHandlers();

    window.addEventListener('load', () => {
      try {
        initThreeEngine();
        document.getElementById('patientInput').value = PRESETS[1].patient_quote;
        applySomaticDataset(PRESETS[1]);
        if (window.lucide?.createIcons) lucide.createIcons();
      } catch (error) {
        console.error('LEFT EYE initialization failed:', error);
        const canvas = document.getElementById('threeCanvasContainer');
        if (canvas) {
          canvas.classList.add('flex', 'items-center', 'justify-center', 'p-6');
          const message = document.createElement('p');
          message.className = 'max-w-md text-center text-sm font-mono theme-text-secondary';
          message.textContent = 'The 3D viewer could not start. Check that WebGL is enabled, refresh the page, or try a recent version of Chrome/Edge.';
          canvas.replaceChildren(message);
        }
        showToast('3D viewer failed to initialize. The details are available in the browser console.');
      }
    });

    window.addEventListener('pagehide', () => {
      stopLiveEyeSensor();
      stopVoiceInput();
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close().catch(() => {});
      if (renderer) renderer.dispose();
    });
