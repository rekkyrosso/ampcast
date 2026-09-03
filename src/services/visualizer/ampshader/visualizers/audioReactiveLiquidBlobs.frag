// https://www.shadertoy.com/view/3c3fDr
// Audio Reactive Liquid Blobs
// iChannel0 = Music
 

#define PI 3.1415926
#define TAU 6.283185

// Smooth minimum for blob merging
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Blob positions - orbiting patterns
vec2 blobPos(float id, float t, float bass, float mid) {
    float angle = id * 2.399 + t * (0.3 + id * 0.1); // golden angle offset
    float radius = 0.3 + 0.4 * sin(id * 1.7 + t * 0.5 + bass * 2.0);
    radius *= 1.0 + mid * 0.3;
    return vec2(cos(angle), sin(angle)) * radius;
}

void mainImage(out vec4 O, in vec2 I) {
    vec2 R = iResolution.xy;
    vec2 uv = (I * 2.0 - R) / R.y;
    float T = mod(iTime, 1000.0);
    
    // Audio
    float bass = texture(iChannel0, vec2(0.05, 0.0)).r;
    float mid = texture(iChannel0, vec2(0.25, 0.0)).r;
    float high = texture(iChannel0, vec2(0.55, 0.0)).r;
    float treble = texture(iChannel0, vec2(0.8, 0.0)).r;
    float energy = (bass + mid + high) / 3.0;
    
    // Blob field
    float d = 1000.0;
    float glow = 0.0;
    float colorMix = 0.0;
    
    // Smoothness increases with bass
    float smoothness = 0.4 + bass * 0.3;
    
    // Central blob - pulses with bass
    float d0 = length(uv) - (0.15 + bass * 0.2);
    d = d0;
    
    // Orbiting blobs
    for(float i = 0.0; i < 8.0; i++) {
        vec2 pos = blobPos(i, T, bass, mid);
        
        // Size varies per blob and with audio
        float size = 0.08 + 0.06 * sin(i * 2.3 + T) + high * 0.05;
        size *= 1.0 + bass * 0.4;
        
        float di = length(uv - pos) - size;
        
        // Track closest for color mixing
        colorMix += exp(-di * 8.0) * (i / 8.0);
        
        // Smooth merge
        d = smin(d, di, smoothness);
        
        // Glow accumulation
        glow += 0.02 / (abs(di) + 0.02);
    }
    
    // Secondary ring of smaller blobs
    for(float i = 0.0; i < 6.0; i++) {
        float angle = i * TAU / 6.0 + T * 0.7 + mid;
        float radius = 0.7 + 0.15 * sin(T + i * 2.0);
        vec2 pos = vec2(cos(angle), sin(angle)) * radius;
        
        float size = 0.04 + treble * 0.03;
        float di = length(uv - pos) - size;
        
        d = smin(d, di, smoothness * 0.7);
        glow += 0.01 / (abs(di) + 0.02);
    }
    
    // Liquid surface
    float surface = smoothstep(0.02, -0.02, d);
    
    // Internal gradient for depth
    float interior = smoothstep(0.1, -0.3, d);
    
    // Edge highlight
    float edge = smoothstep(0.03, 0.0, abs(d)) * 0.7;
    
    // Fresnel-like rim
    float rim = smoothstep(-0.15, 0.0, d) * smoothstep(0.02, -0.01, d);
    
    // Color palette - deep liquid colors
    vec3 deepCol = vec3(0.02, 0.04, 0.12); // deep blue-black
    vec3 midCol = vec3(0.1, 0.2, 0.5) + vec3(0.3, 0.1, 0.0) * bass; // blue shifting to purple on bass
    vec3 surfaceCol = vec3(0.3, 0.5, 0.9) + vec3(0.4, 0.2, -0.2) * energy; // bright surface
    vec3 highlightCol = vec3(0.9, 0.95, 1.0); // white highlight
    
    // Build up color
    vec3 col = deepCol;
    
    // Interior gradient
    col = mix(col, midCol, interior);
    col = mix(col, surfaceCol, surface * 0.7);
    
    // Rim lighting
    col += highlightCol * rim * 0.6;
    col += highlightCol * edge * (0.4 + high * 0.4);
    
    // Subsurface glow
    vec3 glowCol = mix(vec3(0.2, 0.4, 1.0), vec3(1.0, 0.4, 0.6), colorMix + bass * 0.3);
    col += glowCol * glow * 0.15 * (1.0 + energy);
    
    // Outer glow / atmosphere
    float outerGlow = exp(-length(uv) * 1.5) * (0.3 + bass * 0.3);
    col += vec3(0.1, 0.15, 0.3) * outerGlow;
    
    // Specular highlights - fake reflection
    vec2 lightDir = normalize(vec2(0.5, 0.7));
    for(float i = 0.0; i < 5.0; i++) {
        vec2 pos = blobPos(i, T, bass, mid);
        float size = 0.08 + 0.06 * sin(i * 2.3 + T) + high * 0.05;
        size *= 1.0 + bass * 0.4;
        
        vec2 toLight = uv - pos + lightDir * size * 0.6;
        float spec = exp(-length(toLight) * 15.0 / size);
        col += highlightCol * spec * surface * 0.5;
    }
    
    // Central specular
    vec2 centerSpec = uv + lightDir * (0.1 + bass * 0.1);
    col += highlightCol * exp(-length(centerSpec) * 8.0) * surface * 0.6;
    
    // Background - subtle gradient
    vec3 bg = mix(vec3(0.01, 0.02, 0.05), vec3(0.05, 0.03, 0.08), length(uv) * 0.5);
    bg += vec3(0.03, 0.02, 0.05) * energy;
    col = mix(bg, col, surface + glow * 0.3);
    
    // Tone mapping
    col = col / (1.0 + col * 0.2);
    col = pow(max(col, 0.0), vec3(0.95));
    
    // Subtle vignette
    col *= 1.0 - length(uv) * 0.2;
    
    O = vec4(col, 1.0);
}
