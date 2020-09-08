import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
	providedIn: 'root'
})
export class ThreeService {
	private wrapper: HTMLDivElement;
	private target: HTMLCanvasElement;

	private scene: THREE.Scene;
	private camera: THREE.Camera;
	private renderer: THREE.Renderer;
	private sceneObjects = [];

	constructor() {}

	init($wrapper: HTMLDivElement, $target: HTMLCanvasElement): void {
		this.wrapper = $wrapper;
		this.target = $target;

		this.scene = new THREE.Scene();

		this.camera = new THREE.PerspectiveCamera(75, $wrapper.clientWidth / $wrapper.clientHeight, 0.1, 1000);
		this.camera.position.z = 5;

		this.renderer = new THREE.WebGLRenderer();
		this.renderer.setSize($wrapper.clientWidth, $wrapper.clientHeight);

		this.adjustLighting();
		this.addBasicCube();
		this.render();
	}

	private adjustLighting(): void {
		const pointLight: THREE.PointLight = new THREE.PointLight(0xdddddd);
		pointLight.position.set(-5, -3, 3);
		this.scene.add(pointLight);

		const ambientLight: THREE.AmbientLight = new THREE.AmbientLight(0x505050);
		this.scene.add(ambientLight);
	}

	private addBasicCube(): void {
		const geometry: THREE.BoxGeometry = new THREE.BoxGeometry(1, 1, 1);
		const material: THREE.MeshLambertMaterial = new THREE.MeshLambertMaterial();

		const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
		mesh.position.x = -2;
		this.scene.add(mesh);
		this.sceneObjects.push(mesh);
	}

	private render(): void {
		const r: FrameRequestCallback = () => {
			this._render();

			requestAnimationFrame(r);
		};
		requestAnimationFrame(r);
	}

	private _render(): void {

		for (let object of this.sceneObjects) {
			object.rotation.x += 0.01;
			object.rotation.y += 0.03;
		}

		this.renderer.render(this.scene, this.camera);

		const c: HTMLCanvasElement = this.target;
		c.width = this.wrapper.clientWidth;
		c.height = this.wrapper.clientHeight;
		const ctx: CanvasRenderingContext2D = c.getContext('2d');
		ctx.drawImage(this.renderer.domElement, 0, 0);
	}
}
