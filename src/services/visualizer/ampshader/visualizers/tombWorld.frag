// https://www.shadertoy.com/view/tcKBR3
// CC0: Tomb World of Silicon Beats
//  Now with music. No more silent silicon dreaming. 
//  Music starts after 5 seconds and because browsers you might need to jiggle the controls to get it started

// Music: OurPithyAtor by In-FaZe (at least that's the listed artist on Soundcloud)
//  https://soundcloud.com/in-faze/ourpithyator

// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
const vec4 hsv2rgb_K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);

// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
//  Macro version of above to enable compile-time constants
#define HSV2RGB(c)  (c.z * mix(hsv2rgb_K.xxx, clamp(abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www) - hsv2rgb_K.xxx, 0.0, 1.0), c.y))

// License: WTFPL, author: sam hocevar, found: https://stackoverflow.com/a/17897228/418488
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + hsv2rgb_K.xyz) * 6.0 - hsv2rgb_K.www);
  return c.z * mix(hsv2rgb_K.xxx, clamp(p - hsv2rgb_K.xxx, 0.0, 1.0), c.y);
}

const float
  fft_limit=0.5
, fov=2.
, motion_blur=.3
, tomb_probability=.3
, OFF=.7
;

const vec2
  camera_direction=vec2(-.5,.1)
, camera_pos=vec2(25,3.3)
;

const vec3
  BY=HSV2RGB(vec3(.05+OFF,.7,.8))
, BG=HSV2RGB(vec3(.95+OFF,.6,.3))
, BW=HSV2RGB(vec3(.55+OFF,.3,2.))
, BF=HSV2RGB(vec3(.82+OFF,.6,2.))
, FC=HSV2RGB(vec3(.3,.7,.15))
, LD=normalize(vec3(1,-.5,1))
, RN=normalize(vec3(-0.2,1,-1.1))
;

const vec4
  GG=vec4(vec3(-700,300,1000),400.)
  ;

const float
  PI=3.141592654
, TAU=2.*PI
, PI_2=.5*PI
, ZZ =11.
;

const vec2
  PA=vec2(6,1.41)
, PB=vec2(.056,.035)
;

const mat2
  R=mat2(1.2,1.6,-1.6,1.2)
;

// License: Unknown, author: Unknown, found: don't remember
float hash(vec2 co) {
  return fract(sin(dot(co.xy ,vec2(12.9898,58.233))) * 13758.5453);
}

float beat() {
  float 
    b=0.
  , c=0.
  , f
  ;
  for(float x=.025;x<.2;x+=.025) {
    f=textureLod(iChannel0,vec2(x,.25),0.).x*(1.+.5*x);
    b+=smoothstep(.0,.1,f-.7);
    ++c;
  }
    
  return 2.*b/c;
}

float freq(float x) {
  x=fract(x)*.5+0.025;
  return textureLod(iChannel0,vec2(x,.25),0.).x*(1.+.5*x);
}


// License: Unknown, author: Claude Brezinski, found: https://mathr.co.uk/blog/2017-09-06_approximating_hyperbolic_tangent.html
vec3 tanh_approx(vec3 x) {
  vec3
    x2 = x*x
  ;
  return clamp(x*(27.0 + x2)/(27.0+9.0*x2), -1.0, 1.0);
}

// License: MIT, author: Pascal Gilcher, found: https://www.shadertoy.com/view/flSXRV
float atan_approx(float y, float x) {
  float cosatan2 = x / (abs(x) + abs(y));
  float t = PI_2 - cosatan2 * PI_2;
  return y < 0.0 ? -t : t;
}

float acos_approx(float x) {
  return atan_approx(sqrt(max(.0, 1. - x*x)), x);
}

vec3 to_spherical(vec3 p) {
  float
    r = length(p)
  ;
  return vec3(r, acos_approx(p.z/r), atan_approx(p.y, p.x));
}

vec3 stars(vec3 R) {
  float
    Z=TAU/200.
  ;

  vec3
    col=vec3(0)
  ;

  float
    a=1.
  ;
  for(int i=0;i<3;++i) {
    R=R.zxy;
    vec2
      s=to_spherical(R).yz
    , n=floor(s/Z+.5)
    , c=s-Z*n
    ;

    float
      h=sin(s.x)
    , h0=hash(n+123.4*float(i+1))
    , h1=fract(8887.*h0)
    , h2=fract(9187.*h0)
    , h3=fract(9677.*h0)
    ;
    c.y*=h;

    col += a*hsv2rgb(vec3(-.4*h1,sqrt(h3),step(h0,.1*h)*h1*vec3(7e-6)/max(7e-7,dot(c,c))));
    Z*=.5;
    a*=.5;
  }
  return col;
}


// License: MIT, author: Inigo Quilez, found: https://www.iquilezles.org/www/articles/spherefunctions/spherefunctions.htm
float ray_sphere(vec3 ro, vec3 rd, vec4 sph) {
  vec3
    oc=ro - sph.xyz
    ;
  float
    b=dot(oc, rd)
  , c=dot(oc, oc)- sph.w*sph.w
  , h=b*b-c
  ;
  if(h<0.) return -1.;
  return -b-sqrt(h);
}

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/intersectors/
float ray_plane(vec3 ro, vec3 rd, vec4 p) {
  return -(dot(ro,p.xyz)+p.w)/dot(rd,p.xyz);
}

// License: MIT, author: Inigo Quilez, found: https://iquilezles.org/articles/distfunctions/
float doctahedron(vec3 p, float s) {
  p = abs(p);
  return (p.x+p.y+p.z-s)*0.57735027;
}

vec3 path(float z) {
  return vec3(camera_pos+PA*cos(PB*z),z);
}

vec3 dpath(float z) {
  return vec3(-PA*PB*sin(PB*z),1);
}

vec3 ddpath(float z) {
  return vec3(-PA*PB*PB*cos(PB*z),0);
}

float dfbm(vec3 p) {
  float
    d=p.y+.6
  , a=1.
  ;

  vec2
    D=vec2(0)
  , P=.23*p.xz
  ;

  vec4
    o
  ;

  for(int j=0;j<7;++j) {
    o=cos(P.xxyy+vec4(11,0,11,0));
    p=o.yxx*o.zwz;
    D+=p.xy;
    d-=a*(1.+p.z)/(1.+3.*dot(D,D));
    P*=R;
    a*=.55;
  }

  return d;
}

float dpyramid(vec3 p, out vec3 oo) {
  vec2
    n=floor(p.xz/ZZ+.5)
  ;
  p.xz-=n*ZZ;

  float
    h0=hash(n)
  , h1=fract(9677.*h0)
  , h =.3*ZZ*h0*h0+0.1
  , d =doctahedron(p,h)
  ;

  oo=vec3(1e3,0,0);
  if(h1>tomb_probability) return 1e3;
  oo=vec3(d,h0,h);
  return d;
}

float df(vec3 p, out vec3 oo) {
  p.y=abs(p.y);

  float
    d0=dfbm(p)
  , d1=dpyramid(p,oo)
  , d
  ;
  d=d0;
  d=min(d,d1);
  return d;
}

float fbm(float x) {
  float
    a=1.
  , h=0.
  ;

  for(int i=0;i<5;++i) {
    h+=a*sin(x);
    x*=2.03;
    x+=123.4;
    a*=.55;
  }

  return abs(h);
}

vec4 render(vec2 p2, vec2 q2) {
  float
      d=1.
    , z=0.
    , T=3.*iTime
    , B=beat()
    , F
    , L
    ;

  vec3
      oo
    , O=vec3(0)
    , p
    , P=path(T)
    , ZZ=normalize(dpath(T)+vec3(camera_direction,0))
    , XX=normalize(cross(ZZ,vec3(0,1,0)+ddpath(T)))
    , YY=cross(XX,ZZ)
    , R=normalize(-p2.x*XX+p2.y*YY+fov*ZZ)
    , Y=(1.+R.x)*BY
    , S=(1.+R.y)*BW*Y
    ;

  vec4
      M
    ;

  for(int i=0;i<50&&d>1e-5&&z<2e2;++i) {
    p=z*R+P;
    d=df(p,oo);
    if(p.y>0.) {
      O+=BG+min(d,9.)*Y;
    } else {
      O+=S;
      oo.x*=9.;
    }

    O+=
        B
      * smoothstep(oo.z*.78,oo.z*.8,abs(p.y))
      / max(oo.x+oo.x*oo.x*oo.x*oo.x*9.,3e-2)
      * BF
      ;

    z+=d*.7;
  }

  O*=9E-3;

  if(R.y>0.0) {
    M=GG;
    S=M.xyz+P;
    M.xyz=S;
    z=d=ray_sphere(P,R,M);

    F=smoothstep(0.0,0.2,R.y);
    Y=clamp((hsv2rgb(vec3(OFF-.4*R.y,.5+1.*R.y,3./(1.+800.*R.y*R.y*R.y)))),0.,1.);
    L=dot(vec3(0.2126, 0.7152, 0.0722),Y);
    if(z>0.) {
      p=P+R*z;
      ZZ=normalize(p-M.xyz);
      Y+=
          max(dot(LD,ZZ),0.)
        * F
        * smoothstep(1.0,.89,1.+dot(R,ZZ))
        * fbm(2e-2*dot(p-S,RN))
        ;
    }
    M=vec4(RN,-dot(RN,S));
    z=ray_plane(P,R,M);
    if(z>0.&&(d>0.&&z<d||d==-1.)) {
      p=P+R*z;
      z=distance(S,p);
      Y+=
          F
        * smoothstep(GG.w*1.41,GG.w*1.46,z)
        * smoothstep(GG.w*2.,GG.w*1.95,z)
        * (
            smoothstep(
               fft_limit
            ,  1.01
            ,  freq(1.5*abs(z-GG.w*1.48)/GG.w))
            *  hsv2rgb(vec3(OFF-.7+z/GG.w,.9,9.))
        +   abs(dot(LD,RN))*fbm(.035*z)
        )
        ;

    }

    if(d==-1.) {
      Y+=pow(max(0.,1.-L),4.)*stars(R);
    }

    O*=Y;
  }

  O-=(length(-1.+2.*q2)+.2)*FC;
  O=tanh_approx(O);
  O=max(O,0.);
  O*=smoothstep(0.,6., iTime-p2.y*p2.y);
  O=sqrt(O);

  return vec4(O,1);
}

void mainImage(out vec4 O, vec2 C) {
  vec2 
    r=iResolution.xy
  ;
  O=render((C+C-r)/r.y,C/r);
}
