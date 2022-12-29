// Audio-reactive scene 1st attempt by kishimisu
// https://www.shadertoy.com/view/cslSRr

/* DOES NOT WORK */


/* @kishimisu - 2022

   First attempt at raymarching scenes
   that react to audio input !

   I realized that it's really hard
   to isolate the notes in order to
   have different parts of the scene
   react to different sounds without
   manual fine-tuning. I'll try to
   improve on it, any reference on
   this subject is welcome !
*/

// Set to 1 if you have a really good PC
#define HIGH_PERF 0

#if HIGH_PERF
    #define iterations           50.
    #define max_dist            500.
// numbers of neighbor lights to check, very expensive so default to 0.
    #define light_neighbors_check 1.
#else
    #define iterations           30.
    #define max_dist            100.
    #define light_neighbors_check 0.
#endif

float lightRep = 12.;    // lights spacing
float attenuation = 20.; // light attenuation

#define rot(a) mat2(cos(a), -sin(a), sin(a), cos(a))
#define rep(p,r) (mod(p+r/2.,r)-r/2.)
#define rid(p,r) floor((p+r/2.)/r)
#define hash33(p) fract(sin( (p) * mat3( 127.1,311.7,74.7 , 269.5,183.3,246.1 , 113.5,271.9,124.6) ) *43758.5453123)

float hash11(float p) {
    p = fract(p * .1031);
    p *= p + 33.33;
    return fract(2.*p*p);
}

vec3 getLight(float d, vec3 color) {
    return max(vec3(0.), color / (1. + pow(abs(d * attenuation), 1.3)) - .001*0.);
}

float getLevel(float x) {
    return texture(iChannel0, vec2(int(x*512.), 0)).r; // Can't get `.r` to work.
}

// The next functions are borrowed from https://www.shadertoy.com/view/7lVBRw
// because they seem to better retrieve the musical aspects from the FFT
float getPitch(float freq, int octave){
   return getLevel(pow(2.0, float(octave)) * freq / 12000.0);
}
float logX(float x, float a, float c){
   return 1.0 / (exp(-a*(x-c)) + 1.0);
}
float logisticAmp(float amp){
   float c = 1.0 - (0.25);
//    float a = 20.0 * (1.0 - iMouse.y / iResolution.y);
   float a = 20.;
   return (logX(amp, a, c) - logX(0.0, a, c)) / (logX(1.0, a, c) - logX(0.0, a, c));
}
float getAudioIntensityAt(float x) {
    x = abs(fract(x));
    float freq = pow(2., x*3.) * 261.;
    return logisticAmp(getPitch(freq, 1));
}

float map(vec3 p, inout vec3 col) {
    //p.z = abs(p.z);
    p.y = abs(p.y) - 13. - getAudioIntensityAt(0.)*1.2;

    vec2 id = rid(p.xz, 2.);
    p.y += sin( length(sin(id/5.23 - iTime) * cos(id/10.45 + iTime))  ) * 8.;

    vec3 fp = rep(p, lightRep);
    fp.y = p.y;

    const float r = light_neighbors_check;
    for (float j = -r; j <= r; j++)
    for (float i = -r; i <= r; i++) {
        vec3 off = vec3(i, 0., j) * lightRep;
        vec3 nid = rid(p - off, lightRep);
        float d = length( fp + off )-1.;

        // assign more red to lower frequencies, more green to middle and more blue to upper frequencies
        vec3 c = hash33(nid);
        vec3 light = vec3(getAudioIntensityAt(c.r*.33), getAudioIntensityAt(c.g*.33+.33), 4.*getAudioIntensityAt(c.b*.33+.67));
        // make the intensity vary depending on a random frequency (always the same for each light)
        light *= getAudioIntensityAt(c.r+c.b+c.g)+(c.r+c.b+c.g);
        col += getLight(d, light);
    }

    p.xz = rep(p.xz, 2.);
    return length(p) - 1.;
}

void initRayOriginAndDirection(vec2 uv, inout vec3 ro, inout vec3 rd) {
    vec2 m = iMouse.xy/iResolution.xy*2.-1.;
    ro = vec3(iTime*8. -6., 0., 0.);

    float t = -iTime*.15*0.;
    vec3 f = normalize(vec3(cos(t),0,sin(t)));
    vec3 r = normalize(cross(vec3(0,1,0), f));
    rd = normalize(f + uv.x*r + uv.y*cross(f, r));
}

void main(void) {
    vec2 uv = (2.*gl_FragCoord.xy - iResolution.xy)/iResolution.y;
    vec3 p, ro, rd, col;

    initRayOriginAndDirection(uv, ro, rd);

    float t = 0.;

    for (float i = 0.; i < iterations; i++) {
        p = ro + t*rd;
        //p.yz *= rot(-t*mix(-.01, .01, sin(iTime*.1)*.5+.5));
        t += map(p, col);
        if (t > max_dist) break;
    }

    col = pow(col, vec3(.45));
    gl_FragColor = vec4(col, 1.0);
}
