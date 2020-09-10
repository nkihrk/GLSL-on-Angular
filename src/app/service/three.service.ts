import { Injectable } from '@angular/core';
import * as THREE from 'three';
import { HttpClient } from '@angular/common/http';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { GlitchPass } from 'three/examples/jsm/postprocessing/GlitchPass.js';
import { switchMap } from 'rxjs/operators';

@Injectable({
	providedIn: 'root'
})
export class ThreeService {
	private wrapper: HTMLDivElement;
	private target: HTMLCanvasElement;

	private vertUrl = 'shader.vert';
	private fragUrl = 'lighting.frag';
	private postProcUrl = 'post-processing.frag';

	private _iMouse = {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	};

	private scene: THREE.Scene;
	private dolly: THREE.Group;
	private camera: THREE.Camera;
	private clock: THREE.Clock;
	private renderer: THREE.WebGLRenderer;
	private composer: EffectComposer;

	private vertex: string;
	private fragment: string;
	private uniforms: {
		tDiffuse: { value: any };
		resolution: { value: any };
		cameraWorldMatrix: { value: any };
		cameraProjectionMatrixInverse: { value: any };
		iTime: { value: any };
		iResolution: { value: any };
		iChannel0: { value: any };
		iMouse: { value: any };
	};

	constructor(private http: HttpClient) {
		this.http
			.get('assets/vert/' + this.vertUrl, { responseType: 'text' as 'json' })
			.pipe(
				switchMap(($vert: string) => {
					this.vertex = $vert;
					return this.http.get('assets/frag/' + this.fragUrl, { responseType: 'text' as 'json' });
				})
			)
			.pipe(
				switchMap(($frag: string) => {
					this.fragment = $frag;

					const loader = new THREE.TextureLoader();
					const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/bayer.png');
					texture.minFilter = THREE.NearestFilter;
					texture.magFilter = THREE.NearestFilter;
					texture.wrapS = THREE.RepeatWrapping;
					texture.wrapT = THREE.RepeatWrapping;

					// Initialize uniforms
					this.uniforms = {
						tDiffuse: { value: null },
						resolution: { value: new THREE.Vector2(this.wrapper.clientWidth, this.wrapper.clientHeight) },
						cameraWorldMatrix: { value: this.camera.matrixWorld },
						cameraProjectionMatrixInverse: { value: new THREE.Matrix4().getInverse(this.camera.projectionMatrix) },
						iTime: { value: 0 },
						iResolution: { value: new THREE.Vector3() },
						iChannel0: { value: texture },
						iMouse: { value: { x: 0, y: 0, z: 0, w: 1 } }
					};
					// Load vertex and fragment
					this.addBasicPlane();

					this.composer.addPass(new RenderPass(this.scene, this.camera));

					return this.http.get('assets/frag/' + this.postProcUrl, { responseType: 'text' as 'json' });
				})
			)
			.subscribe(($frag: string) => {
				const copyShader = {
					uniforms: this.uniforms,
					vertexShader: this.vertex,
					fragmentShader: $frag
				};
				const shaderPass = new ShaderPass(copyShader);
				shaderPass.renderToScreen = true;
				this.composer.addPass(shaderPass);

				// Glitch effect
				//const glitchPass = new GlitchPass();
				//this.composer.addPass(glitchPass);

				this.render();
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

		this.composer = new EffectComposer(this.renderer);
	}

	onMove($x: number, $y: number): void {
		let x: number = $x - this.target.getBoundingClientRect().left;
		let y: number = $y - this.target.getBoundingClientRect().top;

		this._iMouse.x = x;
		this._iMouse.y = y;
	}

	private addBasicPlane(): void {
		const geometry: THREE.PlaneBufferGeometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
		const material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertex,
			fragmentShader: this.fragment
		});
		material.extensions.derivatives = true;

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
		this.uniforms.iMouse.value.x = this._iMouse.x;
		this.uniforms.iMouse.value.y = this._iMouse.y;

		//this.renderer.render(this.scene, this.camera);
		this.composer.render();
	}
}
