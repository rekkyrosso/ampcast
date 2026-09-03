// https://www.shadertoy.com/view/Ml23zy

float bass_lvl=0.;

float bass()
{
    float b=.0; 
    for (int i=0; i < 7; i++)
    {
       	vec2 coord=vec2(float(i)/iResolution.x,.0);
        b=max(b,texture(iChannel0,coord).x);
    }
    return pow(b*0.85,3.);
}

//Probably made by iq
float hash( const float n ) {
    return fract(sin(n*14.1234512)*51231.545341231);
}
float hash( const vec2 x ) {
  float n = dot( x, vec2(14.1432,1131.15532) );
    return fract(sin(n)*51231.545341231);
}

vec4 sky(vec2 uv)
{
    return vec4(0.0,0.0,0.5*(1.0-uv.y),1.);
}

bool onRect(vec2 p, vec2 center, vec2 size) {
  return !(p.x > center.x + size.x*0.5 ||
             p.x < center.x - size.x*0.5 ||
             p.y > center.y + size.y*0.5 ||
             p.y < center.y - size.y*0.5 );

}
const float immeubles=18.0;
const float immeuble_largeur=1.0/(immeubles-6.0);
const float window_width=immeuble_largeur/3.0;
const float window_height=immeuble_largeur/1.5;
vec4 getImmeubleColor(vec2 uv, float height)
{
    if (cos(6.28*uv.x/window_width) > 0.0 && uv.y > 0.09 &&
        sin(6.28*uv.y/window_height) > 0.0 && abs(uv.y + window_height*0.5) < height*0.5)  {
        //On window
        float random=hash(floor(uv/window_height)*height);
        if ( random > 0.9-min(bass_lvl,0.65))
          return vec4(1.0,1.0,0.0,1.);
        else if ( random > 0.25)
          return 0.33*sky(uv);
        else 
          return vec4(0.0,0.0,0.0,1.);
    }
    return vec4(0.0,0.0,0.0,1.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    bass_lvl=bass();
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec4 color=sky(uv);
    //uv.x-=0.5*iResolution.x/iResolution.y;
    uv.y -=0.1;
    //uv = normalize(vec3(uv,1.-length(uv))).xy;

    float posx=-iTime*0.1;
    if (uv.y < 0.0) {
      color=vec4(0.15,0.15,0.15,0.15);

    }
    else {
       for (float i=0.0; i < immeubles; i++) {
            float position_x=(i-3.0)*immeuble_largeur+mod(posx,immeuble_largeur);//-1.;
            vec2 center=vec2(position_x,0.0);
            vec2 size=vec2(immeuble_largeur,0.7*hash(i-floor(posx/immeuble_largeur))+0.3);

            if (onRect(uv, center, size)) {
                color=getImmeubleColor(uv-center,size.y);
                break;
            }
        }
    }

   float a=1.;
   if (uv.y < 0.) a=0.;
   int cas=int(mod(gl_FragCoord.x,3.0));
    if (cas==0) color = color*0.5 + color*vec4(0.5,0.0,0.0,1.);
    else if (cas==1) color = color*0.5 + color*vec4(0.0,0.5,0.0,1.);
    else color = color*0.5 + color*vec4(0.0,0.0,0.5,1.);
    
	fragColor = color;
}