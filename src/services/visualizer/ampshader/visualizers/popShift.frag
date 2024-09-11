// https://www.shadertoy.com/view/cdcBWs
// Pop Shift 0.31.231019 by QuantumSuper
// auto-vj with glowing symbols in front of a pixelated background and with glitching uv coordinates 
// 
// - use with music in iChannel0 -

#define isVdj false
#define PI 3.14159265359 
#define aTime 2.5*iTime
#define getDat(addr) texelFetch( iChannel0, ivec2(addr,0), 0).x
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
	
	if (isVdj) for (int n=0;n++<4;) fft[n] *= 1. + .3*pow(fft[n],5.); fft = clamp(fft,.0,1.); //limiter? workaround attempt for VirtualDJ
}

vec3 getCol(float id){ //color definitions, for triplets
    vec3 setCol = vec3(0);
    id = mod(id,15.);
         if (id< 1.) setCol = vec3(244,  0,204); //vw2 pink
    else if (id< 2.) setCol = vec3(  0,250,253); //vw2 light blue
    else if (id< 3.) setCol = vec3( 30, 29,215); //vw2 blue
    else if (id< 4.) setCol = vec3(252,157,  0); //miami orange
    else if (id< 5.) setCol = vec3( 26,246,138); //miami green
    else if (id< 6.) setCol = vec3(131, 58,187); //nordic violet
    else if (id< 7.) setCol = vec3(231, 15, 20); //arena red
    else if (id< 8.) setCol = vec3( 35, 87, 97); //arena dark blue
    else if (id< 9.) setCol = vec3(103,211,225); //arena blue
    else if (id<10.) setCol = vec3(241,204,  9); //bambus2 yellow
    else if (id<11.) setCol = vec3( 22,242,124); //bambus2 green
    else if (id<12.) setCol = vec3( 30,248,236); //magic turquoise
    else if (id<13.) setCol = vec3(173,  0, 27); //matrix red
    else if (id<14.) setCol = vec3( 28,142, 77); //matrix green
    else if (id<15.) setCol = vec3( 66,120, 91); //matrix green 2
    return setCol/256.;
}

float sdCircle( vec2 p, float r){
    return length(p)-r;
}

float sdBox( vec2 p, vec2 b){ //source: https://iquilezles.org/articles/distfunctions2d/
    vec2 d = abs(p) - b;
    return length(max(d,.0)) + min(max(d.x,d.y),.0);
}

float sdEquilateralTriangle(vec2 p){ //source: https://iquilezles.org/articles/distfunctions2d/
    const float k = sqrt(3.);
    p.x = abs(p.x) - 1.;
    p.y = p.y + 1./k;
    if (p.x+k*p.y > 0.) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.;
    p.x -= clamp( p.x, -2., 0.);
    return -length(p)*sign(p.y);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord){
    
    compressFft(); //initializes fft, ffts
    vec2 uv = (2.*fragCoord-iResolution.xy) / max(iResolution.x, iResolution.y); //long edge -1 to 1, square aspect ratio
    uv *= .6 + .5*getDat(dot(floor((uv+1.)/.1),vec2(1,10))+24.); //pixel shift
    float widthF = (isVdj)? 9. : 1.;

    vec3 r3 = vec3(getDat(0),getDat(1),getDat(2));
    vec3 col = (.3+.5*pow(fft.x,9.)) * (r3*r3*r3*r3*r3*vec3(3,1,5)*.005+.01) * widthF / abs(vec3( //draw glowing symbols
        sdCircle( uv, .27*r3.x),
        sdEquilateralTriangle( uv/(.1/r3.y+.001)) * .1/r3.y,
        sdBox( uv, vec2(.35*r3.z))) );
    
    uv /= (.3+.7*pow(fft.w,.5)); //background zoom
    col = (col*4.+.6) * vec3(.5*fft.z+.2) * getDat((floor(abs(uv.y)*22.)+floor(abs(uv.x)*22.)/22.)/22.*512.); //pixel background
        
    float colId = 3. * floor(mod(aTime/16.,5.)); //color set id 
    col = mat3( getCol( colId+0.), getCol( colId+1.), getCol( colId+2.)) * col; //remap colors
    col *= abs( cos( .06*iTime + PI/vec3(.5,2.,4.) + ffts.xyz*PI)); //color shift 

    fragColor = vec4(col,1.);
}