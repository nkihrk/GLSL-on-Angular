uniform vec3 iResolution;
uniform sampler2D tDiffuse;
varying vec2 vUv;

float luminance(vec3 col) {
  return dot(vec3(0.298912, 0.586611, 0.114478), col);
}

vec3 reinhard(vec3 col, float exposure, float white) {
  col *= exposure;
  white *= exposure;
  float lum = luminance(col);
  return (col * (lum / (white * white) + 1.0) / (lum + 1.0));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec3 col = texture2D(tDiffuse, vUv).rgb;

  col = reinhard(col, .3, 30.0);
  col = pow(col, vec3(1.0 / 2.2));

  fragColor = vec4(col, 1.0);
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }