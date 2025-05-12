// https://www.shadertoy.com/view/3c2XW3
// music flower by Orblivius
// sources: https://shadertoy.com/view/wcjSWV

#define rot(x) mat2(cos(x+vec4(0,11,33,0)))

//formula for creating colors;
#define H(h)  (  cos(  h/2. + vec3(1,2,3)   )*.5 + .4 )
#define H2(h) (  cos(  h + vec3(1,2,0)   )*.7 + .2 )

//formula for mapping scale factor 
#define M(c)  log(1.+c)

#define R iResolution

#define T iTime*.5
#define path(t) vec3(.5*cos(t),.3*sin(t),t)
vec2 csD, csD2;
float sc=1., shell;
const float pi = 3.14159;

vec2 Rot2D (vec2 q, float a)
{
  vec2 cs;
  cs = sin (a + vec2 (0.5 * pi, 0.));
  return vec2 (dot (q, vec2 (cs.x, - cs.y)), dot (q.yx, cs));
}

vec2 Rot2Cs (vec2 q, vec2 cs)
{
  return vec2 (dot (q, vec2 (cs.x, - cs.y)), dot (q.yx, cs));
}


vec3 DodecSym (vec3 p)
{
  float a, w;
  w = 2. * pi / 5.;
  p.xz = Rot2Cs (vec2 (p.x, abs (p.z)), vec2 (csD.x, - csD.y));
  p.xy = Rot2D (p.xy, - 0.25 * w);
  p.x = - abs (p.x);
  for (int k = 0; k < 3; k ++) {
    if (dot (p.yz, csD) > 0.) p.zy = Rot2Cs (p.zy, csD2) * vec2 (1., -1.);
    p.xy = Rot2D (p.xy, - w);
  }
  if (dot (p.yz, csD) > 0.) p.zy = Rot2Cs (p.zy, csD2) * vec2 (1., -1.);
  a = mod (atan (p.x, p.y) + 0.5 * w, w) - 0.5 * w;
  p.yx = vec2 (cos (a), sin (a)) * length (p.xy);
  p.xz = - vec2 (abs (p.x), p.z);
  return p;
}

float PrBoxDf (vec3 p, vec3 b)
{
  //return length(p) - 1.5;
  
  vec3 d;
  d = abs (p) - b;
  return min (max (d.x, max (d.y, d.z)), 0.) + length (max (d, 0.));
}
// end dr2 dodecahedron stuff

vec3 hueShift(vec3 col, float shift) {
    vec3 m = vec3(cos(shift), -sin(shift) * .57735, 0);
    m = vec3(m.xy, -m.y) + (1. - m.x) * .33333;
    return mat3(m, m.zxy, m.yzx) * col;
}

void mainImage( out vec4 O, vec2 U) {
  
    float dihedDodec;
    dihedDodec = 0.5 * atan (2.);
    csD = vec2 (cos (dihedDodec), - sin (dihedDodec));
    csD2 = vec2 (cos (2. * dihedDodec), - sin (2. * dihedDodec));  
  
    O = vec4(0);
    
    vec3 c=vec3(0);

    float sc,dotp,totdist=0., t=52.5, tt=iTime;

    float start = -5.+52.5/11.;  //start at stellated dodecahedron
    
    U  = (U+U-R.xy)/R.y;    

    // path stuff by diatribes
    // ro,rd, added la stuff
    vec3 ro = path(T);
    vec3 la = path(T+1.); // look ahead/where you're going
    vec3 laz = normalize(la - ro),
         lax = normalize(cross(laz, vec3(0.,1., 0))),
         lay = cross(lax, laz),
         rd = mat3(lax, lay, laz) * normalize( vec3( U, 1.7) ) ;
    
   
    vec4 rdx = normalize( vec4( rd,1.) );  //keep 4d options open  
    
    for (float i=0.; i<60.; i++) {
         float s = texture(iChannel0, vec2(i/30.,0.)).r; 
        vec4 p = vec4( rdx*totdist)*20.;
           
        shell = length(p.xyz) - .01; //carve out a spherical shell around ray origin
        
        p.xyz += ro;

        p.yzw = p.xyz;
        
        sc = 1.; 
        
        float dd = 4.;
        vec4 id = round(p/dd);
        p -= dd*id;
        
        p.yw *= rot(.55 +s+ .3*tt* (mod(length(id),6.)-3.) ); 
         p.zw *= rot(-i*i/60.*s*s ); 
        
        
        p.xyz = DodecSym (p.yzw);
        
        
//dr2 dodecahedron stuff, thanks dr2
  vec3 b;
  const float nIt = 5., sclFac = 2.5;
  b = (sclFac - 1.) * vec3 (0.8, 1., 0.5) * (1. + 0.03 * sin (vec3 (1.23, 1., 1.43) ));

  p.z += 0.35 * (.25 + b.z);
  p.xy /= 1. - 0.2 * p.z;
  
 
  for (float n = 0.; n < nIt; n ++) {
   float s = texture(iChannel0, vec2(n*n/nIt,0.)).r; 
     s*=1.5*(s*s);
    p = abs (p)*1.3 - .015*abs(sin(-tt*1.15));
    
   // p.x += 0.35*s*(s);
    p.xy = (p.x > p.y) ? p.xy : p.yx;
    p.xz = (p.x > p.z) ? p.xz : p.zx;
    p.yz = (p.y > p.z) ? p.yz : p.zy;
    
    p.xyz = sclFac * p.xyz - vec3(-s*.2+2.*totdist,0,0);  ///b - .2;
     p.x -= (.02*t+.02)*s;
    // pb: adding clamped inversion, also notice power of 6 instead of 2
    float dotp = 1./clamp(pow(dot(p.xyz,p.xyz),.5),.01,7.);
    sc *= dotp;
    p  *= dotp;
    
    p.z += b.z * step (p.z, -0.5 * b.z);
  } 
// end dr2 dodecahedron stuff

        //float dist = max( PrBoxDf (p.xyz, vec3(.1)) / pow (sclFac, nIt) / sc, -shell);
        
        //no sig diff between box and sphere here so use sphere
        float dist = max(  (length(p.xyz)-.05) / pow(sclFac,nIt) /sc, -shell);
        
        float stepsize = dist/80. ;     
        totdist += stepsize;      
        
        //if (dist < .1) break;  //nicer without this but useful to see some structures
        
        if (i >10.)  //get rid of a little of near field chaff
        c +=
             hueShift(.05 * (H2( 2.*atan( .1+p.w, p.z )) 
                 + cos(log(sc)/2.+4.*vec3(1,2,3)) )
                 * exp(-(i*i*stepsize*stepsize+totdist*totdist)*4.  ),s+i/60.),
                  c=c, i/60.;
                 
    }
   
    c = 1. - exp(-c*c);
     c *= sqrt(c)*2.;
    O = ( vec4(c,1) );
               
}