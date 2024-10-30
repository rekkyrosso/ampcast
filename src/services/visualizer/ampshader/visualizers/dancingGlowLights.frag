// https://www.shadertoy.com/view/DtsBWH
// Fork: Dancing Glow Lights 0.1.230824 by QuantumSuper
// Forked from Glow Lights 0.5.230821 by QuantumSuper
// auto-vj of a 2.5d arrangement of lights & particles circling an invisible sphere
//
// - use with music in iChannel0 -

#define PI 3.14159265359
#define aTime 2.5*iTime
vec4 fft, ffts; //compressed frequency amplitudes

mat2 rotM(float r){float c = cos(r), s = sin(r); return mat2(c,s,-s,c);} //2D rotation matrix
float hash21(vec2 p){p = fract(p*vec2(13.81,741.76)); p += dot(p, p+42.23); return fract(p.x*p.y);} //pseudorandom generator, cf. The Art of Code on youtu.be/rvDo9LvfoVE

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

float particle(vec2 p){ //single particle shape
    return smoothstep( .1, .0, length(p)) * smoothstep( .1, .06, length(p-vec2(0.,.02)));
}

float particleLayer(vec2 p){ //pseudo-random 2d particle plane
    float id = hash21(floor(p));
    return smoothstep(0.,1.,id) *
        particle((fract(p)-vec2(.5+.4*cos(id*iTime),.5+.4*sin(.8*id*iTime))) * rotM((id-fft.x)*2.*PI)/vec2(cos(.5*id*iTime),1));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord){ 

    // General initializations
    compressFft(); //initializes fft, ffts
    vec2 uv = (2.*fragCoord-iResolution.xy) / max(iResolution.x, iResolution.y); //long edge -1 to 1, square aspect ratio
	vec3 col = vec3(0);
    
    // Center orbs 
    vec3 p, camPos = vec3(0,0,-1.3+(.3*sin(aTime/16.))); //vec3 camDir = vec3(0,0,1); 
    float v1, v2, a = 11.;
    for (float n=1.;n<a;n++){            
        v1 = aTime + n/a*PI*4. - fft.x*n/a*1.;
        v2 = iTime + n/a*PI + fft.y*mod(1.-n*2./a,2.)*1.;
        p = vec3( cos(v1)*cos(v2), sin(v1)*cos(v2), sin(v2)) * .5*max(ffts.w,fft.x); //parametric sphere
        p.yz *= rotM(n); //vary orientation
        col += 1./((p.z-camPos.z)*(p.z-camPos.z)+dot(p.xy,p.xy)) * //vary brightness with distance
            .001*(.8+1.*fft.x*fft.x) / max( .001, length(uv-camPos.xy-p.xy/(p.z-camPos.z)) - .02/(p.z-camPos.z)) * //orb shape, vary size with distance
            (.5 + clamp( .01/max( .001, length(uv-camPos.xy-p.xy/(p.z-camPos.z)+.005*normalize(p.xy))), .0, .9)) * //light spot
            (vec3(mod(n+.5,2.),mod(n,2.),mod(n*PI,2.))*ffts.xyz*.5 + .5*vec3(ffts.x<=ffts.y,ffts.y<=ffts.z,ffts.z<=ffts.x)); //color
    }    

    // Particle layers    
    uv *= rotM(iTime*.1-.5*length(uv)); //rotate inner faster
    float aFrac, amp = 0.; 
    for (float n=0.;n<4.;n++){
        aFrac = fract(-.05*iTime+.25*n)-.02*fft.w*fft.w*fft.w;
        amp += 1.4*(.2+.8*fft.z)*particleLayer( (uv*mix(1.,length(uv),ffts.w)+n*vec2(.1,.05))*25.*aFrac) * smoothstep(1.,.33,aFrac) * (.1+.9*smoothstep(.33,.66,aFrac));
        
    }
	col *= (1. + amp*40.*(1.+.5*fft.x*fft.x*fft.x/abs(length(uv)-fract(aTime)*1.15))); //expanding particle flash rings
    col += .05*step(.95, fft.x)*hash21(vec2(aTime,iFrame))*mod(float(iFrame),2.)/abs(length(uv)-fract(aTime+.1)*1.15); //expanding large flash rings
    
    // Finalizations
    col *= .3*hash21(uv*iTime) + .7; //noise
	col -= length(uv) * .005; //vignette
	col = pow(col, vec3(.4545)); //gamma correction    
    fragColor = vec4(col,1.);
}