precision highp float;

#define MAX_STEPS 64
#define EPSILON .001

#define M_PI 3.14159265358979

uniform vec3 iResolution;
uniform float iTime;

const vec3 LightSource = vec3(3.,20.5, 3.);

vec3 WaterColor = vec3(0.4, 0.9, 1);

const float WaterHeight = 0.;
const float MaxWaveAmplitude = 0.03;

const float HeightPool = 1.;
const float HalfSizePool = 3.;
const float DepthPool = 3.0;

struct MaterialInfo {
	vec3 Kd;
	float Shininess;
};

float CyclicTime()
{
  return mod(iTime, 30.);
}

float WaveAmplitude() {
	return MaxWaveAmplitude * exp(-CyclicTime() / 10.);
}

float WaterWave(vec3 a) {
    float wave = 0.0;
    vec3 org = a;
    float amp = WaveAmplitude();
    wave += amp * min(pow(distance(org, vec3(0.0)), -1.), 2.0) * sin((2. * a.x * a.x + 2. * a.z * a.z) - 15. * CyclicTime());
	return wave;
}

float BallOscillation() {
	return sin(5. * CyclicTime() + 4.) * exp(-CyclicTime() / 6.) + 0.3;
}

float PoolBottom(vec3 a) {
	return a.y + DepthPool + .01;
}

float BackWall(vec3 a) {
	return a.z + HalfSizePool + .01;
}

float LeftWall(vec3 a) {
	return a.x + HalfSizePool + .01;
}

float WaterSurface2(vec3 a) {
	vec3 sz = vec3(HalfSizePool, 0, HalfSizePool);
	return length(max(abs(a + vec3(0, 0.0, 0)) - sz, 0.));
}

float WaterSurface(vec3 a) {
	vec3 sz = vec3(HalfSizePool, 0, HalfSizePool);
	return length(max(abs(a + vec3(0, WaterWave(a), 0)) - sz, 0.));
}

float Pool(vec3 a) {
	return min(PoolBottom(a), min(LeftWall(a), BackWall(a)));
}

float Pool2(vec3 a) {
	return min(PoolBottom(a), min(LeftWall(a), BackWall(a)));
}

float Ball(vec3 a) {
	return length(a + vec3(0., BallOscillation(), 0.)) - 0.75;
}

float Scene(vec3 a) {
	return min(WaterSurface(a), min(Ball(a), Pool(a)));
}

bool IsWaterSurface(vec3 a)
{
	float closest = Ball(a);
	float dist = Pool(a);
	if (dist < closest) {
		closest = dist;
	}
	dist = WaterSurface(a);
	if (dist < closest) {
		return true;
	}
	return false;
}

bool IsWater(vec3 pos)
{
	return (pos.y < (WaterHeight - MaxWaveAmplitude));
}

bool IsPool(vec3 pos)
{
    return Pool(pos) < 0.01;
}

bool IsBall(vec3 pos)
{
    return Ball(pos) < 0.01;
}

vec3 PoolColor(vec3 pos) {
	if ((pos.y > HeightPool) || (pos.x > HalfSizePool) || (pos.z > HalfSizePool))
		return vec3(0.0);
	float tileSize = 0.2;
	float thickness = 0.015;
	vec3 thick = mod(pos, tileSize);
	if ((thick.x > 0.) && (thick.x < thickness) || (thick.y > 0.) && (thick.y < thickness) || (thick.z > 0.) && (thick.z < thickness))
		return vec3(1);
	return vec3(sin(floor((pos.x + 1.) / tileSize)) * cos(floor((pos.y + 1.) / tileSize)) * sin(floor((pos.z + 1.) / tileSize)) + 3.);
}

MaterialInfo Material(vec3 a) {
	MaterialInfo m = MaterialInfo(vec3(.5, .56, 1.), 50.);
	float closest = Ball(a);

	float dist = WaterSurface(a);
	if (dist < closest) {
		closest = dist;
		m.Kd = WaterColor;
		m.Shininess = 120.;
	}
	dist = Pool(a);
	if (dist < closest) {
		m.Kd = PoolColor(a);
		m.Shininess = 0.;
	}
	return m;
}

vec3 Normal(vec3 a) {
	vec2 e = vec2(.001, 0.);
	float s = Scene(a);
	return normalize(vec3(
		Scene(a+e.xyy) - s,
		Scene(a+e.yxy) - s,
		Scene(a+e.yyx) - s));
}

float Occlusion(vec3 at, vec3 normal) {
	float b = 0.;
	for (int i = 1; i <= 4; ++i) {
		float L = .06 * float(i);
		float d = Scene(at + normal * L);
		b += max(0., L - d);
	}
	return min(b, 1.);
}

vec3 LookAt(vec3 pos, vec3 at, vec3 rDir) {
	vec3 f = normalize(at - pos);
	vec3 r = cross(f, vec3(0., 1., 0.));
	vec3 u = cross(r, f);
	return mat3(r, u, -f) * rDir;
}

float Trace(vec3 rPos, vec3 rDir, float distMin) {
	float L = distMin;
	for (int i = 0; i < MAX_STEPS; ++i) {
		float d = Scene(rPos + rDir * L);
		L += d;
		if (d < EPSILON * L) break;
	}
	return L;
}

vec3 Lighting(vec3 at, vec3 normal, vec3 eye, MaterialInfo m, vec3 lColor, vec3 lPos) {
	vec3 lDir = lPos - at;

	vec3 lDirN = normalize(lDir);
	float t = Trace(at, lDirN, EPSILON*2.);
	if (t < length(lDir)) {
		vec3 pos = at + lDirN * t;
		if(!IsWaterSurface(pos))
			return vec3(0.);
	}
	vec3 color = m.Kd * lColor * max(0., dot(normal, normalize(lDir)));

	if (m.Shininess > 0.) {
		vec3 h = normalize(normalize(lDir) + normalize(eye - at));
		color += lColor * pow(max(0., dot(normal, h)), m.Shininess) * (m.Shininess + 8.) / 25.;
	}
	return color / dot(lDir, lDir);
}


float beforeWater(vec3 ro, vec3 ray)
{
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        float res = WaterSurface2(ro+ray*t);
        if( res < 0.0001 ) return t;
        t += res;
    }

    return -1.0;
}

float water(vec3 ro, vec3 ray)
{
    float t = 0.0;
    for (int i = 0; i < 128; i++) {
        float res = WaterSurface(ro+ray*t);
        if( res < 0.01 ) return t;
        t += res*0.5;
    }

    return -1.0;
}

float pool(vec3 ro, vec3 ray)
{
    float t = 0.0;
    for (int i = 0; i < 64; i++) {
        float res = Pool(ro+ray*t);
        if( res < 0.001 ) return t;
        t += res;
    }

    return -1.0;
}

float caustics(vec3 p, vec3 lp) {
    vec3 ray = normalize(p - lp);

    float d = beforeWater(lp, ray);
    vec3 inter = lp + ray * d;


    if (d < -0.5) {
    	return (0.0);
    }

    //d = water(lp, ray);
    //vec3 surfpos = lp + ray * d;
    vec3 surfpos = inter - vec3(0., WaterWave(inter) - 0.01, 0.);

    vec3 refractRay = refract(ray, vec3(0., 1., 0.), 1./1.333);
    float beforeHit = pool(inter, refractRay);
    vec3 beforePos = inter + refractRay * beforeHit;
    //return beforePos.y;
    float tp = (-beforePos.y - DepthPool) / refractRay.y;
    beforePos += refractRay * tp;

    refractRay = refract(ray, Normal(surfpos), 1./1.333);
    float afterHit = pool(surfpos, refractRay);
    vec3 afterPos = surfpos + refractRay * afterHit;
    tp = (-afterPos.y - DepthPool) / refractRay.y;
    afterPos += refractRay * tp;

    float beforeArea = length(dFdx(beforePos)) * length(dFdy(beforePos));
    float afterArea = length(dFdx(afterPos)) * length(dFdy(afterPos));
    return max(beforeArea / afterArea, .001);
}

vec3 Shade(vec3 rpos, vec3 rdir, float t)
{
	vec3 pos = rpos + rdir * t;
	vec3 nor = Normal(pos);

	bool waterSurface = IsWaterSurface(pos);
	bool water = IsWater(pos);
	vec3 waterSurfaceLight = vec3(0);
    vec3 light = vec3(50.);
	if (waterSurface)
	{
		vec3 refractionDir = refract(normalize(rdir), nor, 1./1.333);

		waterSurfaceLight = Lighting(pos, nor, rpos, Material(pos), light, LightSource);

		float wt = Trace(pos, refractionDir, 0.03);
		pos += refractionDir * wt;
		nor = Normal(pos);
	}
	MaterialInfo mat = Material(pos);

	vec3 color = .11 * mat.Kd;


	if (water || waterSurface) {
        if (IsPool(pos) || (IsBall(pos) && water)) {
            color += Lighting(pos, nor, rpos, mat, light, LightSource) * vec3(caustics(pos, LightSource));
            color *= WaterColor;
        }
        if (waterSurface) {
			color += waterSurfaceLight;
        }
    } else {
        color += Lighting(pos, nor, rpos, mat, light, LightSource);
    }
	return color;
}

vec3 Camera(vec2 px) {
	vec2 uv = px.xy / iResolution.xy * 2. - 1.;
	uv.x *= iResolution.x / iResolution.y;

    float x = M_PI * 0.15;
    float y = 4.;

	if (iMouse.z>=1.) {
    	x = (iMouse.x/iResolution.x - .5)*7.;
    	y = (iMouse.y/iResolution.y)*7.;
    	x = clamp(x, -0.2, 1.8);
    }

	vec3 rayStart = vec3(sin(x) * 10.0, y * 1.5, cos(x) * 10.0);
	vec3 rayDirection = LookAt(rayStart, vec3(0, sin(iTime * 0.5) -1.5, 0), normalize(vec3(uv, -3.)));

	float path = Trace(rayStart, rayDirection, 0.);
	return Shade(rayStart, rayDirection, path);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec3 col = Camera(fragCoord.xy);
	fragColor = vec4(col, 0.);
}