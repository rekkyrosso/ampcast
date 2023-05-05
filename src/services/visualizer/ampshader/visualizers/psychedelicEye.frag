// https://www.shadertoy.com/view/fllSD8
// License CC0: Psychedelic eye
//  Continuation of weekend experiment

#define PI            3.141592654
#define TAU           (2.0*PI)
#define TIME          iTime
#define TTIME         (TAU*TIME)
#define RESOLUTION    iResolution
#define ROT(a)        mat2(cos(a), sin(a), -sin(a), cos(a))
#define PCOS(x)       (0.5 + 0.5*cos(x))
#define DOT2(x)       dot(x, x)
#define BPERIOD       5.6
#define MPERIOD       7.2
#define FLIP          10.0

const vec2 iris_center = vec2(0.0, 0.28);

// https://stackoverflow.com/questions/15095909/from-rgb-to-hsv-in-opengl-glsl
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}
// Macro version of above to enable compile-time constants
#define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

const vec3  grid_color    = HSV2RGB(vec3(0.6, 0.3, 1.0));
const vec3  light0_color  = 16.0*HSV2RGB(vec3(0.6, 0.5, 1.0));
const vec3  light1_color  = 8.0*HSV2RGB(vec3(0.9, 0.25, 1.0));
const vec3  sky0_color    = HSV2RGB(vec3(0.05, 0.65, -0.25));
const vec3  sky1_color    = HSV2RGB(vec3(0.6, 0.5, 0.25));
const vec3  light0_pos    = vec3(1.0, 5.0, 4.0);
const vec3  light1_pos    = vec3(3.0, -1.0, -8.0);
const vec3  light0_dir    = normalize(light0_pos);
const vec3  light1_dir    = normalize(light1_pos);
const vec4  planet_sph    = vec4(50.0*normalize(light1_dir+vec3(0.025, -0.025, 0.0)), 10.0);

int   g_eff = 0;

float g_hf;

vec2 g_vx = vec2(0.0);
vec2 g_vy = vec2(0.0);

vec2 g_wx = vec2(0.0);
vec2 g_wy = vec2(0.0);


vec4 alphaBlend(vec4 back, vec4 front) {
  float w = front.w + back.w*(1.0-front.w);
  vec3 xyz = (front.xyz*front.w + back.xyz*back.w*(1.0-front.w))/w;
  return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

vec3 alphaBlend(vec3 back, vec4 front) {
  return mix(back, front.xyz, front.w);
}

vec3 postProcess(vec3 col, vec2 q) {
  col = clamp(col, 0.0, 1.0);
  col = pow(col, vec3(1.0/2.2));
  col = col*0.6+0.4*col*col*(3.0-2.0*col);
  col = mix(col, vec3(dot(col, vec3(0.33))), -0.4);
  col *=0.5+0.5*pow(19.0*q.x*q.y*(1.0-q.x)*(1.0-q.y),0.7);
  return col;
}

float circle(vec2 p, float r) {
  return length(p) - r;
}

// Based on: https://iquilezles.org/articles/distfunctions2d
float vesica(vec2 p, vec2 sz) {
  if (sz.x < sz.y) {
    sz = sz.yx;
  } else {
    p  = p.yx;
  }
  vec2 sz2 = sz*sz;
  float d  = (sz2.x-sz2.y)/(2.0*sz.y);
  float r  = sqrt(sz2.x+d*d);
  float b  = sz.x;
  p = abs(p);
  return ((p.y-b)*d>p.x*b) ? length(p-vec2(0.0,b))
                           : length(p-vec2(-d,0.0))-r;
}

// IQ's box
float box(vec2 p, vec2 b) {
  vec2 d = abs(p)-b;
  return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float eye_shape(vec2 p) {
  float a  = mix(0.0, 1.0, smoothstep(0.995, 1.0, cos(TTIME/BPERIOD)));
  const float w = 1.14;
  float h = mix(0.48, 0.05, a);
  float d0 =  vesica(p, vec2(w, h));
  return d0;
}

// IQ's ray sphere intersect: https://iquilezles.org/articles/intersectors
vec2 raySphere(vec3 ro, vec3 rd, vec4 sph) {
  vec3 oc = ro - sph.xyz;
  float b = dot( oc, rd );
  float c = dot( oc, oc ) - sph.w*sph.w;
  float h = b*b - c;
  if (h < 0.0) return vec2(-1.0);
  h = sqrt(h);
  return vec2(-b - h, -b + h);
}

// IQ's ray plane intersect: https://iquilezles.org/articles/intersectors
float rayPlane(vec3 ro, vec3 rd, vec4 p) {
  return -(dot(ro,p.xyz)+p.w)/dot(rd,p.xyz);
}

float tanh_approx(float x) {
//  return tanh(x);
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

vec2 toPolar(vec2 p) {
  return vec2(length(p), atan(p.y, p.x));
}

vec2 toRect(vec2 p) {
  return p.x*vec2(cos(p.y), sin(p.y));
}

vec3 toSpherical(vec3 p) {
  float r   = length(p);
  float t   = acos(p.z/r);
  float ph  = atan(p.y, p.x);
  return vec3(r, t, ph);
}

vec3 toRect(vec3 p) {
  return p.x*vec3(cos(p.z)*sin(p.y), sin(p.z)*sin(p.y), cos(p.y));
}

// https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

// https://mercury.sexy/hg_sdf/
vec2 mod2(inout vec2 p, vec2 size) {
  vec2 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5,size) - size*0.5;
  return c;
}

// https://iquilezles.org/articles/smin
float pmin(float a, float b, float k) {
  float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
  return mix( b, a, h ) - k*h*(1.0-h);
}

float pmax(float a, float b, float k) {
  return -pmin(-a, -b, k);
}

float pabs(float a, float k) {
  return -pmin(-a, a, k);
}

float noise(vec2 p) {
  float a = sin(p.x);
  float b = sin(p.y);
  float c = 0.5 + 0.5*cos(p.x + p.y);
  float d = mix(a, b, c);
  return d;
}

// https://iquilezles.org/articles/fbm
float fbm(vec2 p, float aa) {
  const mat2 frot = mat2(0.80, 0.60, -0.60, 0.80);

  float f = 0.0;
  float a = 1.0;
  float s = 0.0;
  float m = 2.0;
  for (int x = 0; x < 4; ++x) {
    f += a*noise(p);
    p = frot*p*m;
    m += 0.01;
    s += a;
    a *= aa;
  }
  return f/s;
}

// https://iquilezles.org/articles/warp
float warp(vec2 p, out vec2 v, out vec2 w) {
  const float r  = 0.5;
  const float rr = 0.25;
  float l2 = length(p);
  float f  = 1.0;

  if (g_eff==0) {
//    f = smoothstep(r, r+rr, l2);
    f = smoothstep(-0.1, 0.15, eye_shape(p));
    p.y += TIME*0.125;
    p.x = pabs(p.x, 0.1);
  } else if (g_eff==1) {
    const float z = 0.75;
    f = smoothstep(-0.05, 0.1, eye_shape(p.yx/z)*z);
    f = smoothstep(r, r+rr, l2);
    p = -p.yx;
    p = toPolar(p);
//    f = smoothstep(r, r+rr, l2);
    p.y -= -0.125*TIME+p.x*1.25;
  }

  g_hf = f;
  vec2 pp = p;

  vec2 vx = g_vx;
  vec2 vy = g_vy;

  vec2 wx = g_wx;
  vec2 wy = g_wy;


  //float aa = mix(0.95, 0.25, tanh_approx(pp.x));
  float aa = 0.5;

  v = vec2(fbm(p + vx, aa), fbm(p + vy, aa))*f;
  w = vec2(fbm(p + 3.0*v + wx, aa), fbm(p + 3.0*v + wy, aa))*f;

  return -tanh_approx(fbm(p + 2.25*w, aa)*f);
}

vec3 normal(vec2 p) {
  vec2 v;
  vec2 w;
  vec2 e = vec2(4.0/RESOLUTION.y, 0);

  vec3 n;
  n.x = warp(p + e.xy, v, w) - warp(p - e.xy, v, w);
  n.y = 2.0*e.x;
  n.z = warp(p + e.yx, v, w) - warp(p - e.yx, v, w);

  return normalize(n);
}

void compute_globals() {
  vec2 vx = vec2(0.0, 0.0);
  vec2 vy = vec2(3.2, 1.3);

  vec2 wx = vec2(1.7, 9.2);
  vec2 wy = vec2(8.3, 2.8);

  vx *= ROT(TTIME/1000.0);
  vy *= ROT(TTIME/900.0);

  wx *= ROT(TTIME/800.0);
  wy *= ROT(TTIME/700.0);

  g_vx = vx;
  g_vy = vy;

  g_wx = wx;
  g_wy = wy;
}

vec3 iris(vec2 p) {
  const vec3 up  = vec3(0.0, 1.0, 0.0);
  const vec3 lp1 = 1.0*vec3(1.0, 1.25, 1.0);
  const vec3 lp2 = 1.0*vec3(-1.0, 2.5, 1.0);

  vec3 ro = vec3(0.0, 10.0, 0.0);
  vec3 pp = vec3(p.x, 0.0, p.y);

  vec2 v;
  vec2 w;

  float h  = warp(p, v, w);
  float hf = g_hf;
  vec3  n  = normal(p);

  vec3 lcol1 = hsv2rgb(vec3(0.7, 0.5, 1.0));
  vec3 lcol2 = hsv2rgb(vec3(0.4, 0.5, 1.0));
  vec3 po  = vec3(p.x, 0.0, p.y);
  vec3 rd  = normalize(po - ro);

  vec3 ld1 = normalize(lp1 - po);
  vec3 ld2 = normalize(lp2 - po);

  float diff1 = max(dot(n, ld1), 0.0);
  float diff2 = max(dot(n, ld2), 0.0);

  vec3  ref   = reflect(rd, n);
  float ref1  = max(dot(ref, ld1), 0.0);
  float ref2  = max(dot(ref, ld2), 0.0);

  const vec3 col1 = vec3(0.1, 0.7, 0.8).xzy;
  const vec3 col2 = vec3(0.7, 0.3, 0.5).zyx;

  float a = length(p);
  vec3 col = vec3(0.0);
//  col += hsv2rgb(vec3(fract(0.3*TIME+0.25*a+0.5*v.x), 0.85, abs(tanh_approx(v.y))));
//  col += hsv2rgb(vec3(fract(-0.5*TIME+0.25*a+0.125*w.x), 0.85, abs(tanh_approx(w.y))));
  col += hsv2rgb(vec3(fract(-0.1*TIME+0.125*a+0.5*v.x+0.125*w.x), abs(0.5+tanh_approx(v.y*w.y)), tanh_approx(0.1+abs(v.y-w.y))));
//  col += (length(v)*col1 + length(w)*col2*1.0);
//  col += diff1;
//  col += diff2;
//  col *= 0.0;
  col += 0.5*lcol1*pow(ref1, 20.0);
  col += 0.5*lcol2*pow(ref2, 10.0);
  col *= hf;

//  col = n;
  return col;
}

vec3 eye_complete(vec2 p) {
  const float iris_outer = 0.622;
  const float iris_inner = 0.285;


  float t0 = abs(0.9*p.x);
  t0 *= t0;
  t0 *= t0;
  t0 *= t0;
  t0 = clamp(t0, 0.0, 1.0);
  float dt0 = mix(0.0125, -0.0025, t0);

  vec2 p0 = p;
  float d0 = eye_shape(p);
  float d5 = d0;

  vec2 p1 = p;
  p1 -= iris_center;
  float d1 = circle(p1, iris_outer);
  d1 = max(d1,d0+dt0);
  float d6 = d1;

  vec2 p2 = p;
  p2 -= vec2(0.155, 0.35);
  float d2 = circle(p2, 0.065);

  vec2 p3 = p;
  p3 -= iris_center;
  p3 = toPolar(p3);
  float n3 = mod1(p3.x, 0.05);
  float d3 = abs(p3.x)-0.0125*(1.0-1.0*length(p1));

  vec2 p4 = p;
  p4 -= iris_center;
  float d4 = circle(p4, iris_inner);

  d3 = max(d3,-d4);

  d1 = pmax(d1,-d2, 0.0125);
  d1 = max(d1,-d3);

  d0 = abs(d0)-dt0;


  float d = d0;
  d = pmin(d, d1, 0.0125);
  return vec3(d, d6, d5);
}

vec3 df(vec2 p) {
  return eye_complete(p);
}

vec3 render_background(vec3 ro, vec3 rd, vec3 nrd) {
  rd.xy *= ROT(-PI/2.0+0.6);
  vec3 srd = toSpherical(rd.xzy);
  srd.z += 0.025*TIME;
  vec2 pg  = srd.yz;
  float f  = sin(pg.x);
  float lf2= ceil(log(f)/log(2.0)-0.505);
  float mf = pow(2.0, lf2);

  float aa = 0.005;
  const float count = 20.0;
  const vec2 sz = vec2(2.0*PI/count);
  vec2 ng = mod2(pg, vec2(mf, 1.0)*sz);

  float dg = min(abs(pg.y)*f, abs(pg.x))-aa*0.0;
  vec3 lines = grid_color*smoothstep(-aa, aa, -dg)*f*f;

  vec3 sky  = smoothstep(1.0, 0.0, rd.y)*sky1_color+smoothstep(0.5, 0.0, rd.y)*sky0_color;

  vec2 pi = raySphere(ro, rd, planet_sph);

  float lf1 = 1.0;
  if (pi.x > 0.0) {
    vec3 ppos = ro+rd*pi.x;
    float t = 1.0-tanh_approx(1.5*(pi.y - pi.x)/planet_sph.w);
    sky *= mix(0.5, 1.0, t);
    lf1 = t;
  } else {
    sky += lines;
  }

  sky += pow(max(dot(rd, light0_dir), 0.0), 800.0)*light0_color;
  sky += pow(max(dot(rd, light0_dir), 0.0), 80.0)*light1_color*0.1;
  sky += lf1*pow(max(dot(rd, light1_dir), 0.0), 150.0)*light1_color;
  sky += lf1*pow(max(dot(rd, light1_dir), 0.0), 50.0)*light0_color*0.1;


  return sky;
}

vec4 render_iris(vec3 ro, vec3 rd, vec3 nrd) {
  vec4 plane = vec4(normalize(vec3(1.0, 0.165-0.00, 0.0)), -0.944);
  float aa = TTIME/MPERIOD;
  float bb = smoothstep(-0.125, 0.125, sin(aa));
  plane.xy *= ROT(0.075*bb);
  plane.xz *= ROT(0.25*bb*sign(-sin(PI/4.0+0.5*aa)));
  vec3 tnor  = plane.xyz;
  const vec3 tup   = normalize(vec3(0.0, -1.0, 0.0));
  float t = rayPlane(ro, rd, plane);
  if (t <= 0.0) {
    return vec4(0.0);
  }

  vec3 tpos = ro + t*rd;
  tpos *= 4.0;
  vec3 txx = normalize(cross(tnor, tup));
  vec3 tyy = normalize(cross(tnor, txx));

  vec2 tpos2 = vec2(dot(txx, tpos), dot(tyy, tpos));

  vec3 col = iris(tpos2)*smoothstep(0.0, 1.0/75.0, t);

  return vec4(col, smoothstep(0.0, 1.0/500.0, t));
}


vec4 render_body(vec2 p, vec3 dd, float z) {
//  p -= iris_center;
  float aa = 2.0/RESOLUTION.y;

  vec3 ro = vec3(2.0, 0.0, 0.0);
  vec3 la = vec3(0.0, 0.0, 0.0);

  vec2 np   = p + vec2(4.0/RESOLUTION.y);

  vec3 ww   = normalize(la - ro);
  vec3 uu   = normalize(cross(vec3(0.0,1.0,0.0), ww));
  vec3 vv   = normalize(cross(ww,uu));
  float rdd = 2.0;
  vec3 rd   = normalize(p.x*uu + p.y*vv + rdd*ww);
  vec3 nrd  = normalize(np.x*uu + np.y*vv + rdd*ww);

  vec4 sph  = vec4(vec3(0.0), 1.0);

  vec2 si   = raySphere(ro, rd, sph);
  if (si.x <= 0.0) {
    return vec4(0.0);
  }

  float a = smoothstep(-aa, aa, -dd.z);
  float b = smoothstep(0.0, mix(0.25, 1.0, float(p.y > 0.0))*mix(0.075, 0.0025, smoothstep(0.5, 1.0, abs(p.x))), -dd.z/z);
  float c = smoothstep(-aa, aa, -dd.x);

  vec3 pos  = ro + rd*si.x;

  vec3 nor  = normalize(pos - sph.xyz);

  float dif0= max(dot(nor, light0_dir), 0.0);
  float dif1= max(dot(nor, light1_dir), 0.0);

  vec3 ref  = reflect(rd, nor);
  vec3 nref = reflect(nrd, nor);

  vec3 refr = refract(rd, nor, 0.9);
  vec3 nrefr= refract(nrd, nor, 0.9);

  vec3 rbkg = render_background(pos, ref, nref);
  vec4 riris= render_iris(pos, refr, nrefr);

  vec3 col = vec3(0.0);
  col += vec3(0.5);
  col += dif1*0.5;
  col += dif0*0.5;
  if (fract((TIME/BPERIOD)/(2.0*FLIP)) > 0.5) {
    rbkg = max(rbkg, 0.0);
    rbkg = tanh(vec3(0.5, 1.0, 1.6)*rbkg).zxy;
    col = mix(rbkg, rbkg*0.6, c);
  } else {
    col = alphaBlend(col, riris);
    col += rbkg*mix(0.33, 1.0, riris.w);
  }
  col *= b;

  return vec4(col, a);
}

float synth(vec2 p) {
  const float z = 4.0;
  const float st = 0.02;
  float dob = box(p, vec2(1.4, 0.5));
  p.x = abs(p.x);
  p.x += st*20.0;
  p /= z;
  float n = mod1(p.x, st);
  float dib = 1E6;
  const int around = 1;
  for (int i = -around; i <=around ;++i) {
    float fft = texture(iChannel0, vec2((n+float(i))*st, 0.25)).x;
    fft *= fft;
    float dibb = box(p-vec2(st*float(i), 0.0), vec2(st*0.25, 0.05*fft+0.001));
    dib = min(dib, dibb);
  }

  float dl = p.y;
  dl = abs(dl) - 0.005;
  dl = abs(dl) - 0.0025;
  dl = abs(dl) - 0.00125;
  float d = dib;
  d = max(d, -dl);
  //d = pmax(d, dob, 0.025);
  return d*z;
}

vec3 effect(vec2 p) {
  compute_globals();

  float aa = 2.0/RESOLUTION.y;
  const float m = 3.0;
  const float z = 1.0;
  p /= z;
  vec2 pp  = p;

  vec3 d   = df(pp)*z;

  vec4 dcol = vec4(mix(vec3(0.9), vec3(0.0), smoothstep(-aa, aa, -d.x)) , smoothstep(-aa, aa, -d.z));
  g_eff = 1;
  vec4 scol = render_body(p, d, z);

  vec3 col  = vec3(1.0);
  g_eff = 0;
  col = iris(p);

  vec2 dp = p;
  dp.y = -pabs(dp.y, 1.0);
  dp -= vec2(0.0, -0.85);
  dp = toPolar(dp);
  dp.y += -0.2*(p.x);
  dp = toRect(dp);
  float dd = synth(dp);

  vec4 ddcol = vec4(vec3(0.9), smoothstep(-aa, aa, -dd));

  col = alphaBlend(col, dcol);
  if (fract((TIME/BPERIOD)/FLIP) > 0.5) {
    col = alphaBlend(col, scol);
  }
  col -= 0.5*exp(-75.0*max(dd, 0.0));
  col = alphaBlend(col, ddcol);
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/iResolution.xy;
  vec2 p = -1.0 + 2.0*q;
  p.x *= RESOLUTION.x/RESOLUTION.y;
  float aa = 2.0/RESOLUTION.y;

  vec3 col = effect(p);
  col = mix(vec3(0.0), col, smoothstep(0.5, 5.0, TIME));
  col = postProcess(col, q);

  fragColor = vec4(col, 1.0);
}
