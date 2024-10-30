// https://www.shadertoy.com/view/Dtj3zW
/* @kishimisu - 2023

   An audio-reactive scene that maps the frequencies of the input music
   and the audio volume to different cells, colors, size and intensity!

   I've been struggling to complete this scene as I wanted to repeat
   the space with random variations for each cell. There's a wonderful
   tutorial by Blackle Mori explaining how to achieve this (https://www.youtube.com/watch?v=I8fmkLK1OKg) ,
   however I'm using an accumulation technique for the lighting with a
   fixed number of steps (30) which gets broken with this new technique.

   I decided to keep a reasonable random variation amount to prevent having
   raymarching artifacts that are too visible. I couldn't get totally rid of them,
   however with this kind of audio reactive scene it seems to be more acceptable
   as there's a lot of rapid movements!
*/

#define light(d, att) 1. / (1.+pow(abs(d*att), 1.3))
#define rot(a) mat2(cos(a + vec4(0,33,11,0)))

/* Audio-related functions */
#define getLevel(x) (texelFetch(iChannel0, ivec2(int(x*512.), 0), 0).r)
#define logX(x,a,c) (1./(exp(-a*(x-c))+1.))
float logisticAmp(float amp){
   float c = .88, a = 20.;
   return (logX(amp, a, c) - logX(0.0, a, c)) / (logX(1.0, a, c) - logX(0.0, a, c));
}
float getPitch(float freq, float octave){
   freq = pow(2., freq)   * 261.;
   freq = pow(2., octave) * freq / 12000.;
   return logisticAmp(getLevel(freq));
}
float getVol() {
    float avg = 0.;
    for (float i = 0.; i < 8.; i++) avg += getLevel(i/8.);
    return avg / 8.;
}
/* ----------------------- */

float sdBox( vec3 p, vec3 b ) {
  vec3 q = abs(p) - b;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0);
}
float hash13(vec3 p3) {
	p3  = fract(p3 * .1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv   = (2.*fragCoord-iResolution.xy)/iResolution.y;
    vec3 col = vec3(.1,.0,.14);
    float vol = getVol();

    vec3 ro = vec3(0, 8, 12)*(1. + vol*.3);
    ro.zx *= rot(iTime*.4);
    vec3 f = normalize(-ro), r = normalize(cross(vec3(0,1,0), f));
    vec3 rd = normalize(f + uv.x*r + uv.y*cross(f, r));

    float hasSound = 1.; if (iChannelTime[0] <= 0.) hasSound = .4;

    float t = 0.;
    for (float i = 0.; i < 30.; i++) {
        vec3 p  = ro + t*rd;

        vec2 cen = floor(p.xz) + .5;
        vec3 id = abs(vec3(cen.x, 0, cen.y));
        float d = length(id);

        float freq = smoothstep(0., 20., d)*3.*hasSound + hash13(id)*2.;
        float pitch = getPitch(freq, .7);

        float v  = vol*smoothstep(2., 0., d);
        float h  = d*.2*(1.+pitch*1.5) + v*2.;
        float me = sdBox(p - vec3(cen.x, -50., cen.y), vec3(.3, 50. + h, .3)+pitch) - .05;

        col += mix(mix(vec3(.8,.2,.4), vec3(0,1,0), min(v*2.,1.)), vec3(.5,.3,1.2), smoothstep(10., 30., d))
               *(cos(id)+1.5)
               * (pitch * d*.08 + v)
               * light(me, 20.) * (1. + vol*2.);

        t += me;
    }

    fragColor = vec4(col,1.0);
}
