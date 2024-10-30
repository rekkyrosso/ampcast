// https://www.shadertoy.com/view/M32yDw
// one beat to rule them all

#define FFT(a) pow(texelFetch(iChannel0, ivec2(a, 0), 0).x, 5.)
float snd = 0.;

// MIT Licensed hash From Dave_Hoskins (https://www.shadertoy.com/view/4djSRW)
vec3 hash33(vec3 p)
{
    p = fract(p * vec3(443.8975,397.2973, 491.1871));
    p += dot(p.zxy, p.yxz+19.27);
    return fract(vec3(p.x * p.y, p.z*p.x, p.y*p.z));
}

vec3 stars(in vec3 p)
{
    vec3 c = vec3(0.);
    float res = iResolution.x*0.8;
    
	for (float i=0.;i<4.;i++)
    {
        vec3 q = fract(p*(.15*res))-0.5;
        vec3 id = floor(p*(.15*res));
        vec2 rn = hash33(id).xy;
        float c2 = 1.-smoothstep(0.,.6,length(q));
        c2 *= step(rn.x,.0005+i*i*0.001);
        c += c2*(mix(vec3(1.0,0.49,0.1),vec3(0.75,0.9,1.),rn.y)*0.25+0.75);
        p *= 1.4;
    }
    return c*c*.65;
}

// colormap
vec3 palette(float t) {
    vec3 a = vec3(0.5);
    vec3 b = vec3(0.5);
    vec3 c = vec3(1.);
    vec3 d = vec3(0.563,0.416,0.457 + .2*sin(0.4*iTime));
    
    return a + b*cos( 6.28 * c * (t+d)); // A + B * cos ( 2pi * (Cx + D) )
}

float rand(vec2 n) { 
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
}

float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
        mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
        mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
}

// used to rotate domain of noise function
const mat2 rot = mat2( 0.80,  0.60, -0.60,  0.80 );

// fast implementation of fBM
float fbm( vec2 p )
{
    float f = 0.0;
    f += 0.500000*noise( p + 0.1 * sin(iTime ) + 0.2 * iTime); p = rot*p*2.02;
    f += 0.031250*noise( p  ); p = rot*p*2.01;
    f += 0.250000*noise( p ); p = rot*p*2.03;
    f += 0.125000*noise( p + 0.1 * sin(iTime) + 0.2 * iTime ); p = rot*p*2.01;
    f += 0.062500*noise( p + 0.3 * sin(iTime) ); p = rot*p*2.04;
    f += 0.015625*noise( p );
    return f/0.96875;
}

float fbm2( vec2 p )
{
    float f = 0.0;
    f += 0.500000*noise( p ); p = rot*p*2.02;
    f += 0.031250*noise( p ); p = rot*p*2.01;
    f += 0.250000*noise( p ); p = rot*p*2.03;
    f += 0.125000*noise( p ); p = rot*p*2.01;
    f += 0.062500*noise( p ); p = rot*p*2.04;
    f += 0.015625*noise( p );
    return f/0.96875;
}

float fbm3(vec2 uv)
{
	float f;
	mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
	f  = 0.5000*noise( uv ); uv = m*uv;
	f += 0.2500*noise( uv ); uv = m*uv;
	f += 0.1250*noise( uv ); uv = m*uv;
	f += 0.0625*noise( uv ); uv = m*uv;
	f = 0.5 + 0.5*f;
	return f*(.8+snd*5.);
}

// nested fBM
float pattern( vec2 p ) {
    return fbm( p + fbm( p + fbm(p) ) )*snd*10.;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    snd = (FFT(1)+FFT(25)+FFT(50)+FFT(75))/4.;
    vec2 uv = (fragCoord - .5*iResolution.xy)/iResolution.y;
    float scale = 1.33;
    uv = (uv-0.5)*scale+(scale/2.);
    
    vec2 uv2 = uv;
    uv2.x *= 2.0;
    float d1 = length(uv2-vec2(-0.5,0.));
    float d2 = length(uv2-vec2(0.5,0.));    
    float dc = length(uv);    
    float r = sqrt(dot(uv,uv));
    float a = atan(uv.y,uv.x);
    
    vec3 around_eye = smoothstep(0.1,-0.1,abs(max(d1,d2)-0.5) - 0.2)*(.8+5.*snd) * vec3(0.99, 0.81, 0.27);
    vec3 strs = normalize(vec3(uv2,-1.5));
    vec3 col = vec3(0.);
    vec3 rd = normalize(vec3(uv2,-1.5));
    vec3 p1 = mix(vec3(1.,.25,0.1),vec3(0.2,0.2,0.3), fbm(3.*uv));
    
    
    float sa = abs(fract(a/6.)-0.5);
    float n = fbm2(2. * vec2(r - 0.5*iTime, sa));
    float n2 = fbm3(7. * vec2(r - 0.7*iTime, a));
    
    float flame = (0.5*n + 0.8*n2) * (1. - 1.5*r);
    vec3 p2 = vec3(1.5*flame, 2.*pow(flame,3.), pow(flame,6.) );
    
    vec3 p3 = mix(around_eye, p2, max(d1,d2));
    
    col = p3;
    col *= smoothstep(0.6,0.65,max(d1,d2));    
    col += smoothstep(0.03,-0.1,abs(max(d1,d2)-0.6) - 0.05) * vec3(0.99, 0.81, 0.27);
    col += smoothstep(0.01,-0.1,abs(dc-0.45) - 0.05)*(.8+5.*snd)  * vec3(0.99, 0.81, 0.27);
    
    //where does all the blue color come from :-/
    col.b=0.;
    
    rd.x+=sin(iTime/1000.)*2.;
    vec3 bg = stars(rd)*(1.+3.*snd);
    bg.b=0.;
    col = mix(bg, col, step(0.01, length(col))); 
    
    fragColor = vec4(col,1.0);
}