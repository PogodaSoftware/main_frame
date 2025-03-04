import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';

@Component({
  selector: 'app-blenderfiles',
  imports: [],
  template: `
    <body>
      <canvas id="bg"> </canvas>
    </body>
  `,
  styleUrl: './blenderfiles.component.scss',
})
export class KevinBlenderFilesComponent implements OnInit {
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  renderer!: THREE.WebGLRenderer;
  geometry!: THREE.TorusGeometry;
  material!: THREE.MeshStandardMaterial;
  torus!: THREE.Mesh;
  pointLight!: THREE.PointLight;
  ambientLight!: THREE.AmbientLight;

  ngOnInit(): void {
    const animate = () => {
      requestAnimationFrame(animate);
      this.torus.rotation.x += 0.01;
      this.torus.rotation.y += 0.005;
      this.torus.rotation.z += 0.01;
      this.renderer.render(this.scene, this.camera);
    };

    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#bg') as HTMLCanvasElement,
    });

    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.camera.position.setZ(30);
    this.renderer.render(this.scene, this.camera);

    this.geometry = new THREE.TorusGeometry(10, 3, 16, 100);
    this.material = new THREE.MeshStandardMaterial({ color: 0xff6347});
    this.torus = new THREE.Mesh(this.geometry, this.material);

    this.scene.add(this.torus);

    this.pointLight = new THREE.PointLight(0xffffff);
    this.pointLight.position.set(5, 5, 5);
    this.ambientLight = new THREE.AmbientLight(0xffffff);
    this.scene.add(this.pointLight, this.ambientLight);

    animate();
  }
}
