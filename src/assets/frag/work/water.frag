uniform vec2 iResolution;
uniform float iTime;
uniform vec4 iMouse;

// Constants
#define PI 3.14159265358979
#define TWO_PI 6.2831852
#define MAX_STEPS 100
#define MAX_DIST 100.
#define SURFACE_DIST .01
#define HASHSCALE4 vec4(.1031, .1030, .0973, .1099)

float sdSphere(vec3 p, vec4 s) { return length(p - s.xyz) - s.w; }

float sdPlane(vec3 p) { return p.y; }

vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

float mod289(float x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }

vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }

float permute(float x) { return mod289(((x * 34.0) + 1.0) * x); }

vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float taylorInvSqrt(float r) { return 1.79284291400159 - 0.85373472095314 * r; }

vec4 grad4(float j, vec4 ip) {
  const vec4 ones = vec4(1.0, 1.0, 1.0, -1.0);
  vec4 p, s;

  p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
  p.w = 1.5 - dot(abs(p.xyz), ones.xyz);
  s = vec4(lessThan(p, vec4(0.0)));
  p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;

  return p;
}

// (sqrt(5) - 1)/4 = F4, used once below
#define F4 0.309016994374947451

float snoise(vec4 v) {
  const vec4 C = vec4(0.138196601125011,   // (5 - sqrt(5))/20  G4
                      0.276393202250021,   // 2 * G4
                      0.414589803375032,   // 3 * G4
                      -0.447213595499958); // -1 + 4 * G4

  // First corner
  vec4 i = floor(v + dot(v, vec4(F4)));
  vec4 x0 = v - i + dot(i, C.xxxx);

  // Other corners

  // Rank sorting originally contributed by Bill Licea-Kane, AMD (formerly ATI)
  vec4 i0;
  vec3 isX = step(x0.yzw, x0.xxx);
  vec3 isYZ = step(x0.zww, x0.yyz);
  //  i0.x = dot( isX, vec3( 1.0 ) );
  i0.x = isX.x + isX.y + isX.z;
  i0.yzw = 1.0 - isX;
  //  i0.y += dot( isYZ.xy, vec2( 1.0 ) );
  i0.y += isYZ.x + isYZ.y;
  i0.zw += 1.0 - isYZ.xy;
  i0.z += isYZ.z;
  i0.w += 1.0 - isYZ.z;

  // i0 now contains the unique values 0,1,2,3 in each channel
  vec4 i3 = clamp(i0, 0.0, 1.0);
  vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
  vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);

  vec4 x1 = x0 - i1 + C.xxxx;
  vec4 x2 = x0 - i2 + C.yyyy;
  vec4 x3 = x0 - i3 + C.zzzz;
  vec4 x4 = x0 + C.wwww;

  // Permutations
  i = mod289(i);
  float j0 = permute(permute(permute(permute(i.w) + i.z) + i.y) + i.x);
  vec4 j1 = permute(permute(permute(permute(i.w + vec4(i1.w, i2.w, i3.w, 1.0)) +
                                    i.z + vec4(i1.z, i2.z, i3.z, 1.0)) +
                            i.y + vec4(i1.y, i2.y, i3.y, 1.0)) +
                    i.x + vec4(i1.x, i2.x, i3.x, 1.0));

  // Gradients: 7x7x6 points over a cube, mapped onto a 4-cross polytope
  // 7*7*6 = 294, which is close to the ring size 17*17 = 289.
  vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);

  vec4 p0 = grad4(j0, ip);
  vec4 p1 = grad4(j1.x, ip);
  vec4 p2 = grad4(j1.y, ip);
  vec4 p3 = grad4(j1.z, ip);
  vec4 p4 = grad4(j1.w, ip);

  // Normalise gradients
  vec4 norm =
      taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  p4 *= taylorInvSqrt(dot(p4, p4));

  // Mix contributions from the five corners
  vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
  vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
  m0 = m0 * m0;
  m1 = m1 * m1;
  return 49.0 * (dot(m0 * m0, vec3(dot(p0, x0), dot(p1, x1), dot(p2, x2))) +
                 dot(m1 * m1, vec2(dot(p3, x3), dot(p4, x4))));
}

vec4 hash41(float p) { // by Dave_Hoskins
  vec4 p4 = fract(vec4(p) * HASHSCALE4);
  p4 += dot(p4, p4.wzxy + 19.19);
  return fract((p4.xxyz + p4.yzzw) * p4.zywx);
}

// polynomial smooth min (k = 0.1);
float smin(float a, float b, float k) { // by iq
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

vec4 getSky(vec3 rd) {
  if (rd.y > 0.3)
    return vec4(0.5, 0.8, 1.5, 1.0); // bright sky
  if (rd.y < 0.0)
    return vec4(1.0, 0, 0, 1.0); // no reflection from below

  if (rd.z > 0.9 && rd.x > 0.3) {
    if (rd.y > 0.2)
      return 1.5 * vec4(2.0, 1.0, 1.0, 1.0); // red houses
    return 1.5 * vec4(2.0, 1.0, 0.5, 1.0);   // orange houses
  } else
    return vec4(0.5, 0.8, 1.5, 1.0); // bright sky
}

vec4 shade(vec3 normal, vec3 pos, vec3 rd) {
  vec4 final = vec4(0.);

  float ReflectionFresnel = 0.99;
  float fresnel =
      ReflectionFresnel * pow(1.0 - clamp(dot(-rd, normal), 0.0, 1.0), 5.0) +
      (1.0 - ReflectionFresnel);
  vec3 refVec = reflect(rd, normal);
  vec4 reflection = getSky(refVec);

  float deep = 1.0 + 0.5 * pos.y;

  vec4 col = fresnel * reflection;
  col += deep * 0.4 * vec4(0.0, 0.3, 0.4, 1.0);

  vec3 lightDir = normalize(vec3(-1.0, -1.0, 0.5));
  vec3 reflectDir = reflect(-lightDir, normal);
  float spec = pow(max(dot(rd, reflectDir), 0.0), 5.0);
  final = clamp(col, 0.0, 1.0) + spec * vec4(0, 1, 1, 0) * 0.2;

  return final;
}

float map(vec3 p) {
  float sphereNoise = snoise(vec4(p.x, p.y + iTime * 0.5, p.z, 1.)) * 0.15;
  float s = sdSphere(p, vec4(0.0, 1, 0.0, 1)) + sphereNoise * 1.2 -
            0.2 * exp(cos(iTime / 2. - PI));

  // float s2 = sdPlane(p) + sphereNoise * 1.2 - 0.2 * exp(cos(iTime / 2. -
  // PI));

  for (int i = 0; i < 12; ++i) {
    vec4 rnd = hash41(100.0 + float(i));
    vec3 rndPos = 2.0 * (normalize(rnd.xyz) - vec3(0.5));
    rndPos.y *= 2.0;
    float timeOffset = rnd.w;
    float phase = fract(timeOffset - 0.25 * exp(cos(iTime / 5. - PI)));
    vec3 offset = mix(0.1 * rndPos, 15.0 * rndPos, phase);
    float rnd2 = fract(rnd.x + rnd.y);
    float s0 = length(p + offset) -
               0.3 * mix(0.8 + 0.2 * rnd2, 0.2 + 0.8 * rnd2, phase);

    s = smin(s, s0, 0.4);
  }

  s += 0.002 * sin(20.0 * p.x + 10.0 * iTime);
  // s = smin(s, s2, 0.4);

  return s;
}

vec3 calcNormal(vec3 p) { // by iq
  vec2 e = vec2(.0001, 0);
  return normalize(vec3(map(p + e.xyy) - map(p - e.xyy),
                        map(p + e.yxy) - map(p - e.yxy),
                        map(p + e.yyx) - map(p - e.yyx)));
}

float shadow(vec3 p, vec3 l) {
  float t = 0.01;
  float t_max = 20.0;

  float res = 1.0;
  for (int i = 0; i < 128; ++i) {
    if (t > t_max)
      break;

    float d = map(p + t * l);
    if (d < 0.001) {
      return 0.0;
    }
    t += d;
    res = min(res, 10.0 * d / t);
  }

  return res;
}

vec4 trace(vec3 ro, vec3 rd) {
  float dO = 0.; // Distane Origin

  vec3 col = vec3(0.);
  for (int i = 0; i < MAX_STEPS; i++) {
    vec3 p = ro + rd * dO;
    float ds = map(p); // ds is Distance Scene
    if (ds < SURFACE_DIST) {
      vec3 normal = calcNormal(p);
      vec3 lightPos = vec3(2.0, -5.0, 3.0);
      vec3 lightDir = normalize(p - lightPos);

      return vec4(vec3(shade(normal, p, rd).xyz + shadow(p, rd)), 1.0);
    }

    if (ds > MAX_DIST)
      break;

    dO += ds;
    col = .99 * col + .08 * vec3(ds, ds, ds * ds * ds);
  }

  return vec4(0.99, 0.94, 0.92, 1.0);
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

  vec3 targetPos = vec3(0.0, 1, 0.0);
  // vec3 cameraPos = vec3(-5.0, 2.5, -5.0);
  vec3 cameraPos = vec3(cos(iTime * 0.5) * 5.0, 2.5, sin(iTime * 0.5) * 5.0);

  // vec2 m = iMouse.xy / iResolution.xy;
  // m.y += 0.3;
  // m.x += 0.72;
  // vec3 cameraPos =
  //    5.0 * normalize(vec3(sin(5.0 * m.x), 1.0 * m.y, cos(5.0 * m.x)));

  vec3 ro = cameraPos;
  vec3 ta = targetPos;
  mat3 c = camera(ro, ta, 0.0);
  vec3 rd = c * normalize(vec3(uv, 1));

  vec4 color = trace(ro, rd);
  // color = calcNormal(p);

  // Set the output color
  gl_FragColor = color;
}