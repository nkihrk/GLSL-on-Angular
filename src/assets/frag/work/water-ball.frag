vec4 trace_heightfield(vec3 ro, vec3 rd) {

  // intersect with max h plane, y=1

  // ro.y + t*rd.y = 1.0;
  // t*rd.y = 1.0 - ro.y;
  float t = (1.0 - ro.y) / rd.y;

  if (t < 0.0)
    return red;

  vec3 p = ro + t * rd;

  // float h = getHeight(p);
  float h, last_h;
  bool not_found = true;
  vec3 last_p = p;

  for (int i = 0; i < 20; i++) {

    p += step * rd;

    h = getHeight(p);

    if (p.y < h) {
      not_found = false;
      break;
    } // we stepped through
    last_h = h;
    last_p = p;
  }

  if (not_found)
    return bg;

  // refine interection
  float dh2 = h - p.y;
  float dh1 = last_p.y - last_h;
  p = last_p + rd * step / (dh2 / dh1 + 1.0);

  // box shenanigans
  // if (p.x < -2.0) {
  //   if (rd.x <= 0.0)
  //     return bg;
  //   return intersect_box(ro, rd);
  // }
  // if (p.x > 2.0) {
  //   if (rd.x >= 0.0)
  //     return bg;
  //   return intersect_box(ro, rd);
  // }
  // if (p.z < -2.0) {
  //   if (rd.z <= 0.0)
  //     return bg;
  //   return intersect_box(ro, rd);
  // }
  // if (p.z > 2.0) {
  //   if (rd.z >= 0.0)
  //     return bg;
  //   return intersect_box(ro, rd);
  // }

  vec3 pdx = p + vec3(0.01, 0.0, 0.00);
  vec3 pdz = p + vec3(0.00, 0.0, 0.01);

  float hdx = getHeight(pdx);
  float hdz = getHeight(pdz);
  h = getHeight(p);

  p.y = h;
  pdx.y = hdx;
  pdz.y = hdz;

  vec3 normal = normalize(cross(p - pdz, p - pdx));

  return shade(normal, p, rd);
}

// Shadertoy camera code by iq

mat3 setCamera(in vec3 ro, in vec3 ta, float cr) {
  vec3 cw = normalize(ta - ro);
  vec3 cp = vec3(sin(cr), cos(cr), 0.0);
  vec3 cu = normalize(cross(cw, cp));
  vec3 cv = normalize(cross(cu, cw));
  return mat3(cu, cv, cw);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 p = (-iResolution.xy + 2.0 * fragCoord.xy) / iResolution.y;
  vec2 m = iMouse.xy / iResolution.xy;

  m.y += 0.3;
  m.x += 0.72;

  // camera
  vec3 ro = 9.0 * normalize(vec3(sin(5.0 * m.x), 1.0 * m.y,
                                 cos(5.0 * m.x))); // positon
  vec3 ta = vec3(0.0, -1.0, 0.0);                  // target
  mat3 ca = setCamera(ro, ta, 0.0);
  // ray
  vec3 rd = ca * normalize(vec3(p.xy, 4.0));

  fragColor = trace_heightfield(ro, rd);
}

void main() { mainImage(gl_FragColor, gl_FragCoord.xy); }