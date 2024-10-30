// https://www.shadertoy.com/view/lXXyDM
#define PI 3.14159265359
#define TWO_PI 6.28318530718

#define TENTACLES 8.0
#define FLOATERS 12
#define SPIKES 8.0

float getFFT(float f) {
    return texture(iChannel0, vec2(f, 0.0)).r;
}

float smoothFFT(float f, float s) {
    float r = getFFT(f);
    r = pow(r, 2.5);
    return mix(r, 0.5, s);
}

// credits: https://github.com/hughsk/glsl-hsv2rgb/blob/master/index.glsl
vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float sdTentacle(vec2 p, float l, float a, float i) {
    p = vec2(p.x * cos(a) + p.y * sin(a), 
             -p.x * sin(a) + p.y * cos(a));
    
    float w = i * sin(p.y * 10.0 + iTime * 5.0);
    p.x -= w;
    
    float t = mix(0.03, 0.001, clamp(p.y / l, 0.0, 1.0));
    
    return length(vec2(p.x, max(0.0, p.y))) - t;
}

float sdJellyfish(vec2 p, float r, float t, float w) {
    float a = atan(p.y, p.x);
    float l = length(p);
    
    float b = l - r * (1.0 + 0.2 * sin(a * SPIKES + iTime));
    
    float n = 1e10;
    for (int i = 0; i < int(t); i++) {
        float t = float(i) / t;
        float o = TWO_PI * t;
        float x = p.x - (r + 0.2) * cos(o);
        float y = p.y - (r + 0.2) * sin(o);
        float g = 0.4 + 0.3 * sin(iTime * 2.0 + t * TWO_PI);
        n = min(n, sdTentacle(vec2(x, y), g, o, w));
    }
    
    return min(b, n);
}

vec2 rotate2D(vec2 p, float a) {
    float s = sin(a);
    float c = cos(a);
    
    return vec2(p.x * c - p.y * s, p.x * s + p.y * c);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    
    float bF = smoothFFT(0.1, 0.5);
    float mF = smoothFFT(0.2, 0.3);
    float hF = smoothFFT(0.5, 0.3);
    
    float r = 0.2 + 0.4 * bF;
    float t = TENTACLES;
    vec2 s = vec2(0.2 * cos(iTime * 0.5), 0.1 * sin(iTime * 0.7));
    float w = 0.05 + 0.1 * bF;
    
    uv = rotate2D(uv, iTime * 0.1);
    
    float j = sdJellyfish(uv - s, r, t, w);
    
    vec3 col = vec3(0.0);
    if (j < 0.0) {
        float p = 0.5 + 0.5 * sin(iTime * 5.0 + uv.y * 10.0);
        vec3 c = hsv2rgb(vec3(
            fract(iTime * 0.1 + hF * 2.0),
            0.7 + 0.3 * mF,
            0.6 + 0.4 * p * bF
        ));
        
        col = c * (1.0 - smoothstep(-0.01, 0.01, j));
    }
    
    vec2 bgUV = uv * 0.5 - 0.1 * vec2(cos(iTime * 0.2), sin(iTime * 0.3));
    float bgNoise = fract(sin(dot(bgUV, vec2(12.9898, 78.233))) * 43758.5453);
    vec3 bgColor = hsv2rgb(vec3(
        fract(0.7 + iTime * 0.02 + bF * 0.1),
        0.5,
        0.1 + 0.05 * bgNoise + 0.05 * bF
    ));
    
    col = mix(bgColor, col, smoothstep(0.0, 0.01, -j));
    
    col += 0.05 * vec3(0.2, 0.5, 1.0) / (abs(j) + 0.1);
    
    float v = 1.0 - smoothstep(0.5, 1.5, length(uv));
    col *= v;
    
    for (int i = 0; i < FLOATERS; i++) {
        vec2 fS = vec2(
            sin(iTime * (0.1 + float(i) * 0.05) + float(i)),
            mod(1.5 - iTime * (0.1 + float(i) * 0.05) + float(i), 3.0) - 1.5
        );
        
        float l = 0.01 + 0.005 * sin(iTime + float(i)) + 0.005 * bF;
        float f = length(uv - fS) - l;
        col += vec3(0.2, 0.5, 1.0) * (1.0 - smoothstep(0.0, 0.005, f)) * 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}