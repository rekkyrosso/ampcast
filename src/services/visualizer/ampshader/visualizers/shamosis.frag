// https://www.shadertoy.com/view/3t3yRl
// This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 3.0
// Unported License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/3.0/
// or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
// =========================================================================================================

#define FFT(p) pow(texelFetch(iChannel0, ivec2(int(p), 0), 0)*.45, vec4(4.5))

float lenny(vec2 v)
{
  return abs(v.x)+abs(v.y);
}
#define sat(a) clamp(a, 0.,1.)
mat2 r2d(float a)
{
  float ca = cos(a);
  float sa = sin(a);

  return mat2(ca,-sa, sa, ca);
}
vec2 _sub(vec2 a, vec2 b)
{
  if (a.x > -b.x)
    return a;
  return b;
}

vec2 _min(vec2 a, vec2 b)
{
  if (a.x < b.x)
    return a;
  return b;
}
float sdCylinder( vec3 p, vec3 c )
{
  return length(p.xz-c.xy)-c.z;
}

// power smooth min (k = 8);
float _smin( float a, float b, float k )
{
    a = pow( a, k ); b = pow( b, k );
    return pow( (a*b)/(a+b), 1.0/k );
}

vec3 getDir(vec3 rd, vec2 uv)
{
  vec3 r = normalize(cross(rd, vec3(0.,1.,0.)));
  vec3 u = normalize(cross(r, rd));

  return rd+ r * uv.x + u * uv.y;
}

float rhombus(vec3 p, float sz)
{
  p = abs(p);
  return (p.x+p.y+p.z-sz)*0.577;
}


vec2 map(vec3 p)
{
  float beat = FFT(5).x*3.;
  vec2 cyl = vec2(sdCylinder(p, vec3(1., 1., 1.)), 0.);
  vec3 p2 = p;
  p2.xz += vec2(sin(beat), cos(beat))*4.;
  vec2 sph = vec2(length(p2)-2.5*max(FFT(55).x, 0.007)*70., 0.);
  p2 = p+vec3(1.);
  vec2 sph2 = vec2(rhombus(p2, 5.5*max(FFT(205).x, 0.005)*70.), 0.);
  return _min(_min(sph2, sph), cyl);
  vec2 fl = vec2(p.y, 1.);
  return _min(cyl, fl);
}

vec3 calcNormal( in vec3 p, in float t )
{
    float e = 0.001*t;

    vec2 h = vec2(1.0,-1.0)*0.5773;
    return normalize( h.xyy*map( p + h.xyy*e ).x +
					  h.yyx*map( p + h.yyx*e ).x +
					  h.yxy*map( p + h.yxy*e ).x +
					  h.xxx*map( p + h.xxx*e ).x );
}

vec3 checkerBoard(vec2 uv)
{
  uv.y+=iTime*5.;
  float sz = 1.5;
  float x = mod(uv.x, sz)-sz*.5;
  float y = mod(uv.y, sz)-sz*.5;
  x = sat(x*200.);
  float res = mix(x, 1.-x, sat(y*200.));
  return vec3(res);
}

vec3 grad(vec2 uv)
{
  vec3 col;
  vec3 blue = vec3(157., 200., 255.)/255.;
  vec3 yellow = vec3(255, 241., 187.)/255.;
  vec3 red = vec3(255., 190., 191.)/255.;

  float sz = 19.;

  if (uv.y < 0.)
  {
    return mix(yellow, red, sat(-uv.y*sz));
  }


  return mix(yellow, blue, sat(uv.y*sz));
}

float sig(vec2 uv)
{
  float attenBorder = 1.;
  float t = iTime;// iTime;
  float tst = sin(abs(uv.x)*5.+t)*.002;
  return uv.y -.01- (attenBorder*sat(FFT(abs(uv.x*.005)).x*5.))*.05-tst;//*(1.-sat(abs(uv.x*2.)), 5.);
}

vec3 rdr(vec2 uv)
{
  vec3 col;
  col = vec3(0.123, 0.07, 0.15);

  vec3 rgb = pow(grad(uv), vec3(1.45));
  rgb.x *= .6+sat(FFT(uv.x*.1).x)*100.;

  vec2 ouv = uv;
  uv = vec2(atan(uv.y, uv.x), length(uv));
  float ln = abs(sig(uv))-.00001;

    col = mix(col, rgb, 1.-sat(ln*800.));
    col += rgb *pow(1.-sat(ln*10.), 5.);


  for (int i = 0; i < 8; ++i)
  {
    float fi = float(i);

    vec2 uvt = ouv * r2d(fi);
    uvt = vec2(atan(uvt.y, uvt.x), length(uvt));
    float ln2 = abs(sig(uvt*fi/8.))-.00001*fi*fi;

    col += .3*rgb *pow(1.-sat(ln2*950.), 5.);

  }


  return col;
}



vec2 myPixel(vec2 uv, float k)
{
  vec2 pxuv = uv/k;
  pxuv = vec2(int(pxuv.x), int(pxuv.y))*k;
  return pxuv;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (fragCoord.xy-vec2(.5)*iResolution.xy)/iResolution.xx;
 uv *= .2;



  float rep = 1.+(sin(iTime*.5) < 0. ? 1. : sat(FFT(5).x*50.));

  if (false)//iTime > 78.8)
  {

  float rep2 = .1*sin(iTime*.5);
  uv *= r2d(sin(iTime+length(uv)*145.));
  uv.x = mod(uv.x, rep2)-.5*rep2;
  }
  uv *= r2d(-3.14159265/2.);
  uv *= mod(-iTime, 2.);
  float r = 0.05/(sin(iTime));
  uv *= r2d(mod(length(uv), r)/r);

  vec2 uv2 = uv;
  uv2.x = (mod(atan(uv.y, uv.x), rep)-.5*rep)*.1;
  uv2.y = FFT(abs(uv.y)).x+length(uv)*(mod(iTime*.5, 2.5))+sin(iTime)*.05;

  uv2 = myPixel(uv2, 0.01*sin(iTime*.5));

  vec3 col =rdr(uv2)*.7;
  col += rdr(uv)*.1*(sin(iTime*.2)*.5+.5);
	col *= .5+rdr(uv*.2);
    float a = atan(uv.y, uv.x);
    col = mix(col, mix(col.zyx, col, 0.), sat(sin(uv.x*15.+iTime)+.1*sin(length(uv-a*3.14159265*2.-iTime))));
  col = pow(col, vec3(1.45));
  vec3 txt;// = texture(iChannel1, fragCoord/iResolution.xy).xyz;
  col *= mix(vec3(1.), vec3(5.), txt.x);
  //col *= sat(iTime-2.);
  col *= 1.-sat(iTime-502.);
  fragColor = vec4(col, 1.0);
}
