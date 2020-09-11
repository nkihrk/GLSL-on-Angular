uniform sampler2D tDiffuse;
varying vec2 vUv;
uniform vec2 iResolution;
uniform float iTime;

float luminance(vec3 col) {
  return dot(vec3(0.298912, 0.586611, 0.114478), col);
}

vec3 saturation(vec3 col, float scale) {
  return mix(vec3(luminance(col)), col, scale);
}

vec3 reinhard(vec3 col, float exposure, float white) {
  col *= exposure;
  white *= exposure;
  float lum = luminance(col);
  return (col * (lum / (white * white) + 1.0) / (lum + 1.0));
}

float hash(float n) { return fract(sin(n) * 43758.5453); }

vec2 disp(vec2 p, float n, float s) {
  p.y += (hash(floor(iTime * s) + n) * 2.0 - 1.0);
  return vec2(smoothstep(0.0011, 0.001,
                         abs(abs(p.y) - vec2(0.5, 0.1)) - vec2(0.25, 0.02)));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec4 col = vec4(0.);

  vec3 sum = vec3(0.);
  float sumW = 0.0;

  col = textureLod(tDiffuse, vUv, 0.0);
  // vec2 d = (disp(p*0.8, 0.0, 10.)*0.4 + disp(p*1.6,100.,20.0)*0.2) * 0.5;

  vec2 p = vUv * 2. - 1.;
  vec2 uvR = (p + p * dot(p, p) * 0.01) + 1.;
  vec2 uvG = (p + p * dot(p, p) * 0.02) + 1.;
  vec2 uvB = (p + p * dot(p, p) * 0.03) + 1.;
  float r = textureLod(tDiffuse, uvR / 2., 0.).r;
  float g = textureLod(tDiffuse, uvG / 2., 0.).g;
  float b = textureLod(tDiffuse, uvB / 2., 0.).b;
  col = vec4(r, g, b, 1.);

  fragColor = col;
  // fragColor = vec4(vec3(texture2D(tDiffuse, vUv).a), 1.0);
  fragColor.rgb = pow(fragColor.rgb, vec3(1.0 / 2.2)); // Gamma
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }