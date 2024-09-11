// https://www.shadertoy.com/view/Xfy3D3
float fractHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p+45.32);
  
  return fract(p.x*p.y);
}

vec3 hash( vec3 p )      // this hash is not production ready, please
{                        // replace this by something better
	p = vec3( dot(p,vec3(127.1,311.7, 74.7)),
			  dot(p,vec3(269.5,183.3,246.1)),
			  dot(p,vec3(113.5,271.9,124.6)));

	return -1.0 + 2.0*fract(sin(p)*43758.5453123);
}

mat2 Rot(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

// NOISE
// returns 3D value noise (in .x)  and its derivatives (in .yzw)
vec4 noised( in vec3 x )
{
    // grid
    vec3 p = floor(x);
    vec3 w = fract(x);
    
    // quintic interpolant
    vec3 u = w*w*w*(w*(w*6.0-15.0)+10.0);
    vec3 du = 30.0*w*w*(w*(w-2.0)+1.0);
    
    // gradients
    vec3 ga = hash( p+vec3(0.0,0.0,0.0) );
    vec3 gb = hash( p+vec3(1.0,0.0,0.0) );
    vec3 gc = hash( p+vec3(0.0,1.0,0.0) );
    vec3 gd = hash( p+vec3(1.0,1.0,0.0) );
    vec3 ge = hash( p+vec3(0.0,0.0,1.0) );
    vec3 gf = hash( p+vec3(1.0,0.0,1.0) );
    vec3 gg = hash( p+vec3(0.0,1.0,1.0) );
    vec3 gh = hash( p+vec3(1.0,1.0,1.0) );
    
    // projections
    float va = dot( ga, w-vec3(0.0,0.0,0.0) );
    float vb = dot( gb, w-vec3(1.0,0.0,0.0) );
    float vc = dot( gc, w-vec3(0.0,1.0,0.0) );
    float vd = dot( gd, w-vec3(1.0,1.0,0.0) );
    float ve = dot( ge, w-vec3(0.0,0.0,1.0) );
    float vf = dot( gf, w-vec3(1.0,0.0,1.0) );
    float vg = dot( gg, w-vec3(0.0,1.0,1.0) );
    float vh = dot( gh, w-vec3(1.0,1.0,1.0) );
	
    // interpolation
    float v = va + 
              u.x*(vb-va) + 
              u.y*(vc-va) + 
              u.z*(ve-va) + 
              u.x*u.y*(va-vb-vc+vd) + 
              u.y*u.z*(va-vc-ve+vg) + 
              u.z*u.x*(va-vb-ve+vf) + 
              u.x*u.y*u.z*(-va+vb+vc-vd+ve-vf-vg+vh);
              
    vec3 d = ga + 
             u.x*(gb-ga) + 
             u.y*(gc-ga) + 
             u.z*(ge-ga) + 
             u.x*u.y*(ga-gb-gc+gd) + 
             u.y*u.z*(ga-gc-ge+gg) + 
             u.z*u.x*(ga-gb-ge+gf) + 
             u.x*u.y*u.z*(-ga+gb+gc-gd+ge-gf-gg+gh) +   
             
             du * (vec3(vb-va,vc-va,ve-va) + 
                   u.yzx*vec3(va-vb-vc+vd,va-vc-ve+vg,va-vb-ve+vf) + 
                   u.zxy*vec3(va-vb-ve+vf,va-vb-vc+vd,va-vc-ve+vg) + 
                   u.yzx*u.zxy*(-va+vb+vc-vd+ve-vf-vg+vh) );
                   
    return vec4( v, d );                   
}


// GRADIENTS    
vec3 palette( float t, float change ) {

    vec4 sound = texture(iChannel0,vec2(.6,.2));
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(1.000,0.949,0.5);
    vec3 c = vec3(1.0, 0.5, 1.0);
    vec3 d = vec3(0.8,0.0,0.0);
    
    //a.x *= iTime*0.001;1
    a.x += smoothstep(0.0, 0.8,sound.x*0.5);
    a.y += smoothstep(0.0, 0.8,sound.x*0.5);
    a.z += smoothstep(0.0, 0.8,sound.x*0.5);
    
    //b.x += sound.x;
    b.y += smoothstep(0.0, 1.0,sound.x*3.0);
    b.z += sound.x*0.5;
    
    c.x += smoothstep(0.0, 1.0, sound.x*0.002);
    c.y += sound.x*0.002;
    //c.z += sound.x*0.002;
    
    //d.x += smoothstep(0.0, 1.2, sound.x*0.5);
    d.y += smoothstep(0.0, 1.2, sound.x);
    d.z += smoothstep(0.0, 1.2, sound.x);
    
    //a.x += iTime;
    return a + b*cos( 6.28318*(c*t+d) );

}

float dot2( vec2 v ) { return dot(v,v); }


float sdBox( in vec2 p, in vec2 b )
{
    //p = p * Rot(iTime*0.1);
    vec2 d = abs(p)-b * Rot(5.01);
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float sdfCoolS( in vec2 p )
{
    float six = (p.y<0.0) ? -p.x : p.x;
    p.x = abs(p.x);
    p.y = abs(p.y) - 0.2;
    p = abs(p * Rot(iTime*0.1));
    float rex = p.x - min(round(p.x/0.4),0.4);
    float aby = abs(p.y-0.2)-0.6;
    
    float d = dot2(vec2(six,-p.y)-clamp(0.5*(six-p.y),0.0,0.2));
    d = min(d,dot2(vec2(p.x,-aby)-clamp(0.5*(p.x-aby),0.0,0.4)));
    d = min(d,dot2(vec2(rex,p.y  -clamp(p.y          ,0.0,0.4))));
    
    float s = 2.0*p.x + aby + abs(aby+0.4) - 0.4;
    return sqrt(d) * sign(s);
}

float sdCircleWave( in vec2 p, in float tb, in float ra )
{
    tb = 3.1415927*4.5/6.0*max(tb,0.0001);
    vec2 co = ra*vec2(sin(tb),cos(tb));
    p.x = abs(mod(p.x,co.x*4.0)-co.x*2.0);
    vec2  p1 = p;
    vec2  p2 = vec2(abs(p.x-2.0*co.x),-p.y+2.0*co.y);
    float d1 = ((co.y*p1.x>co.x*p1.y) ? length(p1-co) : abs(length(p1)-ra));
    float d2 = ((co.y*p2.x>co.x*p2.y) ? length(p2-co) : abs(length(p2)-ra));
    return min(d1, d2); 
}

float sdHexagram( in vec2 p, in float r )
{
    const vec4 k = vec4(-0.5,0.86602540378,0.57735026919,1.73205080757);
    
    p = abs(p * Rot(iTime*0.1));
    //*****p *= Rot(iTime*0.1)// rotates something in here
    p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
    p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
    p -= vec2(clamp(p.x,r*k.z,r*k.w),r);
    
    return length(p)*sign(p.y);
}

float sdArc( in vec2 p, in vec2 sc, in float ra, float rb )
{
    p.x = abs(p.x);
    return ((sc.y*p.x>sc.x*p.y) ? length(p-sc*ra) : 
                                  abs(length(p)-ra)) - rb;
}



void mainImage( out vec4 fragColor, in vec2 fragCoord ) {

    vec4 sound = texture(iChannel0,vec2(.6,.2));
    float smoothSound = smoothstep(0.0, 1.0, sound.x);
        
    vec2 uv = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    vec2 M = (iMouse.xy - iResolution.xy*.5)/iResolution.y;   
        
    vec2 uv0 = uv; // *uv0* is the GLOBAL center of the canvas
      
    vec3 finalColor = vec3(0.0);

    //uv = fract(uv * 0.8) - 0.5;
    uv = uv + abs(8.0);
    uv *= Rot(iTime*0.1);//Rotates the whole canvas

for(float i = 0.0; i< 2.2; i++){ 
    vec2 fRot = fract(uv * Rot(iTime*0.1));
    vec2 uvRot = uv * Rot(iTime*0.1);
    vec2 uv0Rot = uv0 * Rot(iTime*0.1);
    
    uv += M;
    uv = fract(uv * 0.8) - 0.5;
    
    
    //uv = (uv * 1.5) - 0.5 ;
    uv = abs((uv * 2.0)) - (0.8 *iTime/20000.0) ; //adding abs here undoes some transform to make it a fractal in the centyer again
    //uv = abs(fract(uv * 1.4) - 0.5) ; // addingt abs here makes it tile seamlessly 
    uv =  abs(uv * Rot(iTime*0.1));//rotates each individual uvm the multiplication iterates
    //uv = fract(uv * 0.8) - 0.5;
    //uv0 *= fRot;
    
    float d = length(uv) * exp(-length(uv0 *2.0 )); // THIS CHANGES THINGS BASED ON THE DISTANCE TO THE CENTER OF THE CANVAS         

    vec3 col = palette(length(uv) + i*5.6 + iTime*0.2, iTime);
    //col.x = col.x + iTime;

    
    d = sin(d *0.8 + iTime*0.1)/8.0;
    
    d += sdArc(uv,uv, 0.7, iTime*0.0002);
    
    d += sdBox(uv, uv) - smoothstep(0.0, 1.5, sound.x*1.5);//WOAH
    
    d += sdHexagram( uv, 1.25 );
    //d += sdHexagram( uv, 1.35 )+ smoothstep(0.0, 1.5, sound.x*1.5);
    
    d += sdfCoolS(uv0);
    
    d += sdfCoolS(uv0)*iTime*0.0002;
    
    //d += sdArc(uv,uv, 0.7, iTime*0.00002);
    //d += sdCircleWave(uv, 1.0, 1.0);
        
    d = abs(d);
       
    //d = pow(0.001 / d, 0.5 + smoothstep(0.0, 1.3, sound.x*0.1));   
    //d = pow(0.001 / d, 0.5 + smoothstep(0.0, 1.0, sound.x*0.5));
    //d = pow(0.001 / d, 0.5);
    
    d = pow(0.01 / d, 0.7 + smoothstep(0.0, 1.3, sound.x*.0095));//THESE TOGETHER LOOK AMAZING
    
    //d = pow(0.000001 / d, 0.08);//BRIGHT SOFT VERSION 
    //d = pow(0.1 / d, 1.0);//ADD THIS TO SOFT FOR INVERTED VERSION
    //d = pow(0.01 / d, 0.8);//EDGES VERSION
     
    //d = pow(0.01 / d, 0.8); // POWER FUNCTION
        
    //col.x = col.x + iTime*0.006;
    finalColor += col * d;
    
}           
    vec4 noise = noised(finalColor);
          
    fragColor = vec4(finalColor, 1.0);//NOT FOR TESTING
      
}   
