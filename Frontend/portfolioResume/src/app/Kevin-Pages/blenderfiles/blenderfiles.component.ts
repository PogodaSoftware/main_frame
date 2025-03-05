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
      <!-- <canvas id="bg"> </canvas> -->

      <canvas id="webgl"></canvas>
      <script src="blenderfiles.js"></script>
    </body>
  `,
  styleUrls: ['./blenderfiles.component.scss'],
})
export class KevinBlenderFilesComponent implements OnInit {
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
  light!: THREE.DirectionalLight;

  ngOnInit(): void {
    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#webgl') as HTMLCanvasElement,
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

    this.camera.position.set(0, 1, 2);

    this.renderer.setSize(window.innerWidth, window.innerHeight);

    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.renderer.shadowMap.enabled = true;

    this.scene.add(this.camera);

    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.position.set(2, 2, 5);
    this.scene.add(this.light);

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
