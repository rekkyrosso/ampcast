// https://www.shadertoy.com/view/tfjSzc
/*
Forked "vt220 at night" from https://www.shadertoy.com/view/lt2SDK  by sprash3
Added "Dancing icons " from https://www.shadertoy.com/view/wdBGDh by otaviogood
Added "Spiral fire" from https://www.shadertoy.com/view/XfKBDy  by jcponcemath
Added Audio+Camera from  https://www.shadertoy.com/view/mtKGRW "Solum Object" by QuantumSuper
Example with different song on YT: https://www.youtube.com/watch?v=CKSX5pXJvbQ
*/

#define R rotate2D
#define PI 3.14159265359
#define TWO_PI 2.*PI
#define aTime 128./60.*iAmplifiedTime
// nicer scene when this song ends and starts from beginning
//#define aTime mod(128./60.*iAmplifiedTime, 161.135)

#define FFT(a) pow(texelFetch(iChannel0, ivec2(a, 0), 0).x, 5.)
#define MOUSE_CURVE
//#define MOUSE_MOVE

#define MAIN_BLOOM_ITERATIONS 10
#define MAIN_BLOOM_SIZE 0.01

#define REFLECTION_BLUR_ITERATIONS 10
#define REFLECTION_BLUR_SIZE 0.05

#define WIDTH 0.48
#define HEIGHT 0.3
#define CURVE .0

#define BEZEL_COL vec4(0.8, 0.8, 0.6, 0.0)
#define PHOSPHOR_COL vec4(0.2, 1.0, 0.2, 0.0)
#define AMBIENT 0.2

#define NO_OF_LINES iResolution.y*HEIGHT
#define SMOOTH 0.004

precision highp float;

float snd = 0.;
float iAmplifiedTime=0.;
#define saturate(a) clamp(a, 0.0, 1.0)  // Clamp [0..1] range
mat2 rotate2D(float a) { float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
mat2 rotM(float r){float c = cos(r), s = sin(r); return mat2(c,s,-s,c);} //2D rotation matrix

vec4 fft, ffts; //compressed frequency amplitudes


void compressFft(){ //v1.2, compress sound in iChannel0 to simplified amplitude estimations by frequency-range
    fft = vec4(0), ffts = vec4(0);

    // Sound (assume sound texture with 44.1kHz in 512 texels, cf. https://www.shadertoy.com/view/Xds3Rr)
    for (int n=0;n<3;n++) fft.x  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //bass, 0-517Hz, reduced to 0-258Hz
    for (int n=6;n<8;n++) ffts.x  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //speech I, 517-689Hz
    for (int n=8;n<14;n+=2) ffts.y  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //speech II, 689-1206Hz
    for (int n=14;n<24;n+=4) ffts.z  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //speech III, 1206-2067Hz
    for (int n=24;n<95;n+=10) fft.z  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //presence, 2067-8183Hz, tenth sample
    for (int n=95;n<512;n+=100) fft.w  += texelFetch( iChannel0, ivec2(n,0), 0 ).x; //brilliance, 8183-44100Hz, tenth2 sample
    fft.y = dot(ffts.xyz,vec3(1)); //speech I-III, 517-2067Hz
    ffts.w = dot(fft.xyzw,vec4(1)); //overall loudness
    fft /= vec4(3,8,8,5); ffts /= vec4(2,3,3,23); //normalize
    //for (int n=0;n++<4;) fft[n] *= 1. + .3*pow(fft[n],5.); fft = clamp(fft,.0,1.); //workaround for VirtualDJ, ?any hints for reverting audio limiters appreciated 
}

// stars
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
        //q*= snd/10.;
        vec3 id = floor(p*(.15*res));
        vec2 rn = hash33(id).xy;
        float c2 = 1.-smoothstep(0.,.6,length(q));
        c2 *= step(rn.x,.0005+i*i*0.001);
        c += c2*(mix(vec3(1.0,0.49,0.1),vec3(0.75,0.9,1.),rn.y)*0.25+0.75);
        p *= 1.4;
    }
    return c*c*.65;
}


// Got this line drawing function from https://www.shadertoy.com/view/4tc3DX
// This function will make a signed distance field that says how far you are from the edge
// of the line at any point U,V.
// Pass it UVs, line end points, line thickness (x is along the line and y is perpendicular),
// How rounded the end points should be (0.0 is rectangular, setting rounded to thick.y will be circular),
// dashOn is just 1.0 or 0.0 to turn on the dashed lines.
float LineDistField(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded) {
    // Don't let it get more round than circular.
    //thick = vec2(0.005, 0.005);
    rounded = min(thick.y, rounded);
    // midpoint
    vec2 mid = (pB + pA) * 0.5;
    // vector from point A to B
    vec2 delta = pB - pA;
    // Distance between endpoints
    float lenD = length(delta);
    // unit vector pointing in the line's direction
    vec2 unit = delta / lenD;
    // Check for when line endpoints are the same
    if (lenD < 0.0001) unit = vec2(1.0, 0.0);	// if pA and pB are same
    // Perpendicular vector to unit - also length 1.0
    vec2 perp = unit.yx * vec2(-1.0, 1.0);
    // position along line from midpoint
    float dpx = dot(unit, uv - mid);
    // distance away from line at a right angle
    float dpy = dot(perp, uv - mid);
    // Make a distance function that is 0 at the transition from black to white
    float disty = abs(dpy) - thick.y + rounded;
    float distx = abs(dpx) - lenD * 0.5 - thick.x + rounded;

    // Too tired to remember what this does. Something like rounded endpoints for distance function.
    float dist = length(vec2(max(0.0, distx), max(0.0,disty))) - rounded;
    dist = min(dist, max(distx, disty));

    return dist;
}

// This makes a line in UV units. A 1.0 thick line will span a whole 0..1 in UV space.
float FillLine(vec2 uv, vec2 pA, vec2 pB, vec2 thick, float rounded) {
    float df = LineDistField(uv, pA, pB, vec2(thick), rounded);
    return saturate(df / abs(dFdy(uv).y));
}

float Wobble(float a, float seed) {
    //seed = floor(seed) * 3.14159 * 0.5;
    a += seed;
    return sin(a) + sin(a * 2.0)*0.5 + sin(a * 4.0)*0.25;
}

// makes a dancer in the 0..1 uv space. Seed is which dancer to draw.
float Dancer(vec2 uv, vec2 seed)
{
	//uv.x += iTime * 0.05;
    float time = iAmplifiedTime*4.0;

    float legLen = 0.18;
    float armLen = 0.15;

    // Define joint positions
    vec2 hipA = vec2(0.57,0.33);
    vec2 kneeA = vec2(0.65 + Wobble(time, seed.x*7.6543)*0.1, 0.2);
    vec2 footA = vec2(0.6 + Wobble(time, seed.x*237.6543)*0.1, 0.0);
    // Constrain joints to be a fixed length
    kneeA = normalize(kneeA - hipA) * legLen + hipA;
    footA = normalize(footA - kneeA) * legLen + kneeA;

    vec2 hipB = vec2(0.43,0.33);
    vec2 kneeB = vec2(0.35 + Wobble(time, seed.x*437.6543)*0.1, 0.2);
    vec2 footB = vec2(0.4 + Wobble(time, seed.x*383.6543)*0.1, 0.0);
    kneeB = normalize(kneeB - hipB) * legLen + hipB;
    footB = normalize(footB - kneeB) * legLen + kneeB;

    vec2 shoulderA = vec2(0.62, 0.67);
    vec2 elbowA = vec2(0.8, 0.43 + Wobble(time, seed.x*7.6543)*0.3);
    vec2 handA = elbowA + vec2(.14, 0.0 + Wobble(time, seed.x*73.6543)*0.5);
    elbowA = normalize(elbowA - shoulderA) * armLen + shoulderA;
    handA = normalize(handA - elbowA) * armLen + elbowA;

    vec2 shoulderB = vec2(0.38, 0.67);
    vec2 elbowB = vec2(0.2, 0.43 + Wobble(time, seed.x*17.6543)*0.3);
    vec2 handB = elbowB + vec2(-0.14, 0.0 + Wobble(time, seed.x*173.6543)*0.5);
    elbowB = normalize(elbowB - shoulderB) * armLen + shoulderB;
    handB = normalize(handB - elbowB) * armLen + elbowB;

    vec2 headPos = vec2(0.5 + Wobble(time, seed.x*573.6543)*0.03, 0.83 + sin(time*2.0)* 0.01);

    // Find an approximate center of mass on the x axis
    float balance = (kneeA.x + kneeB.x + footA.x + footB.x +
                    elbowA.x + elbowB.x + handA.x + handB.x +
                    headPos.x * 1.0) - (0.5*9.0);

    // Make the dancer stick to the ground even when they lift their legs.
    float ground = min(footA.y, footB.y);
    uv.y += ground - 0.025;
    // Make them counter-balance based on approximate center of mass
    uv.x += balance*0.1;

    // Torso
    float l = max(0.0, FillLine(uv, vec2(0.5,0.45), vec2(0.5,0.6), vec2(0.12,0.12), 0.0));

    // Legs
    l = min(l, FillLine(uv, kneeA, hipA, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, kneeA, footA, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, kneeB, hipB, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, kneeB, footB, vec2(0.05,0.05), 1.0));

    // Arms
    l = min(l, FillLine(uv, elbowA, shoulderA, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, elbowA, handA, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, elbowB, shoulderB, vec2(0.05,0.05), 1.0));
    l = min(l, FillLine(uv, elbowB, handB, vec2(0.05,0.05), 1.0));

    // Head
    l = min(l, FillLine(uv, headPos, headPos, vec2(0.1,0.1), 1.0));

    // Optional skirt
    if (fract(seed.x*123.4567) > 0.5) {
        l = min(l, FillLine(uv, vec2(0.5, 0.55), vec2(0.65, 0.33), vec2(0.05,0.05), 1.0));
        l = min(l, FillLine(uv, vec2(0.5, 0.55), vec2(0.35, 0.33), vec2(0.05,0.05), 1.0));
        l = min(l, FillLine(uv, vec2(0.35, 0.33), vec2(0.65, 0.33), vec2(0.05,0.05), 1.0));
    }
	if(fract(iAmplifiedTime/15.)>.7){
            return 1.-l;
	}else {
	   	return l;
	}
}

mat2 r2d(float a) {
	float c = cos(a), s = sin(a);
	return mat2(c, s, -s, c);
}

float inner(float dist, float radius, float size) {
	return abs(dist - radius) * size;
}


// The pattern function based on your formula
// https://www.shadertoy.com/view/4fyfWK
float funPattern(float x, float y, float t, float s) {
        t+=s;
		float a = atan(y, x);
		float b = asin(sin(a - t + 3.0 * log(x*x + y*y)));
		float k = pow( 2.0 * PI, 1.0 - sqrt(sin(6.0*a)*sin(6.0*a)+b*b) );
    return 5.*s*2.0 * b * cos(k) - sin(k) / (1.0/sin(12.0 * a));
}





// using normal vectors of a sphere with radius r
vec2 crtCurve(vec2 uv, float r) 
{
        uv = (uv - 0.5) * 2.0;// uv is now -1 to 1
    	uv = r*uv/sqrt(r*r -dot(uv, uv));
        uv = (uv / 2.0) + 0.5;// back to 0-1 coords
        return uv;
}

float roundSquare(vec2 p, vec2 b, float r)
{
    return length(max(abs(p)-b,0.0))-r;
}

float rand(vec2 co){
    return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
}

// Calculate normal to distance function and move along
// normal with distance to get point of reflection
vec2 borderReflect(vec2 p, float r)
{
    float eps = 0.0001;
    vec2 epsx = vec2(eps,0.0);
    vec2 epsy = vec2(0.0,eps);
    vec2 b = (1.+vec2(r,r))* 0.5;
    r /= 3.0;
    
    p -= 0.5;
    vec2 normal = vec2(roundSquare(p-epsx,b,r)-roundSquare(p+epsx,b,r),
                       roundSquare(p-epsy,b,r)-roundSquare(p+epsy,b,r))/eps;
    float d = roundSquare(p, b, r);
    p += 0.5;
    return p + d*normal;
}


float heartRadius(float theta)
{
    return 2. - 2.*sin(theta) + sqrt(abs(cos(theta)))*sin(theta)/(1.4 + sin(theta));
}

// Render the heart using the parametric equation
float renderHeart(vec2 uv)
{
    vec2 p = uv - 0.5;  // Center the UV coordinates around the center (0.5, 0.5)
    p/=(1.+snd*2.);
    float theta = atan(p.y, p.x);  // Angle of the point relative to the center
    float r = heartRadius(theta);  // Get the radius for the heart equation
    float dist = length(p);  // Distance from the center to the point

    return smoothstep(0.02, 0.03, r - dist);  // Smooth the edges to create the heart shape
}

float heart(vec2 uv) {
    // Aspect ratio correction
    vec2 aspect = vec2(1.,iResolution.y/iResolution.x);
    uv = -2.6+7.*uv;
    uv *= vec2(80, 24); // 80 by 24 characters
    uv = ceil(uv);
    uv /= vec2(80, 24);
    uv.x +=3.;
    uv.y +=1.75;
    vec2 p = uv - 0.5;  // Center the UV coordinates around the center (0.5, 0.5)
    p/=(1.+snd*2.);
    float theta = atan(p.y, p.x);  // Angle of the point relative to the center
    float r = heartRadius(theta);  // Get the radius for the heart equation
    float dist = length(p);  // Distance from the center to the point
    return (r - dist)/snd*.1;
}

float weed(vec2 uv)
{
    float d = 1.;
    float count = 7.;
    float rad = .8;
    uv*=2.;
    uv.y += .35; 
    
    float theta = atan(uv.y, uv.x); 	
    float r = .2* (1.+sin(theta))*(1.+.9 * cos(8.*theta))*(1.+.1*cos(24.*theta))*(.9+.05*cos(200.*theta));
    float l = length(uv);
    
    //d = clamp((l - r ), 0., 1.);
    d = clamp((l - r ), 0., 1.);

    uv.y -= .2; 

    return -smoothstep(0.0, 50./iResolution.x ,d);
    return smoothstep(0., 50./iResolution.x,d)/snd*.1;
}

float Rectangle(vec2 uv,vec2 p,float width,float height,float blur){
   vec2 W = vec2(width,height);
   vec2 s = smoothstep(W+blur,W-blur,abs(uv-p));
   return s.x*s.y;
}


float getShape(vec2 p, float r){ //shape combination scaling with r about 0,0
    
    float fTime = fract(iAmplifiedTime/64.); 
    if (fract(aTime/32.)<.75); //break, standard view
    //else if (fTime<.33) p = fract(p*2.*abs(sin(aTime/8.))+.5)-.5; //scaling multiples
    else if (fTime<.33) {p = 2.5*fract(p*2.*abs(sin(aTime/8.))+.5)-.5; p.y-=.5;} //scaling multiples
    else if (fTime<.66) p *= 1.5*rotM(sign(fract(aTime/32.)-.5)*aTime/8.); //rotation
    else p = snd*sin( PI*p + vec2( sign(fract(aTime/32.)-.5) * aTime/4., 0)); //moving warp multiples
				

	if(fract(iAmplifiedTime/16.)<.2) {
		p.x *= iResolution.x / iResolution.y;
		p.x += iAmplifiedTime*0.1;
		p.y *=0.5;
		p.y -=0.51;
		vec2 newSeed = floor(p);
		return sqrt((1.-fft.z)*Dancer(fract(p), newSeed-0.41)*mod(newSeed.y, 2.)); 
	}else {
		if(sin(iAmplifiedTime*.1)>=.7){
			//return (1.-fft.z)*weed(p/(1.+snd*4.));//*(1.+snd);
				p.x *= iResolution.x / iResolution.y;
				p.x += iAmplifiedTime*0.1;
				p.y *=0.5;
				p.y -=0.51;
				vec2 newSeed = floor(p);
			return (1.-fft.z) * -Dancer(fract(p), newSeed-0.41)*mod(newSeed.y, 2.);

		} else if(sin(iAmplifiedTime*.1)>=.4){
			p.x *= iResolution.x / iResolution.y;
			p.x += iAmplifiedTime*0.1;
			p.y *=0.5;
			p.y -=0.51;
			vec2 newSeed = floor(p);
			return (1.-fft.z)*funPattern(p.x,p.y, iAmplifiedTime, snd)*sqrt(Dancer(fract(p), newSeed-0.41)*mod(newSeed.y, 2.));
		}else {
			if(fract(iAmplifiedTime/32.)>.5){
				float pattern = funPattern(p.x,p.y, iAmplifiedTime, snd);
				p.x *= iResolution.x / iResolution.y;
				p.x += iAmplifiedTime*0.1;
				p.y *=0.5;
				p.y -=0.51;
				vec2 newSeed = floor(p);
				return (1.-fft.z)*pattern*sqrt(Dancer(fract(p), newSeed-0.41)*mod(newSeed.y, 2.));
			}
			return (1.-fft.z)*funPattern(p.x,p.y, iAmplifiedTime, snd);
		}
	}
}

// Some Plasma stolen from dogeshibu for testing
float render(vec2 uv)
{
    
    if(uv.x < 0.0 || uv.x > 1.0 ||  uv.y < 0.0 || uv.y > 1.0) return 0.0;
    uv = -1.+2.*uv;
    float scln = 0.5 - 0.5*cos(uv.y*NO_OF_LINES);
    
    return scln*floor(3.0*(0.5+0.499*getShape(uv, iAmplifiedTime)))/3.0; 
}

void mainImage(out vec4 fragColor, in vec2 fragCoord )
{
    int max_freq = 100;
    for(int i=1; i < max_freq; i++){
        snd +=FFT(i)*float(i);
    }
    snd /=float(max_freq*20);
    // in ShaderAmp, iAmplifiedTime is calculated differently...
    // just adapting it to work alike
    iAmplifiedTime=iTime*1.5; 
    compressFft(); //initializes fft, ffts
	
    vec2 uv = fragCoord.xy / iResolution.xy;
	// aspect-ratio correction
	vec2 aspect = vec2(1.,iResolution.y/iResolution.x);
	uv = 0.5 + (uv -0.5)/ aspect.yx;

	vec4 c = vec4(0.0, 0.0, 0.0, 0.0);
	    
    
#ifdef MOUSE_CURVE
    float r = 1.5*exp(1.0-iMouse.y/iResolution.y);
#else
    float r = CURVE;
#endif
        
    // Screen Layer
    vec2 uvS = crtCurve(uv, r);
#ifdef MOUSE_MOVE
    uvS.x -= iMouse.x/iResolution.x - 0.5;
#endif

    // Screen Content
    vec2 uvC = (uvS - 0.5)* 2.0; // screen content coordinate system
    uvC *= vec2(0.5/WIDTH, 0.5/HEIGHT);
    uvC = (uvC / 2.0) + 0.5;
    
    c += PHOSPHOR_COL * render(uvC);
    
    // Simple Bloom
    float B = float(MAIN_BLOOM_ITERATIONS*MAIN_BLOOM_ITERATIONS);
    for(int i=0; i<MAIN_BLOOM_ITERATIONS; i++)
    {
        float dx = float(i-MAIN_BLOOM_ITERATIONS/2)*MAIN_BLOOM_SIZE;
        for(int j=0; j<MAIN_BLOOM_ITERATIONS; j++)
        {
            float dy = float(j-MAIN_BLOOM_ITERATIONS/2)*MAIN_BLOOM_SIZE;
            c += PHOSPHOR_COL * render(uvC + vec2(dx, dy))/B;
        }
    }           
    
    // Ambient
    c += max(0.0, AMBIENT - 0.3*distance(uvS, vec2(0.5,0.5))) *
        smoothstep(SMOOTH, -SMOOTH, roundSquare(uvS-0.5, vec2(WIDTH, HEIGHT), 0.05));
  

    // Enclosure Layer
    vec2 uvE = crtCurve(uv, r+0.25);
#ifdef MOUSE_MOVE
    uvE.x -= iMouse.x/iResolution.x - 0.5;
#endif
    
    // Inner Border
    for( int i=0; i<REFLECTION_BLUR_ITERATIONS; i++)
    {
    	vec2 uvR = borderReflect(uvC + (vec2(rand(uvC+float(i)), rand(uvC+float(i)+0.1))-0.5)*REFLECTION_BLUR_SIZE, 0.05) ;
    	c += (PHOSPHOR_COL - BEZEL_COL*AMBIENT) * render(uvR) / float(REFLECTION_BLUR_ITERATIONS) * 
	        smoothstep(-SMOOTH, SMOOTH, roundSquare(uvS-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT), 0.05)) * 
			smoothstep(SMOOTH, -SMOOTH, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.05, 0.05));
    }
               
  	c += BEZEL_COL * AMBIENT * 0.7 *
        smoothstep(-SMOOTH, SMOOTH, roundSquare(uvS-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT), 0.05)) * 
        smoothstep(SMOOTH, -SMOOTH, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.05, 0.05));
    
    // Corner
  	c -= (BEZEL_COL )* 
        smoothstep(-SMOOTH*2.0, SMOOTH*10.0, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.05, 0.05)) * 
        smoothstep(SMOOTH*2.0, -SMOOTH*2.0, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.05, 0.05));

    // Outer Border
    c += BEZEL_COL * AMBIENT *
       	smoothstep(-SMOOTH, SMOOTH, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.05, 0.05)) * 
        smoothstep(SMOOTH, -SMOOTH, roundSquare(uvE-vec2(0.5, 0.5), vec2(WIDTH, HEIGHT) + 0.15, 0.05)); 

    
	fragColor = c*(.8+snd*1.3); // some glow on the whole scene based on the snd input
}