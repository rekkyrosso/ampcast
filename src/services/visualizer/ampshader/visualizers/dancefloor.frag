// https://www.shadertoy.com/view/sXG3Wd
// dancefloor
// the crowd is the dancing silhouettes layer out of trippy, redone as distance fields
// 124bpm, breakdown then a drop every 64 beats. hold the mouse for a follow spot
// iChannel0 = music, optional, it just pushes the lights

#define BPM 124.
#define BEAMS 6

const float STROBE = .3;     // drop strobe, 0 = off
const float SPECKS = 1.;     // disco ball specks
const vec2  BALL   = vec2(0, .36);
const float BR     = .045;

// hashes from dave hoskins, smin and the palette from iq
float h11(float p){ p = fract(p*.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 q = fract(p.xyx*.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y)*q.z); }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
vec3 pal(float t){ return .5 + .5*cos(6.2832*(t + vec3(0, .33, .67))); }

float noise(vec2 p){
    vec2 i = floor(p), f = fract(p);
    f = f*f*(3. - 2.*f);
    return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + 1.), f.x), f.y);
}
float fbm(vec2 p){
    float s = 0., a = .5;
    for(int i = 0; i < 4; i++){ s += a*noise(p); p = p*2.03 + 7.1; a *= .5; }
    return s;
}

float seg(vec2 p, vec2 a, vec2 b, float r){
    vec2 pa = p - a, ba = b - a;
    return length(pa - ba*clamp(dot(pa, ba)/dot(ba, ba), 0., 1.)) - r;
}
float smin(float a, float b, float k){ float h = max(k - abs(a - b), 0.)/k; return min(a, b) - h*h*k*.25; }

// 0 hangs straight down, positive swings toward +x
vec2 dn(float a){ return vec2(sin(a), -cos(a)); }

// a = shoulders L R, elbows L R. l = hips L R, knees L R. b = lean, sway, jump
struct P { vec4 a, l, b; };
P mixP(P x, P y, float t){ return P(mix(x.a, y.a, t), mix(x.l, y.l, t), mix(x.b, y.b, t)); }

P move(int m, float b){
    float f = fract(b), k = exp(-f*6.), s = sin(b*3.1416);
    float dip = .5 + .5*cos(b*6.2832);      // knees go on the beat
    P p = P(vec4(.3, .3, 1.1, 1.1), vec4(.1, .1, .1 + .4*dip, .1 + .4*dip), vec4(.03*s, 0, 0, 0));
    if(m == 0){                             // bounce
        p.a = vec4(.35 + .2*s, .35 - .2*s, 1.2, 1.2);
    } else if(m == 1){                      // fist pump
        p.a = vec4(.25, 2.1 + .5*k, 1.1, 1.4*(1. - k));
    } else if(m == 2){                      // hands up, slow sway
        float w = sin(b*1.5708);
        p.a = vec4(2.65 + .2*w, 2.65 - .2*w, .3, .3);
        p.b.xy = vec2(.12, .04)*w;
        p.l.zw = vec2(.15);
    } else if(m == 3){                      // shuffle
        p.b.y = .07*s;
        p.l = vec4(.12 + .3*max(s, 0.), .12 + .3*max(-s, 0.), .2 + .3*dip, .2 + .3*dip);
        p.a = vec4(.5 + .3*s, .5 - .3*s, .9, .9);
    } else if(m == 4){                      // jump
        float air = sin(f*3.1416);
        p.b.z = .13*air;
        p.l = vec4(.15, .15, vec2(.2 + .7*k + .2*air));
        p.a = vec4(vec2(2.4 + .3*air), .3, .3);
    } else if(m == 5){                      // arm waves
        p.a = vec4(1.6 + .7*s, 1.6 - .7*s, .9 - .7*s, .9 + .7*s);
        p.b.x = .08*s;
    } else if(m == 6){                      // two step, hands in
        p.l = vec4(.08, .08, .15 + .5*max(s, 0.), .15 + .5*max(-s, 0.));
        p.a = vec4(.2, .2, 1.7, 1.7);
        p.b.x = .06*s;
    } else {                                // point at the dj
        p.a = vec4(.3, 2.75 + .2*k, 1.1, .1);
    }
    return p;
}

// 8 beat blocks: 0-4 groove, 5 breakdown, 6-7 the drop
int songMove(float h, float n){
    float k = mod(n, 8.);
    if(k == 5.) return 2;
    if(k > 5.) return h > .4 ? 4 : (k == 6. ? 1 : 7);
    return int(h21(vec2(h*97., n))*8.);
}

P pose(float h, float bt, float near, out float phone){
    float b = bt + (h - .5)*.12;            // nobody's quite on it
    if(h > .94) b *= .5;
    float n = floor(bt/8.);
    P p = mixP(move(songMove(h, n - 1.), b), move(songMove(h, n), b), smoothstep(0., 1., fract(bt/8.)*8.));
    phone = 0.;
    if(mod(n, 8.) == 5. && h > .55){        // phones out
        phone = smoothstep(0., 1., fract(bt/8.)*4.);
        p.a.yw = mix(p.a.yw, vec2(2.75, .15), phone);
    }
    return mixP(p, move(4, b), near);
}

// x = distance, y = distance to the right hand (phone)
vec2 dancer(vec2 q, P p, float h){
    float sw = .1 + .035*h21(vec2(h, 3.));
    float hw = .05 + .02*h21(vec2(h, 5.));
    float bulk = .9 + .3*h21(vec2(h, 7.));
    float lean = p.b.x;
    vec2 up = vec2(-sin(lean), cos(lean)), rt = vec2(up.y, -up.x);
    vec2 hp = vec2(p.b.y, 0);
    vec2 hL = hp - vec2(hw, 0), hR = hp + vec2(hw, 0);
    // knees bend toward you, so mostly they just get shorter
    vec2 nL = hL + .25*dn(-p.l.x - .25*p.l.z)*vec2(1, cos(p.l.z*.8)), fL = nL + .24*dn(.3*p.l.z - p.l.x);
    vec2 nR = hR + .25*dn(p.l.y + .25*p.l.w)*vec2(1, cos(p.l.w*.8)),  fR = nR + .24*dn(p.l.y - .3*p.l.w);
    q.y += min(fL.y, fR.y) - .03 - p.b.z;   // stand on the floor

    vec2 nk = hp + up*.3, ch = hp + up*.19;
    vec2 sL = nk - up*.035 - rt*sw, sR = nk - up*.035 + rt*sw;
    vec2 eL = sL + .19*dn(lean - p.a.x), wL = eL + .18*dn(lean - p.a.x - p.a.z);
    vec2 eR = sR + .19*dn(lean + p.a.y), wR = eR + .18*dn(lean + p.a.y + p.a.w);
    vec2 hd = nk + up*.11;

    float d = seg(q, hp + up*.04, ch, .078*bulk);
    d = smin(d, seg(q, sL, sR, .045), .07);
    d = smin(d, seg(q, ch, nk, .05), .05);
    d = smin(d, seg(q, hL, hR, .062*bulk), .05);
    d = smin(d, min(seg(q, sL, eL, .038), seg(q, eL, wL, .03)), .03);
    d = smin(d, min(seg(q, sR, eR, .038), seg(q, eR, wR, .03)), .03);
    d = min(d, min(length(q - wL), length(q - wR)) - .036);
    d = smin(d, min(seg(q, hL, nL, .055), seg(q, nL, fL, .042)), .04);
    d = smin(d, min(seg(q, hR, nR, .055), seg(q, nR, fR, .042)), .04);

    float hh = length(q - hd) - .068 - .012*h21(vec2(h, 9.));
    float hv = h21(vec2(h, 11.));
    if(hv > .72) hh = smin(hh, seg(q, hd, hd - up*.13, .058), .03);       // long hair
    else if(hv > .55) hh = min(hh, length(q - hd - up*.075) - .034);      // bun
    d = smin(d, hh, .025);
    return vec2(d, length(q - wR - up*.035));
}

vec3 ledWall(vec2 p, float bt, float t, float blk, float k){
    vec2 w = p - vec2(0, .1);
    if(abs(w.x) > .52 || abs(w.y) > .16) return vec3(0);
    vec2 g = (floor(p*110.) + .5)/110. - vec2(0, .1);
    float r = length(g), a = atan(g.y, g.x);
    float sp = blk == 5. ? .25 : 1.;
    // trippy mandala rings
    float v = sin(r*34. - bt*3.1416*sp + 1.6*sin(a*6. + t*.3 + r*8.));
    v = smoothstep(.3, 1., v);
    vec3 c = pal(r*1.2 + bt*.03 + (blk > 5. ? .5 : 0.))*v;
    if(blk == 5.) c = vec3(.1, .3, 1.)*v*.5;
    c *= .45 + .9*k;
    vec2 f = fract(p*110.) - .5;
    return c*smoothstep(.5, .2, length(f))*1.6;
}

vec3 beamCol(float i, float blk){
    if(blk > 5.) return mix(vec3(1, .85, .6), vec3(1), mod(i, 2.));
    if(blk == 5.) return vec3(.15, .3, 1);
    return mod(i + floor(blk*.5), 2.) < 1. ? vec3(1, .15, .6) : vec3(.15, .65, 1);
}

vec3 beams(vec2 p, float bt, float t, float blk, float k){
    vec3 L = vec3(0);
    float hz = .5 + fbm(p*2.5 + vec2(t*.06, -t*.02));
    float on = blk > 5. ? .9 + .8*k : (blk == 5. ? .1 : .45 + .55*k);
    float n2 = floor(bt*.5), f2 = fract(bt*.5);
    for(int i = 0; i < BEAMS; i++){
        float fi = float(i), side = fi/float(BEAMS - 1)*2. - 1.;
        vec2 src = vec2(side*.78, .47);
        float a = -side*.3 + .45*sin(t*.37 + fi*1.7);
        if(blk > 5.)    // snap to a new spot every 2 beats
            a = mix(h21(vec2(fi, n2 - 1.)), h21(vec2(fi, n2)), smoothstep(0., .25, f2))*1.6 - .8;
        vec2 dir = dn(a), v = p - src;
        float al = dot(v, dir);
        if(al < 0.) continue;
        float pe = dot(v, vec2(-dir.y, dir.x));
        float w = .006 + al*.085;
        L += beamCol(fi, blk)*exp(-pe*pe/(w*w))*(.2 + .012/w)*exp(-al*.8);
    }
    return L*on*hz;
}

vec3 lasers(vec2 p, float bt, float t, float blk){
    if(blk < 3. || blk == 5.) return vec3(0);
    vec2 v = p - vec2(0, -.03);
    float L = 0.;
    for(int i = 0; i < 9; i++){
        float a = (float(i) - 4.)*.2 + .35*sin(t*.9) + (blk > 5. ? .15*sin(bt*3.1416) : 0.);
        vec2 d = vec2(sin(a), cos(a));
        float al = dot(v, d);
        L += exp(-pow(dot(v, vec2(d.y, -d.x))*900., 2.))*step(0., al)*exp(-al*1.5);
    }
    return vec3(.1, 1, .25)*L*(blk > 5. ? .8 : .35)*(.5 + .5*sin(bt*6.2832*2.));
}

float specks(vec2 p, float t){
    vec2 v = p - BALL;
    float r = length(v);
    vec2 u = vec2(atan(v.y, v.x)/6.2832*48. + t*.9, log(r)*7.);
    vec2 c = floor(u), f = fract(u) - .5;
    c.x = mod(c.x, 48.);
    float h = h21(c + 13.);
    if(h < .5) return 0.;
    vec2 o = (vec2(h21(c + 3.1), h21(c + 7.7)) - .5)*.5;
    return smoothstep(.12, .05, length(f - o))*(.5 + .5*sin(t*3. + h*40.))*smoothstep(.06, .12, r)/(1. + 2.*r);
}

vec3 ball(vec2 p, float t, out float m){
    vec2 q = (p - BALL)/BR;
    float rr = dot(q, q);
    m = smoothstep(1., .9, rr);
    vec3 n = vec3(q, sqrt(max(1. - rr, 0.)));
    float lit = .25 + .75*max(dot(n, normalize(vec3(-.4, .6, .7))), 0.);
    n.xz *= rot(t*.7);
    vec2 g = vec2(atan(n.x, n.z)*16./3.1416, asin(clamp(n.y, -1., 1.))*16./3.1416);
    vec2 c = floor(g), f = fract(g);
    float h = h21(c);
    float tw = pow(fract(h*7. + t*.5), 40.);
    float grout = smoothstep(0., .12, min(min(f.x, 1. - f.x), min(f.y, 1. - f.y)));
    return (vec3(.2 + .3*h)*lit + vec3(1, .95, .9)*tw*3.)*grout;
}

void mainImage(out vec4 O, in vec2 fc){
    vec2 R = iResolution.xy;
    vec2 p = (fc - .5*R)/R.y;
    float px = 1.5/R.y;
    float t = iTime, bt = t*BPM/60.;
    float n = floor(bt/8.), blk = mod(n, 8.), fb = fract(bt/8.);
    // snare roll at the end of the build
    float rate = blk == 4. ? (fb > .75 ? 4. : fb > .5 ? 2. : 1.) : 1.;
    float k = exp(-fract(bt*rate)*6.);
    float snd = texture(iChannel0, vec2(.03, .25)).x;
    k = max(k, smoothstep(.45, 1., snd));
    if(blk == 5.) k *= .3;

    // back wall, stage, led wall
    vec3 col = vec3(.008, .006, .016)*(1. + 2.*smoothstep(.5, -.1, p.y));
    col += ledWall(p, bt, t, blk, k);
    vec2 fw = abs(p - vec2(0, .1)) - vec2(.52, .16);
    col *= 1. - smoothstep(.006, 0., abs(max(fw.x, fw.y)) - .004)*.9;     // frame
    if(p.y < -.065){
        col = vec3(.01, .01, .015);
        col += .12*ledWall(vec2(p.x, -.13 - p.y), bt, t, blk, k)*smoothstep(-.3, -.07, p.y);
        if(p.y > -.09) col = vec3(.015, .013, .02) + pal(p.x*.5 + bt*.05)*.12*smoothstep(.003, 0., abs(p.y + .07))*(.5 + k);
    }

    // dj behind the booth
    {
        float bd = blk == 5. ? 2. : (blk > 5. ? 1. : 6.);
        P pp = move(int(bd), bt);
        if(bd == 6.) pp.a = vec4(.9, .9 + .3*sin(bt*.785), .7, .5);
        float d = dancer((p - vec2(0, -.068))/.075, pp, .3).x*.075;
        col = mix(col, vec3(.005), smoothstep(px, -px, d));
        vec2 bx = abs(p - vec2(0, -.048)) - vec2(.075, .018);
        float db = max(bx.x, bx.y);
        col = mix(col, vec3(.012, .01, .016) + vec3(.6, .1, .9)*smoothstep(.002, 0., abs(p.y + .04))*(.4 + k), smoothstep(px, -px, db));
    }

    // light rig
    float hzn = exp(-abs(p.y + .02)*4.);
    vec3 glow = (blk == 5. ? vec3(.1, .2, .8) : pal(bt*.03)*.5 + .2)*hzn*(.08 + .08*k);
    vec3 air = beams(p, bt, t, blk, k) + lasers(p, bt, t, blk) + glow;
    col += air;
    float tr = abs(p.y - .485) - .012;
    col = mix(col, vec3(.02), smoothstep(px, -px, tr));
    for(int i = 0; i < BEAMS; i++){
        vec2 src = vec2((float(i)/float(BEAMS - 1)*2. - 1.)*.78, .47);
        col += beamCol(float(i), blk)*.004/(dot(p - src, p - src) + 4e-4)*(blk == 5. ? .1 : .3 + .7*k)*.08;
    }
    float bm;
    vec3 bc = ball(p, t, bm);
    col = mix(col, bc, bm);
    col = mix(col, vec3(.03), smoothstep(px*.6, 0., abs(p.x))*step(BALL.y + BR, p.y)*step(p.y, .48));
    float spk = specks(p, t)*SPECKS*(blk == 5. ? 1. : .35);
    col += vec3(1, .95, .85)*spk*.35*(1. - bm);

    // follow spot
    float ms = iMouse.z > 0. ? 1. : 0.;
    vec2 sp = (iMouse.xy - .5*R)/R.y;
    float spot = ms*smoothstep(.15, .11, length(p - sp));
    col += vec3(.5, .48, .42)*spot*.25;

    // crowd, back to front
    const float RS[5] = float[](.085, .13, .2, .34, .75);
    const float FG[5] = float[](.55, .4, .26, .12, .03);
    for(int r = 0; r < 5; r++){
        float s = RS[r], fr = float(r);
        vec2 q0 = (p - vec2(0, -.05*s - 1.03*s))/s;
        float off = h11(fr*7.3 + .4);
        if(q0.y > 1.8 || q0.y < -.05) continue;
        float u = q0.x*2. + off, id = floor(u);
        float nb = fract(u) < .5 ? -1. : 1.;      // this cell and the nearer neighbour
        float dm = 1e3, pm = 1e3;
        for(int j = 0; j < 2; j++){
            float cid = id + float(j)*nb;
            float hc = h21(vec2(cid, fr*13.1 + 1.));
            if(hc < .08) continue;
            float sz = .88 + .24*fract(hc*31.7);
            float cx = (cid + .5 + (fract(hc*17.3) - .5)*.35 - off)*.5;
            vec2 q = (q0 - vec2(cx, 0))/sz;
            if(abs(q.x) > .95 || q.y > 1.75 || q.y < -.05) continue;
            float near = ms*smoothstep(.3, .1, abs(cx*s - sp.x));
            float ph;
            vec2 dd = dancer(q, pose(hc, bt, near, ph), hc)*s*sz;
            dm = min(dm, dd.x);
            if(ph > 0.) pm = min(pm, dd.y/ph);
        }
        float a = smoothstep(px, -px, dm);
        vec3 sil = air*FG[r] + vec3(.004, .004, .008);
        sil += col*.75*smoothstep(-.003 - .008*s, 0., dm);     // rim off whatever's behind
        sil += vec3(1, .95, .85)*spk*.12 + vec3(.2, .19, .17)*spot*(1. - FG[r]);
        col = mix(col, sil, a);
        col += vec3(.8, .9, 1)*(smoothstep(.006*s + px, .006*s, pm) + .5*exp(-pm/(.04*s)));  // phones
        col += air*.06;
    }

    col += vec3(.7)*STROBE*exp(-fract(bt)*35.)*step(5.5, blk)*step(1., mod(floor(bt), 2.));
    col = 1. - exp(-col*1.4);
    col = pow(col, vec3(.95));
    vec2 uv = fc/R;
    col *= .5 + .5*pow(16.*uv.x*uv.y*(1. - uv.x)*(1. - uv.y), .2);
    col += (h21(fc + fract(t)*91.) - .5)*.015;
    O = vec4(col, 1);
}