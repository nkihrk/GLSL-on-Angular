uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// Constants
#define PI 3.14159265358979
#define TWO_PI 6.2831852
#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURFACE_DIST .01

float sdSphere(vec3 p, vec4 s) { return length(p - s.xyz) - s.w; }

float sdPlane(vec3 p) { return p.y; }

float sdBox(vec3 p, vec3 b, vec4 s) {
  vec3 q = abs(p - s.xyz) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float sdRoundBox(vec3 p, vec3 b, float r, vec4 s) {
  vec3 q = abs(p - s.xyz) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

float opSmoothUnion(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float GetDist(vec3 p) {
  vec4 s = vec4(0.0, 1, 0.0, 1); // Sphere xyz is position w is radius
  float sphereDist = sdSphere(p, s);
  float planeDist = sdPlane(p);
  float boxDist = sdRoundBox(p, vec3(0.35), 0.5, s);
  float d = min(sphereDist, planeDist);
  d = opSmoothUnion(d, boxDist, 0.01);

  return d;
}

float RayMarch(vec3 ro, vec3 rd) {
  float dO = 0.; // Distane Origin
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * dO;
    float ds = GetDist(p); // ds is Distance Scene
    dO += ds;
    if (dO > MAX_DIST || ds < SURFACE_DIST)
      break;
  }
  return dO;
}

vec3 GetNormal(vec3 p) {
  float d = GetDist(p);  // Distance
  vec2 e = vec2(.01, 0); // Epsilon
  vec3 n = d - vec3(GetDist(p - e.xyy), GetDist(p - e.yxy), GetDist(p - e.yyx));

  return normalize(n);
}

float GetLight(vec3 p) {
  // Light (directional diffuse)
  // vec3 lightPos = vec3(5. * sin(iTime), 5., 5.0 * cos(iTime)); // Light
  // Position
  vec3 lightPos = vec3(10., 10., 10.);
  vec3 l = normalize(lightPos - p); // Light Vector
  vec3 n = GetNormal(p);            // Normal Vector

  float dif = dot(n, l);    // Diffuse light
  dif = clamp(dif, 0., 1.); // Clamp so it doesnt go below 0

  // Shadows
  float d = RayMarch(p + n * SURFACE_DIST * 2., l);
  if (d < length(lightPos - p))
    dif *= 0.1;

  return dif;
}

mat3 camera(vec3 ro, vec3 ta, float cr) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(sin(cr), cos(cr), 0.);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  return mat3(cu, cv, cw);
}

void main() {
  vec2 uv = vec2(gl_FragCoord.xy - .5 * iResolution.xy) / iResolution.y;

  float x = PI * 0.15;
  float y = 4.;

  x = (iMouse.x / iResolution.x - .5) * 7.;
  y = (iMouse.y / iResolution.y) * 7.;

  vec3 targetPos = vec3(0.0, 1, 0.0);
  vec3 cameraPos = vec3(cos(iTime * 0.5) * 5.0, 2.5, sin(iTime * 0.5) * 5.0);

  vec3 ro = cameraPos;
  vec3 ta = targetPos;
  mat3 c = camera(ro, ta, 0.0);
  vec3 rd = c * normalize(vec3(uv, 1));

  float d = RayMarch(ro, rd); // Distance

  vec3 p = ro + rd * d;
  float dif = GetLight(p); // Diffuse lighting
  d *= 10.;
  vec3 color = vec3(0);
  color = vec3(dif);
  // color = GetNormal(p);

  // Set the output color
  gl_FragColor = vec4(color, 1.0);
}