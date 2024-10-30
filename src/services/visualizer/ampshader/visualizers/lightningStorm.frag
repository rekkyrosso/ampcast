// https://www.shadertoy.com/view/lcc3zr
// Crossing storms, by ukeshet
// Based on https://twitter.com/zozuar/status/1441384708441456651, with added periodic darkening + lightening.
// As mentioned in comments: the @zozuar tweet is apparently based on nimitz (twitter: @stormoid) https://www.shadertoy.com/view/3l23Rh

float hash21(vec2 x) {
    return fract(cos(mod(dot(x, vec2(13.9898, 8.141)), 3.14)) * 43758.5453);
}

vec2 hash22(vec2 uv) {
    uv = vec2(dot(uv, vec2(127.1,311.7)),
              dot(uv, vec2(269.5,183.3)));
    return 2.0 * fract(sin(uv) * 43758.5453123) - 1.0;
}

float perlinNoise(vec2 uv)
{
    vec2 iuv = floor(uv);
    vec2 fuv = fract(uv);
    vec2 blur = smoothstep(.0, 1., fuv);
    vec2 bl = vec2(.0, .0);
    vec2 br = vec2(1., .0);
    vec2 tl = vec2(.0, 1.);
    vec2 tr = vec2(1., 1.);
    vec2 bln = hash22(iuv + bl);
    vec2 brn = hash22(iuv + br);
    vec2 tln = hash22(iuv + tl);
    vec2 trn = hash22(iuv + tr);
    float b  = mix(dot(bln, fuv - bl), dot(brn, fuv - br), blur.x);
    float t  = mix(dot(tln, fuv - tl), dot(trn, fuv - tr), blur.x);
    float c = mix(b, t, blur.y);
    float rs = 2.0 * texture(iChannel0, vec2(uv.x,0.75)).r;
       
    return (c*rs);
}

float fbm(vec2 uv, int octaves)
{
    float value = .0;
    float ampitude  = .5;
    float freq = 2. ;
    
    for(int i = 0; i < octaves; i++)
    {  
      value += perlinNoise(uv) * ampitude;
        uv *= freq;
        ampitude *= .5;
    }
    return value;
}


mat2 R(float q){return mat2(cos(q),sin(q),-sin(q),cos(q));}
void mainImage(out vec4 Col,in vec2 FC) 
{
    vec2 uvv = (FC - 0.5 * iResolution.xy)/iResolution.y;
    vec3 col1, col2; 
    uvv.xy += fbm(uvv.yx + iTime * .5, 30);
    float dist1 = abs(uvv.y);
   
    col1 = vec3(1.) * mix(.0, .05, hash21(vec2(sin(iTime)))) / dist1;
    
    vec4 o=vec4(0);vec2 uv=FC.xy/iResolution.xy,r=iResolution.xy;
    float t=iTime,i,e,s,g,k=0.01;
    
    for(o+=0.5;i++<100.;g+=max(k,e*.2))
    {
        vec3 p=vec3((FC-.6*r)/r.y*g+r/r*R(t+g*.5)*.5,g+t/.3); 
             e=.3-dot(p.xy,p.xy);
        for (s=2.0;s<100.;s/=.6) {
            p.yz*=R(s); 
            e+=abs(dot(sin(p*s+t*s*.2)/s,p-p+1.));
        }
        o+=o.w*min(e*o+(sin(vec4(1.,2.,3.,1.)-p.z*.3)*.6-.4),k)*k;
      } 
       Col=mix(o,vec4(col1,1.),0.3);
        Col*=min(1.,1.+cos(.15*t))+min(1.,max(0.,-2.-4.*cos(.15*t)))*smoothstep(.85, 1.,fract(sin(t)*43758.5453));
}
