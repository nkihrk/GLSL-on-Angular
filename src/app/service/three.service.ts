import { Injectable } from '@angular/core';
import * as THREE from 'three';

@Injectable({
	providedIn: 'root'
})
export class ThreeService {
	private wrapper: HTMLDivElement;
	private target: HTMLCanvasElement;

	private scene: THREE.Scene;
	private dolly: THREE.Group;
	private camera: THREE.Camera;
	private renderer: THREE.Renderer;
	private sceneObjects = [];

	constructor() {}

	init($wrapper: HTMLDivElement, $target: HTMLCanvasElement): void {
		this.wrapper = $wrapper;
		this.target = $target;

		this.scene = new THREE.Scene();

		this.dolly = new THREE.Group();

		this.camera = new THREE.PerspectiveCamera(60, $wrapper.clientWidth / $wrapper.clientHeight, 0.1, 1000);
		this.camera.position.z = 4;
		this.dolly.add(this.camera);

		this.renderer = new THREE.WebGLRenderer({ canvas: this.target });
		this.renderer.setSize($wrapper.clientWidth, $wrapper.clientHeight);

		this.adjustLighting();
		this.addBasicCube();
		this.addExperimentalCube();

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
		const geometry: THREE.PlaneBufferGeometry = new THREE.PlaneBufferGeometry(2.0, 2.0);
		const material = new THREE.RawShaderMaterial({
			uniforms: {
				resolution: { value: new THREE.Vector2(this.wrapper.clientWidth, this.wrapper.clientHeight) },
				cameraWorldMatrix: { value: this.camera.matrixWorld },
				cameraProjectionMatrixInverse: { value: new THREE.Matrix4().getInverse(this.camera.projectionMatrix) }
			},
			vertexShader: this.vertexShader(),
			fragmentShader: this.fragmentShader()
		});

		const mesh: THREE.Mesh = new THREE.Mesh(geometry, material);
		mesh.frustumCulled = false;
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

	private addExperimentalCube(): void {
		let uniforms = {
			colorB: { type: 'vec3', value: new THREE.Color(0xacb6e5) },
			colorA: { type: 'vec3', value: new THREE.Color(0x74ebd5) }
		};

		let geometry = new THREE.BoxGeometry(1, 1, 1);
		let material = new THREE.ShaderMaterial({
			uniforms: uniforms,
			fragmentShader: this.fragmentShader(),
			vertexShader: this.vertexShader()
		});

		let mesh = new THREE.Mesh(geometry, material);
		mesh.position.x = 2;
		this.scene.add(mesh);
		this.sceneObjects.push(mesh);
	}

	private vertexShader(): string {
		return `
			attribute vec3 position;

			void main(void) {
				gl_Position = vec4(position, 1.0);
			}
  	`;
	}

	private fragmentShader(): string {
		return `
			precision highp float;

			uniform vec2 resolution;

			uniform mat4 viewMatrix;
			uniform vec3 cameraPosition;

			uniform mat4 cameraWorldMatrix;
			uniform mat4 cameraProjectionMatrixInverse;

			const float EPS = 0.01;
			const float OFFSET = EPS * 100.0;
			const vec3 lightDir = vec3( -0.48666426339228763, 0.8111071056538127, -0.3244428422615251 );

			// distance functions
			vec3 opRep( vec3 p, float interval ) {

				vec2 q = mod( p.xz, interval ) - interval * 0.5;
				return vec3( q.x, p.y, q.y );

			}

			float sphereDist( vec3 p, float r ) {

				return length( opRep( p, 3.0 ) ) - r;

			}

			float floorDist( vec3 p ){

				return dot(p, vec3( 0.0, 1.0, 0.0 ) ) + 1.0;

			}

			vec4 minVec4( vec4 a, vec4 b ) {

				return ( a.a < b.a ) ? a : b;

			}

			float checkeredPattern( vec3 p ) {

				float u = 1.0 - floor( mod( p.x, 2.0 ) );
				float v = 1.0 - floor( mod( p.z, 2.0 ) );

				if ( ( u == 1.0 && v < 1.0 ) || ( u < 1.0 && v == 1.0 ) ) {

					return 0.2;

				} else {

					return 1.0;

				}

			}

			vec3 hsv2rgb( vec3 c ) {

				vec4 K = vec4( 1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0 );
				vec3 p = abs( fract( c.xxx + K.xyz ) * 6.0 - K.www );
				return c.z * mix( K.xxx, clamp( p - K.xxx, 0.0, 1.0 ), c.y );

			}

			float sceneDist( vec3 p ) {

				return min(
					sphereDist( p, 1.0 ),
					floorDist( p )
				);

			}

			vec4 sceneColor( vec3 p ) {

				return minVec4(
					// 3 * 6 / 2 = 9
					vec4( hsv2rgb(vec3( ( p.z + p.x ) / 9.0, 1.0, 1.0 ) ), sphereDist( p, 1.0 ) ),
					vec4( vec3( 0.5 ) * checkeredPattern( p ), floorDist( p ) )
				);

			}

			vec3 getNormal( vec3 p ) {

				return normalize(vec3(
					sceneDist(p + vec3( EPS, 0.0, 0.0 ) ) - sceneDist(p + vec3( -EPS, 0.0, 0.0 ) ),
					sceneDist(p + vec3( 0.0, EPS, 0.0 ) ) - sceneDist(p + vec3( 0.0, -EPS, 0.0 ) ),
					sceneDist(p + vec3( 0.0, 0.0, EPS ) ) - sceneDist(p + vec3( 0.0, 0.0, -EPS ) )
				));

			}

			float getShadow( vec3 ro, vec3 rd ) {

				float h = 0.0;
				float c = 0.0;
				float r = 1.0;
				float shadowCoef = 0.5;

				for ( float t = 0.0; t < 50.0; t++ ) {

					h = sceneDist( ro + rd * c );

					if ( h < EPS ) return shadowCoef;

					r = min( r, h * 16.0 / c );
					c += h;

				}

				return 1.0 - shadowCoef + r * shadowCoef;

			}

			vec3 getRayColor( vec3 origin, vec3 ray, out vec3 pos, out vec3 normal, out bool hit ) {

				// marching loop
				float dist;
				float depth = 0.0;
				pos = origin;

				for ( int i = 0; i < 64; i++ ){

					dist = sceneDist( pos );
					depth += dist;
					pos = origin + depth * ray;

					if ( abs(dist) < EPS ) break;

				}

				// hit check and calc color
				vec3 color;

				if ( abs(dist) < EPS ) {

					normal = getNormal( pos );
					float diffuse = clamp( dot( lightDir, normal ), 0.1, 1.0 );
					float specular = pow( clamp( dot( reflect( lightDir, normal ), ray ), 0.0, 1.0 ), 10.0 );
					float shadow = getShadow( pos + normal * OFFSET, lightDir );
					color = ( sceneColor( pos ).rgb * diffuse + vec3( 0.8 ) * specular ) * max( 0.5, shadow );

					hit = true;

				} else {

					color = vec3( 0.0 );

				}

				return color - pow( clamp( 0.05 * depth, 0.0, 0.6 ), 2.0 );

			}

			void main(void) {

				// screen position
				vec2 screenPos = ( gl_FragCoord.xy * 2.0 - resolution ) / resolution;

				// ray direction in normalized device coordinate
				vec4 ndcRay = vec4( screenPos.xy, 1.0, 1.0 );

				// convert ray direction from normalized device coordinate to world coordinate
				vec3 ray = ( cameraWorldMatrix * cameraProjectionMatrixInverse * ndcRay ).xyz;
				ray = normalize( ray );

				// camera position
				vec3 cPos = cameraPosition;

				// cast ray
				vec3 color = vec3( 0.0 );
				vec3 pos, normal;
				bool hit;
				float alpha = 1.0;

				for ( int i = 0; i < 3; i++ ) {

					color += alpha * getRayColor( cPos, ray, pos, normal, hit );
					alpha *= 0.3;
					ray = normalize( reflect( ray, normal ) );
					cPos = pos + normal * OFFSET;

					if ( !hit ) break;

				}

				gl_FragColor = vec4( color, 1.0 );

			}
  	`;
	}
}
