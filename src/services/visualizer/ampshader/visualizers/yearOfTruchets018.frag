// https://www.shadertoy.com/view/clG3RR
/**

    License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

    Year of Truchets #018
    05/06/2023  @byt3_m3chanic

    All year long I'm going to just focus on truchet tiles and the likes!
    Truchet Core \M/->.<-\M/ 2023

    Thanks to @Shane for his path shaders!
    https://www.shadertoy.com/view/MlXSWX

    good song choices
    https://soundcloud.com/trybesof/tim-green-battle-illusion
    https://soundcloud.com/trybesof/tim-green-pyxis

*/

#define R          iResolution
#define M          iMouse
#define T          iTime
#define PI         3.141592653
#define PI2        6.283185307

#define MAX_DIST   50.
#define MIN_DIST   1e-3

float sampleFreq(float freq) { return texture(iChannel0, vec2(freq, .25)).x; }
mat2 rot(float a) { return mat2(cos(a),sin(a),-sin(a),cos(a)); }
float hash21(vec2 p) { return fract(sin(dot(p,vec2(27.609, 57.583)))*43758.5453); }

//@iq SDF's
float box( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float trs( vec3 p,vec2 t){
    vec2 q = vec2(length(p.zx)-t.x,p.y);
    return length(q)-t.y;
}

//@Shane - path function
vec2 path(in float z){
    vec2 p1 =vec2(2.38*sin(z * .15)+5.38*cos(z * .15), 3.4*cos(z * .0945));
    vec2 p2 =vec2(3.2*sin(z * .179),4.31*sin(z * .127));
    return (p1 - p2)*.3;
}

//@MercurySexy
vec2 pModPolar(inout vec2 p) {
    float angle = 0.26179938779;//0.52359877559;//hardcoded for speed 2.*PI/24;
    float a = atan(p.y, p.x) + angle/2.,
          r = length(p),
          c = floor(a/angle);
    a = mod(a,angle) - angle/2.;
    p = vec2(cos(a), sin(a))*r;
    if (abs(c) >= (12.)) c = abs(c);
    return vec2(c,angle);
}

float time=0.,tspeed=0.,glow = 0.,gwave=0.;
vec3 hp,hit,lp = vec3(0.);
vec2 gid,sid;
mat2 rxa,rxb;

const float sz = 1.;
const float hf = .5;

vec2 map (in vec3 pos, float sg) {
 	vec2 res = vec2(1e5,0);
 	vec3 p = pos;


 	vec2 tun = p.xy - path(p.z);
    vec3 px = vec3(tun+vec2(0.,-.1),pos.z+tspeed+5.+gwave);
    vec3 q = vec3(tun,p.z);

    float iz = floor((q.z+hf)/sz);
    q.z = mod(q.z+hf,sz)-hf;
    vec3 r = q;
    r.xz*=1.15;
    float zhs=hash21(vec2(iz,0.));
    if(zhs<.75) r.xy *= rxa;
    if(zhs>.95) r.xy *= rxb;
    vec2 id = pModPolar(r.xy);
    r -= vec3(4.1,0,0);
    r.xy *= rot(id.y*6.);

    vec2 mid = vec2(id.x,iz);
    float hs = hash21(mid);

    if(hs>.5) r.xz*=rot(1.5707);
    float ct = box(r,vec3(hf,.015,hf));
    float tk = .125;


    float d = min(
    trs(r-vec3(hf,0,-hf),vec2(hf,tk)),
    trs(r-vec3(-hf,0,hf),vec2(hf,tk))
    );

    if(hs>.75) d = min(length(r.yz)-tk,length(r.yx)-tk);
    if (hs>.9) d = min(length(abs(r.xz)-vec2(hf,0))-tk,length(r.yx)-tk);
    d = max(ct,d);
    if(d<res.x) {
        res = vec2(d,1.);
        hit=q;
        sid=mid;
    }

    float ns = sampleFreq(.01)*.5;
    float nx = sampleFreq(.4)*PI2;
    float nr = sampleFreq(.75)*PI2;
    float b=length(px)-(.001+ns);
    px.xz *= rot(nx);
    px = abs(px.xzy)-.3;
    px.zy *= rot(-nr);
    b = min(trs(px,vec2(.2+ns,.01)),b);

    if(sg==1.) { glow += .001/(.0002+b*b);}

    if(b<res.x) {
        res = vec2(b,1.);
        hit=px;
        sid=vec2(0);
    }

    res.x /=1.15;
 	return res;
}

vec3 normal(vec3 p, float t) {
    t*=MIN_DIST;
    float d = map(p,0.).x;
    vec2 e = vec2(t,0);
    vec3 n = d - vec3(
        map(p-e.xyy,0.).x,
        map(p-e.yxy,0.).x,
        map(p-e.yyx,0.).x
        );
    return normalize(n);
}

//@iq of hsv2rgb
vec3 hsv2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.+vec3(0,4,2),6.)-3.)-1., 0., 1.0 );
    return c.z * mix( vec3(1), rgb, c.y);
}

void mainImage( out vec4 O, in vec2 F )
{
    // precal
    time = iTime;
    tspeed = time*3.85;
    gwave = 7.75+5.*sin(time*.1);
    rxa=rot(T*.3);
    rxb=rot(-T*.25);

    vec3 C =vec3(0);

    vec2 uv = (2.*F.xy-R.xy)/max(R.x,R.y);

    vec3 ro = vec3(0,0,.1);
    vec3 rd = normalize(vec3(uv,-1.));

    // mouse //
    float x = M.xy==vec2(0) && M.z<1. ? 0. : -(M.y/R.y*.5-.25)*PI;
    float y = M.xy==vec2(0) && M.z<1. ? 0. : -(M.x/R.x*2.-1.)*PI;
    if(M.z>0.){
        mat2 rx = rot(x), ry = rot(y);
        ro.zy *= rx; ro.xz *= ry;
        rd.zy *= rx; rd.xz *= ry;
    }

    ro.z -= tspeed;
    ro.xy += path(ro.z);

    // center tracking
    rd.xy = rot( (.2*sin(time*.3))-path(lp.z).x/ 24. )*rd.xy;
    rd.xz = rot( path(lp.z+1.).y/ 14. )*rd.xz;

    float d,m;
    vec3 p = vec3(0);

    for(int i=0;i<255;i++) {
        p=ro+rd*d;
        vec2 ray = map(p,1.);
        if(ray.x<MIN_DIST*d||d>MAX_DIST)break;
        d+= i>75? ray.x*.65 : ray.x * .2;
        m = ray.y;
    }
    gid=sid;

    if(d<MAX_DIST) {
        vec3 n = normal(p,d);

        vec3 lpos = rd;
        lpos.z-=tspeed;
        lpos.xy+=path(lpos.z);
        vec3 l = normalize(lpos-p);
        float diff = clamp(dot(n,l),.001,.9);

        vec3 h = vec3(.1);

        float hs = hash21(gid);
        if(hs<.65) h = hsv2rgb(vec3(p.z*.05,1.,.5));

        C = h *diff;

    }

    C = mix(vec3(.001),C, exp(-.00004*d*d*d));
    C = mix(C,vec3(.9),clamp(glow*.5,0.,1.));
    C = pow(C, vec3(.4545));
    O = vec4(C,1.);
}
