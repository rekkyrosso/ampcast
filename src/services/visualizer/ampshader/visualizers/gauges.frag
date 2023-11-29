// https://www.shadertoy.com/view/DsjcRD
// Gauges 0.8.230622 by QuantumSuper
// auto-vj including a variety of gauges each working on their own
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

	for (int n=0;n++<4;) fft[n] *= 1. + .3*pow(fft[n],5.); fft = clamp(fft,.0,1.); //limiter? workaround attempt for VirtualDJ
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

float aaStep( float fun){return smoothstep( fwidth(fun), .0, fun);} //simple antialiasing
vec2 aaStep( vec2 fun){return vec2( aaStep(fun.x), aaStep(fun.y));} //overload

mat2 rotM(float r){float c = cos(r), s = sin(r); return mat2(c,s,-s,c);} //2D rotation matrix

float hash21(vec2 p){ //pseudorandom generator, cf. The Art of Code on youtu.be/rvDo9LvfoVE
    p = fract(p*vec2(13.81, 741.76));
    p += dot(p, p+42.23);
    return fract(p.x*p.y);
}

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

float sdEquilateralTriangle(vec2 p){ //source: https://iquilezles.org/articles/distfunctions2d/
    const float k = sqrt(3.);
    p.x = abs(p.x) - 1.;
    p.y = p.y + 1./k;
    if (p.x+k*p.y > 0.) p = vec2(p.x-k*p.y,-k*p.x-p.y)/2.;
    p.x -= clamp( p.x, -2., 0.);
    return -length(p)*sign(p.y);
}

vec3 getCircScale( vec2 p, float a, float s){ //in( position, amplitude, scale scale); out( circle, scale, indicator)
    float rho = atan(p.x,p.y)/PI/2.+.5; //polar angle flipped & shifted, 0..1
    return vec3(aaStep( sdCircle( p, .5)), //circle
        (aaStep( abs(sdCircle( p, .46))-.01) //ring
        + aaStep( fract((rho-1./8.)*s*10.*4./3.)-.03) * aaStep( abs(sdCircle( p, .39))-.06) //large scale, 10%
        + aaStep( fract((rho-1./8.)*s*10.*4./3.+.5)-.01) * aaStep( abs(sdCircle( p, .41))-.04) //mid scale, 5%
        + aaStep( fract((rho-1./8.)*s*100.*4./3.)-.03) * aaStep( abs(sdCircle( p, .43))-.02)) //small scale 1%
        * aaStep( fract(rho-1.01/8.)-3./4.), //bottom cutout
        aaStep( sdSegment( p*rotM(-(a-1./6.)*3./2.*PI), vec2(0), vec2(-.4,0)) - .01/length(p/.1))); //indicator
}

void mainImage( out vec4 fragColor, in vec2 fragCoord){

    // General initialization
    compressFft(); //initializes fft, ffts
    vec2 uv = (2.*fragCoord-iResolution.xy) / max(iResolution.x, iResolution.y); //long edge -1..1, square aspect ratio
	float rho = atan(uv.x,uv.y)/PI/2.+.5; //polar angle flipped & shifted, 0..1
    float colId = 3. * floor(mod(aTime/16.,5.)); //color set id
    vec3 col = getCol(colId+2.) * fft.x * .05; //background
    vec4 tmp; //temporary values


    // Gauge, left
    tmp.xyz = getCircScale( uv*1.6+vec2(.79,.18), fft.x, 1.);
    col *= 1.-tmp.x; //delete col
    col += tmp.x*(1.-tmp.y)*(1.-tmp.z) * getCol(colId+2.) * (1.-.5*fft.x) * .5 + tmp.y*(1.-tmp.z) * getCol(colId+1.) * (.2+.8*fft.x) * .8 + tmp.z*getCol(colId);


     // Double gauge, top mid
    tmp.xyz = clamp((getCircScale( (uv*vec2(1,-1)+vec2(.125, .5))*rotM( PI/4.), 1.-fft.z*.27, 1./.27)  * vec3(1.-aaStep(uv.xx),1.) //right half of double scale
        + getCircScale( (uv*vec2(1,-1)-vec2(.125,-.5))*rotM(-PI/4.), fft.y*.27, 1./2.7) * vec3(aaStep(uv.xx),1.))//left half of double scale
        * aaStep(uv.y-.58),.0,1.); //cut of unused part
    col *= 1.-tmp.x; //delete col
    col += tmp.x*(1.-tmp.y)*(1.-tmp.z) * getCol(colId+1.) * (1.-.2*(fft.y+fft.z)) * .5 //circle
        + tmp.y*(1.-tmp.z) * getCol(colId+0.) * (.6+.2*(fft.y+fft.z)) * .8 //scale
        + tmp.z * getCol(colId+2.); //indicator


    // Led lights
    col *= 1.-aaStep(sdCircle( uv-vec2(.31,.07), .07)); //delete col
    tmp.x = sdCircle( uv-vec2(.31,.07), .07*ffts.w);
    col += (aaStep( sdCircle( uv-vec2(.31,.07), .07*ffts.w)) + .002/max(.002,tmp.x)) * getCol(colId+2.) * (.2+.8*fft.x); //extending circle near center

    for (float n=0.;n<4.;n++){ //lower left set of integrated four
        tmp.x = sdCircle( uv+vec2(.449+.1*floor(n/2.),.22+.1*mod(ceil(n/2.),2.)), .03); //circles
        col *= 1.-aaStep(tmp.x); //delete col
        col += .002/max(.002,tmp.x) * getCol(colId+n) * (.2+.8*step( .91, texelFetch( iChannel0, ivec2(n,0), 0 ).x)); //light, bass channels
    }


    // Spectrum bars I, indicators, bottom right
    tmp = vec4( //spectrum indicators (ugly but quick code)
         aaStep(sdSegment( uv, -vec2(-.375-(.6* 6./512.),.4-.05), -vec2(.22,.13)-vec2(-.75-.002,.18-.002))-.002) //speech lower
        +aaStep(sdSegment( uv, -vec2(-.375-(.6*24./512.),.4-.05), vec2(.22,-.13)-vec2(-.75+.002,.18-.002))-.002), //speech higher
         aaStep(sdSegment( uv, -vec2(-.375+(.6*24./512.),.4-.05), vec2(.3,-.05)-vec2(-.18+.002,.1-.002))-.002) //presence lower
        +aaStep(sdSegment( uv, -vec2(-.375+(.6*95./512.),.4-.05), -vec2(.3,.05)-vec2(-.18-.002,.1-.002))-.002), //presence higher
         aaStep(sdSegment( uv, -vec2(-.375-(.6*95./512.)-.002,.4+.05-.002), -vec2(.45,-.02)-vec2(-.52-.002,.5-.002))-.002) //brilliance lower
        +aaStep(sdSegment( uv, -vec2(-.375-(.6         )+.002,.4+.05-.002), vec2(.45,.02)-vec2(-.52+.002,.5-.002))-.002), //brilliance higher
        0);
    col *= 1.-clamp(dot(tmp,vec4(1)),.0,1.);
    for (int n=0;n<3;n++) col += tmp[n] * getCol(colId+float(n)) * .2;


    // Waveform
    tmp = vec4( uv+vec2(-.16,.25), vec2(.32,.06));
    float wave = texelFetch( iChannel0, ivec2((tmp.x+tmp.z)*512./(2.*tmp.z)*.98+1.,1), 0).x; //get waveform from texture, trim edges
    if (wave == 0.){ //catch if no waveform found
        for (int n=0;n<9;n++) //synthesize crude approximation
            wave += texelFetch( iChannel0, ivec2(n,0), 0 ).x * sin((tmp.x+tmp.z)*PI/tmp.z * float(n*n*n) + aTime*2.*PI);
        wave = wave/18. + .5; //scale & shift
    }
    tmp.z = aaStep(sdBox( tmp.xy, tmp.zw)); //empty box
    col *= 1.-tmp.z; //delete col
    col += aaStep(abs(wave-.5-tmp.y/(2.*tmp.w))-.1) * tmp.z * getCol(colId+0.) * (.2+.8*ffts.w); //waveform in black box

    wave = .0;
    tmp = vec4( uv+vec2(.499,.47), vec2(.23,.04));
    for (int n=0;n<int(6.*fract(aTime));n++) //synthesize crude approximation
        wave += texelFetch( iChannel0, ivec2(n,0), 0 ).x * sin((tmp.x+tmp.z)*PI/tmp.z * float(n));
    wave = wave/(6.*fract(aTime)) + .5; //scale & shift
    wave = aaStep(abs(wave-.5-tmp.y/(2.*tmp.w))-.01) * aaStep(abs(tmp.x)-tmp.z+.001);
    col *= 1. - wave - aaStep( sdCircle( abs(tmp.xy)-vec2(tmp.z,.0), .01)); //delete col
    col += wave * getCol(colId+2.); //bottom left waveform


    // Spectrum bars II, bars itself, bottom right
    tmp = vec4( uv+vec2(-.375,.4), vec2(.6,.05)); //spectrum bar mid
    tmp.y = aaStep(sdBox( tmp.xy, tmp.zw));
    col *= 1.-tmp.y; //delete col
    col += tmp.y * texelFetch( iChannel0, ivec2(1024.*abs(tmp.x/(2.*tmp.z)),0),0).x  * getCol(colId+2.); //sound texture, full, mirrored

    tmp = vec4( uv+vec2(-.75,.18), vec2(.22,.13)); //spectrum bar top right
    tmp.y = aaStep(sdBox( tmp.xy, tmp.zw));
    col *= 1.-tmp.y; //delete col
    tmp.x = texelFetch( iChannel0, ivec2(6.+18.*(tmp.x+tmp.z)/(2.*tmp.z),0),0).x; //sound texture, speech
    col += tmp.x*tmp.x*tmp.x*tmp.x * tmp.y * getCol(colId+0.);

    tmp = vec4( uv+vec2(-.18,.1), vec2(.3,.05)); //spectrum bar top left
    tmp.y = aaStep(sdBox( tmp.xy, tmp.zw));
    col *= 1.-tmp.y; //delete col
    tmp.x = texelFetch( iChannel0, ivec2(24.+71.*(tmp.x+tmp.z)/(2.*tmp.z),0),0).x; //sound texture, presence
    col += tmp.x*tmp.x*tmp.x * tmp.y * getCol(colId+1.);

    tmp = vec4( uv+vec2(-.52,.5), vec2(.45,.02)); //spectrum bar bottom
    tmp.y = aaStep(sdBox( tmp.xy, tmp.zw));
    col *= 1.-tmp.y; //delete col
    col += texelFetch( iChannel0, ivec2(95.+417.*(tmp.x+tmp.z)/(2.*tmp.z),0),0).x * tmp.y * getCol(colId+2.); //sound texture, brilliance


    // Spectrum screen, top right
    tmp = vec4( uv-vec2(.7,.26), vec2(.27));
    tmp.z = aaStep(sdBox( tmp.xy, tmp.zw)); //empty box
    col *= 1.-tmp.z; //delete col
    tmp.xy /= 2.*tmp.w;
    col += (texelFetch( iChannel0, ivec2(int(512.*2.*abs(tmp.x)),0),0).x - 2.*abs(tmp.y)) * tmp.z * getCol(colId+1.); //mirrored sound texture spectrum


    // Fill bars, top left
    tmp = vec4( -.94, .32, -.38, .012);
    for (float n=0.;n<4.;n++){
        col *= 1. - aaStep( sdSegment( uv, tmp.xy, tmp.zy) - tmp.w); //delete col
        col += aaStep( sdSegment( uv, tmp.xy, tmp.zy) - tmp.w) * aaStep(fract((uv.x-tmp.x)/abs(-tmp.x+tmp.z)*4.) - .03) * getCol(colId+n) * ffts.w; //add scale
        col += aaStep( sdSegment( uv, tmp.xy, vec2( tmp.x+fft[int(n)]*abs(tmp.z-tmp.x), tmp.y)) - tmp.w) * getCol(colId+n) * .5; //light bar
        tmp.y += 4.5*tmp.w; //shift to the top
        tmp.z -= .02/(n+n+1.); //shorten
    }


    // Shifter, bottom left
    tmp = vec4( -.94, -.5, .0, 0);
    for (float n=0.;n<3.;n++){
        tmp.w = sdSegment( uv, tmp.xy, tmp.xz+vec2(.0,.16-n*.085))-.001;
        col *= 1. - aaStep(tmp.w); //delete col
        col += .002/max(.002,tmp.w) * getCol(colId+n+0.) * ffts[int(n)] //glow lines
        * (1.-aaStep(fract((uv.y-tmp.y)/abs(-tmp.y+tmp.z)*2.04) - .01) * aaStep(abs(uv.x-tmp.x)-.004) * step(tmp.y-tmp.x,abs(uv.y)-tmp.y)); //indicators
        tmp.w = aaStep( sdCircle( uv-tmp.xy-vec2(0.,ffts[int(n)]*(tmp.z-tmp.y)), .015));
        col *= 1. - tmp.w; //delete col
        col += tmp.w * getCol(colId+n+1.) * .5; //knob
        tmp.x += .04;
    }


    // Triangle
    tmp = vec4( (vec2(uv.x,-uv.y)+vec2(.81,.19))*7., 0, 0);
    tmp.z = aaStep( sdEquilateralTriangle( tmp.xy));
    col *= 1. - tmp.z; //delete col
    col += tmp.z * mat3(getCol(colId+0.),getCol(colId+1.),getCol(colId+2.))*(.5+.5*vec3(tmp.xy,-tmp.x)) * .33; //triangle
    col += .01/max(.01, sdCircle( tmp.xy-vec2( (ffts.z-ffts.y)*(1.-ffts.x*1.9), (2.*ffts.x-ffts.z-ffts.y)*.56), .08*fft.y)) //dot
        * mat3(getCol(colId+0.),getCol(colId+1.),getCol(colId+2.)) * vec3(ffts.x>ffts.y && ffts.x>ffts.z,ffts.y>ffts.z && ffts.y>ffts.x,ffts.z>ffts.x && ffts.z>ffts.y); //coloring


    // Finalizations
    col *= .8+.3*hash21(uv*aTime); //noise
    col -= length(uv) * .03; //vignette
	col = pow(col, vec3(.4545)); //gamma correction
    fragColor = vec4(col,1.);
}
