// https://www.shadertoy.com/view/Ws2fWG

float s;
float t;
vec3 ot;
vec3 colo=vec3(0);

mat2 rot(float a) {
  float s=sin(a),c=cos(a);
  return mat2(c,s,-s,c);
}

float de(vec3 p)
{
  float z=p.z;
  ot=vec3(100);
  colo=p;
  float sc=1.;
  p.xy*=rot(p.z*.1);
  p=abs(15.-mod(p,30.))-1.;
  for (int i=0; i<8; i++) {
    p.xy*=rot(1.);
    p.yz*=rot(t*10.);
    ot=min(ot,abs(p.xyz));
    p.xy=abs(p.xy+5.)-abs(p.xy-5.)-p.xy;
    float s=1.5;
    sc*=s;
    p=p*s;
  }
  colo=exp(-15.*ot);
  return (length(p)/sc-.5)*.8;

}


vec3 march(vec3 from, vec3 dir) {
  float d, td=0.;
  vec3 p, c=vec3(0.);
  for (int i=0; i<50; i++)
  {
    p=from+dir*td;
    d=de(p);
    td+=max(.01,abs(d));
    c+=colo*exp(-.05*td);
  }
  return (c*c*.02);

}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
  t=floor(iChannelTime[0]*10.)*.001;
  s=texture(iChannel0,vec2(.3)).r;
  vec2 uv = vec2(gl_FragCoord.x / iResolution.x, gl_FragCoord.y / iResolution.y);
  uv-=.5;
  uv.x*=iResolution.x/iResolution.y;
  if (fract(t*4.)<.5) t+=floor(length(uv)*4.-t*100.); else t+=floor(length(uv.y+uv.x)*1.5-t*100.);
  vec3 dir=normalize(vec3(uv,.5+s*.3));
  vec3 from=vec3(cos(t*.5)*2.,sin(t)*2.,t*200.);
  from.xy*=rot(t*100.);
  dir.yz*=rot(smoothstep(-.5,.5,sin(t*10.))*10.);
  vec3 c = march(from,dir);
  c=abs(cross(c,dir));
  c.xy*=rot(t*50.+s*20.);
  fragColor = vec4(c,1.)*min(1.,iChannelTime[0]*.2);
}
