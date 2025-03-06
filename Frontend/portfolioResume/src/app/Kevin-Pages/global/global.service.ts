import { Injectable } from '@angular/core';
import { Component, OnInit } from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';

@Injectable({
  providedIn: 'root',
})
export class KevinGlobalService {
  openPage(url: string): void {
    window.open(url, '_blank');
  }

  threeDimensionModelBuilder(): void {
    const renderer = new THREE.WebGLRenderer({
      canvas: document.querySelector('#canvas1') as HTMLCanvasElement,
    });

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const controls = new OrbitControls(camera, renderer.domElement);



    camera.position.set(0, 1, 3);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    scene.add(camera);

    const light1 = new THREE.DirectionalLight(0xffffff, 1);
    light1.position.set(10, 10, 10);
    scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 1);
    light2.position.set(-10, 10, 10);
    scene.add(light2);

    const light3 = new THREE.DirectionalLight(0xffffff, 1);
    light3.position.set(0, 10, -10);
    scene.add(light3);

    const helper1 = new THREE.DirectionalLightHelper(light1, 5);
    scene.add(helper1);

    const helper2 = new THREE.DirectionalLightHelper(light2, 5);
    scene.add(helper2);

    const helper3 = new THREE.DirectionalLightHelper(light3, 5);
    scene.add(helper3);

    const gridHelper = new THREE.GridHelper(100, 50);
    scene.add(gridHelper);

    const dloader = new DRACOLoader();
    const loader = new GLTFLoader();

    dloader.setDecoderPath(
      'https://www.gstatic.com/draco/versioned/decoders/1.5.7/'
    );

    loader.setDRACOLoader(dloader);

    dloader.setDecoderConfig({ type: 'js' });

    loader.load(
      './assets/snowman.glb',
      (glb) => {
        console.log(glb);
        const root = glb.scene;
        scene.add(root);
      },
      (xhr) => {
        console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
      },
      (error) => {
        console.log('An error happened');
      }
    );

    function animate() {
      requestAnimationFrame(animate);
      renderer.render(scene, camera);
    }
    animate();
  }
}
