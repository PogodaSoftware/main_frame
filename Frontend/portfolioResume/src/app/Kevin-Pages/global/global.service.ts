import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

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
  openPage(url: string): void {
    window.open(url, '_blank');
  }

  private scenes: { [canvasId: string]: ThreeScene } = {};

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
    let threeScene = this.scenes[canvasId];
    const helpersOn = helpersBoolean;

    if (!threeScene) {
      const canvas = document.querySelector(
        `#${canvasId}`
      ) as HTMLCanvasElement;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(canvasColor);

      const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      const controls = new OrbitControls(camera, renderer.domElement);

      // cameraPositionX, cameraPositionY - UP, cameraPositionZ - BACK
      camera.position.set(cameraPositionX, cameraPositionY, cameraPositionZ);
      controls.update();

      const light1 = new THREE.DirectionalLight(0xffffff, 1);
      light1.position.set(10, 10, 10);
      scene.add(light1);

      const light2 = new THREE.DirectionalLight(0xffffff, 1);
      light2.position.set(-10, 10, 10);
      scene.add(light2);

      const light3 = new THREE.DirectionalLight(0xffffff, 1);
      light3.position.set(0, 10, -10);
      scene.add(light3);

      if (helpersOn) {
        scene.add(
          new THREE.DirectionalLightHelper(light1, 5),
          new THREE.DirectionalLightHelper(light2, 5),
          new THREE.DirectionalLightHelper(light3, 5)
        );
      }

      // scene.add(new THREE.GridHelper(100, 50));

      const rgbeLoader = new RGBELoader();
      rgbeLoader.load(`./assets/${hdrPath}.hdr`, (texture) => {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.background = texture;
        scene.environment = texture;
      });

      const animate = () => {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      renderer.setSize(
        window.innerWidth / renderPositionWidth,
        window.innerHeight / renderPositionHeight
      );

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      renderer.shadowMap.enabled = true;

      const onResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        if (window.innerWidth <= 468) {
          renderer.setSize(window.innerWidth * 0.7, window.innerHeight * 0.7);
        } else if (window.innerWidth <= 768) {
          renderer.setSize(window.innerWidth * 0.9, window.innerHeight * 0.9);
        } else if (window.innerWidth > 768) {
          renderer.setSize(window.innerWidth * 0.1, window.innerHeight * 0.1);
        } else {
          renderer.setSize(
            window.innerWidth / renderPositionWidth,
            window.innerHeight / renderPositionHeight
          );
        }
      };

      window.addEventListener('resize', onResize);

      threeScene = { scene, renderer, camera, controls };
      this.scenes[canvasId] = threeScene;
    }

    const dLoader = new DRACOLoader();
    dLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    );
    dLoader.setDecoderConfig({ type: 'js' });

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
