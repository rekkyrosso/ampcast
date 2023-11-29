// https://www.shadertoy.com/view/DlVXDc
// Spaceship Console 0.6.230610 by QuantumSuper
// auto-vj of a 2d spaceship ui flying through pseudo-3d space with gauges, fft textures, and bass reactive animations
//
// - use with music in iChannel0 -

#define PI 3.14159265359
#define aTime 2.133333*iTime

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

	//for (int n=0;n++<4;) fft[n] *= 1. + .3*pow(fft[n],5.); fft = clamp(fft,.0,1.); //limiter? workaround attempt for VirtualDJ
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
    else if (id<13.) setCol = vec3( 28,142, 77); //matrix green
    else if (id<14.) setCol = vec3( 66,120, 91); //matrix green 2
    else if (id<15.) setCol = vec3(173,  0, 27); //matrix red
    return setCol/256.;
}

float hash21(vec2 p){ //pseudorandom generator, cf. The Art of Code on youtu.be/rvDo9LvfoVE
    p = fract(p*vec2(13.81, 741.76));
    p += dot(p, p+42.23);
    return fract(p.x*p.y);
}

float aaStep( float fun){return smoothstep( fwidth(fun), .0, fun);} //simple antialiasing
float aaStep( float fun, float minWidth){return smoothstep( max(fwidth(fun),minWidth), .0, fun);} //overload to set minimum width

mat2 rotM(float r){float c = cos(r), s = sin(r); return mat2(c,s,-s,c);} //2D rotation matrix

float sdCircle( vec2 p, float r){
    return length(p)-r;
}

float sdBox( vec2 p, vec2 b){ //source: https://iquilezles.org/articles/distfunctions2d/
    vec2 d = abs(p) - b;
    return length(max(d,.0)) + min(max(d.x,d.y),.0);
}

float sdSegment( vec2 p, vec2 a, vec2 b){//source: https://iquilezles.org/articles/distfunctions2d/
    vec2 pa = p - a, ba = b - a;
    float h = clamp( dot(pa,ba)/dot(ba,ba), 0., 1.);
    return length(pa - ba*h);
}

vec3 getStar(vec2 p, vec2 id){
    id = vec2( hash21(id), hash21(id+id.yx));
    p *= 1. + id.y*2.; //different sizes
    p += id.y*vec2(sin(id.x*aTime/8.),sin(id.y*iTime*.1)); //different postions
    return smoothstep( .85, 1., id.x) //brightness
        * (.8 + .2 * vec3( sin(id*aTime/4.), sin(dot(id,vec2(.5))*iTime))) * vec3(1.5,1.,1.5) //color
        * ((.5 + .5 * sin(2.*aTime*id.x+2.*PI*id.x) * sin(iTime)) //brightness varying over time
        * aaStep(1. - dot( .1/(abs(p)+fwidth(p)+.12), vec2(1))) //"lens flare" shape
        + smoothstep( .2, .8, .07/length(p))); //round core
}

void mainImage( out vec4 fragColor, in vec2 fragCoord){

    // General initialization
    compressFft(); //initializes fft, ffts
    vec2 uv = (2.*fragCoord-iResolution.xy) / max(iResolution.x, iResolution.y); //long edge -1 to 1, square aspect ratio
    float rho = atan(-abs(uv.x),uv.y)/PI+1.; //polar angle flipped & mirrored


    // Animation definitions
    vec4 bang = vec4(0);
    for (int n=0;n<4;n++)
        bang[n] = smoothstep( .91, 1., texelFetch( iChannel0, ivec2(n,0), 0 ).x);
    float colId = 3. * floor(mod(aTime/16.,5.)); //color set id
    mat2 spaceRot = rotM(.2*sin(aTime/8.+fft.x)*sin(iTime*.1)); //"outside" space rotation


    // Object definitions
    float winDistort = length(uv*vec2(1.2,2.)-vec2(0,.2)); //morphing window shape
    vec4 tmp = vec4( uv*winDistort, vec2(.7,.3)); //temporary "throw-away" variable
    float window = sdBox( tmp.xy, tmp.zw)-.1; //window frame
    float frame = sdBox( .6*tmp.xy, tmp.zw)-.1; //frame of window frame
    float sideBox = sdBox( vec2(abs(tmp.x),tmp.y)+vec2(-1.4,1.), vec2(.5)); //bottom edges
    tmp.x = uv.x;
    float vent = sdBox( tmp.xy-vec2(-.5,.75), vec2(.15,.3)); //top left "vent" shape
    float ventAmp = sdSegment( fract(tmp.xy*33.), vec2(0), vec2(0,1))-.3; //vertical line texture

    tmp = vec4( uv*winDistort+vec2(0,.53), vec2(.8,.09));
    float bBar = sdBox( tmp.xy, tmp.zw); //bottom "screen"
    float bBarAmp = texelFetch( iChannel0, ivec2(1024.*abs(tmp.x/(2.*tmp.z)),0),0).x; // sound texture, full
    tmp = vec4( uv*winDistort+vec2(1.05,.0), vec2(.2,.4));
    float lBar = sdBox( tmp.xy, tmp.zw); //left "screen"
    float lBarAmp = texelFetch( iChannel0, ivec2(24.+71.*(tmp.y+tmp.w)/(2.*tmp.w),0),0).x; // sound texture, presence
    tmp.x = uv.x*winDistort-1.05;
    float rBar = sdBox( tmp.xy, tmp.zw); //right "screen"
    float rBarAmp = texelFetch( iChannel0, ivec2(95.+417.*(tmp.y+tmp.w)/(2.*tmp.w),0),0).x; // sound texture, brilliance

    tmp = vec4( uv*spaceRot, .1/fft.y, 0.);
    float reticle = sdCircle( uv, tmp.z); //reticle
    float horBars = sdSegment( abs(tmp.xy), vec2(.1+tmp.z,.0), vec2(.4+tmp.z,.0)); //horizontal bars
    float reticleAmp = (length(uv)<.1/fft.y+.1)? //inner/outer
        texelFetch(iChannel0,ivec2(6.+17.*rho,0),0).x : //sound texture, speech
        (tmp.x>.0)? //left/right
            texelFetch(iChannel0,ivec2(94.-71.*(tmp.x-.1-tmp.z)/.3,0),0).x : //sound texture, -presence
            texelFetch(iChannel0,ivec2(5.-5.*(-tmp.x-.1-tmp.z)/.3,0),0).x; //sound texture, -bass

    vec4 cannonAngle = vec4(2.4,PI-2.4,2.5,PI-2.5); //orientation
    vec4 cannons = vec4(
        sdBox( (uv+vec2(.8,.6))*rotM(cannonAngle.x)-vec2(0,.1*bang.x), vec2(.1,.55)-.5*vec2(uv.y+.3,-.1)) - .02, //left bottom cannon
        sdBox( (uv+vec2(-.8,.6))*rotM(cannonAngle.y)+vec2(0,.1*bang.y), vec2(.1,.55)-.5*vec2(uv.y+.3,-.1)) - .02, //right bottom cannon
        sdBox( (uv*3.+vec2(-2.,-1.5))*rotM(cannonAngle.z)+vec2(0,.2*bang.z), vec2(.01,.8)+.8*vec2(uv.y-.25,.1)) - .05, //right top cannon
        sdBox( (uv*3.+vec2(2.,-1.5))*rotM(cannonAngle.w)-vec2(0,.2*bang.w), vec2(.01,.8)+.8*vec2(uv.y-.25,.1)) - .05); //left top cannon

    tmp = vec4( -.9, .39, .02, .0);
    vec4 led = vec4( //dot lights
        sdCircle( uv-tmp.xy-vec2(-.02,.0), tmp.z),
        sdCircle( uv-tmp.xy-vec2(.07,.02), tmp.z),
        sdCircle( uv-tmp.xy-vec2(.09,.08), tmp.z),
        sdCircle( uv-tmp.xy-vec2(.0,.06), tmp.z));

    tmp = vec4( uv*rotM(2.9)+vec2(.8,.6), .005, -.02);
    float strip1 = sdSegment( tmp.xy, vec2(.0), vec2(.5,.0)) - tmp.z; //strip light 1 carve-out
    float strip2 = sdSegment( tmp.xy, vec2(.0,tmp.w), vec2(.4,tmp.w)) - tmp.z; //strip light 2 carve-out
    float strip3 = sdSegment( tmp.xy, vec2(.0,2.*tmp.w), vec2(.3,2.*tmp.w)) - tmp.z; //strip light 3 carve-out
    float strip1fill = sdSegment( tmp.xy, vec2(.0), vec2(.5*ffts.x,.0)) - tmp.z; //strip light 1 fill, speech I
    float strip2fill = sdSegment( tmp.xy, vec2(.0,tmp.w), vec2(.4*ffts.y,tmp.w)) - tmp.z; //strip light 2 fill, speech II
    float strip3fill = sdSegment( tmp.xy, vec2(.0,2.*tmp.w), vec2(.3*ffts.z,2.*tmp.w)) - tmp.z; //strip light 3 fill, speech III


    // Draw starfield
    vec3 col = vec3(0);
    vec2 myUv;
    float aFrac;
    for (float n=0.;n<4.;n++){
        aFrac = fract(-aTime/32.+.25*n) - .03*fft.w*fft.w*fft.w;
        myUv = 30. * (.3+aFrac) * uv * spaceRot;
        col += getStar(fract(myUv)-.5, ceil(myUv)+sin(n))
            * smoothstep(1.,.33,aFrac) //fade in
            * smoothstep(.0,.33,aFrac); //fade out (not very graceful)
    }


    // Draw screen overlay
    reticle = clamp( .005/abs(reticle), .0, 1.) + clamp( .005/abs(horBars), .0, 1.); //glow
    reticle = reticle * mix( 1., smoothstep(.2,.8,reticleAmp), .75*smoothstep(.66,1.,reticle)); //mix with texture
    col += mix(reticle,pow(reticle,20.),reticle) * getCol(colId+0.); //heighten contrast & color

    col -= clamp(-1.,.0,texelFetch( iChannel0, ivec2(512.*2.*abs(fragCoord.x/iResolution.x-.5)*winDistort,0),0).x
        - 1.5*abs(fragCoord.y/iResolution.y-.5)*winDistort) * (.8+.2*getCol(colId)); //sound texture "shield"


    // Draw cannons
    vec4 flashX = vec4(.4,-.4,-.51,.51); //x position
    vec4 flashY = vec4(.21,.21,-.3,-.3); //y position
    vec4 flashMorphX = vec4(1,1,4,4); //x stretch
    vec4 flashMorphY = vec4(5,5,20,20); //y stretch
    for (int n=0;n<4;n++) //draw "nuzzle" flash
        col += .1 * (clamp( .1 / clamp(
            length( (uv+vec2(flashX[n],flashY[n]))*rotM(cannonAngle[n])*vec2(flashMorphX[n],flashMorphY[n]) - sign(flashX[n])*vec2(0,.18*bang[n])) - .05
            , .001, 1.) * pow(bang[n],9.), .08, 10.) - .08);
    for (int n=0;n<4;n++)
        tmp[n] = aaStep(cannons[n]);
    col *= 1. - dot(tmp,vec4(1)); //delete col at cannon positions
    for (int n=0;n<4;n++)
           col += tmp[n] * (.05-cannons[n]) * (.6+.4*getCol(colId)) * (.5+.5*bang[n]); //cannons


    // Draw inside
    col *= aaStep(window); //delete
    col += (1.-aaStep(window)) * (.8+.2*getCol(colId)) * (.3+.7*ffts.w) * .1; //window frame
    col -= (1.-aaStep(frame)) * (.8+.2*getCol(colId)) * (.3+.7*ffts.w) * .05; //frame of window frame

    col *= 1. - aaStep(sideBox); //delete
    col += aaStep(sideBox) * (.15+sideBox) * (.7+.3*getCol(colId)) * (.3+.7*ffts.w) * 1.5; //bottom side elements

    col *= 1. - aaStep(vent) * aaStep(ventAmp); //vent

    col *= 1.-(aaStep(bBar)+aaStep(lBar)+aaStep(rBar)); //delete
    col += aaStep(bBar) * bBarAmp*bBarAmp*bBarAmp * getCol(colId+1.) //bottom "screen"
        + aaStep(lBar) * lBarAmp*lBarAmp*lBarAmp*lBarAmp * getCol(colId) //left "screen"
        + aaStep(rBar) * rBarAmp*rBarAmp * getCol(colId); //right "screen"

    tmp = vec4(bBar,lBar,rBar,0);
    for (int n=0;n<3;n++)
        col *= 1. - aaStep(abs(tmp[n]),.01)  * .9; //"screen" frames

    col *= 1. - (aaStep(led.x)+aaStep(led.y)+aaStep(led.z)+aaStep(led.w)); //delete
    for (int n=0;n<4;n++)
        col += (aaStep(led[n]) + .001/length(led[n])) * (.2+.8*step(.6,fft[n])) * getCol(colId+float(n)); //round led lights

    col *= 1. - (aaStep(strip1) + aaStep(strip2) + aaStep(strip3)); //delete
    col += aaStep(strip1fill) * getCol(colId+0.) * .7; //top right line 1
    col += aaStep(strip2fill) * getCol(colId+1.) * .7; //top right line 2
    col += aaStep(strip3fill) * getCol(colId+2.) * .7; //top right line 3


    // Finalizations
    col -= length(uv) * .03; //vignette
    col = pow(col, vec3(.4545)); //gamma correction

    fragColor = vec4(col,1.);
}
