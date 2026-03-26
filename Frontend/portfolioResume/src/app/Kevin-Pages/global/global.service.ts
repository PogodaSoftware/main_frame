/**
 * Kevin Global Service
 *
 * Shared service providing utility functions used across Kevin's portfolio pages.
 * Handles two main responsibilities:
 *
 * 1. External URL Navigation - Opens URLs in new browser tabs with SSR safety
 * 2. Three.js 3D Model Rendering - Builds interactive WebGL viewers for
 *    Blender .glb models with orbit controls, HDR environments, and
 *    responsive canvas sizing
 *
 * SSR Compatibility:
 *   All browser-dependent operations (window, document, WebGL) are gated
 *   behind isPlatformBrowser checks to prevent errors during server rendering.
 */

import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

/**
 * Internal interface for tracking Three.js scene components per canvas.
 */
interface ThreeScene {
  scene: THREE.Scene;
  renderer: THREE.WebGLRenderer;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  currentModel?: THREE.Object3D;
}

@Injectable({
  providedIn: 'root',
})
export class KevinGlobalService {
  /**
   * @param platformId - Angular platform identifier for detecting
   *                     browser vs server rendering environment.
   */
  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  /**
   * Opens a URL in a new browser tab.
   * No-op during server-side rendering (SSR).
   *
   * @param url - The URL to open (can be relative or absolute).
   */
  openPage(url: string): void {
    if (isPlatformBrowser(this.platformId)) {
      window.open(url, '_blank');
    }
  }

  /** Registry of active Three.js scenes, keyed by canvas element ID. */
  private scenes: { [canvasId: string]: ThreeScene } = {};

  /**
   * Creates or updates a Three.js 3D model viewer on a canvas element.
   *
   * Sets up a complete WebGL rendering pipeline including:
   * - Scene with configurable background color or HDR environment
   * - Perspective camera with configurable initial position
   * - Three directional lights for model illumination
   * - OrbitControls for interactive rotation/zoom
   * - Responsive canvas resizing for mobile/tablet/desktop
   * - GLTF model loading with DRACO compression support
   *
   * If a scene already exists for the given canvas ID, only loads the
   * new model into the existing scene (prevents duplicate renderers).
   *
   * No-op during SSR (server-side rendering).
   *
   * @param canvasId - HTML element ID of the target canvas
   * @param modelPath - Filename of the .glb model (without extension, loaded from /assets/)
   * @param helpersBoolean - Whether to show directional light debug helpers
   * @param canvasColor - Background color of the scene (CSS color string)
   * @param cameraPositionX - Initial camera X position
   * @param cameraPositionY - Initial camera Y position (up/down)
   * @param cameraPositionZ - Initial camera Z position (near/far)
   * @param renderPositionWidth - Divisor for canvas width (e.g., 3 = window.innerWidth / 3)
   * @param renderPositionHeight - Divisor for canvas height (e.g., 2 = window.innerHeight / 2)
   * @param hdrPath - HDR environment map filename (without extension, loaded from /assets/)
   */
  threeDimensionModelBuilder(
    canvasId: string,
    modelPath: string,
    helpersBoolean: boolean,
    canvasColor: string,
    cameraPositionX: number,
    cameraPositionY: number,
    cameraPositionZ: number,
    renderPositionWidth: number,
    renderPositionHeight: number,
    hdrPath: string
  ): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    let threeScene = this.scenes[canvasId];
    const helpersOn = helpersBoolean;

    if (!threeScene) {
      // --- First-time setup for this canvas ---
      const canvas = document.querySelector(
        `#${canvasId}`
      ) as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(canvasColor);

      // Configure perspective camera
      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const controls = new OrbitControls(camera, renderer.domElement);

      // Set initial camera position (X = left/right, Y = up/down, Z = near/far)
      camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
      controls.update();

      // Add three directional lights from different angles for even illumination
      const light1 = new THREE.DirectionalLight(0xffffff, 1);
      light1.position.set(10, 10, 10);
      scene.add(light1);

      const light2 = new THREE.DirectionalLight(0xffffff, 1);
      light2.position.set(-10, 10, 10);
      scene.add(light2);

      const light3 = new THREE.DirectionalLight(0xffffff, 1);
      light3.position.set(0, 10, -10);
      scene.add(light3);

      // Optionally show light direction helpers for debugging
      if (helpersOn) {
        scene.add(
          new THREE.DirectionalLightHelper(light1, 5),
          new THREE.DirectionalLightHelper(light2, 5),
          new THREE.DirectionalLightHelper(light3, 5)
        );
      }

      // Load HDR environment map if specified (provides realistic reflections)
      const rgbeLoader = new RGBELoader();
      rgbeLoader.load(`./assets/${hdrPath}.hdr`, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
      });

      // Start the render loop (runs continuously via requestAnimationFrame)
      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      // Set initial canvas dimensions based on width/height divisors
      renderer.setSize(
        window.innerWidth / renderPositionWidth,
        window.innerHeight / renderPositionHeight
      );

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;

      // Responsive resize handler with breakpoints for mobile/tablet/desktop
      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        if(window.innerWidth <= 468) {
          // Mobile: 70% of viewport
          renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
        }
        else if(window.innerWidth <= 768) {
          // Tablet: 90% of viewport
          renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.9);
        }
        else{
          // Desktop: Use configured divisors
          renderer.setSize(
          window.innerWidth / renderPositionWidth,
          window.innerHeight / renderPositionHeight
        );
        }
      };

      window.addEventListener('resize', onResize);

      // Cache the scene for reuse
      threeScene = { scene, renderer, camera, controls };
      this.scenes[canvasId] = threeScene;
    }

    // --- Load the 3D model (runs for both new and existing scenes) ---
    // Configure DRACO decoder for compressed models
    const dLoader = new DRACOLoader();
    dLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    );
    dLoader.setDecoderConfig({ type: 'js' });

    // Load the GLTF/GLB model file
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dLoader);

    loader.load(
      `./assets/${modelPath}.glb`,
      (glb) => {
        console.log(glb.scene);
        threeScene.currentModel = glb.scene;
        threeScene.scene.add(glb.scene);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.error('Error loading model:', error);
      }
    );
  }
}
