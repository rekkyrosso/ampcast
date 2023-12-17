// https://www.shadertoy.com/view/WsGBDc
/* NOT CURRENTLY USED */
// This work is licensed under the Creative Commons Attribution-NonCommercial-ShareAlike 3.0
// Unported License. To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/3.0/
// or send a letter to Creative Commons, PO Box 1866, Mountain View, CA 94042, USA.
// =========================================================================================================

// https://youtu.be/SIYvL_-OkR8

mat2 r2d(float a){float cosa = cos(a);float sina = sin(a);return mat2(cosa,sina,-sina,cosa);}

#define PI 3.14159265
#define sat(a) clamp(a,0.,1.)

float lenny(vec2 uv)
{
  return abs(uv.x)+abs(uv.y);
}
float cir(vec2 p, float r)
{
  return length(p)-r;
}
float loz(vec2 p, float r)
{
  return lenny(p)-r;
}

vec3 rdr(vec2 uv, float t)
{
  vec3 col;

  for (int i=0; i < 7; i++)
  {
    float fi = float(i);
    for (int j=0; j < 7; j++)
    {
      float fj = float(j);
      float a = fi*.5*t+(fj/7.)*PI*2.
      +texelFetch(iChannel1, ivec2(int(fj*5.), 0), 0).x;
      float lz = loz(uv+vec2(sin(a),cos(a))*(1.+fi)*(.25+.05*sin(iTime)),mix(.1,.2, fi/7.));
      col = mix(col, vec3(1.),1.-sat(lz*400.));
    }
  }
  //col += texture(iChannel0,uv+iTime*50.).xxx*.1;
  col += sat(1.5+sin(uv.y*50.+t*20.))*.3*vec3(.9,.71,.54)*(1.-sat(lenny(uv*.2)));
  col *= texelFetch(iChannel1, ivec2(0, 0), 0).x;
  vec3 lzCol = 0.5 + 0.5*cos(iTime+uv.xyx+vec3(0,2,4));
  col += .55*(1.-sat(lenny(uv*.1*vec2(1.,3.))))*lzCol*texelFetch(iChannel1, ivec2(55, 0), 0).x;
  return col;
}

vec3 rdr2(vec2 uv)
{
  float dist = (sin(-iTime*5.+(uv.x+uv.y)*5.)*.5+1.)*0.05;//*(1.-sat(pow(length(uv)-.2,2.)));
  vec2 dir = normalize(uv);
  vec3 col;
  float stp = 1./20.;
  float t = float(int(iTime/stp))*stp*.25;
  col.r = rdr(uv, t-.05).r;
  col.g = rdr(uv,t).g;
  col.b = rdr(uv,t+.05).b;
  return col.yzx;
}

vec2 myPixel(vec2 uv, vec2 sz)
{
  vec2 tmp = uv / sz;

  uv.x = float(int(tmp.x));
  uv.y = float(int(tmp.y));
  return (uv)*sz;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
  vec2 uv =( fragCoord.xy-0.5*iResolution.xy) / iResolution.xx;
  uv = myPixel(uv,vec2(0.005));
  uv*=5.7;

  vec3 col = rdr2(uv);
  col+=rdr2(uv*r2d(.1))*.5;
  col *= .5+1.-sat(lenny(uv*.25));

  float val = texture(iChannel2, fragCoord/iResolution.xy).x;

  col *= sat(iTime-3.);
  //col = mix(col, vec3(1.), val*.5);


  fragColor = vec4(col, 1.0);
}
