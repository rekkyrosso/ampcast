// https://www.shadertoy.com/view/s3yGDd
// circle of fifths
// the music theory overlay from trippy, grown up. notes round the circle of fifths,
// chord shapes drawn between them, overtone rings, and a lissajous of the main interval
// put music or the mic on iChannel0, or leave it empty for a little demo progression
// hold the mouse on a note to play it

#define RADIUS     .34     // circle size
#define PALETTE    0       // 0 rainbow round the circle, 1 warm, 2 cool, 3 mono
#define LABELS     1       // note names
#define HARMONICS  1       // overtone rings
#define CHORDS     1       // lines between the notes that are sounding
#define LISSAJOUS  1       // interval figure in the middle
#define BPM        92.     // demo tempo
#define AUDIO      1       // 0 = ignore iChannel0, always play the demo
#define AUDIO_AMT  1.      // music sensitivity
#define SCOPE      1       // waveform ring round the outside when music is on
#define GLOW       1.

float h11(float p){ p = fract(p*.1031); p *= p + 33.33; p *= p + p; return fract(p); }

vec3 pal(float t){
    if(PALETTE == 1) return .55 + .45*cos(6.2832*(t*.5 + vec3(0, .15, .3)));
    if(PALETTE == 2) return .55 + .45*cos(6.2832*(t*.5 + vec3(.55, .45, .35)));
    if(PALETTE == 3) return vec3(.85, .9, 1);
    return .55 + .45*cos(6.2832*(t + vec3(0, .33, .67)));
}

float seg(vec2 p, vec2 a, vec2 b){
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba*clamp(dot(pa, ba)/dot(ba, ba), 0., 1.));
}

// 3x5 letters
float glyph(int g, vec2 p){
    if(p.x < 0. || p.y < 0. || p.x >= 3. || p.y >= 5.) return 0.;
    int b = 14 - (int(4. - floor(p.y))*3 + int(p.x));
    return float((g >> b) & 1);
}
// note name for a pitch class, all flats
float label(int pc, vec2 p){
    const int L[12] = int[](14627, 14627, 27502, 31143, 31143, 31140, 31140, 14699, 11245, 11245, 27566, 27566);
    const int AC[12] = int[](0, 2, 0, 2, 0, 0, 2, 0, 2, 0, 2, 0);   // 2 = flat
    // letter for the flats is the one above
    int g = AC[pc] == 2 ? L[(pc + 1)%12] : L[pc];
    float d = glyph(g, p);
    if(AC[pc] == 2) d += glyph(18862, p - vec2(4, 0));
    return d;
}

// 1:1 up to the major seventh, small whole numbers
vec2 ratio(int s){
    const vec2 Q[12] = vec2[](vec2(1, 1), vec2(16, 15), vec2(9, 8), vec2(6, 5), vec2(5, 4), vec2(4, 3),
                              vec2(7, 5), vec2(3, 2), vec2(8, 5), vec2(5, 3), vec2(7, 4), vec2(15, 8));
    return Q[s];
}

void mainImage(out vec4 O, in vec2 fc){
    vec2 R = iResolution.xy;
    vec2 p = (fc - .5*R)/R.y;
    float px = 1./R.y, t = iTime;
    float bt = t*BPM/60.;

    // chroma from the fft. low octaves smear into each other, so lean on c4 up
    float ch[12];
    float tot = 0., mx = 0., lo = 0.;
    for(int c = 0; c < 12; c++){
        float s = 0.;
        for(int o = 3; o < 8; o++){
            float f = 440.*exp2(float(12*(o + 1) + c - 69)/12.);
            float w = o == 3 ? .15 : o == 4 ? .5 : 1.;
            s += texture(iChannel0, vec2(f/11025., .25)).x*w;
        }
        ch[c] = s*.27;
        tot += ch[c];
    }
    lo = texture(iChannel0, vec2(.01, .25)).x;
    bool live = AUDIO == 1 && tot > .05;
    if(live){
        float mean = tot/12.;
        for(int c = 0; c < 12; c++){ ch[c] = max(ch[c] - mean*.9, 0.)*4.*AUDIO_AMT; mx = max(mx, ch[c]); }
        for(int c = 0; c < 12; c++){ float v = clamp(ch[c]/max(mx, .15), 0., 1.); ch[c] = v*v; }
    } else {
        // I V vi IV in c, a bar each, plus a wandering top note
        const ivec3 PROG[4] = ivec3[](ivec3(0, 4, 7), ivec3(7, 11, 2), ivec3(9, 0, 4), ivec3(5, 9, 0));
        float bar = bt/4.;
        int k = int(mod(floor(bar), 4.)), kp = int(mod(floor(bar) - 1., 4.));
        float fb = fract(bar), env = .55 + .45*exp(-fract(bt)*3.);
        float xf = smoothstep(0., .08, fb);
        for(int c = 0; c < 12; c++){
            float a = float(c == PROG[k].x || c == PROG[k].y || c == PROG[k].z);
            float b = float(c == PROG[kp].x || c == PROG[kp].y || c == PROG[kp].z);
            ch[c] = mix(b, a, xf)*env;
        }
        const int SC[7] = int[](0, 2, 4, 5, 7, 9, 11);
        float hb = floor(bt*2.);
        int mel = SC[int(h11(hb*1.7)*7.)];
        ch[mel] = max(ch[mel], .7*exp(-fract(bt*2.)*2.));
        lo = exp(-fract(bt)*5.);
    }

    // mouse plays the nearest note
    vec2 mp = (iMouse.xy - .5*R)/R.y;
    if(iMouse.z > 0. && abs(length(mp) - RADIUS) < .1){
        float a = atan(mp.x, mp.y);
        int i = int(mod(floor(a/6.2832*12. + .5), 12.));
        ch[(i*7)%12] = 1.;
    }

    // strongest two notes for the interval
    int n1 = 0, n2 = 1;
    for(int c = 0; c < 12; c++) if(ch[c] > ch[n1]) n1 = c;
    if(n1 == 1) n2 = 0;
    for(int c = 0; c < 12; c++) if(c != n1 && ch[c] > ch[n2]) n2 = c;
    int n3 = 0;
    while(n3 == n1 || n3 == n2) n3++;
    for(int c = 0; c < 12; c++) if(c != n1 && c != n2 && ch[c] > ch[n3]) n3 = c;

    float r = length(p), ang = atan(p.x, p.y);
    vec3 col = vec3(.008, .007, .016);

    // tint the room with the chord
    vec3 tint = vec3(0); float tw = 0.;
    for(int i = 0; i < 12; i++){ float c = ch[(i*7)%12]; tint += pal(float(i)/12.)*c; tw += c; }
    tint /= max(tw, 1e-3);
    col += tint*.05*exp(-r*2.5);

#if HARMONICS
    for(int k = 1; k <= 8; k++){
        float rk = RADIUS*.92*float(k)/8.;
        float pw = clamp(lo*float(9 - k)*.3, 0., 1.);
        float w = px*(1. + 2.*pw);
        col += pal(float(k)*.04 + .6)*(smoothstep(w, 0., abs(r - rk))*(.12 + .5*pw) + exp(-abs(r - rk)*90.)*.03*pw*GLOW);
    }
#endif

    // petals out to each note
    float sa = ang/6.2832*12.;
    int si = int(mod(floor(sa + .5), 12.));
    float sf = fract(sa + .5) - .5;
    float cs = ch[(si*7)%12];
    float pet = smoothstep(.5, .1, abs(sf))*smoothstep(RADIUS*(.4 + .6*cs), RADIUS*.4, r)*step(RADIUS*.4, r);
    col += pal(float(si)/12.)*pet*cs*.18;

    // fill the chord's triangle
    {
        vec2 v[3]; float cc = 1e3; vec3 fc3 = vec3(0);
        int nn[3] = int[](n1, n2, n3);
        for(int k = 0; k < 3; k++){
            int i = (nn[k]*7)%12;
            float a = float(i)/12.*6.2832;
            v[k] = RADIUS*vec2(sin(a), cos(a));
            cc = min(cc, ch[nn[k]]);
            fc3 += pal(float(i)/12.)/3.;
        }
        vec2 e0 = v[1] - v[0], e1 = v[2] - v[1], e2 = v[0] - v[2];
        float s0 = e0.x*(p - v[0]).y - e0.y*(p - v[0]).x;
        float s1 = e1.x*(p - v[1]).y - e1.y*(p - v[1]).x;
        float s2 = e2.x*(p - v[2]).y - e2.y*(p - v[2]).x;
        bool inside = (s0 > 0. && s1 > 0. && s2 > 0.) || (s0 < 0. && s1 < 0. && s2 < 0.);
        if(inside) col += fc3*.07*smoothstep(.2, .6, cc)*(1. - .5*r/RADIUS);
    }

    // the ring
    col += vec3(.5, .55, .7)*smoothstep(px*1.2, 0., abs(r - RADIUS))*.35;

#if CHORDS
    for(int i = 0; i < 12; i++){
        float ci = ch[(i*7)%12];
        if(ci < .15) continue;
        float ai = float(i)/12.*6.2832;
        vec2 pi = RADIUS*vec2(sin(ai), cos(ai));
        for(int j = i + 1; j < 12; j++){
            float cj = ch[(j*7)%12];
            if(cj < .15) continue;
            float aj = float(j)/12.*6.2832;
            float d = seg(p, pi, RADIUS*vec2(sin(aj), cos(aj)));
            float w = ci*cj;
            col += mix(pal(float(i)/12.), pal(float(j)/12.), .5)*w*(smoothstep(px*2.2, px*.5, d) + exp(-d*50.)*.2*GLOW);
        }
    }
#endif

#if LISSAJOUS
    if(r < RADIUS*.42){
        vec2 q = ratio((n2 - n1 + 12)%12);
        float amp = RADIUS*.3*(.4 + .6*ch[n1]);
        float d = 1e3;
        vec2 a = vec2(0);
        for(int s = 0; s <= 160; s++){
            float u = float(s)/160.*6.2832;
            vec2 b = amp*vec2(sin(q.x*u + t*.7), sin(q.y*u));
            if(s > 0) d = min(d, seg(p, a, b));
            a = b;
        }
        vec3 lc = mix(pal(float(n1*7%12)/12.), pal(float(n2*7%12)/12.), .5);
        col += lc*(smoothstep(px*1.3, 0., d)*.9 + exp(-d*120.)*.15*GLOW)*(.3 + .7*ch[n2]);
    }
#endif

    // notes
    for(int i = 0; i < 12; i++){
        int pc = (i*7)%12;
        float c = ch[pc];
        float ai = float(i)/12.*6.2832;
        vec2 np = RADIUS*vec2(sin(ai), cos(ai));
        float d = length(p - np);
        float s = .012 + .014*c;
        vec3 nc = pal(float(i)/12.);
        col += nc*(smoothstep(s, s - px*1.5, d)*(.35 + .9*c) + exp(-d*(40. - 20.*c))*.25*c*GLOW);
        col += nc*smoothstep(px*1.2, 0., abs(d - s - .006))*.25;
#if LABELS
        vec2 lp = np*1.24;
        float sz = .0075;
        vec2 g = (p - lp)/sz + vec2((pc == 1 || pc == 3 || pc == 6 || pc == 8 || pc == 10) ? 3.5 : 1.5, 2.5);
        col += mix(vec3(.4), nc, .5)*label(pc, g)*(.5 + .7*c);
#endif
    }

#if SCOPE
    // the actual waveform, wrapped round the circle
    if(live){
        float u = fract(ang/6.2832 + .5);
        float wv = texture(iChannel0, vec2(u, .75)).x - .5;
        float sr = RADIUS*1.45 + wv*.06*AUDIO_AMT;
        float sd = abs(r - sr);
        float sm = smoothstep(.98, 1., u) + smoothstep(.02, 0., u);    // hide the seam
        col += mix(tint, vec3(.7, .75, .9), .4)*(smoothstep(px*1.6, 0., sd)*.5 + exp(-sd*120.)*.08*GLOW)*(1. - .8*sm);
    }
#endif

    col = 1. - exp(-col*1.5);
    col = pow(col, vec3(.92));
    col += (h11(dot(fc, vec2(1, 113.)) + fract(t)*91.) - .5)*.01;
    O = vec4(col, 1);
}