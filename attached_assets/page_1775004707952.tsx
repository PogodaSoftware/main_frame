// app/canvas/page.tsx
"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader';

import { HDRLoader } from "three/examples/jsm/Addons.js";

export default function CanvasPage() {
  const searchParams = useSearchParams();
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationIdRef = useRef<number | null>(null);

  useEffect(() => {
    // Get parameters from URL
    const model = searchParams.get('model') || 'snowman';
    const helpers = searchParams.get('helpers') === 'true';
    const color = searchParams.get('color') || '#000000';
    const cameraX = Number(searchParams.get('cameraX')) || 0;
    const cameraY = Number(searchParams.get('cameraY')) || 0;
    const cameraZ = Number(searchParams.get('cameraZ')) || 0;
    const hdrPath = searchParams.get('hdrPath') || '';

    const canvas = document.getElementById('fullscreenCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(color);
    sceneRef.current = scene;

    // Camera setup - full screen
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(cameraX, cameraY, cameraZ);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ 
      canvas, 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    controls.enableRotate = true;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(10, 10, 10);
    scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight2.position.set(-10, 10, 10);
    scene.add(directionalLight2);

    const directionalLight3 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight3.position.set(0, 10, -10);
    scene.add(directionalLight3);

    // Add helpers if requested
    if (helpers) {
      scene.add(
        new THREE.DirectionalLightHelper(directionalLight1, 5),
        new THREE.DirectionalLightHelper(directionalLight2, 5),
        new THREE.DirectionalLightHelper(directionalLight3, 5)
      );
      
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
      
      const gridHelper = new THREE.GridHelper(10, 10);
      scene.add(gridHelper);
    }

    // Load HDR texture if provided
    if (hdrPath && hdrPath.trim() !== '') {
      const hrdrLoader = new HDRLoader()
      hrdrLoader.load(`/hdr/${hdrPath}.hdr`, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
      }, undefined, (error) => {
        console.error('Error loading HDR:', error);
      });
    }

    // Load the model
    const dLoader = new DRACOLoader();
    dLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.7/');
    dLoader.setDecoderConfig({ type: 'js' });

    const loader = new GLTFLoader();
    loader.setDRACOLoader(dLoader);

    loader.load(
      `/models/${model}.glb`,
      (gltf) => {
        console.log(`Model ${model} loaded successfully`);
        
        // Add model to scene
        scene.add(gltf.scene);

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(gltf.scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        // Calculate the scale to fit the view
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 3 / maxDim;
        
        gltf.scene.position.x = -center.x * scale;
        gltf.scene.position.y = -center.y * scale;
        gltf.scene.position.z = -center.z * scale;
        gltf.scene.scale.setScalar(scale);

        // Update camera to look at the model
        controls.update();
      },
      (xhr) => {
        // Progress callback
        if (xhr.total === 0) {
          console.log(`Loading ${model}...`);
        } else {
          const percentLoaded = (xhr.loaded / xhr.total) * 100;
          console.log(`${percentLoaded.toFixed(2)}% loaded`);
        }
      },
      (error) => {
        console.error(`Error loading model ${model}:`, error);
      }
    );

    // Animation loop
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }

      if (rendererRef.current) {
        rendererRef.current.dispose();
      }

      if (controlsRef.current) {
        controlsRef.current.dispose();
      }

      // Dispose of all materials and geometries
      if (sceneRef.current) {
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) {
              object.geometry.dispose();
            }
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach(material => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          }
        });
      }
    };
  }, [searchParams]);

  return (
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      margin: 0, 
      padding: 0, 
      overflow: 'hidden',
      backgroundColor: '#000000'
    }}>
      <canvas 
        id="fullscreenCanvas" 
        style={{ 
          width: '100%', 
          height: '100%', 
          display: 'block' 
        }}
      />
      {/* <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: 'white',
        padding: '10px 15px',
        borderRadius: '5px',
        fontSize: '14px',
        fontFamily: 'Arial, sans-serif',
        zIndex: 100
      }}>
        <div>Use mouse/touch to:</div>
        <div>• Rotate: Left click + drag</div>
        <div>• Zoom: Scroll wheel or pinch</div>
        <div>• Pan: Right click + drag</div>
      </div> */}
    </div>
  );
}