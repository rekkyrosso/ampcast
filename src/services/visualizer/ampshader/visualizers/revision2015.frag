// https://www.shadertoy.com/view/ltj3W1
/* NOT CURRENTLY USED */
//#define LIGHT_REACT_TO_MUSIC

#define time iTime
#define v2Resolution iResolution.xy
#define texFFTSmoothed iChannel0
#define texFFT iChannel0
#define fGlobalTime iTime
#define out_color fragColor

vec4 plas( vec2 v, float time )
{
  float c = 0.5 + sin( v.x * 10.0 ) + cos( sin( time + v.y ) * 20.0 );
  return vec4( sin(c * 0.2 + cos(time)), c * 0.15, cos( c * 0.1 + time / .4 ) * .25, 1.0 );
}



float df ( vec3 p)
{
  p+=0.5;
  float a=time*.3,cs=cos(a),ss=sin(a);
  mat3 r = mat3(cs,0,ss,0,1,0,-ss,0,cs);

a=time*.4,cs=cos(a),ss=sin(a);
  mat3 r2 = mat3(cs,ss,0, -ss,cs,0 ,0,0,1);


  float e = .5;
  p = abs(p*r*r2)-.5-sin(time)*.005;;
  p = abs(p*r*r2)-.25-sin(time)*.005;
  p = abs(p*r*r2)-.125-sin(time)*.005;
  p = abs(p*r*r2)-.06125-sin(time)*.005;
  p = abs(p*r*r2)-.0025-sin(time)*.005;
  p = abs(p*r*r2)-.00025-sin(time)*.005;
  return mix(length(p)-.02,max(p.x,max(p.y,p.z))-.02, sin(time)*.5+.5 );
}

vec3 nf (vec3 p)
{
  vec2 e = vec2(.0,.001);
  float c = df(p);
  return normalize(
 vec3(df(p+e.yxx), df(p+e.xyx), df(p+e.xxy))
 );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  vec2 uv = vec2(gl_FragCoord.x / v2Resolution.x, gl_FragCoord.y / v2Resolution.y);
  uv -= 0.5;
  uv /= vec2(v2Resolution.y / v2Resolution.x, 1);

  vec2 m;
  m.x = atan(uv.x / uv.y) / 3.14;
  m.y = 1.0 / length(uv) * .2;
  float d = m.y;

  float a=time*.2,cs=cos(a),ss=sin(a);
  mat3 r = mat3(cs,0,ss,0,1,0,-ss,0,cs);

  a=time*.37,cs=cos(a),ss=sin(a);
  mat3 r2 = mat3(cs,ss,0, -ss,cs,0 ,0,0,1);

  float zoom = sin(time*2.1)*.3+.5;
  float distr = texture(texFFTSmoothed, vec2(pow(uv.y-.5,2.0))*44.0*(sin(time)*.5+.5,.0)).x;

  vec3 p = vec3(.0,.0,-4.0+sin(time*.8)*0.5);
  vec3 dir = normalize(vec3(uv*zoom,distr+1.0-length(uv)));

  p*=r*r2;
  dir*=r*r2;

  for (int i=0; i<40; i++)
  {
    float d = df(p);
    p += d*dir;

   }

  vec3 l = normalize(vec3(.1,.2,.3));

  vec3 c = nf(p)/(1.0+df(p));
  c=vec3(.5+df(p-l*.01)*.5+df(p-l)*.5+df(p-l*2.0)*.25);
  c*= dot(nf(p),-l)*.5+.8;
  float f = texture( texFFT, vec2(d,.0) ).r * 100.0;

    #ifdef LIGHT_REACT_TO_MUSIC
  float beat = texture(texFFTSmoothed,vec2(.1,.0)).x*1.4;
	#else
  float beat = .7;
    #endif


  c = min(vec3(1.0),c);

  c-=texture(texFFTSmoothed,vec2(pow(uv.y*.5,2.0)*2.0-1.0,.0)).xxx*uv.x*2.0;

  m.x += sin( fGlobalTime ) * 0.1;
  m.y += fGlobalTime * 0.25;

  c -= length(uv);
  c += mix(vec3(.1,.4,.9), vec3(.9,.7,.2), (uv.y+.5));
  //c -= .1;
  vec4 t = plas( m * 3.14, fGlobalTime ) / d;
  t = clamp( t, 0.0, 1.0 );
  out_color = vec4(c,1.0)*beat + t*.05;;
}
