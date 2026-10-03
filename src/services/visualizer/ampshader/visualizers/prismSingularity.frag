// https://www.shadertoy.com/view/fXV3zd
// =====================================================================
//  PRISM SINGULARITY  -  audio-reactive tunnel medley
//  Remix of three tunnel visualizers into an 8-scene set that keeps
//  changing: flower tunnel, spectrum crown, binary singularities,
//  hyperdrive, neon singularity, strobe grid, star gate, kaleido bloom.
//
//  iChannel0 = Music / SoundCloud input (FFT row y=0.25, wave y=0.75)
//  Falls back to a synthetic beat when no audio is bound.
//
//  Kick   -> whole-frame hue rotation, zoom punch, shockwaves
//  Bass   -> star deformation, core size, warp brightness
//  Mids   -> tunnel speed, glow intensity, kaleido drift
//  Highs  -> sparkle, ray strength, strobe grid flicker
// =====================================================================

#define PI  3.141592653589793
#define TAU 6.283185307179586
#define SCENE_LEN 11.0      // seconds per scene
#define TRANS     1.8       // seconds of transition at the end of each scene

float gSilent, gBass, gMid, gHigh, gKick;

float hash(float n){ return fract(sin(n*127.1)*43758.5453); }
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
mat2  rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
float wrapA(float x){ return atan(sin(x),cos(x)); }
vec3  hue(float h){ return 0.5+0.5*cos(TAU*(h+vec3(0.0,0.33,0.67))); }

vec3 pal(float i){
    i = mod(floor(i),7.0);
    if(i<1.0) return vec3(0.15,1.0,0.15);
    if(i<2.0) return vec3(1.0,0.55,0.05);
    if(i<3.0) return vec3(0.20,0.35,1.0);
    if(i<4.0) return vec3(1.0,0.08,0.75);
    if(i<5.0) return vec3(1.0,0.9,0.1);
    if(i<6.0) return vec3(0.0,0.9,1.0);
    return vec3(0.7,0.2,1.0);
}

// rotate hue around the grey axis (bass-hit color change)
vec3 hueRot(vec3 c, float a){
    const vec3 k = vec3(0.57735);
    float ca = cos(a);
    return c*ca + cross(k,c)*sin(a) + k*dot(k,c)*(1.0-ca);
}

// ---------------------------------------------------------------- audio
float FFT(float x){
    x = clamp(x,0.001,0.999);
    float f  = texture(iChannel0, vec2(x,0.25)).x;
    float bt = pow(sin(iTime*PI*2.0)*0.5+0.5,6.0);            // 120 bpm fake kick
    float fb = bt*(1.0-x)*0.9 + (sin(x*20.0+iTime*5.0)*0.15+0.35)*(1.0-x*0.5);
    return mix(f, fb, gSilent);
}
float WAVE(float x){
    x = clamp(x,0.001,0.999);
    float w  = texture(iChannel0, vec2(x,0.75)).x;
    float fb = 0.5 + 0.22*sin(x*TAU*7.0+iTime*4.0)*sin(x*TAU*2.0-iTime*1.3);
    return mix(w, fb, gSilent);
}

float shock(float r, float t, float speed){
    float sw = 0.0;
    for(int i=0;i<3;i++){
        float ph = fract(t*speed + float(i)/3.0);
        sw += exp(-abs(r-ph*1.7)/0.012)*(1.0-ph);
    }
    return sw;
}

// ============================================================ SCENE 0
// Bloom Flower: rainbow beaded spokes + scrolling tick rings
vec3 sFlower(vec2 uv, float t, float p, float v){
    float r = max(length(uv),1e-4), a = atan(uv.y,uv.x);
    float af   = a + t*0.15*(v>0.5 ? 1.0 : -1.0);
    float twist= 0.22 + 0.28*sin(t*0.3 + v*6.0);           // spiral breathes
    float ang  = af + twist*log(r);
    float u = ang/TAU, uf = af/TAU;
    float fc = abs(fract(uf)*2.0-1.0);
    float m  = pow(FFT(0.02+fc*0.5),1.4)*1.4;
    float N  = floor(70.0 + 60.0*v);
    float bi = floor(u*N);
    float bar  = smoothstep(0.5,0.30,abs(fract(u*N)-0.5));
    float depth= log(r)*4.0 - t*(0.7+gMid*0.5);
    float ri   = floor(depth);
    float tick = smoothstep(0.5,0.30,abs(fract(depth)-0.5));
    float L   = 0.42 + m*1.7;
    float env = smoothstep(L, L-0.10, r);
    // second half of the scene the rainbow snaps to the neon palette
    float neon = smoothstep(0.48,0.55,p);
    float h = fract(uf) + 0.05*ri + 0.14*(hash(bi+ri*7.0)-0.5) + v;
    vec3 c  = mix(hue(h), pal(hash(bi*0.5+ri*3.0)*7.0), neon);
    vec3 col = c*bar*tick*env*2.6;
    col += vec3(1.0,0.97,0.92)*pow(smoothstep(0.16,0.0,r),2.5)*(1.4+gKick*2.0);
    col *= smoothstep(0.0,0.02,r);
    return col;
}

// ============================================================ SCENE 2
// Star Gate: n-point star glow rings, forward then reverse zoom
vec3 sStarGate(vec2 uv, float t, float p, float v){
    float r = max(length(uv),1e-4), a = atan(uv.y,uv.x);
    float pts  = floor(5.0 + v*6.0);
    float star = cos(a*pts);
    float amp  = FFT(abs(a)/PI*0.5 + 0.1);
    float rd = r - star*0.06*(1.0+gBass) - amp*0.12;
    // zoom speed follows cos(p*PI): flies in, slows, then pulls back out
    float zt = t*0.3 + 1.5*SCENE_LEN/PI*sin(PI*clamp(p,-0.2,1.2));
    float z  = log(max(rd,0.001))*1.8 - zt;
    float ri = floor(z), rf = fract(z);
    vec3  c  = hue(ri*0.12 + t*0.1 + gHigh*0.3 + v);
    float glow = 0.012/(abs(rf-0.5)+0.010);
    // finer inner rings in a second color, lit by the highs
    float z2 = z*3.0 + t*0.5;
    float glow2 = 0.004/(abs(fract(z2)-0.5)+0.008);
    vec3 acc = c*glow*(1.0 + gMid*1.6)
             + hue(ri*0.12 + 0.5 + v)*glow2*(0.2 + gHigh*1.2);
    float ray = sin(a*32.0+t*2.0)*sin(a*16.0-t*4.0);
    acc += vec3(0.2,0.8,1.0)*pow(clamp(ray,0.0,1.0),3.0)*(gBass+0.3)*smoothstep(0.05,0.9,r);
    float cr = 0.07 + gBass*0.025;
    acc *= smoothstep(cr-0.01, cr, r);
    acc += vec3(1.0,0.95,0.8)*0.006/(abs(r-cr)+0.003);
    acc *= smoothstep(1.3,0.2,r);
    return acc;
}

// ------------------------------------------------ neon tunnel (compact)
vec3 neonTunnel(float r, float a, float t, float po, float pts){
    r = max(r,1e-4);
    float af  = a + t*0.15;
    float ang = af + 0.30*log(r);
    float u = ang/TAU, uf = af/TAU;
    float N = 110.0;
    float cell = floor(u*N);
    float bar  = smoothstep(0.5,0.30,abs(fract(u*N)-0.5));
    float fc = abs(fract(uf)*2.0-1.0);
    float m  = pow(FFT(0.02+fc*0.5),1.4)*1.4;
    float L  = 0.44 + m*2.0;
    float env  = smoothstep(L,L-0.10,r);
    float star = cos(af*pts)*0.035*(1.0+gBass);
    float depth  = log(max(r-star,0.001))*4.0 - t*0.7;
    float ringId = floor(depth);
    float tick = smoothstep(0.5,0.30,abs(fract(depth)-0.5));
    float cidx = hash(floor(cell/2.0)*1.7 + ringId*3.0)*7.0 + po;
    vec3 col = pal(cidx)*bar*tick*env*2.4;
    float core = smoothstep(0.13,0.0,r);
    col += (pal(hash(cell)*7.0+po)*0.7 + vec3(0.65))*pow(core,2.2)*1.9;
    col *= smoothstep(0.0,0.017,r);
    return col;
}

// ------------------------------------------------ particle warp streaks
vec3 warpField(float r, float a, float t, float N, float seedOff){
    vec3 c = vec3(0.0);
    float cell = floor(a/TAU*N);
    float ca   = (cell+0.5)/N*TAU;
    float thin = smoothstep(0.9/N, 0.0, abs(wrapA(a-ca)));
    for(int i=0;i<2;i++){
        float seed = cell + float(i)*57.3 + seedOff;
        float sp   = 0.5 + hash(seed)*1.4;
        float pr   = fract(hash(seed*1.3) + t*sp*0.35);
        float rr   = pr*pr*1.9;
        float head = exp(-abs(r-rr)/0.05);
        float tail = step(r,rr)*exp(-(rr-r)/(0.22+gBass*0.25));
        c += pal(hash(seed*2.1)*7.0)*thin*(head+tail*0.6);
    }
    return c;
}

// ============================================================ SCENE 4
// Neon Singularity: big tunnel first, then the warp field bursts out
vec3 sSingularity(vec2 uv, float t, float p, float v){
    float r = length(uv), a = atan(uv.y,uv.x);
    float burst = smoothstep(0.22,0.45,p);
    float k = mix(1.25, 2.3, burst);
    vec3 tun = neonTunnel(r*k, a, t, floor(v*7.0), 8.0);
    tun *= smoothstep(mix(1.2,0.58,burst), mix(0.9,0.40,burst), r);
    vec3 w = warpField(r, a + t*0.06, t, 110.0, 0.0)*(1.4+gBass);
    w *= smoothstep(0.30,0.46,r)*burst;
    vec3 col = tun + w;
    col += vec3(0.6,0.9,1.0)*shock(r,t,0.33)*(0.25+gBass*1.1);
    float ray = sin(a*32.0+t*2.0)*sin(a*16.0-t*4.0);
    col += vec3(0.2,0.8,1.0)*pow(clamp(ray,0.0,1.0),3.0)*(gBass+0.3)*smoothstep(0.06,0.9,r)*0.22;
    float cr = 0.05 + gBass*0.02;
    col += vec3(1.0,0.95,0.8)*(0.005/(abs(r-cr)+0.004))*0.9;
    return col;
}

// ============================================================ SCENE 1
// Hyperdrive: full-screen warp that accelerates through the scene
vec3 sHyperdrive(vec2 uv, float t, float p, float v){
    float r = length(uv), a = atan(uv.y,uv.x);
    float pp = clamp(p,0.0,1.0);
    float tt = t + pp*pp*pp*SCENE_LEN*1.6;                 // accelerate to lightspeed
    vec3 col = warpField(r, a + t*0.04, tt, 140.0, 13.0*floor(v*9.0))*(1.2+gBass*1.5);
    col += warpField(r, a - t*0.02, tt*0.7, 260.0, 91.0)*0.55*(0.5+gHigh*1.5);
    // central star flare
    float fl = pow(max(0.0,1.0-abs(uv.y)*12.0),3.0) + pow(max(0.0,1.0-abs(uv.x)*12.0),3.0);
    col += vec3(0.8,0.9,1.0)*fl*smoothstep(0.6,0.0,r)*(0.3+gKick*1.2);
    col += vec3(1.0,0.95,0.9)*pow(smoothstep(0.25,0.0,r),2.0)*(1.0+gKick*2.5);
    col += hue(v+t*0.05)*shock(r,t,0.5)*gKick*1.5;
    // speed blur tint at the edges
    col *= 1.0 + pp*smoothstep(0.4,1.6,r)*1.5;
    return col;
}

// ============================================================ SCENE 3
// Spectrum Crown: circular LED equalizer + oscilloscope ring
vec3 sCrown(vec2 uv, float t, float p, float v){
    float r = length(uv), a = atan(uv.y,uv.x) + t*0.1;
    float fa = fract(a/TAU);
    float bins = 48.0 + 16.0*floor(v*3.0);
    float kb = floor(fa*bins);
    float fk = (kb+0.5)/bins;
    float mir = abs(fk*2.0-1.0);                           // mirrored spectrum
    float amp = pow(FFT(0.02 + mir*0.6),1.5)*0.7*(1.0 + mir*1.6);   // lift the highs
    float R0  = 0.34 + gKick*0.05;
    float barX = smoothstep(0.5,0.32,abs(fract(fa*bins)-0.5));
    float h = (r-R0)/max(amp,0.001);
    float led = smoothstep(0.5,0.25,abs(fract((r-R0)/0.024)-0.5));
    float outB = step(0.0,r-R0)*step(r-R0,amp);
    vec3 cB = hue(0.35 - clamp(h,0.0,1.0)*0.4 + v + fk*0.3*step(0.5,p));
    vec3 col = cB*barX*led*outB*1.9;
    // peak caps
    float cap = exp(-abs(r-R0-amp-0.012)/0.004)*barX;
    col += vec3(1.0)*cap*0.9;
    // inward mirror (dimmer)
    float inB = step(R0-amp*0.45, r)*step(r,R0-0.02);
    col += cB*barX*inB*0.35;
    // oscilloscope ring
    float rw = 0.18 + (WAVE(fa)-0.5)*0.16*(0.6+gMid);
    col += hue(v+0.5+t*0.07)*0.004/(abs(r-rw)+0.003);
    // dim star gate behind everything
    col += sStarGate(uv*1.6, t, p, v)*0.18;
    // kick ring
    col += vec3(1.0,0.9,0.8)*exp(-abs(r-R0)/0.006)*(0.3+gKick*1.5);
    col *= smoothstep(0.0,0.05,r);
    return col;
}

// ============================================================ SCENE 5
// Kaleido Bloom: folded flower + star-gate mandala
vec3 sKaleido(vec2 uv, float t, float p, float v){
    float segs = 6.0 + 2.0*floor(v*3.0);
    float a = atan(uv.y,uv.x), r = length(uv);
    float s = TAU/segs;
    a = mod(a + t*0.08, s); a = abs(a - s*0.5);
    vec2 q = r*vec2(cos(a),sin(a));
    q -= vec2(0.25 + 0.15*sin(t*0.4) + gMid*0.08, 0.0);
    q *= rot(t*0.2);
    vec3 c1 = sFlower(q*1.4, t, p, v)*0.9;
    vec3 c2 = sStarGate(q*0.9, t, p, fract(v+0.5))*0.6*(0.4+gHigh*1.2);
    vec3 col = c1 + c2;
    col += vec3(1.0,0.95,0.85)*pow(smoothstep(0.2,0.0,r),2.0)*(0.8+gKick*2.0);
    return col;
}

// ============================================================ SCENE 6
// Binary: two neon singularities orbiting, spiralling in to merge
vec3 sBinary(vec2 uv, float t, float p, float v){
    float orb = t*0.45 + v*TAU;
    float sep = 0.48 + 0.06*sin(t*0.7) - clamp(p,0.0,1.0)*0.3;
    vec2  c1  = sep*vec2(cos(orb),sin(orb));
    vec2  q1 = uv - c1, q2 = uv + c1;
    float r1 = length(q1), r2 = length(q2);
    vec3 col = neonTunnel(r1*3.4, atan(q1.y,q1.x),  t, 0.0, 6.0)*smoothstep(0.34,0.22,r1);
    col     += neonTunnel(r2*3.4, atan(q2.y,q2.x), -t, 3.0, 8.0)*smoothstep(0.34,0.22,r2);
    // energy bridge between the two
    vec2 ba = -2.0*c1, pa = uv - c1;
    float hh = clamp(dot(pa,ba)/dot(ba,ba),0.0,1.0);
    float d  = length(pa - ba*hh);
    float jitter = sin(hh*40.0 - t*12.0)*0.01*(0.3+gHigh*2.0);
    col += hue(hh*0.5+t*0.1)*0.003/(abs(d+jitter)+0.002)*(0.3+gBass*1.2)*smoothstep(0.0,0.1,min(r1,r2));
    // shared shockwaves from both
    col += vec3(0.6,0.9,1.0)*(shock(r1,t,0.4)+shock(r2,t+0.5,0.4))*(0.15+gBass*0.7);
    // accretion haze
    float r = length(uv), a = atan(uv.y,uv.x);
    col += warpField(r, a+t*0.1, t, 90.0, 7.0)*0.35*smoothstep(0.7,1.2,r);
    return col;
}

// ============================================================ SCENE 7
// Strobe Grid: perspective polar grid, highs flicker, kicks paint cells
vec3 sStrobe(vec2 uv, float t, float p, float v){
    float r = max(length(uv),0.02), a = atan(uv.y,uv.x);
    float z   = 0.6/r + t*(1.2+gMid*0.6);
    float ang = a/TAU*24.0 + t*0.3 + sin(z*0.5)*0.4
              + z*0.25*smoothstep(0.4,0.6,clamp(p,0.0,1.0));   // twists mid-scene
    float gz = abs(fract(z)-0.5), ga = abs(fract(ang)-0.5);
    float dz = gz*r*r/0.6, da = ga*TAU*r/24.0;
    float line = smoothstep(0.010,0.0,min(dz,da));
    float fog  = smoothstep(0.0,0.6,r);
    vec3 col = vec3(0.85,0.9,1.0)*line*fog*(0.4+gHigh*1.8);
    vec2 cid = vec2(floor(z),floor(ang));
    float lit = step(0.72, hash2(cid + floor(t*4.0)));
    col += pal(hash2(cid)*7.0 + v*7.0)*lit*gKick*fog*1.4*(1.0-line);
    float ray = sin(a*32.0+t*2.0)*sin(a*16.0-t*4.0);
    col += vec3(0.2,0.8,1.0)*pow(clamp(ray,0.0,1.0),3.0)*(gBass+0.3)*fog*0.4;
    col += vec3(1.0,0.95,0.9)*pow(smoothstep(0.15,0.0,length(uv)),2.0)*(0.5+gKick*2.0);
    return col;
}

// ============================================================ director
int sceneId(float k){
    // permutation of 8 per cycle, shifted each cycle, never repeats back to back
    return int(mod(k*3.0 + floor(k/8.0), 8.0));
}

vec3 scene(int id, vec2 uv, float t, float p, float v){
    if(id==0) return sFlower(uv,t,p,v);
    if(id==1) return sHyperdrive(uv,t,p,v);
    if(id==2) return sStarGate(uv,t,p,v);
    if(id==3) return sCrown(uv,t,p,v);
    if(id==4) return sSingularity(uv,t,p,v);
    if(id==5) return sKaleido(uv,t,p,v);
    if(id==6) return sBinary(uv,t,p,v);
    return sStrobe(uv,t,p,v);
}

void mainImage(out vec4 O, in vec2 I){
    vec2 R  = iResolution.xy;
    vec2 uv = (2.0*I - R)/R.y;
    vec2 uv0 = uv;
    float T = iTime;

    // ---- audio analysis
    float s = texture(iChannel0,vec2(0.05,0.25)).x + texture(iChannel0,vec2(0.2,0.25)).x
            + texture(iChannel0,vec2(0.5,0.25)).x;
    gSilent = 1.0 - smoothstep(0.0,0.03,s);
    gBass = clamp((FFT(0.02)+FFT(0.05)+FFT(0.09))/3.0, 0.0, 1.0);
    gMid  = clamp((FFT(0.25)+FFT(0.35))*0.5, 0.0, 1.0);
    gHigh = clamp((FFT(0.60)+FFT(0.75))*0.5*1.4, 0.0, 1.0);
    gKick = clamp(pow(gBass,4.0)*1.5, 0.0, 1.0);

    // ---- timeline
    float st = T/SCENE_LEN;
    float k  = floor(st);
    float p  = fract(st);
    float tr = smoothstep(1.0 - TRANS/SCENE_LEN, 1.0, p);

    // ---- camera: slow rotation (nudged by bass), kick zoom punch, drift
    uv *= rot(T*0.05 + 0.35*sin(T*0.07) + gBass*0.08);
    uv *= 1.0 - gKick*0.08;
    uv += 0.025*vec2(sin(T*0.31), cos(T*0.23));

    vec3 col = scene(sceneId(k), uv, T, p, hash(k+0.37));

    // ---- transition into next scene (iris / sweep / dissolve)
    if(tr > 0.001){
        vec3 colB = scene(sceneId(k+1.0), uv, T, p-1.0, hash(k+1.37));
        float r = length(uv0), a = atan(uv0.y,uv0.x);
        float kind = hash(k*7.13);
        float m, edge;
        if(kind < 0.4){                      // iris out from the singularity
            float rad = tr*2.4 - 0.15;
            m = smoothstep(rad+0.08, rad-0.08, r);
            edge = exp(-abs(r-rad)/0.03);
        } else if(kind < 0.75){              // radar sweep
            float fa = fract((a+PI)/TAU + 0.25);
            float sw = tr*1.1 - 0.05;
            m = smoothstep(sw+0.04, sw-0.04, fa);
            edge = exp(-abs(fa-sw)*40.0)*smoothstep(0.05,0.3,r);
        } else {                             // shimmer dissolve
            float n = hash2(floor(I/6.0));
            m = smoothstep(n-0.1, n+0.1, tr*1.2-0.1);
            edge = 0.0;
        }
        col = mix(col, colB, m);
        col += hue(T*0.1+k*0.3)*edge*(0.8+gKick*2.0)*(1.0-tr)*tr*4.0;
    }

    // ---- signature move: bass hits rotate the whole palette
    col = max(hueRot(col, gKick*PI*0.85 + sin(T*0.05)*0.4), 0.0);

    // ---- kick flash + tonemap + vignette + grain
    col += col*gKick*0.35;
    col += col*col*0.15;
    col  = 1.0 - exp(-col*1.4);
    col *= smoothstep(2.1, 0.6, length(uv0));
    col += (hash2(I + fract(T)*97.0) - 0.5)*0.012;

    O = vec4(max(col,0.0), 1.0);
}
