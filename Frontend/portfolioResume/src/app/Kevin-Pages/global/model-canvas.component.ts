/**
 * KevinModelCanvasComponent — shared three.js canvas for project GLB models.
 *
 * Used by both Hero3dComponent (large stage, OrbitControls, ground) and
 * ProjectThumbComponent (small thumb, self-rotate). Loads `/assets/<model>.glb`
 * via GLTFLoader + DRACOLoader (gstatic CDN) and auto-fits the result.
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { Project } from './kevin-data';

const DRACO_CDN = 'https://www.gstatic.com/draco/versioned/decoders/1.5.7/';

@Component({
  selector: 'app-model-canvas',
  standalone: true,
  template: `<div class="model-canvas" #container></div>`,
  styles: [`
    :host { display: block; position: absolute; inset: 0; }
    .model-canvas { position: absolute; inset: 0; width: 100%; height: 100%; }
    .model-canvas canvas { display: block; width: 100% !important; height: 100% !important; }
  `],
})
export class KevinModelCanvasComponent
  implements AfterViewInit, OnDestroy, OnChanges
{
  @Input() project: Project | null = null;
  @Input() orbitControls = false;
  @Input() autoRotate = true;
  @Input() autoRotateSpeed = 1.2;
  @Input() ground = false;
  @Input() cameraPos: [number, number, number] = [4.5, 2.4, 4.5];
  @Input() fov = 35;
  @Input() fitScale = 2.6;
  @Input() selfRotateSpeed = 0; // applied when no orbit controls

  @ViewChild('container', { static: true }) containerRef!: ElementRef<HTMLDivElement>;

  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private controls?: OrbitControls;
  private modelHolder!: THREE.Group;
  private rafId: number | null = null;
  private resizeObserver: ResizeObserver | null = null;

  constructor(private ngZone: NgZone) {}

  ngAfterViewInit(): void {
    if (typeof window === 'undefined') return;
    this.init();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project'] && !changes['project'].firstChange) this.loadModel();
    if (changes['autoRotate'] && this.controls) this.controls.autoRotate = this.autoRotate;
  }

  ngOnDestroy(): void {
    this.cleanup();
  }

  private init(): void {
    const el = this.containerRef.nativeElement;
    this.scene = new THREE.Scene();

    const w = el.clientWidth || 1, h = el.clientHeight || 1;
    this.camera = new THREE.PerspectiveCamera(this.fov, w / h, 0.1, 100);
    this.camera.position.set(...this.cameraPos);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    el.appendChild(this.renderer.domElement);

    if (this.orbitControls) {
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.08;
      this.controls.enablePan = false;
      this.controls.minDistance = 3;
      this.controls.maxDistance = 8;
      this.controls.autoRotate = this.autoRotate;
      this.controls.autoRotateSpeed = this.autoRotateSpeed;
      this.controls.target.set(0, 0, 0);
    }

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const d1 = new THREE.DirectionalLight(0xffffff, 1.0); d1.position.set(6, 8, 6); this.scene.add(d1);
    const d2 = new THREE.DirectionalLight(0xffd4a5, 0.6); d2.position.set(-6, 5, 4); this.scene.add(d2);
    const d3 = new THREE.DirectionalLight(0x8eb8ff, 0.5); d3.position.set(0, 6, -8); this.scene.add(d3);

    this.modelHolder = new THREE.Group();
    this.scene.add(this.modelHolder);

    if (this.ground) {
      const groundGeom = new THREE.CircleGeometry(3.5, 64);
      const groundMat = new THREE.MeshStandardMaterial({
        color: 0x000000, roughness: 0.7, transparent: true, opacity: 0.18,
      });
      const ground = new THREE.Mesh(groundGeom, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -1.6;
      this.scene.add(ground);
    }

    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(el);

    this.loadModel();

    this.ngZone.runOutsideAngular(() => {
      const tick = () => {
        this.rafId = requestAnimationFrame(tick);
        this.controls?.update();
        if (!this.controls && this.modelHolder.children[0] && this.selfRotateSpeed) {
          this.modelHolder.children[0].rotation.y += this.selfRotateSpeed;
        }
        this.renderer.render(this.scene, this.camera);
      };
      tick();
    });
  }

  private loadModel(): void {
    if (!this.scene || !this.modelHolder || !this.project) return;

    while (this.modelHolder.children.length) {
      const child = this.modelHolder.children[0];
      this.modelHolder.remove(child);
      child.traverse?.((o: any) => {
        if (o.isMesh) {
          o.geometry?.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose());
          else o.material?.dispose();
        }
      });
    }

    const loader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath(DRACO_CDN);
    loader.setDRACOLoader(draco);

    const path = `/assets/${this.project.model}.glb`;
    loader.load(
      path,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fit = this.fitScale / maxDim;
        model.scale.setScalar(fit);
        model.position.set(-center.x * fit, -center.y * fit, -center.z * fit);

        // entrance animation
        const target = fit;
        model.scale.setScalar(0.001);
        const start = performance.now();
        const ease = (x: number) => 1 - Math.pow(1 - x, 3);
        const grow = () => {
          const k = Math.min(1, (performance.now() - start) / 600);
          model.scale.setScalar(target * ease(k));
          if (k < 1) requestAnimationFrame(grow);
        };
        grow();

        this.modelHolder.add(model);
      },
      undefined,
      () => {
        if (!this.project) return;
        // GLB failed — fall back to a simple accent torus knot so the slot is not empty
        const accent = new THREE.Color(this.project.accent || '#5ee0c4');
        const mat = new THREE.MeshStandardMaterial({
          color: accent, roughness: 0.25, metalness: 0.6,
          emissive: accent, emissiveIntensity: 0.1,
        });
        const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.8, 0.27, 200, 32), mat);
        const group = new THREE.Group();
        group.add(knot);
        const box = new THREE.Box3().setFromObject(group);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const fit = this.fitScale / maxDim;
        group.scale.setScalar(fit);
        group.position.set(-center.x * fit, -center.y * fit, -center.z * fit);
        this.modelHolder.add(group);
      },
    );
  }

  private onResize(): void {
    const el = this.containerRef?.nativeElement;
    if (!el || !this.camera || !this.renderer) return;
    const w = el.clientWidth, h = el.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private cleanup(): void {
    if (this.rafId != null) cancelAnimationFrame(this.rafId);
    this.resizeObserver?.disconnect();
    this.controls?.dispose();
    this.renderer?.dispose();
    if (this.renderer?.domElement?.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    this.scene?.traverse((o: any) => {
      if (o.isMesh) {
        o.geometry?.dispose();
        if (Array.isArray(o.material)) o.material.forEach((m: any) => m.dispose());
        else o.material?.dispose();
      }
    });
  }
}
