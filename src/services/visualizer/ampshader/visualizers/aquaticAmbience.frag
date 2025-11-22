// https://www.shadertoy.com/view/tXtGzr
// Audio on iChannel0

// Hash & noise (IQ 2D noise)
vec2 hash(vec2 p) { p = vec2(dot(p,vec2(127.1,311.7)), dot(p,vec2(269.5,183.3))); return -1.0 + 2.0*fract(sin(p)*43758.5453123);} 
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f*f*(3.0-2.0*f);
    return mix(mix(dot(hash(i+vec2(0,0)), f - vec2(0,0)), dot(hash(i+vec2(1,0)), f - vec2(1,0)), u.x),
               mix(dot(hash(i+vec2(0,1)), f - vec2(0,1)), dot(hash(i+vec2(1,1)), f - vec2(1,1)), u.x), u.y);
}

// Simple fBm for smooth flow
float fbm(vec2 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v += a*noise(p); p *= 2.0; a *= 0.5;} return v; }

// Smooth palette: water gradient + highlight
vec3 waterPalette(float t){ vec3 c1 = vec3(0.02,0.04,0.1);
    vec3 c2 = vec3(0.0,0.3,0.5);
    vec3 c3 = vec3(0.0,0.6,0.7);
    vec3 c4 = vec3(0.8,0.9,1.0);
    return mix(mix(c1,c2,smoothstep(0.0,0.4,t)), mix(c3,c4,smoothstep(0.6,1.0,t)), smoothstep(0.3,0.8,t)); }

// Draw a stylized fish silhouette (ellipse + fins) at pos
float fish(vec2 uv, vec2 pos, float dir, float scale){
    uv -= pos;
    uv *= mat2(cos(dir), -sin(dir), sin(dir), cos(dir));
    uv *= scale;
    float body = length(uv*vec2(1.2,0.6)) - 0.15;
    float tail = length(uv + vec2(-0.1,0))*0.8 + length(uv + vec2(-0.1,0.07))*0.8 - 0.2;
    return smoothstep(0.02, -0.02, min(body, tail));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= iResolution.x / iResolution.y;
    float time = iTime * 0.3;

    // Audio amplitude for base
    float amp = texture(iChannel0, vec2(uv.x,0.05)).r;

    // Flow field via fBm
    vec2 flow = vec2(fbm(p*1.2 + time), fbm(p*1.2 - time));
    p += flow * 0.1 * amp;

    // Caustic pattern
    float caustic = fbm(p*5.0 + time*2.0) * amp;

    // Base water color + caustics
    vec3 col = waterPalette(length(p)*0.5 + caustic*0.3);

    // Bubbles: 10 randomized circles
    float bubbles = 0.0;
    for(int i=0;i<10;i++){
        float fi = float(i);
        vec2 pos = vec2(fract(sin(fi*12.9898+time*0.5)*43758.5453), fract(cos(fi*78.233+time*0.7)*24634.6345));
        float rad = 0.02 + 0.01 * sin(time + fi);
        float d = length(uv - pos);
        bubbles += smoothstep(rad, rad-0.005, d);
    }
    col = mix(col, vec3(1.0,1.0,1.0), bubbles*amp);

    // Fish silhouettes: 5 fish
    float fishMask = 0.0;
    for(int i=0;i<5;i++){
        float fi = float(i);
        vec2 fpos = vec2(fract(uv.x + fi*0.2 - time*0.05), fract(uv.y + fi*0.3 + time*0.1));
        float dir = sin(time*0.5 + fi);
        fishMask += fish(uv, fpos*2.0-1.0, dir, 0.4);
    }
    col = mix(col, vec3(0.1,0.1,0.15), fishMask*amp);

    fragColor = vec4(col,1.0);
}
