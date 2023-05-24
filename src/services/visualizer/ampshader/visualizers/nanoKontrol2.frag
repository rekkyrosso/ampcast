// https://www.shadertoy.com/view/NlsfDM
/**
    License: Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License

    NanoKontrol2 Korg Midi interface
    04/26/22 | byt3_m3chanic

    Use sound or mic in iChannel0


    Made mostly just cause I had a day to play, but also a pretty
    good demo of how to access the midi texture in KodeLife
    (though here on Shadertoy I'm just pumping the sound to controll)

    https://twitter.com/byt3m3chanic/status/1518968742314754049

    to use in KodeLife - replace the sampleFreq calls with midiCoord

    ivec2 midiCoord(int offset){
        int x = offset % 32;
        int y = offset / 32;
        return ivec2(x,y);
    }

    float md1 = texelFetch(midi1, midiCoord(3 * 127 + i), 0).x;
*/

#define R iResolution
#define M iMouse
#define T iTime

#define PI2 6.28318530718
#define PI  3.14159265359

// button color
const vec3 lcolor = vec3(0.949,0.008,0.290);
// power color
const vec3 tcolor = vec3(0.855,0.969,0.812);

mat2 rot(float g) {return mat2(cos(g), sin(g),-sin(g), cos(g));}
float hash21( vec2 p ) {return fract(sin(dot(p,vec2(23.43,84.21)))*4832.3234);}

float sampleFreq(float freq) {
    return texture(iChannel0, vec2(freq, 0.1)).x;
}

float box(in vec2 p, in vec2 b){
    vec2 d = abs(p)-b;
    return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
}

float px = 0.;

void nanoBody(inout vec3 C, vec2 p) {
    vec2 uv=p-vec2(0);

    //body
    float d = box(uv,vec2(.725,.2))-.015;
    d=smoothstep(px,-px,d);

    //inset
    float i = box(uv,vec2(.715,.1875))-.015;
    i=smoothstep(px,-px,i);

    //shadow
    float sd = box(uv+vec2(0,.01),vec2(.71,.19));
    sd=smoothstep(.045-px,-px,abs(sd)-.01);
    float hs = hash21(uv*sin(uv.x));

    C= mix(C,vec3(.0),sd);
    C= mix(C,vec3(.015)-(hs*.01),d);
    C= mix(C,vec3(.035)-(hs*.01),clamp(min(uv.y+.45,i),0.,1.));

    // button fame boxes
    float r = box(uv+vec2(.55,.15),vec2(.13,.0275));
    r=smoothstep(px,-px,abs(r)-.00075);
    C= mix(C,vec3(.1),r);

    r = box(uv+vec2(.55,.05),vec2(.13,.021));
    r=smoothstep(px,-px,abs(r)-.00075);
    C= mix(C,vec3(.1),r);

    // power light
    float l = box(uv+vec2(.7,-.175),vec2(.0125,.002))-.0025;
    float sl=smoothstep(.02-px,-px,l);
    l=smoothstep(px,-px,l);
    C= mix(C,tcolor*.2,sl);
    C= mix(C,tcolor,l);
}

void knob(inout vec3 C, vec2 p, float level) {
    vec2 uv = p-vec2(0);
    //base
    uv*=rot(level*PI2);
    float k = length(uv)-.037;
    float dk = length(uv)-.027;
    dk=smoothstep(px,-px,abs(dk)-.005);
    k=smoothstep(px,-px,k);

    C= mix(C,vec3(.001),k);
    C= mix(C,uv.x>0.?vec3(.16):vec3(.05),dk);

    //line
    float l = box(uv-vec2(0,.01),vec2(.0015,.01));
    l=smoothstep(px,-px,l);

    C= mix(C,vec3(.6),l);
}

void slider(inout vec3 C, vec2 p, float level) {
    vec2 uv=p-vec2(0);

    //background
    float d = box(uv,vec2(.015,.125))-.015;
    d=smoothstep(px,-px,d);
    C= mix(C,uv.x<0.?vec3(.1):vec3(.15),d);

    //lines
    float l = box(uv,vec2(.015,.0001));
    l = min(box(vec2(uv.x,abs(abs(uv.y)-.075)-.025),vec2(.015,.0001)),l);
    l=smoothstep(px,-px,l);
    C= mix(C,uv.x>0.?vec3(.00):vec3(.5),l);

    //slider
    level = (level*.75)-.15;
    float b = box(uv-vec2(0,level),vec2(.0125,.0175))-.0075;
    b=smoothstep(px,-px,b);

    C= mix(C,vec3(.01),b);
}

void button(inout vec3 C, vec2 p, float state, int type) {
    vec2 uv = p-vec2(0);
    //base
    float b = box(uv,vec2(.0125,type==2?.005:.0125))-.005;
    float sl=smoothstep(.02-px,-px,b);
    b=smoothstep(px,-px,b);

    if(state>.001) C= mix(C,lcolor*.2,sl);
    C= mix(C,state>.001?lcolor:vec3(.05),b);
}

void backdrop( inout vec3 C, vec2 p) {
    vec2 uv = p-vec2(0);
    uv*=rot(.78);
    float d = box(uv,vec2(5.,.4));
    float dcut=d;
    float sd=smoothstep(.03-px,-px,d);
    d=smoothstep(px,-px,d);
    C=mix(C,vec3(.0001),sd);
    C=mix(C,vec3(.001),d);
    C=mix(C,vec3(0.384,0.510,0.227),clamp(min((p.y+.015)*2.865,d),0.,1.));


    float i = .03;
    vec2 nv=p-vec2(1.-T*.1,-.02);
    vec2 f = fract(nv*40.)-.5;
    vec2 fid = floor(nv*40.)+.5;
    fid.x=mod(fid.x,30.);
    float ht = sampleFreq(fid.x*.015)*.85;

    float bd = box(f,vec2(.4))-.01;
    bd=max(bd,dcut);
    bd=smoothstep(px,-px,bd);

    float bx = box(f,vec2(.3))-.01;
    bx=abs(bx)-.12;
    bx=max(bx,dcut);
    bx=smoothstep(px,-px,bx);

    //draw dots
    if(fid.x<40.&& fid.y>0.) {
        float avg = (fid.y*.095)-.5;
        if(ht>avg) C=mix(C,vec3(.0001),bx);
        if ( ht>avg&&ht<avg+.1) C=mix(C,vec3(.0001),bd);
    }


    uv.y=abs(uv.y-.38)-.02;
    float nd = box(uv,vec2(5.,.0075));
    nd=smoothstep(px,-px,nd);
    C=mix(C,tcolor,nd);

}

void mainImage( out vec4 O, in vec2 F )
{

    vec2 uv = (2.* F.xy-R.xy)/max(R.x,R.y);
    float hs = hash21(uv*sin(uv.x));
    vec3 C = vec3(.3-(hs*.05));

    px=2./R.x;

    backdrop(C, uv);

    // uncomment for fun
    //uv.x+=T*.3;
    //uv.x=mod(uv.x+1.,2.)-1.;

    nanoBody(C, uv+vec2(0,.25));
    // to use midi texture you loop over
    // the control values based on a 32x32
    // texture
    // https://hexler.net/kodelife/manual/parameters-built-in

    // sliders
    for(int i = 0; i<8;i++) {
        //float md1 = (texelFetch(midi1, midiCoord(3 * 127 + i), 0).x);
        float md1 = sampleFreq(float(i)*.042)*.35;
        vec2 p = vec2(.25,.29)-vec2(float(i)*.13,0);

        slider(C, uv+p, md1);
    }

    // knobs
    int tk = 0;
    for(int i = 16; i<24;i++) {
    //
        float md1 = sampleFreq(float(i)*.051)*.5;
        vec2 p = vec2(.25,.0925)-vec2(float(tk)*.13,0);
        knob(C,uv+p,md1);

        tk++;
    }

    // solo buttons
    tk = 0;
    for(int i = 32; i<40;i++) {
        float md1 = sampleFreq(float(tk)*.02)*.45;
        if(md1<.2) md1 = 0.;
        vec2 p = vec2(.3125,.2)-vec2(float(tk)*.13,0);
        button(C,uv+p, md1, 0);
        tk++;
    }

    // mute buttons
    tk = 0;
    for(int i = 48; i<56;i++) {
        float md1 = sampleFreq(float(tk)*.1)*.45;
        if(md1<.1) md1 = 0.;
        vec2 p = vec2(.3125,.25)-vec2(float(tk)*.13,0);
        button(C,uv+p, md1, 0);
        tk++;
    }

    // record buttons
    tk = 0;
    for(int i = 64; i<72;i++) {
        float md1 = sampleFreq(float(i-35)*.1)*.45;
        if(md1<.1) md1 = 0.;
        vec2 p = vec2(.3125,.3)-vec2(float(tk)*.13,0);
        button(C,uv+p, md1, 0);
        tk++;
    }

    // track buttons
    for(int i = 41; i<46;i++) {
        float md1 = sampleFreq(float(i-41)*.1)*.45;
        if(md1<.25)md1 = 0.;
        // track button midi jumps all over? why Korg?
        // fixing my brute force
        float fk = 0.;
        if(i==41){
        fk=10.;
        }else if(i==42){
        fk=9.;
        }else if(i==43){
        fk=7.;
        }else if(i==44){
        fk=8.;
        }else{
        fk=11.;
        }

        vec2 p = vec2(1.,.4)-vec2(float(fk)*.05,0);
        button(C,uv+p, md1, 0);
        tk++;
    }

    // cycle button
    tk = 0;
    float md1 = sampleFreq(float(.23434)*.1)*.45;
    if(md1<.2) md1 = 0.;
    button(C,uv+vec2(.65,.30), md1, 2);

    // marker buttons
        for(int i = 60; i<63;i++) {
        float md1 = sampleFreq(float(i-35)*.1)*.45;
        if(md1<.1) md1 = 0.;
        vec2 p = vec2(.55,.30)-vec2(float(tk)*.05,0);
        button(C,uv+p, md1, 2);
        tk++;
    }

    // track buttons
        for(int i = 58; i<60;i++) {
        float md1 = sampleFreq(float(i-57)*.078)*.45;
        if(md1<.25) md1 = 0.;
        vec2 p = vec2(.8,.25)-vec2(float(tk)*.05,0);
        button(C,uv+p, md1, 2);
        tk++;
    }

    if(hs<.65) C = clamp(C+(hs*.005),C,vec3(1));
    C = pow(C, vec3(.4545));
    O = vec4(C,1.);
}
