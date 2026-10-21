import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BotState } from '../types';

interface AurumCore3DProps {
  state: BotState;
  symbol?: string;
  price?: number;
  heightClass?: string;
  onStateSelect?: (state: BotState) => void;
}

export const AurumCore3D: React.FC<AurumCore3DProps> = ({
  state,
  symbol = 'XAUUSD',
  price = 2745.80,
  heightClass = 'h-72 sm:h-80',
  onStateSelect,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Detect software WebGL
    let isSoftwareGl = false;
    try {
      const probeCanvas = document.createElement('canvas');
      const gl = probeCanvas.getContext('webgl2');
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }
    } catch {
      isSoftwareGl = true;
    }

    const width = container.clientWidth || 360;
    const height = container.clientHeight || 300;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 7.8);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;

    // Room Environment for realistic glass refractions & metallic highlights
    try {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    } catch {
      // fallback
    }

    container.appendChild(renderer.domElement);

    // 2. Lighting Rig (Warm key light, cool rim, central glow)
    const ambientLight = new THREE.AmbientLight(0x06070c, 1.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xf6e7b8, 3.0);
    keyLight.position.set(5, 6, 6);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x7fd6ff, 2.2);
    fillLight.position.set(-5, -3, -5);
    scene.add(fillLight);

    const corePointLight = new THREE.PointLight(0xe8c56a, 2.5, 12);
    corePointLight.position.set(0, 0, 0);
    scene.add(corePointLight);

    // 3. Composite 3D Procedural Model: Le Noyau Aurum
    const rootGroup = new THREE.Group();
    scene.add(rootGroup);

    // Floating Levitation Rig container
    const floatingGroup = new THREE.Group();
    rootGroup.add(floatingGroup);

    // --- Part 1: Outer Glass Sphere (Texture vitrée) ---
    const glassGeo = new THREE.SphereGeometry(1.45, 64, 64);
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.06,
      metalness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.92,
      opacity: isSoftwareGl ? 0.35 : 0.88,
      transparent: true,
      ior: 1.54, // Glass index of refraction
      thickness: 1.6,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      specularIntensity: 1.0,
      attenuationDistance: 2.0,
      attenuationColor: new THREE.Color(0xe8c56a),
      depthWrite: false,
    });
    const glassSphere = new THREE.Mesh(glassGeo, glassMat);
    floatingGroup.add(glassSphere);

    // --- Part 2: Inner Faceted Gem Core (Crystal inside the glass) ---
    const innerCrystalGeo = new THREE.IcosahedronGeometry(0.9, 1);
    const innerCrystalMat = new THREE.MeshStandardMaterial({
      color: 0x10121b,
      roughness: 0.25,
      metalness: 0.85,
      emissive: 0xe8c56a,
      emissiveIntensity: 0.85,
      wireframe: false,
    });
    const innerCrystalMesh = new THREE.Mesh(innerCrystalGeo, innerCrystalMat);
    floatingGroup.add(innerCrystalMesh);

    // --- Part 3: Inner Wire Lattice ---
    const innerWireGeo = new THREE.IcosahedronGeometry(0.98, 2);
    const innerWireMat = new THREE.MeshBasicMaterial({
      color: 0xe8c56a,
      wireframe: true,
      transparent: true,
      opacity: 0.7,
    });
    const innerWireMesh = new THREE.Mesh(innerWireGeo, innerWireMat);
    floatingGroup.add(innerWireMesh);

    // --- Part 4: Equatorial Golden Gimbal Ring ---
    const ring1Geo = new THREE.TorusGeometry(2.1, 0.04, 16, 120);
    const ring1Mat = new THREE.MeshStandardMaterial({
      color: 0xe8c56a,
      roughness: 0.15,
      metalness: 0.95,
      emissive: 0x9a7b2c,
      emissiveIntensity: 0.35,
    });
    const ring1 = new THREE.Mesh(ring1Geo, ring1Mat);
    floatingGroup.add(ring1);

    // --- Part 5: Polar Tilted Orbital Ring with Glacier accents ---
    const ring2Geo = new THREE.TorusGeometry(2.45, 0.03, 16, 120);
    const ring2Mat = new THREE.MeshStandardMaterial({
      color: 0x7fd6ff,
      roughness: 0.2,
      metalness: 0.9,
      emissive: 0x225577,
      emissiveIntensity: 0.4,
    });
    const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
    ring2.rotation.x = Math.PI / 3;
    ring2.rotation.y = Math.PI / 5;
    floatingGroup.add(ring2);

    // --- Part 6: Exterior Reticle Ring with tick dashes ---
    const ring3Geo = new THREE.TorusGeometry(2.8, 0.018, 12, 90);
    const ring3Mat = new THREE.MeshBasicMaterial({
      color: 0xf6e7b8,
      transparent: true,
      opacity: 0.4,
    });
    const ring3 = new THREE.Mesh(ring3Geo, ring3Mat);
    ring3.rotation.x = -Math.PI / 4;
    ring3.rotation.z = Math.PI / 3;
    floatingGroup.add(ring3);

    // --- Part 7: Swarm Particles (Orbital Stardust) ---
    const particleCount = 64;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleRadius = 3.1;

    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2;
      const phi = ((i % 7) - 3) * 0.35;
      particlePositions[i * 3] = Math.cos(theta) * particleRadius * Math.cos(phi);
      particlePositions[i * 3 + 1] = Math.sin(phi) * 1.6;
      particlePositions[i * 3 + 2] = Math.sin(theta) * particleRadius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xf6e7b8,
      size: 0.09,
      transparent: true,
      opacity: 0.85,
    });
    const particlePoints = new THREE.Points(particleGeo, particleMat);
    floatingGroup.add(particlePoints);

    // Contact shadow grounded plane beneath floating core
    const shadowGeo = new THREE.PlaneGeometry(3.8, 3.8);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const ctx = shadowCanvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0.55)');
      grad.addColorStop(0.5, 'rgba(0, 0, 0, 0.2)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTexture = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -2.6;
    rootGroup.add(shadowMesh);

    // Color references (Zero GC in loop)
    const colAurum = new THREE.Color(0xe8c56a);
    const colGlacier = new THREE.Color(0x7fd6ff);
    const colEmber = new THREE.Color(0xff6b5b);
    const colChampagne = new THREE.Color(0xf6e7b8);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const renderLoop = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const currentBotState = stateRef.current;

      // ----------------------------------------------------
      // STATE REACTOR DYNAMICS:
      // - surveillance: pulsation dorée lente (0.8 Hz)
      // - trade (entree / en_trade): rotation rapide dorée (speed 3.2x)
      // - objectif (objectif_atteint): bleu glacier
      // - erreur: rouge braise
      // ----------------------------------------------------
      let targetRotSpeed = 0.6;
      let targetColor = colAurum;
      let pulseAmp = 0.05;
      let pulseFreq = 0.8; // lente

      const isTrade = currentBotState === 'en_trade' || currentBotState === 'entree' || currentBotState === 'fvg_repere' || currentBotState === 'cassure_structure' || currentBotState === 'prise_de_liquidite';
      const isObjective = currentBotState === 'objectif_atteint';
      const isError = currentBotState === 'erreur';

      if (isError) {
        // Erreur: rouge braise
        targetRotSpeed = 2.4;
        targetColor = colEmber;
        pulseAmp = 0.12;
        pulseFreq = 4.0;
      } else if (isObjective) {
        // Objectif: bleu glacier
        targetRotSpeed = 1.3;
        targetColor = colGlacier;
        pulseAmp = 0.08;
        pulseFreq = 1.4;
      } else if (isTrade) {
        // Trade: rotation rapide dorée
        targetRotSpeed = 3.2; // Rapid rotation
        targetColor = colAurum;
        pulseAmp = 0.10;
        pulseFreq = 2.8;
      } else {
        // Surveillance: pulsation dorée lente
        targetRotSpeed = 0.45;
        targetColor = colAurum;
        pulseAmp = 0.06;
        pulseFreq = 0.8; // Slow calm breathing
      }

      // Smooth color transitions
      innerCrystalMat.emissive.lerp(targetColor, 0.08);
      innerWireMat.color.lerp(targetColor, 0.08);
      corePointLight.color.lerp(targetColor, 0.08);
      glassMat.attenuationColor.lerp(targetColor, 0.08);

      // 1. Flottement (Levitation oscillation along Y axis)
      const levitation = Math.sin(elapsed * 1.4) * 0.22;
      floatingGroup.position.y = levitation;
      floatingGroup.rotation.z = Math.sin(elapsed * 0.7) * 0.06;

      // Dynamic shadow breathing with height
      shadowMesh.scale.set(1 + levitation * 0.35, 1 + levitation * 0.35, 1);

      // 2. Rotations (Rapid in trade, gentle in surveillance)
      floatingGroup.rotation.y += targetRotSpeed * delta * 0.7;
      ring1.rotation.z += targetRotSpeed * delta * 0.9;
      ring2.rotation.x -= targetRotSpeed * delta * 0.75;
      ring3.rotation.y += targetRotSpeed * delta * 0.4;
      particlePoints.rotation.y -= targetRotSpeed * delta * 0.35;

      // 3. Pulsation (Respiration vitrée et cristalline)
      const pulse = 1 + Math.sin(elapsed * pulseFreq * Math.PI * 2) * pulseAmp;
      innerCrystalMesh.scale.set(pulse, pulse, pulse);
      innerWireMesh.scale.set(pulse * 1.04, pulse * 1.04, pulse * 1.04);
      glassSphere.scale.set(1 + (pulse - 1) * 0.4, 1 + (pulse - 1) * 0.4, 1 + (pulse - 1) * 0.4);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 360;
      const h = container.clientHeight || 300;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (renderer.domElement.parentElement) {
        renderer.domElement.parentElement.removeChild(renderer.domElement);
      }
      renderer.dispose();
      glassGeo.dispose();
      glassMat.dispose();
      innerCrystalGeo.dispose();
      innerCrystalMat.dispose();
      innerWireGeo.dispose();
      innerWireMat.dispose();
      ring1Geo.dispose();
      ring1Mat.dispose();
      ring2Geo.dispose();
      ring2Mat.dispose();
      ring3Geo.dispose();
      ring3Mat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
      shadowGeo.dispose();
      shadowMat.dispose();
      shadowTexture.dispose();
    };
  }, []);

  const stateLabels: Record<string, { label: string; modeDesc: string; colorClass: string; badgeBorder: string }> = {
    surveillance: {
      label: 'Surveillance active',
      modeDesc: 'Pulsation dorée lente · Carnet M5 sous veille',
      colorClass: 'text-[#e8c56a]',
      badgeBorder: 'border-[#e8c56a]/40 bg-[#e8c56a]/10',
    },
    prise_de_liquidite: {
      label: 'Prise de liquidité',
      modeDesc: 'Rotation rapide dorée · Balayage Asie',
      colorClass: 'text-[#f6e7b8]',
      badgeBorder: 'border-[#f6e7b8]/40 bg-[#f6e7b8]/10',
    },
    cassure_structure: {
      label: 'Cassure de structure',
      modeDesc: 'Rotation rapide dorée · Impulsion BOS',
      colorClass: 'text-[#e8c56a]',
      badgeBorder: 'border-[#e8c56a]/40 bg-[#e8c56a]/10',
    },
    fvg_repere: {
      label: 'FVG repéré',
      modeDesc: 'Rotation rapide dorée · Imbalance M5',
      colorClass: 'text-[#e8c56a]',
      badgeBorder: 'border-[#e8c56a]/40 bg-[#e8c56a]/10',
    },
    entree: {
      label: 'Entrée en trade',
      modeDesc: 'Rotation rapide dorée · Ordre exécuté',
      colorClass: 'text-[#e8c56a]',
      badgeBorder: 'border-[#e8c56a]/40 bg-[#e8c56a]/15',
    },
    en_trade: {
      label: 'En trade actif',
      modeDesc: 'Rotation rapide dorée · Cible en vue',
      colorClass: 'text-[#e8c56a]',
      badgeBorder: 'border-[#e8c56a]/40 bg-[#e8c56a]/15',
    },
    objectif_atteint: {
      label: 'Objectif atteint',
      modeDesc: 'Bleu glacier radiant · Take Profit validé',
      colorClass: 'text-[#7fd6ff]',
      badgeBorder: 'border-[#7fd6ff]/40 bg-[#7fd6ff]/15',
    },
    pause: {
      label: 'En pause',
      modeDesc: 'Respiration ambrée basse · Veille passive',
      colorClass: 'text-[#8d90a3]',
      badgeBorder: 'border-[#8d90a3]/40 bg-[#8d90a3]/10',
    },
    erreur: {
      label: 'Anomalie / Alerte',
      modeDesc: 'Rouge braise · Vérifier connexion',
      colorClass: 'text-[#ff6b5b]',
      badgeBorder: 'border-[#ff6b5b]/40 bg-[#ff6b5b]/15',
    },
  };

  const currentInfo = stateLabels[state] || stateLabels.surveillance;

  return (
    <div className={`relative w-full ${heightClass} flex flex-col items-center justify-center overflow-hidden rounded-[24px]`}>
      {/* Background radial volumetric glow behind 3D floating glass sphere */}
      <div 
        className="absolute inset-0 pointer-events-none transition-all duration-1000 opacity-50 blur-3xl"
        style={{
          background: state === 'erreur' 
            ? 'radial-gradient(circle, rgba(255,107,91,0.3) 0%, transparent 68%)'
            : state === 'objectif_atteint'
            ? 'radial-gradient(circle, rgba(127,214,255,0.28) 0%, transparent 68%)'
            : state === 'en_trade' || state === 'entree'
            ? 'radial-gradient(circle, rgba(246,231,184,0.28) 0%, rgba(232,197,106,0.18) 45%, transparent 70%)'
            : 'radial-gradient(circle, rgba(232,197,106,0.22) 0%, transparent 68%)',
        }}
      />

      {/* Reticle guide markings */}
      <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 pointer-events-none flex justify-between items-center opacity-25">
        <div className="w-10 h-[1px] bg-[#e8c56a]" />
        <div className="w-10 h-[1px] bg-[#e8c56a]" />
      </div>
      <div className="absolute inset-y-8 left-1/2 -translate-x-1/2 pointer-events-none flex flex-col justify-between items-center opacity-25">
        <div className="h-10 w-[1px] bg-[#e8c56a]" />
        <div className="h-10 w-[1px] bg-[#e8c56a]" />
      </div>

      {/* Three.js Canvas Container */}
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing relative z-10" />

      {/* Top Left Status Badge */}
      <div className="absolute top-3 left-4 pointer-events-none z-20 flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-[#8d90a3] font-mono">
          Noyau Aurum 3D
        </span>
        <span className={`text-xs font-heading font-semibold ${currentInfo.colorClass}`}>
          {currentInfo.label}
        </span>
      </div>

      {/* Top Right Live Telemetry */}
      <div className="absolute top-3 right-4 pointer-events-none z-20 text-right">
        <span className="text-[10px] font-mono uppercase tracking-wider text-[#8d90a3] block">
          XAUUSD
        </span>
        <span className="text-xs font-mono text-[#e9e6dc] font-bold tabular-nums">
          {price.toFixed(2)} $
        </span>
      </div>

      {/* Bottom Center State Mode Description */}
      <div className="absolute bottom-3 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        <div className={`px-3 py-1 rounded-full border text-[11px] font-mono flex items-center gap-2 backdrop-blur-md ${currentInfo.badgeBorder} ${currentInfo.colorClass}`}>
          <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
          <span>{currentInfo.modeDesc}</span>
        </div>

        {/* Quick state switcher for demonstration & testing */}
        {onStateSelect && (
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#06070c]/80 border border-[#232637] backdrop-blur-md">
            <button
              onClick={() => onStateSelect('surveillance')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                state === 'surveillance' ? 'bg-[#e8c56a] text-[#06070c] font-bold' : 'text-[#8d90a3] hover:text-[#e8c56a]'
              }`}
              title="Surveillance : Pulsation dorée lente"
            >
              Surveillance
            </button>
            <button
              onClick={() => onStateSelect('en_trade')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                state === 'en_trade' ? 'bg-[#e8c56a] text-[#06070c] font-bold' : 'text-[#8d90a3] hover:text-[#e8c56a]'
              }`}
              title="Trade : Rotation rapide dorée"
            >
              Trade
            </button>
            <button
              onClick={() => onStateSelect('objectif_atteint')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                state === 'objectif_atteint' ? 'bg-[#7fd6ff] text-[#06070c] font-bold' : 'text-[#8d90a3] hover:text-[#7fd6ff]'
              }`}
              title="Objectif : Bleu glacier"
            >
              Objectif
            </button>
            <button
              onClick={() => onStateSelect('erreur')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition cursor-pointer ${
                state === 'erreur' ? 'bg-[#ff6b5b] text-[#06070c] font-bold' : 'text-[#8d90a3] hover:text-[#ff6b5b]'
              }`}
              title="Erreur : Rouge braise"
            >
              Erreur
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
