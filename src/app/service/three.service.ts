import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { HttpClient } from '@angular/common/http';
import { HttpErrorResponse, HttpHeaders, HttpResponse } from '@angular/common/http';

import { Observable, throwError } from 'rxjs';

@Injectable({
	providedIn: 'root'
})
export class ThreeService {
	private wrapper: HTMLDivElement;
	private target: HTMLCanvasElement;

	private scene: THREE.Scene;
	private dolly: THREE.Group;
	private camera: THREE.Camera;
	private clock: THREE.Clock;
	private renderer: THREE.Renderer;

	private vertex: string;
	private fragment: string;
	private uniforms: {
		resolution: any;
		cameraWorldMatrix: any;
		cameraProjectionMatrixInverse: any;
		iTime: any;
		iResolution: any;
	};

	constructor(private http: HttpClient) {
		this.http.get('assets/shader.vert', { responseType: 'text' as 'json' }).subscribe(($vert: string) => {
			this.vertex = $vert.toString();

			this.http.get('assets/test.frag', { responseType: 'text' as 'json' }).subscribe(($frag: string) => {
				this.fragment = $frag.toString();

				// Initialize uniforms
				this.uniforms = {
					resolution: { value: new THREE.Vector2(this.wrapper.clientWidth, this.wrapper.clientHeight) },
					cameraWorldMatrix: { value: this.camera.matrixWorld },
					cameraProjectionMatrixInverse: { value: new THREE.Matrix4().getInverse(this.camera.projectionMatrix) },
					iTime: { value: 0 },
					iResolution: { value: new THREE.Vector3() }
				};
				// Load vertex and fragment
				this.addBasicPlane();
				// Render shader
				this.render();
			});
		});
	}

	init($wrapper: HTMLDivElement, $target: HTMLCanvasElement): void {
		this.wrapper = $wrapper;
		this.target = $target;

		this.scene = new THREE.Scene();

		this.dolly = new THREE.Group();
		this.scene.add(this.dolly);

		this.clock = new THREE.Clock();

		this.camera = new THREE.PerspectiveCamera(60, $wrapper.clientWidth / $wrapper.clientHeight, 0.1, 1000);
		this.camera.position.z = 4;
		this.dolly.add(this.camera);

		this.renderer = new THREE.WebGLRenderer({ canvas: this.target });
		this.renderer.setSize($wrapper.clientWidth, $wrapper.clientHeight);
	}

	private addBasicPlane(): void {
		const geometry: THREE.PlaneBufferGeometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
		const material = new THREE.RawShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertex,
			fragmentShader: this.fragment
		});

		const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
		this.scene.add(mesh);
	}

	private render(): void {
		const r: FrameRequestCallback = ($t: number) => {
			this._render($t);

			requestAnimationFrame(r);
		};
		requestAnimationFrame(r);
	}

	private _render($t: number): void {
		const elapsedTime = this.clock.getElapsedTime();
		this.dolly.position.z = -elapsedTime;

		$t *= 0.001;

		this.uniforms.iResolution.value.set(this.target.width, this.target.height, 1);
		this.uniforms.iTime.value = $t;

		this.renderer.render(this.scene, this.camera);
	}
}
