#define MAT_SPONGE 0.0
#define MAT_CREAM 1.0
#define MAT_BALL 2.0
#define MAT_CANDLE 3.0
#define MAT_DISH 4.0
#define MAT_FRAME 5.0
#define MAT_OUTSIDE 6.0
#define MAT_INSIDE 7.0
#define MAT_HEART 8.0
#define MAT_SHELF 9.0
#define MAT_FLOOR 10.0
#define MAT_CORE 11.0

uniform vec3 iResolution;
uniform float iTime;
uniform vec4 iMouse;

vec3 RayOrigin, Target, Coord, CoreCoord;
vec4 CoreID;
float CameraLight, CubeLight;
float Black;

const float pi = acos(-1.);
const float pi2 = pi * 2.0;

// Grab from https://www.shadertoy.com/view/4djSRW
#define MOD3 vec3(.1031, .11369, .13787)
//#define MOD3 vec3(443.8975,397.2973, 491.1871)
float hash31(vec3 p3) {
  p3 = fract(p3 * MOD3);
  p3 += dot(p3, p3.yzx + 19.19);
  return -1.0 + 2.0 * fract((p3.x + p3.y) * p3.z);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * MOD3);
  p3 += dot(p3, p3.yxz + 19.19);
  return -1.0 + 2.0 * fract(vec3((p3.x + p3.y) * p3.z, (p3.x + p3.z) * p3.y,
                                 (p3.y + p3.z) * p3.x));
}

vec2 hash12(float n) { return vec2(fract(sin(n) * vec2(12345.6, 78901.2))); }

float hash21(vec2 p) {
  p = fract(p * vec2(233.34, 851.74));
  p += dot(p, p + 23.45);
  return fract(p.x * p.y);
}

// ========= Noise ===========
float value_noise(vec2 p) {
  vec2 ip = floor(p);
  vec2 u = fract(p);
  u = u * u * (3.0 - 2.0 * u);

  float res = mix(
      mix(hash21(ip), hash21(ip + vec2(1.0, 0.0)), u.x),
      mix(hash21(ip + vec2(0.0, 1.0)), hash21(ip + vec2(1.0, 1.0)), u.x), u.y);
  return res * 2.0 - 1.0;
}

float simplex_noise(vec3 p) {
  const float K1 = 0.333333333;
  const float K2 = 0.166666667;

  vec3 i = floor(p + (p.x + p.y + p.z) * K1);
  vec3 d0 = p - (i - (i.x + i.y + i.z) * K2);

  // thx nikita: https://www.shadertoy.com/view/XsX3zB
  vec3 e = step(vec3(0.0), d0 - d0.yzx);
  vec3 i1 = e * (1.0 - e.zxy);
  vec3 i2 = 1.0 - e.zxy * (1.0 - e);

  vec3 d1 = d0 - (i1 - 1.0 * K2);
  vec3 d2 = d0 - (i2 - 2.0 * K2);
  vec3 d3 = d0 - (1.0 - 3.0 * K2);

  vec4 h =
      max(0.6 - vec4(dot(d0, d0), dot(d1, d1), dot(d2, d2), dot(d3, d3)), 0.0);
  vec4 n = h * h * h * h *
           vec4(dot(d0, hash33(i)), dot(d1, hash33(i + i1)),
                dot(d2, hash33(i + i2)), dot(d3, hash33(i + 1.0)));

  return dot(vec4(31.316), n);
}

float noise(vec3 p) { return simplex_noise(p); }

float noise_sum(vec3 p) {
  float f = 0.0;
  p = p * 4.0;
  f += 1.0000 * noise(p);
  p = 2.0 * p;
  f += 0.5000 * noise(p);
  p = 2.0 * p;

  return f;
}

float fbm(vec2 uv) {
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  float f = 0.5000 * value_noise(uv);
  uv = m * uv;
  f += 0.2500 * value_noise(uv);
  uv = m * uv;
  f += 0.1250 * value_noise(uv);
  uv = m * uv;
  return f;
}

float height(vec3 p) {
  float base = noise(p * 10.5) * 0.25 + 0.5;
  return base * 0.03;
}

mat2 rot(float th) {
  vec2 a = sin(vec2(1.5707963, 0) + th);
  return mat2(a, -a.y, a.x);
}

///////////////////// Distance Functions /////////////////////
// Rotate fold technique
// https://gam0022.net/blog/2017/03/02/raymarching-fold/
vec2 pMod(in vec2 p, in float s) {
  float a = pi / s - atan(p.x, p.y);
  float n = pi2 / s;
  a = floor(a / n) * n;
  p *= rot(a);
  return p;
}
float opRep(in float p, in float c) { return mod(p, c) - 0.5 * c; }
vec2 opRep(in vec2 p, in vec2 c) { return mod(p, c) - 0.5 * c; }
vec3 opRep(in vec3 p, in vec3 c) { return mod(p, c) - 0.5 * c; }

vec2 opU(vec2 d1, vec2 d2) { return (d1.x < d2.x) ? d1 : d2; }

float sdPlane(vec3 p) { return p.y; }

float sdSphere(vec3 p, float s) { return length(p) - s; }

float sdCappedCylinder(vec3 p, vec2 h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - h;
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float sdRoundedCylinder(vec3 p, float ra, float rb, float h) {
  vec2 d = vec2(length(p.xz) - 2.0 * ra + rb, abs(p.y) - h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0)) - rb;
}

float smin(float d1, float d2, float k) {
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

float sdBox(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) +
         min(max(d.x, max(d.y, d.z)),
             0.0); // remove this line for an only partially signed sdf
}

////////////// Lighting /////////////////////
float ndfGGX(float NdotH, float roughness) {
  float alpha = roughness * roughness;
  float alphaSq = alpha * alpha;

  float denom = (NdotH * NdotH) * (alphaSq - 1.0) + 1.0;
  return alphaSq / (pi * denom * denom);
}

float gaSchlickG1(float theta, float k) {
  return theta / (theta * (1.0 - k) + k);
}

float gaSchlickGGX(float NdotL, float NdotV, float roughness) {
  float alpha = roughness * roughness + 1.0;
  float k = (alpha * alpha) / 8.0;
  return gaSchlickG1(NdotL, k) * gaSchlickG1(NdotV, k);
}

vec3 fresnelSchlick_roughness(vec3 F0, float cosTheta, float roughness) {
  return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
}

vec3 skyColor(vec3 rd) {
  // sky
  // vec3 col = vec3(0.2,0.5,0.85)*1.1 - rd.y*rd.y*0.5;
  vec3 col = mix(vec3(0.2, 0.5, 0.85) * 0.8, vec3(0.1, 0.25, 0.8) * 0.5, rd.y);
  col = mix(col, vec3(0.9, 1.1, 1.2) * 1.5, pow(1.0 - max(rd.y, 0.0), 12.0));
  return col * 3.0;
}

vec3 EnvBRDFApprox(vec3 SpecularColor, float Roughness, float NoV) {
  const vec4 c0 = vec4(-1, -0.0275, -0.572, 0.022);
  const vec4 c1 = vec4(1, 0.0425, 1.04, -0.04);
  vec4 r = Roughness * c0 + c1;
  float a004 = min(r.x * r.x, exp2(-9.28 * NoV)) * r.x + r.y;
  vec2 AB = vec2(-1.04, 1.04) * a004 + r.zw;
  return SpecularColor * AB.x + AB.y;
}

float so(float NoV, float ao, float roughness) {
  return clamp(pow(NoV + ao, exp2(-16.0 * roughness - 1.0)) - 1.0 + ao, 0.0,
               1.0);
}

/////////////////////// TimeLine ///////////////////////////
float sum = 0.0;

vec3 targetPos, cameraPos, cylinderPos, cylinderFoldOffset, insideBoxPos,
    insideBox1Pos, insideBox2Pos, insideBoxFoldOffset, framePos,
    frameFoldOffset, frameCenterCubePos;
float cylinderReplaceXY, cylinderReplaceYZ, cylinderFold, insideBoxFold,
    frameFold, frameCornerSize, frameReplaceXY, frameReplaceXZ,
    frameCenterCubeSize, frameCenterCubeCut, sphereAlpha, frameSphereCut;

float materialFlag, cameraFov;

float cio(float t) {
  return t < 0.5 ? 0.5 * (1.0 - sqrt(1.0 - 4.0 * t * t))
                 : 0.5 * (sqrt((3.0 - 2.0 * t) * (2.0 * t - 1.0)) + 1.0);
}

float eio(float t) {
  return t == 0.0 || t == 1.0
             ? t
             : t < 0.5 ? +0.5 * pow(2.0, (20.0 * t) - 10.0)
                       : -0.5 * pow(2.0, 10.0 - (t * 20.0)) + 1.0;
}

float tl(float val, float offset, float range) {
  float im = sum + offset;
  float ix = im + range;
  sum += offset + range;
  return clamp((val - im) / (ix - im), 0.0, 1.0);
}

const vec3 initPos = vec3(0.0, 20.0, 0.0);

void timeLine(float time) {
  // time += 15.0;
  targetPos = vec3(0.0, -0.15, 0.0);
  cameraPos = vec3(cos(time * 0.1) * 5.0, 2.5, sin(time * 0.1) * 5.0);

  //////////// Inside Box Animation
  float t = tl(time, 0.5, 1.0);
  cylinderPos = mix(cylinderPos, initPos, eio(t));
  insideBox2Pos = mix(initPos, vec3(0.0), eio(t));
  t = tl(time, 0.5, 1.0);
  insideBoxFoldOffset = mix(vec3(0.0), vec3(0.47), eio(t));
  t = tl(time, 0.5, 1.0);
  insideBoxFold = eio(t);

  t = tl(time, 0.5, 1.0);
  insideBox1Pos = mix(initPos, vec3(0.0), eio(t));

  t = tl(time, 0.5, 1.0);
  insideBoxPos = mix(vec3(0.0), initPos, eio(t));
  cylinderPos = mix(initPos, vec3(0.0), eio(t));

  /////////// Cylinder Animation
  t = tl(time, 0.5, 1.0);
  cylinderReplaceXY = eio(t);

  t = tl(time, 0.5, 1.0);
  cylinderReplaceYZ = eio(t);

  t = tl(time, 0.5, 1.0);
  cylinderFoldOffset = mix(vec3(0.0), vec3(0.5), eio(t));

  t = tl(time, 0.5, 1.0);
  cylinderFold = eio(t);

  t = tl(time, 0.5, 1.0);
  cylinderFoldOffset = mix(cylinderFoldOffset, vec3(0.0), eio(t));

  t = tl(time, 0.5, 1.0);
  cylinderPos = mix(cylinderPos, initPos, eio(t));
  framePos = mix(initPos, vec3(0.0), eio(t));
  cameraFov = mix(3.5, 10.0, eio(t));
  targetPos = mix(targetPos, vec3(0.0, 0.0, 0.0), eio(t));

  //////////// Frame Animation
  t = tl(time, 0.5, 1.0);
  frameCornerSize = mix(0.0, 0.333, eio(t));

  t = tl(time, 0.5, 1.0);
  frameCenterCubePos = mix(initPos, vec3(0.0), eio(t));
  cameraFov = mix(cameraFov, 7.0, eio(t));

  t = tl(time, 0.5, 1.0);
  frameCenterCubeSize = eio(t) * 0.1667;

  t = tl(time, 0.5, 1.0);
  frameCenterCubeCut = eio(t);

  t = tl(time, 0.0, 0.5);
  frameReplaceXY = eio(t);

  t = tl(time, 0.0, 0.5);
  frameReplaceXZ = eio(t);

  t = tl(time, 0.5, 1.0);
  frameFoldOffset = mix(vec3(0.0), vec3(0.667), eio(t));
  cameraFov = mix(cameraFov, 2.5, eio(t));
  targetPos = mix(targetPos, vec3(0.0, -0.15, 0.0), eio(t));

  t = tl(time, 0.5, 1.0);
  frameFold = eio(t);

  t = tl(time, 0.5, 1.0);
  sphereAlpha = eio(t);
  frameSphereCut = eio(t);

  t = tl(time, 0.5, 1.0);
  sphereAlpha = mix(sphereAlpha, 0.0, eio(t));
  cameraFov = mix(cameraFov, 3.5, eio(t));

  /////////// Complete
  t = tl(time, 0.0, 0.5);
  insideBoxPos = mix(insideBoxPos, vec3(0.0), eio(t));
  t = tl(time, 0.0, 0.5);
  cylinderPos = mix(cylinderPos, vec3(0.0), eio(t));

  t = tl(time, 0.5, 1.0);
  materialFlag = mix(0.0, 1.0, eio(t));
}

float sdFrameCube(vec3 p, vec3 size, float corner, float cutX) {
  vec3 s = max(size - corner, 0.0);
  p = p - clamp(p, -s, s);
  p = abs(p);
  float d = (p.x + p.y + p.z - corner) * 0.5774;
  return mix(d, max(d, p.x), cutX);
}

float sdFrame(vec3 p) {
  vec3 q = p;
  p = mix(p, abs(p), frameFold) - frameFoldOffset;
  float d = sdFrameCube(p, vec3(frameCornerSize), 0.083, 0.0);

  if (p.x > p.y) {
    p.xy = mix(p.xy, p.yx, frameReplaceXY);
  }
  if (p.x > p.z) {
    p.xz = mix(p.xz, p.zx, frameReplaceXZ);
  }
  p.x += 0.583;
  p.zy -= 0.117;
  d = min(d, sdFrameCube(p - frameCenterCubePos, vec3(frameCenterCubeSize),
                         0.033, frameCenterCubeCut));

  p = abs(q);
  if (p.x < p.y) {
    p.xy = p.yx;
  }
  if (p.x < p.z) {
    p.xz = p.zx;
  }
  p.x -= 2.79;
  return mix(d, max(-sdSphere(p, 2.0), d), frameSphereCut);
}

float sdHeartCylinder(vec3 p) {
  p = mix(p, abs(p), cylinderFold);
  p -= cylinderFoldOffset;
  if (p.y < p.x) {
    p.xy = mix(p.xy, p.yx, cylinderReplaceXY);
  }
  if (p.y < p.z) {
    p.yz = mix(p.yz, p.zy, cylinderReplaceYZ);
  }
  float c = sdRoundedCylinder(p, 0.2, 0.02, 0.95);
  return c;
}

float sdHeart(vec2 p) {
  p.y = -0.1 - p.y * 1.2 + abs(p.x) * (1.0 - abs(p.x));
  return length(p) - 0.5;
}

vec2 sdInsideBox(vec3 p) {
  vec2 b1 = vec2(sdBox(p - insideBox1Pos, vec3(0.9)), MAT_INSIDE);
  p = mix(p, abs(p), insideBoxFold) - insideBoxFoldOffset;
  vec2 b2 = vec2(sdBox(p - insideBox2Pos, vec3(.45)), MAT_OUTSIDE);
  return opU(b1, b2);
}

vec2 sdCube(vec3 p) {
  vec3 q = p;
  vec2 f = vec2(sdFrame(p - framePos), MAT_FRAME);
  vec2 b = sdInsideBox(p - insideBoxPos);
  vec2 c = vec2(sdHeartCylinder(p - cylinderPos), MAT_HEART);
  vec2 d = opU(f, b);
  d = opU(d, c);

  return d;
}

vec2 map2(vec3 p) {
  p = abs(p);
  if (p.x < p.y) {
    p.xy = p.yx;
  }
  if (p.x < p.z) {
    p.xz = p.zx;
  }
  p.x -= 2.79;
  return vec2(sdSphere(p, 2.0), MAT_FRAME);
}

vec2 map(vec3 p) {
  vec3 q = p;
  float pp = sdPlane(p + vec3(0.0, 1.0, 0.0));

  // return vec2(min(sdCake(p).x, pp), MAT_FLOOR);
  Coord = p;
  vec2 cube = sdCube(p);
  vec3 s = vec3(0.02, 0.013, 0.02);
  vec2 d = opU(vec2(pp, MAT_FLOOR), cube);
  return d;
}

vec3 normal(vec3 pos, float eps, vec4 h) {
  vec2 e = vec2(1.0, -1.0) * 0.5773 * eps;
  return normalize(
      e.xyy * (map(pos + e.xyy).x + h.x) + e.yyx * (map(pos + e.yyx).x + h.y) +
      e.yxy * (map(pos + e.yxy).x + h.z) + e.xxx * (map(pos + e.xxx).x + h.w));
}

vec3 normal2(vec3 pos, float eps, vec4 h) {
  vec2 e = vec2(1.0, -1.0) * 0.5773 * eps;
  return normalize(e.xyy * (map2(pos + e.xyy).x + h.x) +
                   e.yyx * (map2(pos + e.yyx).x + h.y) +
                   e.yxy * (map2(pos + e.yxy).x + h.z) +
                   e.xxx * (map2(pos + e.xxx).x + h.w));
}

//////////////////////////////////////////////////////////////////////////////////////////////

float shadow(in vec3 p, in vec3 l) {
  float t = 0.01;
  float t_max = 20.0;

  float res = 1.0;
  for (int i = 0; i < 128; ++i) {
    if (t > t_max)
      break;

    float d = map(p + t * l).x;
    if (d < 0.001) {
      return 0.0;
    }
    t += d;
    res = min(res, 10.0 * d / t);
  }

  return res;
}

vec3 calcAmbient(vec3 pos, vec3 albedo, float metalness, float roughness,
                 vec3 N, vec3 V, float t) {
  vec3 F0 = mix(vec3(0.04), albedo, metalness);
  // vec3 F  = fresnelSchlick(F0, max(0.0, dot(N, V)));
  vec3 F = fresnelSchlick_roughness(F0, max(0.0, dot(N, V)), roughness);
  vec3 kd = mix(vec3(1.0) - F, vec3(0.0), metalness);

  float aoRange = t / 40.0;
  float occlusion =
      max(0.0, 1.0 - map(pos + N * aoRange).x / aoRange); // can be > 1.0
  // occlusion = 1.0 - occlusion;
  occlusion = min(exp2(-.8 * pow(occlusion, 2.0)), 1.0); // tweak the curve

  vec3 ambientColor = mix(vec3(0.2, 0.5, 0.85) * 0.8,
                          vec3(0.1, 0.25, 0.8) * 0.5, 0.5 + 0.5 * N.y);

  vec3 diffuseAmbient =
      kd * albedo * ambientColor * min(1.0, 0.75 + 0.5 * N.y) * 3.0;
  vec3 R = reflect(-V, N);

  vec3 col = mix(skyColor(R) * pow(1.0 - max(-R.y, 0.0), 4.0),
                 mix(vec3(0.2, 0.5, 0.85) * 0.8, vec3(0.1, 0.25, 0.8) * 0.5,
                     0.5 + 0.5 * R.y) *
                     3.0 * (0.5 + 0.5 * R.y),
                 pow(roughness, 0.5));

  vec3 ref = EnvBRDFApprox(F0, roughness, max(dot(N, V), 0.0));
  // vec3 specularAmbient = col * F;
  vec3 specularAmbient = col * ref;

  diffuseAmbient *= occlusion;
  specularAmbient *= so(max(0.0, dot(N, V)), occlusion, roughness);

  return vec3(diffuseAmbient + specularAmbient);
}

vec3 PBR(vec3 pos, vec3 albedo, float metalness, float roughness, vec3 N,
         vec3 V, vec3 L, vec3 Lradiance) {
  vec3 H = normalize(L + V);
  float NdotV = max(0.0, dot(N, V));
  float NdotL = max(0.0, dot(N, L));
  float NdotH = max(0.0, dot(N, H));

  vec3 F0 = mix(vec3(0.04), albedo, metalness);

  vec3 F = fresnelSchlick_roughness(F0, max(0.0, dot(H, L)), roughness);
  float D = ndfGGX(NdotH, roughness);
  float G = gaSchlickGGX(NdotL, NdotV, roughness);

  vec3 kd = mix(vec3(1.0) - F, vec3(0.0), metalness);

  float shadow = shadow(pos + N * 0.01, L);
  // shadow = 1.0;
  // NdotL *= shadow;
  vec3 diffuseBRDF = kd * albedo / pi;
  vec3 specularBRDF = (F * D * G) / max(0.0001, 4.0 * NdotL * NdotV);

  return (diffuseBRDF + specularBRDF) * Lradiance * NdotL * shadow;
}

vec3 sunDir = normalize(vec3(.3, .45, .5));
vec3 lightDir1 = normalize(vec3(-.5, .5, .5));
vec3 lightDir2 = normalize(vec3(.5, .5, -.5));

vec3 materialize(vec3 p, vec3 ray, float depth, vec2 mat) {
  vec3 col = vec3(0.0);
  vec3 sky = skyColor(ray);
  col = sky;
  vec3 result = vec3(0.);
  float roughness = 0.0, metalness = 0.0;
  vec3 albedo = vec3(0.0), n = vec3(0.0), emissive = vec3(0.0);
  vec4 h = vec4(0.0);

  if (depth > 200.0) {
    result = col = sky;
  } else if (mat.y == MAT_FLOOR) {
    float checker = mod(floor(p.x) + floor(p.z), 2.0);
    albedo = vec3(0.4) * checker;
    roughness = 0.45 + checker * 0.2;
    metalness = 0.0;
  } else if (mat.y == MAT_FRAME) {
    albedo = mix(vec3(0.4), vec3(0.8), materialFlag);
    roughness = mix(0.5, 0.2, materialFlag);
  } else if (mat.y == MAT_OUTSIDE) {
    albedo = mix(vec3(0.4), vec3(0.3), materialFlag);
    roughness = mix(0.5, 0.3, materialFlag);
  } else if (mat.y == MAT_INSIDE) {
    albedo = mix(vec3(0.4), vec3(0.5, 0.1, 0.2) * 0.3, materialFlag);
    roughness = mix(0.5, 0.2, materialFlag);
    emissive =
        vec3(1.0, 0.2, 0.5) * 50.0 * (sin(iTime) * 0.5 + 0.5) * materialFlag;
  } else if (mat.y == MAT_HEART) {
    vec3 q = Coord * 2.0;
    float heart = min(sdHeart(q.xy), min(sdHeart(q.zx), sdHeart(q.yz))) * 0.5;
    heart = smoothstep(0.0, 0.01, heart);
    albedo = mix(vec3(0.4), mix(vec3(0.5, 0.1, 0.2) * 0.3, vec3(0.8), heart),
                 materialFlag);
    roughness = mix(0.5, mix(0.6, 0.2, heart), materialFlag);
    emissive = mix(vec3(1.0, 0.2, 0.5) * 50.0, vec3(0.0), heart) *
               (sin(iTime) * 0.5 + 0.5) * materialFlag;
  }
  vec3 nor = normal(p, 0.005, h);

  result += PBR(p, albedo, metalness, roughness, nor, -ray, normalize(sunDir),
                vec3(1.0, 0.98, 0.95) * 50.);
  result += PBR(p, albedo, metalness, roughness, nor, -ray,
                normalize(lightDir1), vec3(.01, .5, .5) * 10.0);
  result += PBR(p, albedo, metalness, roughness, nor, -ray,
                normalize(lightDir2), vec3(.5, .2, .01) * 10.0);

  result += calcAmbient(p, albedo, metalness, roughness, nor, -ray, depth);

  col = result + emissive;

  return col;
}

vec3 traceSphere(vec3 p, vec3 ray, out float depth) {
  float t = 0.0;
  vec3 pos;
  vec2 mat;
  for (int i = 0; i < 128; i++) {
    pos = p + ray * t;
    mat = map2(pos);
    if (mat.x < 0.001) {
      break;
    }
    t += abs(mat.x);
  }
  depth = t;

  vec3 nor = normal2(pos, 0.005, vec4(0.0));

  vec3 result = vec3(0.0);
  result += PBR(p, vec3(0.4), 0.0, 0.5, nor, -ray, normalize(sunDir),
                vec3(1.0, 0.98, 0.95) * 50.);
  result += PBR(p, vec3(0.4), 0.0, 0.5, nor, -ray, normalize(lightDir1),
                vec3(.01, .5, .5) * 10.0);
  result += PBR(p, vec3(0.4), 0.0, 0.5, nor, -ray, normalize(lightDir2),
                vec3(.5, .2, .01) * 10.0);

  result += calcAmbient(p, vec3(0.4), 0.0, 0.5, nor, -ray, depth);

  return result;
}

vec3 trace(vec3 p, vec3 ray, out float depth) {
  float t = 0.0;
  vec3 pos;
  vec2 mat;
  for (int i = 0; i < 128; i++) {
    pos = p + ray * t;
    mat = map(pos);
    if (mat.x < 0.001) {
      break;
    }
    t += abs(mat.x);
  }
  depth = t;
  return materialize(pos, ray, t, mat);
}

mat3 camera(vec3 ro, vec3 ta, float cr) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(sin(cr), cos(cr), 0.);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  return mat3(cu, cv, cw);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  timeLine(iTime);
  vec2 p =
      (fragCoord.xy * 2.0 - iResolution.xy) / min(iResolution.x, iResolution.y);

  vec3 ro = cameraPos;
  vec3 ta = targetPos;
  mat3 c = camera(ro, ta, 0.0);
  vec3 ray = c * normalize(vec3(p, cameraFov));
  float depth1, depth2;
  vec3 col1 = trace(ro, ray, depth1);
  vec3 col2 = traceSphere(ro, ray, depth2);

  if (depth1 < depth2) {
    fragColor = vec4(col1, 1.0);
  } else {
    fragColor = vec4(mix(col1, col2, sphereAlpha * 0.8), 1.0);
  }
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }