precision highp float;
uniform vec3 iResolution;
uniform float iTime;

void main(void) {
  vec2 uv = gl_FragCoord.xy / iResolution.xy;
  gl_FragColor = vec4(uv, 0.5 + 0.5 * sin(iTime), 1.0);
}
