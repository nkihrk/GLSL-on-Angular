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
	private fragUrl = 'work/water.frag';
	private postProcUrl = 'work/post-proc.frag';

	private _iMouse = {
		x: 0,
		y: 0,
		z: 0,
		w: 1
	};

	private scene: THREE.Scene;
	private camera: THREE.Camera;
	private renderer: THREE.WebGLRenderer;
	private composer: EffectComposer;

	private vertex: string;
	private fragment: string;
	private uniforms: {
		tDiffuse: { value: any };
		iTime: { value: any };
		iResolution: { value: any };
		iChannel0: { value: any };
		iMouse: { value: any };
	};

	constructor(private http: HttpClient) {
		// Async chain loading of shader files
		http
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

					// Load a texture for iChannel0
					const loader = new THREE.TextureLoader();
					const texture = loader.load('https://threejsfundamentals.org/threejs/resources/images/bayer.png');
					texture.minFilter = THREE.NearestFilter;
					texture.magFilter = THREE.NearestFilter;
					texture.wrapS = THREE.RepeatWrapping;
					texture.wrapT = THREE.RepeatWrapping;

					// Initialize uniforms
					this.uniforms = {
						tDiffuse: { value: null },
						iTime: { value: 0 },
						iResolution: { value: new THREE.Vector2(this.wrapper.clientWidth, this.wrapper.clientHeight) },
						iChannel0: { value: texture },
						iMouse: { value: { x: 0, y: 0, z: 0, w: 1 } }
					};
					// Load vertex and fragment
					this.createSceneMesh();

					// Add a basic scene for later use in post-processing
					// This is off-screen
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
				// Enable this flag to render to the scene
				shaderPass.renderToScreen = true;
				this.composer.addPass(shaderPass);

				// Glitch effect
				//const glitchPass = new GlitchPass();
				//this.composer.addPass(glitchPass);

				this.render();
			});
	}

	init($wrapper: HTMLDivElement, $target: HTMLCanvasElement): void {
		// Wrapper of render target
		this.wrapper = $wrapper;
		// Render target (canvas)
		this.target = $target;

		// Create new scene
		this.scene = new THREE.Scene();

		// Create camera
		this.camera = new THREE.PerspectiveCamera(60, $wrapper.clientWidth / $wrapper.clientHeight, 0.1, 1000);
		this.camera.position.z = 4;

		// Set target as WebGLRenderer, and Initialize for THREE
		this.renderer = new THREE.WebGLRenderer({ canvas: this.target });
		this.renderer.setSize($wrapper.clientWidth, $wrapper.clientHeight);

		// Create EffectComposer to use post-processing over normal shader
		this.composer = new EffectComposer(this.renderer);
	}

	// Called via directive
	onMove($x: number, $y: number): void {
		let x: number = $x - this.target.getBoundingClientRect().left;
		let y: number = $y - this.target.getBoundingClientRect().top;

		this._iMouse.x = x;
		this._iMouse.y = y;
	}

	private createSceneMesh(): void {
		// Simple plane geometry to cover the screen
		const geometry: THREE.PlaneBufferGeometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
		// Material for the geometry
		const material = new THREE.ShaderMaterial({
			uniforms: this.uniforms,
			vertexShader: this.vertex,
			fragmentShader: this.fragment
		});
		// Enable shader extensions
		material.extensions.derivatives = true;

		// Create actual mesh
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
		$t *= 0.001;

		// Emulate ShaderToy's uniforms
		this.uniforms.iResolution.value.set(this.target.width, this.target.height, 1);
		this.uniforms.iTime.value = $t;
		this.uniforms.iMouse.value.x = this._iMouse.x;
		this.uniforms.iMouse.value.y = this._iMouse.y;

		this.composer.render();
	}
}
