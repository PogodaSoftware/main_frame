import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
  geometry!: THREE.BoxGeometry;
  material!: THREE.MeshBasicMaterial;
  torus!: THREE.Mesh;
  pointLight!: THREE.PointLight;
  ambientLight!: THREE.AmbientLight;
  lightHelper!: THREE.PointLightHelper;
  gridHelper!: THREE.GridHelper;
  controls!: OrbitControls;
  sphereGeometry!: THREE.SphereGeometry;
  star!: THREE.Mesh;
  spaceTexture!: THREE.Texture;
  boxMesh!: THREE.Mesh;
  loader!: GLTFLoader;

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

    this.camera.position.set(0, 1, 2);
    this.scene.add(this.camera);

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;

    this.geometry = new THREE.BoxGeometry(1, 1, 1);
    this.material = new THREE.MeshBasicMaterial({ color: 'red' });
    this.boxMesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.boxMesh);

    this.loader = new GLTFLoader();
    this.loader.load('./assets/snowman-practice.glb', function (glb) {
      console.log(glb);
    });

    this.renderer.render(this.scene, this.camera);

    // -------------------------------------------------------------------

    // const canvas = document.querySelector('.webgl') as HTMLCanvasElement;
    // const scene = new THREE.Scene();

    // const sizes = {
    //   width: window.innerWidth,
    //   height: window.innerHeight,
    // };

    // const camera = new THREE.PerspectiveCamera(
    //   75,
    //   sizes.width / sizes.height,
    //   0.1,
    //   100
    // );
    // camera.position.set(0, 1, 2);
    // scene.add(camera);

    // const renderer = new THREE.WebGLRenderer({
    //   canvas: canvas
    // });

    // renderer.setSize(sizes.width, sizes.height);
    // renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    // renderer.shadowMap.enabled= true;

    // -------------------------------------------------------
    // this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0x000000);
    // this.camera = new THREE.PerspectiveCamera(
    //   40,
    //   window.innerWidth / window.innerHeight,
    //   1,
    //   5000
    // );
    // this.camera.rotation.y = (45 / 180) * Math.PI;
    // this.camera.position.x = 800;
    // this.camera.position.y = 100;
    // this.camera.position.z = 1000;
    // this.ambientLight = new THREE.AmbientLight(0x404040, 100);
    // this.scene.add(this.ambientLight);
    // this.renderer = new THREE.WebGLRenderer({ antialias: true });
    // this.renderer.setSize(window.innerWidth, window.innerHeight);
    // document.body.appendChild(this.renderer.domElement);
    // let loader = new GLTFLoader();
    // loader.load('./assets/scifi_crate.glb', (gltf) => {
    //   let crate = gltf.scene.children[0];
    //   crate.scale.set(0.5, 0.5, 0.5);
    //   this.scene.add(gltf.scene);
    //   this.renderer.render(this.scene, this.camera);
    // });
    // ---------------------------------------------------------------

    // this.scene = new THREE.Scene();
    // this.scene.background = new THREE.Color(0x000000);
    // this.camera = new THREE.PerspectiveCamera(
    //   40,
    //   window.innerWidth / window.innerHeight,
    //   1,
    //   5000
    // );

    // const animate = () => {
    //   requestAnimationFrame(animate);
    //   this.torus.rotation.x += 0.01;
    //   this.torus.rotation.y += 0.005;
    //   this.torus.rotation.z += 0.01;
    //   this.controls.update();
    //   this.renderer.render(this.scene, this.camera);
    // };
    // const addStars = () => {
    //   this.sphereGeometry = new THREE.SphereGeometry(0.25, 24, 24);
    //   this.material = new THREE.MeshStandardMaterial({ color: 0xffffff });
    //   this.star = new THREE.Mesh(this.sphereGeometry, this.material);
    //   const [x, y, z] = Array(3)
    //     .fill(0)
    //     .map(() => THREE.MathUtils.randFloatSpread(100));
    //   this.star.position.set(x, y, z);
    //   this.scene.add(this.star);
    // };

    // this.scene = new THREE.Scene();
    // this.camera = new THREE.PerspectiveCamera(
    //   75,
    //   window.innerWidth / window.innerHeight,
    //   0.1,
    //   1000
    // );
    // this.renderer = new THREE.WebGLRenderer({
    //   canvas: document.querySelector('#webgl') as HTMLCanvasElement,
    // });
    // this.renderer.setPixelRatio(window.devicePixelRatio);
    // this.renderer.setSize(window.innerWidth, window.innerHeight);
    // this.camera.position.setZ(30);
    // this.renderer.render(this.scene, this.camera);

    // this.geometry = new THREE.TorusGeometry(10, 3, 16, 100);
    // this.material = new THREE.MeshStandardMaterial({ color: 0xff6347 });
    // this.torus = new THREE.Mesh(this.geometry, this.material);
    // this.scene.add(this.torus);
    // this.pointLight = new THREE.PointLight(0xffffff);
    // this.pointLight.position.set(5, 5, 5);
    // this.ambientLight = new THREE.AmbientLight(0xffffff);
    // this.scene.add(this.pointLight, this.ambientLight);
    // this.lightHelper = new THREE.PointLightHelper(this.pointLight);
    // this.gridHelper = new THREE.GridHelper(200, 50);
    // this.scene.add(this.lightHelper, this.gridHelper);
    // this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    // this.spaceTexture = new THREE.TextureLoader().load('./assets/sci-fi-crate.png');
    // this.scene.background = this.spaceTexture;
    // animate();
    // Array(200).fill(0).forEach(addStars);
  }
}
