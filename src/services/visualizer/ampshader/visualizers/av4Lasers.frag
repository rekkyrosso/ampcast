// https://www.shadertoy.com/view/cdySDy
/* Audio Visualizer #4 - "Lasers" by @kishimisu (2023) - https://www.shadertoy.com/view/cdySDy

   A pretty crazy 3D scene reacting to live music and featuring *Lasers*

   Restart the shader if the music doesn't play!
*/

// <!> Decrease this if you experience low performances <!>
#define ITERATIONS 40.

/*   Distance functions    */
float box( vec2 p, vec2 b ) {
  vec2 q = abs(p) - b;
  return length(max(q,0.)) + min(max(q.x,q.y),0.);
}
float boxf( vec3 p, vec3 b) {
  vec3 q = abs(abs(p)-b);
  return min(length(max(vec3(q.x-b.x,q.y,q.z),0.)),
             length(max(vec3(q.x,q.y-b.y,q.z),0.)));
}
float line(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p-a, ba = b-a;
  float h = clamp( dot(pa,ba)/dot(ba,ba), 0., 1.);
  return length(pa - ba*h) - r;
}

/* Audio-related functions */
#define getLevel(x) (texelFetch(iChannel0, ivec2(int(x*512.), 0), 0).r)
#define getPitch(f) logisticAmp(getLevel(pow(2., f) * .02175))
#define logX(x,a,c) (1./(exp(-a*(x-c))+1.))
float logisticAmp(float amp){
   const float c = 1., a = 20.;
   return (logX(amp, a, c) - logX(0.0, a, c)) / (logX(1.0, a, c) - logX(0.0, a, c));
}
float getVol(float samples) {
    float avg = 0.;
    for (float i = 0.; i < samples; i++) avg += getLevel(i/samples);
    return avg / samples;
}

/*    Helper functions     */
#define rep(p,r) (mod(p+r, r*2.)-r)
#define rid(p,r) floor((p+r)/(r*2.));
#define light(d, itn, att, p) itn / (1. + pow(abs(d)*att, p))

void mainImage(out vec4 O, vec2 F) {
    vec2 R = iResolution.xy, u = (F+F-R)/R.y;

    vec3 p, q, g = vec3(0);
    float i = 0., d = i, t = iTime;

    float v    = getVol(12.);
    float beat = getPitch(.7);

    float pitches[20];
    for (float j = 0.; j < 20.; j++) {
        pitches[int(j)] = getPitch(fract(j/20.)*2.5);
    }

    for (O *= i; i < ITERATIONS; i++) {
        p = d*normalize(vec3(u,.8));
        p.z += t*2.+v*1.5;
        q = p;

        // Walls
        float scene = -box(p.xy, vec2(4));

        // Corner lights
        float id = rid(p.z, 1.);
        p.z = rep(p.z, 1.);
        float corners = box(abs(abs(p.xy) - 4.), vec2(.01));
        g += (1.+cos(q.z/10. + v*10.+ beat + vec3(0,1,2))) * light(corners, v*beat*.1, 20., 1.4);

        // Rectangle lights
        p.z = abs(abs(p.z) - 1.);
        float rects = boxf(p, vec3(4, 4, 0));
        g += (1.+cos(q.z/10. + 1.+ v*10. + vec3(0,1,2))) * light(rects, v*beat*.5, 20., 1.4);

        // Lasers
        p = q;
        const float n = 3.; // Number of neighbors to check in each direction
        const float zrep = .3;
        float zid0 = rid(p.z, zrep);
        p.z = rep(p.z, zrep);

        for (float k = -n; k <= n; k++) {
            float zid = zid0 + k;                 // Neighbor ID
            float a = pitches[int(mod(zid,20.))]; // Neighbor pitch

            // Calculate line start and end points
            float spm = (fract(zid*34.243425)*2.-1.) * smoothstep(0., 1., t/50.)*1.3;
            float x1 = 6. * cos(t*spm + zid*.7 - a*.25);
            float z1 = 6. * sin(t*spm + zid*.7 - a*.25);
            float x2 = 6. * cos(t*spm + zid*.7 + 3.141592 + .25 + a*.25);
            float z2 = 6. * sin(t*spm + zid*.7 + 3.141592 + .25 + a*.25);

            // Add laser
            float l = line(p - vec3(0,0,k*zrep*2.), vec3(x1, z1, 0), vec3(x2, z2, 0), sin(t+zid)*.02-.01+a*.1);
            g += (cos(zid*.2+t + a*3. + vec3(0,1,2))+1.) * light(l, a*2., 20.,2.);
            scene = min(scene, l);
        }

        d += scene;

        if (d > ITERATIONS*.7) break;
    }

    O.rgb = pow(g, vec3(.5));
}
