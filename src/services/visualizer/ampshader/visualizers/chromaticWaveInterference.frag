// https://www.shadertoy.com/view/WcdyRj
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    float t = iTime * 0.5;

    // ==== MUCH STRONGER AUDIO (MEDIUM MODE) ===============================
    float bass   = texture(iChannel0, vec2(0.10, 0.0)).x;
    float mid    = texture(iChannel0, vec2(0.50, 0.0)).x;
    float treble = texture(iChannel0, vec2(0.90, 0.0)).x;

    // Boost response so you can SEE the change
    bass   = pow(bass,   1.1) * 2.8;
    mid    = pow(mid,    1.1) * 2.3;
    treble = pow(treble, 1.1) * 2.5;

    float audioMix = (bass + mid + treble) / 3.0;
    // =======================================================================

    // Wave centers (unchanged)
    vec2 center1 = vec2(sin(t * 1.1) * 0.5, cos(t * 0.9) * 0.3);
    vec2 center2 = vec2(cos(t * 0.7) * 0.4, sin(t * 1.3) * 0.4);
    vec2 center3 = vec2(sin(t * 0.5) * 0.3, cos(t * 0.6) * 0.5);
    
    float dist1 = length(uv - center1);
    float dist2 = length(uv - center2);
    float dist3 = length(uv - center3);

    float wave1 = sin(dist1 * 20.0 - t * 4.0) * 0.5;
    float wave2 = sin(dist2 * 15.0 - t * 3.0) * 0.5;
    float wave3 = sin(dist3 * 25.0 - t * 5.0) * 0.3;

    float combined = wave1 + wave2 + wave3;

    float noise = sin(uv.x * 50.0 + t) * sin(uv.y * 50.0 - t) * 0.1;
    combined += noise;

    float height = combined * 0.5 + 0.5;

    // ==== AUDIO-REACTIVE COLOR SHIFT (MEDIUM INTENSITY) ====================
    vec3 deepColor = vec3(0.12 + bass * 0.20,
                          0.05 + mid  * 0.10,
                          0.22 + treble * 0.25);

    vec3 midColor  = vec3(0.0  + bass * 0.05,
                          0.3  + mid  * 0.30,
                          0.5  + treble * 0.40);

    vec3 peakColor = vec3(0.0,
                          0.8 + mid    * 0.45,
                          0.9 + treble * 0.80);

    vec3 color;

    if (height < 0.5) {
        color = mix(deepColor, midColor, height * 2.0);
    } else {
        color = mix(midColor, peakColor, (height - 0.5) * 2.0);
    }
    // =======================================================================

    // Metallic highlights — now visibly beat-reactive
    float highlight = pow(max(0.0, combined), 2.0);
    color += vec3(1.0, 0.8, 0.6)
           * highlight
           * (0.5 + treble * 0.9 + bass * 0.4);

    // Extra shimmer tied to audio spectrum (MEDIUM MODE)
    float shimmer = sin(t * 8.0 + uv.x * 20.0 + uv.y * 15.0);
    color += shimmer * 0.08 * audioMix;

    // Edge fade
    float edgeFade = 1.0 - smoothstep(0.6, 0.9, length(uv));
    color *= edgeFade;

    // Vignette
    float vignette = 1.0 - length(uv) * 0.3;
    color *= vignette;

    // Audio pulse (stronger)
    color *= (1.0 + bass * 0.5);

    fragColor = vec4(color, 1.0);
}
