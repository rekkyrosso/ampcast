// https://www.shadertoy.com/view/mtKGRW
// Solum Object 0.52.230509 by QuantumSuper
// auto-vj with circles & triangles, shattered particles, and visual tweaks
// 
// - use with music in iChannel0 -


#define PI 3.14159265359 
#define aTime 128./60.*iTime
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

vec3 getCol(float id){ //color definitions, for triplets
    vec3 setCol = vec3(0);
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
    return setCol/256.;
}

mat2 rotM(float r){float c = cos(r), s = sin(r); return mat2(c,s,-s,c);} //2D rotation matrix

float hash21(vec2 p){ //pseudo random generator
    p = fract(p*vec2(13.81, 741.76));
    p += dot(p, p+42.23);
    return fract(p.x*p.y);
}

float sdEquilateralTriangle(vec2 p){ //source: https://iquilezles.org/articles/distfunctions2d/
    const float k = sqrt(3.);
    p.x = abs(p.x) - 1.;
    p.y = p.y + 1./k;
    if (p.x+k*p.y > 0.) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.;
    p.x -= clamp( p.x, -2., 0.);
    return -length(p)*sign(p.y);
}

float sdTriangle(vec2 p, vec2 p0, vec2 p1, vec2 p2){ //source: https://iquilezles.org/articles/distfunctions2d/
    vec2 e0 = p1-p0, e1 = p2-p1, e2 = p0-p2;
    vec2 v0 = p -p0, v1 = p -p1, v2 = p -p2;
    vec2 pq0 = v0 - e0*clamp( dot(v0,e0)/dot(e0,e0), 0., 1.);
    vec2 pq1 = v1 - e1*clamp( dot(v1,e1)/dot(e1,e1), 0., 1.);
    vec2 pq2 = v2 - e2*clamp( dot(v2,e2)/dot(e2,e2), 0., 1.);
    float s = sign(e0.x*e2.y - e0.y*e2.x);
    vec2 d = min(min(vec2( dot(pq0,pq0), s*(v0.x*e0.y-v0.y*e0.x)),
                     vec2( dot(pq1,pq1), s*(v1.x*e1.y-v1.y*e1.x))),
                     vec2( dot(pq2,pq2), s*(v2.x*e2.y-v2.y*e2.x)));
    return -sqrt(d.x)*sign(d.y);
}

float getParticle(vec2 p, vec2 p1, vec2 p2){ //background particle
    float d = mix( 
        length(p*(.5+.5*sin(p1)))-p2.y+.2, //ellipse
        sdTriangle(p,p1,p2,vec2(0)), //triangle 
        clamp(16.+16.*sin(aTime/4.),.0,1.)); //shapeshift
    return smoothstep( min(.01,fwidth(d)), .0, abs(d));
}

float getTria(vec2 p, float r){ //triangle scaled by r about 0,0
    return clamp( .02/abs(sdEquilateralTriangle(p/(r+.001))), .0, 1.);
}

float getRing(vec2 p, float r){ //ring with radius r about 0,0
    return clamp( .01/abs(length(p)-r), .0, 1.);
}

float getShape(vec2 p, float r){ //shape combination scaling with r about 0,0
    return (fract(aTime/16.)<.5)? getRing(p,r)+.2*(1.-fft.z)*getTria(p/3.,r) : getTria(p,r)+.2*(1.-fft.z)*getRing(p/3.,r);
}

float shatterLayer(vec2 p){ //background layers
    float id = hash21(floor(p));
    return getParticle(
        (fract(p)-.5)*rotM(2.*PI*id+aTime)-.2*vec2(cos(id*aTime),sin(.8*id*aTime)) * vec2( 2.*cos(id*aTime), 1.), //multiple rotating shifting origins
        .25*vec2(sin(id*aTime),cos(id*aTime)), //moving corner per id
        vec2(.05+.3*id)) //fixed corner per id
        * (step(id,.8)+clamp(sin(aTime),.0,1.)*step(id,.05)); //different brightness
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    compressFft(); //initializes fft, ffts
    
    // View definition
    vec2 uv = (2.*fragCoord-iResolution.xy) / max(iResolution.x, iResolution.y); //long edge -1 to 1, square aspect ratio  
    float fTime = fract(iTime/64.); //"randomize" view manipulation by using iTime instead of aTime
    if (fract(aTime/32.)<.75); //"break", standard view
    else if (fTime<.33) uv = fract(uv*2.*abs(sin(aTime/8.))+.5)-.5; //scaling multiples
    else if (fTime<.66) uv *= 1.5*rotM(sign(fract(aTime/32.)-.5)*aTime/8.); //rotation
    else uv = sin( PI*uv + vec2( sign(fract(aTime/32.)-.5) * aTime/4., 0)); //moving warp multiples
    
    // Draw color shapes
    vec3 col = vec3(
        getShape( uv*3., fft.y),
        getShape( uv, fft.z),
        getShape( uv, fft.w));
    
    // Overlay brightness with sound texture
    float rho = atan(-abs(uv.x),uv.y)/PI+1.; //polar angle, flipped & mirrored
    col = mix( col, col*smoothstep(.2,.8,vec3(
        texelFetch( iChannel0, ivec2( 6.+17.*rho, 0), 0).x, //speech
        texelFetch( iChannel0, ivec2( 24.+70.*rho, 0), 0).x, //presence
        texelFetch( iChannel0, ivec2( 95.+416.*rho, 0), 0).x)), smoothstep(.66,1.,length(col))); //brilliance
    col.r = mix(col.r,pow(col.r,9.),col.r); //heighten contrast of thin shape
    
    // Remap colors
    float colId = 3. * floor(mod(aTime/8.,4.));
    col = mat3(getCol(colId),getCol(colId+1.),getCol(colId+2.)) * col;
    
    // Draw white shape
    rho = atan(uv.x,uv.y)/2./PI+.5; //polar angle, flipped
    float shape = getShape( uv, .1/(fft.x*fft.x));
    col += shape * mix( 1., smoothstep(.6,.9,texelFetch(iChannel0,ivec2(5.*rho,0),0).x), .75*smoothstep(.66,1.,shape));
    
    // Shatter background layers
    uv *= 1. + .5*cos(uv)/length(2.*uv); //warp view
    float aFrac,amp =0.;
    for (float n=0.;n<4.;n++){
        aFrac = fract(-.05*aTime+.25*n)-1.*.1*fft.w*fft.w*fft.w;
        amp += (1.-.5*fft.z) * shatterLayer((uv*2.*rotM(sin(aTime/32.))+n*vec2(.1,.05))*20.*aFrac) * smoothstep(1.,.33,aFrac);
    }
    amp *= .1 + .9*length(uv)*length(uv)*length(uv); //anti-vignette 
    col += 2. * amp * col/length(col); //merge with foreground
    
    // Final adjustments
	col = pow(col, vec3(.4545)); //gamma correction
    fragColor = vec4(col,1.);
}