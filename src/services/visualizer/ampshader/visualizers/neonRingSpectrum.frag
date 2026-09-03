// https://www.shadertoy.com/view/f3jSDV
// ============ NEON RING SPECTRUM ============
// iChannel0 = audio (music / soundcloud / mic)
// Single pass — paste into the Image tab.
// MIT License
// Enjoy

#define PI 3.14159265
#define NUM_BARS   90.0   // radial LED spikes around the circle
#define RING_R     0.30   // radius of the main neon ring
#define BAR_BASE   0.365  // where the spikes start
#define BAR_MAX    0.22   // max spike length
#define DASH_SIZE  0.016  // LED dash spacing along each spike

// Cyan -> blue -> purple -> pink, like the reference
vec3 palette(float t) {
    t = fract(t);
    vec3 cyan = vec3(0.10, 0.95, 1.00);
    vec3 blue = vec3(0.25, 0.40, 1.00);
    vec3 purp = vec3(0.65, 0.25, 1.00);
    vec3 pink = vec3(1.00, 0.30, 0.85);
    if (t < 0.3333) return mix(cyan, blue, t * 3.0);
    if (t < 0.6666) return mix(blue, purp, (t - 0.3333) * 3.0);
    return  mix(purp, pink, (t - 0.6666) * 3.0);
}

float getAudio(float fx) {
    float a = textureLod(iChannel0, vec2(fx, 0.25), 0.0).x;
    // Fallback animation when no audio is playing
    if (a < 0.01)
        a = (sin(iTime*3.0 + fx*25.0)*0.5+0.5) *
            (sin(iTime*1.3 + fx*7.0 )*0.5+0.5) * 0.8;
    return a;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    float r   = length(uv);
    float ang = atan(uv.y, uv.x);
    float a01 = ang / (2.0 * PI) + 0.5;          // 0..1 around the circle

    // Color rotates slowly so the gradient drifts around the ring, i hope
    float hueT = fract(a01 + 0.15 + iTime * 0.02);
    vec3  hue  = palette(hueT);

    // Bass makes the whole ring breathe slightly
    float bass = getAudio(0.05);
    float r0 = RING_R + bass * bass * 0.015;

    vec3 col = vec3(0.02, 0.015, 0.05); // deep navy background

    // ---------- RADIAL LED SPIKES ----------
    float sector = floor(a01 * NUM_BARS);
    // Mirror the spectrum so bass sits at the bottom, symmetric left/right
    float fx = abs(fract(sector / NUM_BARS + 0.25) * 2.0 - 1.0);
    float audio = getAudio(fx * 0.7);
    audio = audio * audio * 1.4;

    float barLen = 0.025 + audio * BAR_MAX;

    // Thin bar within each angular sector
    float f = fract(a01 * NUM_BARS);
    float angMask = smoothstep(0.18, 0.34, f) * smoothstep(0.82, 0.66, f);

    // Inside the spike's radial span?
    float inBar = step(BAR_BASE, r) * step(r, BAR_BASE + barLen);

    // Chop the spike into little LED dashes
    float d = fract((r - BAR_BASE) / DASH_SIZE);
    float dashMask = smoothstep(0.15, 0.35, d) * smoothstep(0.95, 0.75, d);

    // Fade toward the tip
    float tipFade = 1.0 - smoothstep(BAR_BASE, BAR_BASE + barLen, r) * 0.55;

    col += hue * angMask * inBar * dashMask * tipFade * 1.6;

    // Faint base glow where the spikes are rooted
    col += hue * angMask * exp(-max(r - BAR_BASE, 0.0) * 30.0)
               * step(BAR_BASE, r) * 0.15;

    // ---------- MAIN NEON RING ----------
    float d0 = abs(r - r0);
    col += hue * (exp(-d0 * 110.0) * 1.6    // hot core
                + exp(-d0 * 14.0)  * 0.30); // soft outer glow

    // ---------- BRIGHT SWEEPING ARC ----------
    // A thicker, brighter arc (~30% of the circle) that slowly orbits
    float arcA = fract(a01 - iTime * 0.06);
    float arcMask = smoothstep(0.00, 0.06, arcA) * smoothstep(0.32, 0.24, arcA);
    float d1 = abs(r - (r0 + 0.028));
    vec3 arcCol = mix(hue, vec3(1.0), 0.35);
    col += arcCol * arcMask * (exp(-d1 * 80.0) * 2.2
                             + exp(-d1 * 16.0) * 0.35);

    // ---------- INNER TICK RING ----------
    // Subtle dotted ring just inside the main one
    float tick = smoothstep(0.25, 0.4, abs(fract(a01 * NUM_BARS) - 0.5));
    float d2 = abs(r - (r0 - 0.045));
    col += hue * (1.0 - tick) * exp(-d2 * 160.0) * 0.5;

    // ---------- FINISH ----------
    col *= 1.0 - dot(uv, uv) * 0.55;      // vignette, why not
    fragColor = vec4(sqrt(max(col, 0.0)), 1.0); // gamma
}
