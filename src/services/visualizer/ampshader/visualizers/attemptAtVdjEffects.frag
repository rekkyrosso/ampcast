// https://www.shadertoy.com/view/XctGzf
// CC0: Attempt at VDJ effects
//   Inspired by the Revision VDJ:ng I wanted to try something similar.

// If nothing happens try hitting pause and play to trigger the audio to load.


#define TIME        (iChannelTime[0])
#define RESOLUTION  iResolution
#define PI          3.141592654
#define TAU         (2.0*PI)
#define ROT(a)      mat2(cos(a), sin(a), -sin(a), cos(a))

#define BPM         60.


#define NONE        0

#define COMPUTER    1
#define FREQ1       2
#define FREQ2       3

#define EFFECT0     1
#define EFFECT1     2
#define EFFECT2     3
#define EFFECT3     4
#define EFFECT4     5

#define FLASH       1

#define SCRIPT(a,b,c) ((a << 3)+(b<<1)+c)

const int g_scriptCount = 29;

const int[] g_script = int[g_scriptCount](
    SCRIPT(NONE   , COMPUTER, NONE)
  , SCRIPT(EFFECT0, FREQ1   , FLASH)
  , SCRIPT(EFFECT4, FREQ1   , FLASH)
  , SCRIPT(EFFECT1, FREQ1   , FLASH)
  , SCRIPT(EFFECT1, FREQ1   , FLASH)
  , SCRIPT(EFFECT4, FREQ2   , FLASH)
  , SCRIPT(EFFECT4, FREQ2   , FLASH)
  , SCRIPT(EFFECT0, COMPUTER, FLASH)
  , SCRIPT(EFFECT0, COMPUTER, FLASH)
  , SCRIPT(EFFECT4, COMPUTER, FLASH)
  , SCRIPT(EFFECT4, COMPUTER, FLASH)
  , SCRIPT(EFFECT1, FREQ1   , FLASH)
  , SCRIPT(EFFECT1, FREQ1   , FLASH)
  , SCRIPT(EFFECT4, FREQ2   , FLASH)
  , SCRIPT(EFFECT3, FREQ2   , FLASH)
  , SCRIPT(EFFECT2, FREQ2   , FLASH)
  , SCRIPT(EFFECT2, FREQ2   , FLASH)
  , SCRIPT(EFFECT1, FREQ2   , FLASH)
  , SCRIPT(EFFECT1, FREQ2   , FLASH)
  , SCRIPT(EFFECT4, FREQ1   , FLASH)
  , SCRIPT(EFFECT0, FREQ1   , FLASH)
  , SCRIPT(EFFECT3, COMPUTER, FLASH)
  , SCRIPT(EFFECT3, COMPUTER, FLASH)
  , SCRIPT(EFFECT2, FREQ2   , FLASH)
  , SCRIPT(EFFECT2, FREQ2   , FLASH)
  , SCRIPT(EFFECT1, FREQ2   , FLASH)
  , SCRIPT(EFFECT1, FREQ2   , FLASH)
  , SCRIPT(NONE   , COMPUTER, NONE )
  , SCRIPT(NONE   , COMPUTER, NONE )
  );

int g_mainEffect;
int g_flash;

float g_ntime;
float g_ftime;
float g_btime;
mat2 g_rot0;
mat2 g_rot1;

// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}
// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
//  Macro version of above to enable compile-time constants
#define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

const vec3 lightDir0    = normalize(vec3(-1.,-1., 0.));
const vec3 lightCol0    = HSV2RGB(vec3(0.6, .2, 1E-2));
const vec3 lightDir1    = normalize(vec3(1.,1., -1.));
const vec3 lightCol1    = HSV2RGB(vec3(0.6, 0.2, 2E-3));
const vec3 bottomBoxCol = HSV2RGB(vec3(0.7, 0.5, 0.25));
const vec3 topBoxCol    = HSV2RGB(vec3(0.6, 0.2, 0.95));
const vec3 sbase        = HSV2RGB(vec3(0.0, 0.9, 1.));
const vec3 seye         = HSV2RGB(vec3(0.03, 0.75, 16.));
const vec3 sbase4       = HSV2RGB(vec3(0.6, 0.6, 1.));
const vec3 glowCol      = HSV2RGB(vec3(0.0, 0.9, 1E-3));

// License: Unknown, author: Unknown, found: don't remember
float hash(float co) {
  return fract(sin(co*12.9898) * 13758.5453);
}

// License: Unknown, author: Matt Taylor (https://github.com/64), found: https://64.github.io/tonemapping/
vec3 aces_approx(vec3 v) {
  v = max(v, 0.0);
  v *= 0.6f;
  float a = 2.51f;
  float b = 0.03f;
  float c = 2.43f;
  float d = 0.59f;
  float e = 0.14f;
  return clamp((v*(a*v+b))/(v*(c*v+d)+e), 0.0f, 1.0f);

}

// License: Unknown, author: Claude Brezinski, found: https://mathr.co.uk/blog/2017-09-06_approximating_hyperbolic_tangent.html
float tanh_approx(float x) {
  //  Found this somewhere on the interwebs
  //  return tanh(x);
  float x2 = x*x;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

// License: MIT, author: Inigo Quilez, found: https://www.iquilezles.org/www/articles/smin/smin.htm
float pmin(float a, float b, float k) {
  float h = clamp(0.5+0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}

float pmax(float a, float b, float k) {
  return -pmin(-a, -b, k);
}

float pabs(float a, float k) {
  return -pmin(a, -a, k);
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float mod1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize, size) - halfsize;
  return c;
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
vec2 mod2(inout vec2 p, vec2 size) {
  vec2 c = floor((p + size*0.5)/size);
  p = mod(p + size*0.5,size) - size*0.5;
  return c;
}

// License: MIT OR CC-BY-NC-4.0, author: mercury, found: https://mercury.sexy/hg_sdf/
float modPolar(inout vec2 p, float repetitions) {
  float angle = 2.*PI/repetitions;
  float a = atan(p.y, p.x) + angle/2.;
  float r = length(p);
  float c = floor(a/angle);
  a = mod(a,angle) - angle/2.;
  p = vec2(cos(a), sin(a))*r;
  // For an odd number of repetitions, fix cell index of the cell in -x direction
  // (cell index would be e.g. -5 and 5 in the two halves of the cell):
  if (abs(c) >= (repetitions/2.)) c = abs(c);
  return c;
}

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/distfunctions/
float torus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

float sphere(vec3 p, float t) {
  return length(p)-t;
}

float circle(vec2 p, float r) {
  return length(p) - r;
}

float circle4(vec2 p, float r) {
  p *= p;
  return pow(dot(p, p), 0.25) - r;
}

float plane(vec2 p, vec3 pp) {
  return dot(p, pp.xy)+pp.z;
}

float segmenty(vec2 p, float h, float w) {
  float hh = 0.5*h;
  p.y = abs(p.y);
  p.y -= hh;
  float d0 = length(p);
  float d1 = abs(p.x);
  float d = p.y > 0.0 ? d0 : d1;
  d -= w;
  return d; 
}


// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/intersectors/
float rayPlane(vec3 ro, vec3 rd, vec4 p) {
  return -(dot(ro,p.xyz)+p.w)/dot(rd,p.xyz);
}

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/distfunctions/
float box(vec2 p, vec2 b) {
  vec2 d = abs(p)-b;
  return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}
 
float dfeffect0(vec2 p, vec2 pp) {
  float csz = 0.3;
  csz /= 1.-0.5*length(pp)*sqrt(0.5)*(g_ftime*g_ftime*g_ftime);
  float sm = csz+.4*csz;
  vec2 dp = p;
  vec2 dn = mod2(dp, vec2(csz));
  float ddots = length(dp);
  vec2 adp = abs(dp);
  float dgrid = min(adp.x, adp.y);
  float tm = sqrt(0.5)*g_btime;
  float dblobs = 1E3;
  for (float i = 0.; i < 5.; ++i) {
    vec2 a = vec2(1., sqrt(0.5))*tm+vec2(i, i*i);
    vec2 o = csz*vec2(sin(a))*4.;
    float dd = circle(p-o, csz*0.5);
    dblobs = pmin(dblobs, dd, sm);
  }

  float d = 1E6;
  d = min(d, ddots);
  d = pmin(d, (dblobs), sm);
  return d;
}

// From Evil Ryu Mandelbox - https://www.shadertoy.com/view/XdlSD4

const float fixed_radius2 = 1.9;
const float min_radius2   = 0.5;
const float folding_limit = 1.0;
const float scale         = -2.8;

vec3 pmin(vec3 a, vec3 b, vec3 k) {
  vec3 h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0);
  
  return mix(b, a, h) - k*h*(1.0-h);
}

void sphere_fold(inout vec3 z, inout float dz) {
    float r2 = dot(z, z);
    if(r2 < min_radius2) {
        float temp = (fixed_radius2 / min_radius2);
        z *= temp;
        dz *= temp;
    } else if(r2 < fixed_radius2) {
        float temp = (fixed_radius2 / r2);
        z *= temp;
        dz *= temp;
    }
}

void box_fold(inout vec3 z, inout float dz) {
  const float k = 0.05;
  // Soft clamp after suggestion from ollij
  vec3 zz = sign(z)*pmin(abs(z), vec3(folding_limit), vec3(k));
  // Hard clamp
  // z = clamp(z, -folding_limit, folding_limit);
  z = zz * 2.0 - z;
}


float mb(vec3 z) {
    vec3 offset = z;
    float dr = 1.0;
    float fd = 0.0;
    for(int n = 0; n < 5; ++n) {
        box_fold(z, dr);
        sphere_fold(z, dr);
        z = scale * z + offset;
        dr = dr * abs(scale) + 1.0;        
        float r1 = sphere(z, 5.0);
        float r2 = torus(z, vec2(8.0, 1));
        r2 = abs(r2) - 0.25;
        float r = n < 4 ? r2 : r1;        
        float dd = r / abs(dr);
        if (n < 3 || dd < fd) {
          fd = dd;
        }
    }
    return (fd);
}

vec2 toPolar(vec2 p) {
  return vec2(length(p), atan(p.y, p.x));
}

vec2 toRect(vec2 p) {
  return vec2(p.x*cos(p.y), p.x*sin(p.y));
}

float modMirror1(inout float p, float size) {
  float halfsize = size*0.5;
  float c = floor((p + halfsize)/size);
  p = mod(p + halfsize,size) - halfsize;
  p *= mod(c, 2.0)*2.0 - 1.0;
  return c;
}
// License: CC0, author: Mårten Rånge, found: https://github.com/mrange/glsl-snippets
float smoothKaleidoscope(inout vec2 p, float sm, float rep) {
  vec2 hp = p;

  vec2 hpp = toPolar(hp);
  float rn = modMirror1(hpp.y, TAU/rep);

  float sa = PI/rep - pabs(PI/rep - abs(hpp.y), sm);
  hpp.y = sign(hpp.y)*(sa);

  hp = toRect(hpp);

  p = hp;

  return rn;
}

float dfeffect1(vec2 p, vec2 pp) {
  const float s = sqrt(.5);
  p /= s;
  float rep = 20.0;
  float ss = 0.05*6.0/rep;
  vec3 p3 = vec3(p.x, p.y, 0.5+g_ftime*g_ftime);
  p3.xz*=g_rot0;
  p3.yz*=g_rot1;
  float n = smoothKaleidoscope(p3.xy, ss, rep);
  float d = mb(p3)*s;
  return abs(d);
}


float apollonian(vec3 p, float s) {
  vec3 op = p;
  float scale = 1.;
  float sc = 0.55*s;
  float tsc = sc;
  float ssc = 1.;
  for(int i=0; i < 5; ++i) {
    p = -1.0 + 2.0*fract(0.5*p+0.5);
    float r2 = tanh(dot(p,p)/tsc)*tsc;
    float k  = s/r2;
    p       *= k;
    scale   *= k;
  }
  
  vec3 ap = abs(p/scale);
#define X1  
#if defined(X0)  
  float d = ap.x;
  d = min(d, length(ap.yz));
#elif defined(X1)
  float d = ap.x;
  d = min(d, abs(length(ap.yz-0.08*(g_ftime))-0.0025));
#else
  float d = ap.x;
  d = min(d, ap.y);
  d = min(d, ap.z);
#endif
  return d;
}

float dfeffect2(vec2 p, vec2 pp) {
  float fz = mix(0.75, 1., smoothstep(-0.9, 0.9, cos(TAU*TIME/33.0)));
  float z = 2.*fz;
  p /= z;
  vec3 p3 = vec3(p,0.1);
  p3.xz*=g_rot0;
  p3.yz*=g_rot1;
  float ifz = 1.0/fz;
  float d = apollonian(p3, ifz);
  d *= z;
  return d-5E-4;
}

float dsegmentx(vec2 p, vec2 dim) {
  p.x = abs(p.x);
  float o = 0.5*max(dim.x-dim.y, 0.0);
  if (p.x < o) {
    return abs(p.y) - dim.y;
  }
  return length(p-vec2(o, 0.0))-dim.y;
}

const int[16] digits = int[16](
  0x7D // 0
, 0x50 // 1
, 0x4F // 2
, 0x57 // 3
, 0x72 // 4
, 0x37 // 5
, 0x3F // 2
, 0x51 // 7
, 0x7F // 8
, 0x77 // 9
, 0x7B // A
, 0x3E // B
, 0x2D // C
, 0x5E // D
, 0x2F // E
, 0x2B // F
); 

float digit(vec2 p, float n) {
  const vec2 dim = vec2(0.75, 0.075);
  const float eps = 0.001;
  vec2 ap = abs(p);
  if (ap.x > (1.+dim.y+eps)) return 1E3;
  if (ap.y > (1.5+dim.y+eps)) return 1E3;
  float m = mod(floor(n), 16.0);
  int digit = digits[int(m)];

  vec2 cp = (p-0.5);
  vec2 cn = round(cp);

  vec2 p0 = p;
  p0.y -= 0.5;
  p0.y = p0.y-0.5;
  float n0 = round(p0.y);
  p0.y -= n0;
  float d0 = dsegmentx(p0, dim);

  vec2 p1 = p;
  vec2 n1 = sign(p1); 
  p1 = abs(p1);
  p1 -= 0.5;
  p1 = p1.yx;
  float d1 = dsegmentx(p1, dim);
  
  vec2 p2 = p;
  p2.y = abs(p.y);
  p2.y -= 0.5;
  p2 = abs(p2);
  float d2 = dot(normalize(vec2(1.0, -1.0)), p2);

  float d = d0;
  d = min(d, d1);

  float sx = 0.5*(n1.x+1.0) + (n1.y+1.0);
  float sy = -n0;
  float s  = d2 > 0.0 ? (3.0+sx) : sy;
  // Praying bit shift operations aren't TOO slow
  return ((digit & (1 << int(s))) == 0) ? 1E3 : d;
}

float dfeffect3(vec2 p, vec2 pp) {
  float d = 1E3;
  float nb = mod(g_ntime-1., 4.0);
  float sc =  0.33*mix(0.25, 1., nb/3.);
  p *= ROT(1.5*(hash(g_ntime)-0.5)*(nb-3.)/3.);
  sc /= 1.-0.5*length(pp)*sqrt(0.5)*sin(g_btime*PI);
  vec2 p0 = p;
  p0 /= sc;
  p0.x -= 3.;
  float nx = mod1(p0.x, 3.);
  float sx = 1.-2.*mod(nx, 2.0);
  p0.y += sx*(g_ntime+pow(g_ftime, 4.))*12.;
  float ny = sx*mod1(p0.y, 3.);
  vec2 n2 = vec2(nx, ny);
  float n = (-n2.x+n2.y);
  float sdig = mod(n, 4.);
  n = abs(120.-floor(n/4.));
  float dig0 = mod(n, 10.);
  float dig1 = mod(n/10., 10.);
  float dig2 = mod(n/100., 10.);
  float dig = dig0;
  if (sdig == 1.) dig = dig1;
  if (sdig == 2.) dig = dig2;
  float d0 = digit(p0, dig);
  if (sdig == 3.) d0 = abs(length(p0)-0.5)-0.01;
  d0 *= sc;
  d = pmax(d, -(d0-0.01), 0.01);
  d = min(d, d0);
  return d;
}

// Carefully fine tuned. No thinking involved.
const float ExpBy   = log2(4.1);
const float Radius  = 0.3;
  
float forward(float l) {
  return exp2(ExpBy*l);
}

float reverse(float l) {
  return log2(l)/ExpBy;
}

float dfeffect4(vec2 p, vec2 pp) {
  float ppf = 0.4*dot(pp, pp);
  p /= 1.+ppf;
  float tm = 0.5*g_btime;
  mat2 rot0 = ROT(-tm-ppf*(g_ftime*g_ftime*g_ftime));
  float py = p.y;
  
  float h = 10.0/RESOLUTION.y;
  mod1(py, h);
  
  float d = 1E3;
  for (float i = 0.0; i < 2.0; ++i) {
    float ltm = tm+0.5*i;
    mat2 rot1 = ROT(i*0.5*TAU/8.0);
    float mtm = fract(ltm);
    float ntm = floor(ltm);
    float zz = forward(mtm);
  
    vec2 p0 = p;
    p0 *= rot0;
    p0 *= rot1;
    p0 /= zz;
  
    float l0 = length(p0);
    
    float n0 = ceil(reverse(l0));
    float r0 = forward(n0);
    float r1 = forward(n0-1.0);
    float r = (r0+r1)/2.0;
    float w = r0-r1;
    float nn = n0;
    n0 -= ntm;
    vec2 p1 = p0;
    float n1 = modPolar(p1, 8.0);
    p1.x -= r;
  
    float a = 0.5*ltm+n1/8.0;
    a = fract(a);
    float d1 = length(p1)-Radius*w;
    float d2 = length(p1)-Radius*w*smoothstep(0.0, 0.45, mod(a, 0.5));
    d1 *= zz;
    d2 *= zz;
    if (a >= 0.5) {
      d1 = max(d1, -d2);
      d = min(d, d1);
    } else {
      d = min(d, d2);
    }
  }
  return d;
}

vec3 render0(vec3 ro, vec3 rd) {
  vec3 col = vec3(0.0);
  
  const vec4 pp0 = vec4(normalize(vec3(0.0, -1.0, 0.0)), -5.0);
  const vec4 pp1 = vec4(normalize(vec3(-2., 2.0, 1.0)), -6.);
  float tp0  = rayPlane(ro, rd, pp0);
  float tp1  = rayPlane(ro, rd, pp1);

  if (tp0 > 0.0) {
    vec3 bcol = bottomBoxCol*exp(-0.5*(1.+length((ro + tp0*rd).xz)));
    bcol /=  0.05*(tp0*tp0);;    
    col += bcol;
  }

  if (tp1 > 0.0) {
    vec3 pos  = ro + tp1*rd;
    vec2 pp = pos.xz;
    float db = box(pp, vec2(8.0, 1.))-2.;
    vec3 tcol = vec3(0.);    
    tcol += topBoxCol*smoothstep(0.25, 0.0, db);
    col += 0.2*topBoxCol*exp(-max(db, 0.0));
//    tcol += 0.25*(topBoxCol)*max(-db, 0.0);
    tcol /= 0.025*(tp1*tp1);
    col += tcol;
  }

  col += lightCol0/(1.0090-dot(lightDir0, rd));
  col += lightCol1/(1.0025-dot(lightDir1, rd));
  return clamp(col, 0., 10.); 
}

void sphere(vec2 p, float r, out vec3 sp, out vec3 sn) {
  float z2 = (r*r-dot(p, p));
  if (z2 > 0.0) {
    float z = sqrt(z2);
    vec3 cp = vec3(p, z);
    vec3 cn = normalize(cp);
    sp = cp;
    sn = cn;
  } else {
    sp = vec3(p, 0.);
    sn = vec3(0.);
  }
  
}

void sphere4(vec2 p, float r, out vec3 sp, out vec3 sn) {
  vec2 p2 = p;
  p2 *= p;
  float z4 = (r*r*r*r-dot(p2, p2));
  if (z4 > 0.0) {
    float z = pow(z4, 0.25);
    vec3 cp = vec3(p, z);
    vec3 cn = normalize(cp);
    sp = cp;
    sn = cn;
  } else {
    sp = vec3(p, 0.);
    sn = vec3(0.);
  }
  
}

vec4 dthecomputer(vec2 p, float f) {
  const float sm = 0.015;
  const vec3 pp = vec3(normalize(vec2(1., 1.)), -0.1);
  float d0 = circle4(p, 0.48);
  float d1 = plane(p, pp);
  float d2 = circle(p, 0.225);
  float d3 = abs(d2-0.05-f*4.)-0.02;
  d3 = abs(d3-f*2.)-0.01;
  d3 = abs(d3-f);
  float d4 = d1;
  float d5 = abs(d0-0.015);
  d1 = abs(d1)-0.2;
  d1 = abs(d1)-0.1;
  float d = d0;
  d =  pmax(d, -d1, sm);
  d2 = max(d2, d4);
  d3 = max(d3, d4);
  d2 = pmax(d2, -(d-0.01), sm);
  d3 = pmax(d3, -(d-0.01), sm);
  d = min(d, d2);
  d = min(d, d5);
  
  return vec4(d, d2, d0, min(d5, d3)); 
}

vec3 thecomputer(vec3 col, vec2 p, vec2 pp) {
  float voice = 0.;
  const float vc = 4.0;
  for (float i = 0.; i<vc;++i) {
    voice += max((texture(iChannel0, vec2(0.05+0.05*i, 0.25)).x-0.3), 0.0);
  }
  voice *= 1./vc;
  voice *= voice;
  voice = smoothstep(0.0, 0.2, voice);
  float ntime = g_ntime;
  float ftime = g_ftime;
  float time = ntime+ftime;
  // HARDCODED TIMING - LOVE EM!
  float va = 
         smoothstep(3., 2., time)
      +  step(8., time)
      -  step(168., time)
      +  step(172., time)
      ;
  voice *= va;
              
  
  float aa = sqrt(2.)/RESOLUTION.y;
  
  vec4 d = dthecomputer(p, 0.025*voice);
  const vec3 ro = vec3(0., 0., 8.);
  vec3 sn;
  vec3 sp;
  sphere(p, 0.225, sp, sn);
  vec3 srd  = normalize(sp-ro);
  vec3 sr   = reflect(srd, sn);
  vec3 srcol= render0(sp, sr);
  float sfre= 1.+dot(srd, sn);
  sfre *= sfre;
  vec3 sfre3 = mix(2.*sbase, vec3(2.), sfre);
  vec3 scol = vec3(0.);
  scol = srcol*sfre3;
  scol += pow(-dot(srd,sn), 10.)*sbase;
  scol += pow(-dot(srd,sn), mix(20., 10., voice))*seye*(voice);

  vec3 scol4 = vec3(0.);
  vec3 sn4;
  vec3 sp4;
  sphere4(p, 0.48, sp4, sn4);
  
  vec3 srd4  = normalize(sp4-ro);
  vec3 sr4   = reflect(srd4, sn4);
  vec3 srcol4= render0(sp4, sr4);
  float sfre4= 1.+dot(srd4, sn4);
  sfre4 *= sfre4;
  vec3 sfre34 = mix(2.*sbase4, vec3(2.), sfre4);

  scol4 += srcol4*sfre34;
  vec3 gcol = 0.0001*sbase/(1.00003+dot(srd, vec3(0.0, 0.0, 1.)))*smoothstep(aa, -aa, d.z);
//  gcol += srcol4*sqrt(sbase)*sfre4*0.5;
  
  vec3 ccol = gcol;

  ccol = mix(ccol, scol4, smoothstep(aa, -aa, d.x));
  ccol = mix(ccol, scol, smoothstep(aa, -aa, d.y));
  ccol -= 6E-2*vec3(2.,3.,1.)*dot(p, p);
  col *= 1.-exp(-50.*max(d.z*d.z, 0.));
  col = mix(col, ccol, smoothstep(aa, -aa, d.z));  
  col += glowCol/max(d.w, 1E-3);
  col += 2E-3*seye*(pow(voice, 3.))/max((dot(p,p)), 1E-1);
  return col;
}

float df(vec2 p, vec2 pp) {
  switch(g_mainEffect) {
  case EFFECT0:
    return dfeffect0(p, p);
  case EFFECT1:
    return dfeffect1(p, p);
  case EFFECT2:
    return dfeffect2(p, p);
  case EFFECT3:
    return dfeffect3(p, p);
  case EFFECT4:
    return dfeffect4(p, p);
  default:
    return 1E3;
  }
}

float dfreq(vec2 p, float off) {
  vec2 p3 = p;
  p3.y = abs(p3.y);
  p3.y -= off;
  const float cw = 0.1;
  float n3 = mod1(p3.x, cw);
  n3 = abs(n3);
  n3 += 3.0;
  float fft = texture(iChannel0, vec2(0.02*n3, 0.25)).x;
  fft -= 0.3;
  fft = max(fft, 0.0);
  fft *= fft;
  fft *= 3.;
  float d3 = segmenty(p3, fft, 0.4*cw);
  float d = d3;
  return d;
}

vec3 freq(vec3 col, vec2 p, vec2 pp, float off) {
  float ftime = g_ftime;
  float aa = sqrt(2.)/RESOLUTION.y;
  float df = dfreq(p, off);
  float sy = sign(p.y);
  vec3 fcol = 2.*(1.5+0.5*sy)*(0.5+0.5*sin(vec3(0.,1.,2.)+abs(p.x)+TIME+0.125*sy));
  col = mix(col, mix(fcol, col, ftime*ftime*ftime), smoothstep(aa, -aa, df));
  return col;
}

vec3 mainEffect(vec3 col, vec2 p, vec2 pp) {
  const vec3 glowCol  = HSV2RGB(vec3(0.55, 0.7, 1E-3));
  float ftime         = g_ftime;

  float d = df(p, pp);
  col += glowCol/max(d, 1E-4);
  float sy = sign(p.y);
  
  if (g_flash == 1) {
    col += smoothstep(0.25, 0., ftime)*2E5*glowCol*glowCol/max(dot(p, p), 1E-2);
  }

  return col;
}

vec3 effect(vec2 p, vec2 pp) {
  const float off          = 16.;
  float beat  = (BPM/60.)*(TIME);
  float ntime = floor(beat);
  float ftime = fract(beat);
  float btime = (TIME+(ntime+log2(1.+(off-1.)*ftime)/log2(off)));
  g_ntime = ntime;
  g_ftime = ftime;
  g_btime = btime;
  int script    = g_script[int(ntime/8.)];
  int vis       = (script>>1)&0x3;
  g_flash       = script&0x1;
  g_mainEffect  = script>>3;
/*
  // HARDCODED TIMING - LOVE EM!
  if (ntime == 39.) {
    g_mainEffect = EFFECT2;
    g_flash      = FLASH;
    vis          = FREQ1;
  }
  */

  float t = TAU*btime;
  float a = t*TAU/107.0;
  g_rot0 = ROT(a); 
  g_rot1 = ROT(1.234*a);


  vec3 col;
  col = mainEffect(col, p, pp);
  col *= smoothstep(1.5, sqrt(0.5), length(pp));
  switch(vis) {
  case COMPUTER:
    col = thecomputer(col, p, pp);
    break;
  case FREQ1:
    col = freq(col, p, pp, 0.);
    break;
  case FREQ2:
    col = freq(col, p, pp, 1.);
    break;
  default:
    break;
  }

  col = aces_approx(col);  
  // HARDCODED TIMING - LOVE EM!
  float ca = step(ntime, 117.)+step(120.,ntime);
  col *= ca;
  col = sqrt(col);
  return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
  vec2 q = fragCoord/RESOLUTION.xy;
  vec2 p = -1. + 2. * q;
  vec2 pp = p;
  p.x *= RESOLUTION.x/RESOLUTION.y;
  vec3 col = effect(p, pp);

  fragColor = vec4(col,1.0);
}