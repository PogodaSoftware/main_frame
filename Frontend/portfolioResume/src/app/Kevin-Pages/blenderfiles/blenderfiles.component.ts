import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

@Component({
  selector: 'app-blenderfiles',
  imports: [],
  template: `
    <body>
      <canvas id="canvas"></canvas>
      <canvas id="canvas1"></canvas>
      <script src="blenderfiles.js"></script>
    </body>
  `,
  styleUrls: ['./blenderfiles.component.scss'],
})
// implements OnInit
export class KevinBlenderFilesComponent {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  pointLight!: THREE.PointLight;
  ambientLight!: THREE.AmbientLight;
  lightHelper!: THREE.PointLightHelper;
  gridHelper!: THREE.GridHelper;
  controls!: OrbitControls;
  loader!: GLTFLoader;
  dLoader!: DRACOLoader;

  ngOnInit(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#canvas') as HTMLCanvasElement,
    });
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.dLoader = new DRACOLoader();
    this.loader = new GLTFLoader();

    this.camera.position.set(0, 1, 3);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.scene.add(this.camera);

    // directional light
    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(10, 10, 10);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-10, 10, 10);
    this.scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 1);
    light3.position.set(0, 10, -10);
    this.scene.add(light3);

    const helper1 = new THREE.DirectionalLightHelper(light1, 5);
    this.scene.add(helper1);

    const helper2 = new THREE.DirectionalLightHelper(light2, 5);
    this.scene.add(helper2);

    const helper3 = new THREE.DirectionalLightHelper(light3, 5);
    this.scene.add(helper3);

    this.gridHelper = new THREE.GridHelper(100, 50);
    this.scene.add(this.gridHelper);

    this.dLoader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    );

    this.loader.setDRACOLoader(this.dLoader);

    this.dLoader.setDecoderConfig({ type: 'js' });

    this.loader.load(
      './assets/snowman.glb',
      (glb) => {
        console.log(glb);
        const root = glb.scene;
        this.scene.add(root);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.log('An error happened');
      }
    );

    const animate = () => {
      requestAnimationFrame(animate);
      this.renderer.render(this.scene, this.camera);
    };

    animate();
  }
}
