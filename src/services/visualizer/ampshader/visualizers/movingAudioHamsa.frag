// https://www.shadertoy.com/view/s3BSRK
// Combined Shader: Endless Hamsa Tunnel with Stars
// Based on "Hamsa" by noztol: https://www.shadertoy.com/view/sX2XDw
// Example on YT: https://www.youtube.com/watch?v=_pVpcLFoYb4

#define PI              3.141592654
#define TAU             (2.0*PI)
#define TIME            iTime*1.4
#define TTIME           (TAU*TIME)
#define RESOLUTION      iResolution
#define ROT(a)          mat2(cos(a), sin(a), -sin(a), cos(a))
#define BPM             150.0

const vec3 std_gamma = vec3(2.2);

float g_th = 0.0;
float g_hf = 0.0;

// MIT Licensed hash From Dave_Hoskins (https://www.shadertoy.com/view/4djSRW)
vec3 hash33(vec3 p)
{
    p = fract(p * vec3(443.8975,397.2973, 491.1871));
    p += dot(p.zxy, p.yxz+19.27);
    return fract(vec3(p.x * p.y, p.z*p.x, p.y*p.z));
}

// Starfield generator
vec3 stars(in vec3 p)
{
    vec3 c = vec3(0.);
    float res = iResolution.x*0.8;
    
    for (float i=0.;i<4.;i++)
    {
        vec3 q = fract(p*(.15*res))-0.5;
        vec3 id = floor(p*(.15*res));
        vec2 rn = hash33(id).xy;
        float c2 = 1.-smoothstep(0.,.6,length(q));
        c2 *= step(rn.x,.0005+i*i*0.001);
        c += c2*(mix(vec3(1.0,0.49,0.1),vec3(0.75,0.9,1.),rn.y)*0.25+0.75);
        p *= 1.4;
    }
    return c*c*.65;
}

// Smooth minimum for organic blending
float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

// Distance field capsule helper
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h) - r;
}

float hash(float co) {
    return fract(sin(co * 12.9898) * 13758.5453);
}

vec4 alphaBlend(vec4 back, vec4 front) {
    float w = front.w + back.w * (1.0 - front.w);
    vec3 xyz = (front.xyz * front.w + back.xyz * back.w * (1.0 - front.w)) / w;
    return w > 0.0 ? vec4(xyz, w) : vec4(0.0);
}

vec3 alphaBlend(vec3 back, vec4 front) {
    return mix(back, front.xyz, front.w);
}

float tanh_approx(float x) {
    float x2 = x * x;
    return clamp(x * (27.0 + x2) / (27.0 + 9.0 * x2), -1.0, 1.0);
}

float hamsaSDF(vec2 p) {
    p.y -= 0.25; 
    p.x = abs(p.x); 
    
    // Middle finger
    float d = sdCapsule(p, vec2(0.0, -0.2), vec2(0.0, 0.55), 0.09);
    
    // Ring/Index finger
    d = smin(d, sdCapsule(p, vec2(0.2, -0.2), vec2(0.22, 0.45), 0.08), 0.04);
    
    // Outer thumb (Shark Fin Shape)
    vec2 finTip = vec2(0.55, -0.05); 
    float topEdge = sdCapsule(p, vec2(0.25, -0.15), finTip, 0.06);
    float bottomEdge = sdCapsule(p, finTip, vec2(0.25, -0.45), 0.06);
    
    float thumb = smin(topEdge, bottomEdge, 0.12);
    d = smin(d, thumb, 0.06);
    
    // Curved Oval Palm Base
    d = smin(d, length(p - vec2(0.0, -0.25)) - 0.35, 0.1);
    
    return d;
}

float eyeSDF(vec2 p, out float pupil, float bass, float timeOffset) {
    float blink = pow(max(0.0, sin((TIME + timeOffset) * 0.8)), 50.0);
    blink = clamp(blink + bass * 0.1, 0.0, 1.0);
    
    float halfW = 0.22;
    float offset = 0.18;
    float r = sqrt(halfW * halfW + offset * offset);
    float d1 = length(p - vec2(0.0, offset)) - r;
    float d2 = length(p + vec2(0.0, offset)) - r;
    float eyeOpen = max(d1, d2);
    
    float eyeClosed = sdCapsule(p, vec2(-0.22, 0.0), vec2(0.22, 0.0), 0.002);
    float lens = mix(eyeOpen, eyeClosed, blink);
    
    pupil = length(p) - (0.07 + bass * 0.03);
    pupil = max(pupil, lens); 
    
    return lens;
}

vec3 offset(float z) {
    float a = z;
    vec2 p = -0.05 * (vec2(cos(a), sin(a * sqrt(2.0))) + vec2(cos(a * sqrt(0.75)), sin(a * sqrt(0.5))));
    return vec3(p, z);
}

vec3 doffset(float z) {
    float eps = 0.1;
    return 0.5 * (offset(z + eps) - offset(z - eps)) / eps;
}

vec3 ddoffset(float z) {
    float eps = 0.1;
    return 0.125 * (doffset(z + eps) - doffset(z - eps)) / eps;
}

// Layer Composition
vec4 planeHamsa(vec3 ro, vec3 rd, vec3 pp, vec3 off, float aa, float n) {
    float h = hash(n + 1234.4);
    
    float s = mix(1.1, 1.4, h); 

    vec2 p = (pp - off * vec3(1.0, 1.0, 0.0)).xy;
    p *= ROT(0.1 * mix(-1.0, 1.0, h)); 
    p /= s;

    float audioBass = texture(iChannel0, vec2(0.05, 0.25)).x;
    float audioMid  = texture(iChannel0, vec2(0.40, 0.25)).x;

    float dHamsa = hamsaSDF(p);
    float dPupil;
    
    float dEye = eyeSDF(p, dPupil, audioBass, h * 100.0);

    // Dynamic audio wave distortion wrapped around the eye center
    vec2 rotCenter = vec2(0.0, 0.0); 
    vec2 pUV = p - rotCenter;
    pUV.x = abs(pUV.x); 
    float angle = atan(pUV.x, pUV.y);
    float normAngle = angle / 3.14159265359;
    float wave = texture(iChannel0, vec2(normAngle, 0.75)).x - 0.5;
    float waveDistortion = wave * 0.08;

    // Color Palettes
    vec3 hamsaColor = vec3(0.3, 0.6, 1.0); // Neon Blue
    vec3 eyeColor   = vec3(1.0, 0.2, 0.8); // Neon Pink
    vec3 pupilColor = vec3(1.0, 0.9, 0.2); // Gold/Yellow

    // Compute concentric energy lines inside hand
    float lineFreq = 40.0;
    float lines = abs(cos((dHamsa + waveDistortion) * lineFreq));
    float baseGlow = 0.012 / (lines + 0.01);
    float layerGlow = baseGlow * 0.7;

    // Mask outlines so they slice out holes for the camera to look through
    layerGlow *= smoothstep(0.01, -0.01, dHamsa);
    float eyeMask = smoothstep(0.05, -0.01, dEye);
    layerGlow *= (1.0 - eyeMask);

    float hamsaOutline = 0.012 / (abs(dHamsa) + 0.002);
    float eyeOutline   = 0.009 / (abs(dEye) + 0.001);
    float pupilOutline = 0.009 / (abs(dPupil) + 0.001);

    float pulse = 1.0 + audioBass * 0.4 + 0.1 * sin(TIME * 2.0);

    // Combine neon colored emissions
    vec3 finalLayerCol = vec3(0.);
    finalLayerCol += hamsaColor * layerGlow * (1.2 + audioMid * 0.8);
    finalLayerCol += hamsaColor * hamsaOutline * pulse;
    finalLayerCol += eyeColor   * eyeOutline * pulse;
    finalLayerCol += pupilColor * pupilOutline * pulse;

    // Set transparency threshold
    float totalAlpha = smoothstep(aa, -aa, dHamsa) * 0.9;
    float pupilMask = smoothstep(aa, -aa, dPupil);
    totalAlpha = max(totalAlpha, smoothstep(aa, -aa, dEye));
    totalAlpha *= (1.0 - pupilMask * 0.95); 

    return vec4(finalLayerCol, totalAlpha);
}

vec3 skyColor(vec3 ro, vec3 rd) {
    float ld = max(dot(rd, vec3(0.0, 0.0, 1.0)), 0.0);
    vec3 baseSky = vec3(0.04, 0.01, 0.08) * (pow(ld, 20.0)) + vec3(0.008, 0.003, 0.015);
    
    // Mix the star layer onto the background sky
    return baseSky + stars(rd);
}

vec3 color(vec3 ww, vec3 uu, vec3 vv, vec3 ro, vec2 p) {
    float lp = length(p);
    vec2 np = p + 1.0 / RESOLUTION.xy;
    float rdd = (1.0 + 0.15 * lp * tanh_approx(lp));
    vec3 rd = normalize(p.x * uu + p.y * vv + rdd * ww);
    vec3 nrd = normalize(np.x * uu + np.y * vv + rdd * ww);

    const float planeDist = 0.7; 
    const int furthest = 6;
    const int fadeFrom = 3;
    float fadeDist = planeDist * float(furthest - fadeFrom);
    float nz = floor(ro.z / planeDist);

    vec3 skyCol = skyColor(ro, rd);
    vec4 acol = vec4(0.0);
    const float cutOff = 0.99;
    
    for (int i = 1; i <= furthest; ++i) {
        float pz = planeDist * nz + planeDist * float(i);
        float pd = (pz - ro.z) / rd.z;

        if (pd > 0.0 && acol.w < cutOff) {
            vec3 pp = ro + rd * pd;
            vec3 npp = ro + nrd * pd;
            float aa = 3.0 * length(pp - npp);

            vec3 off = offset(pp.z);
            vec4 pcol = planeHamsa(ro, rd, pp, off, aa, nz + float(i));

            float depthZ = pp.z - ro.z;
            float fadeIn = exp(-1.2 * max((depthZ - planeDist * float(fadeFrom)) / fadeDist, 0.0));
            float fadeOut = smoothstep(0.0, planeDist * 0.15, depthZ);
            
            pcol.xyz = mix(skyCol, pcol.xyz, fadeIn);
            pcol.w *= fadeOut;
            pcol = clamp(pcol, 0.0, 1.0);

            acol = alphaBlend(pcol, acol);
        } else {
            break;
        }
    }

    return alphaBlend(skyCol, acol);
}

vec3 postProcess(vec3 col, vec2 q) {
    col = clamp(col, 0.0, 1.0);
    col = pow(col, 1.0 / std_gamma);
    col = col * 0.55 + 0.45 * col * col * (3.0 - 2.0 * col);
    col *= 0.4 + 0.6 * pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.6); 
    return col;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 q = fragCoord / RESOLUTION.xy;
    vec2 p = -1. + 2. * q;
    p.x *= RESOLUTION.x / RESOLUTION.y;

    float tm  = TIME * 0.25; 
    vec3 ro   = offset(tm);
    vec3 dro  = doffset(tm);
    vec3 ddro = ddoffset(tm);

    vec3 ww = normalize(dro);
    vec3 uu = normalize(cross(normalize(vec3(0.0, 1.0, 0.0) + ddro), ww));
    vec3 vv = normalize(cross(ww, uu));

    vec3 col = color(ww, uu, vv, ro, p);
    col = postProcess(col, q);

    fragColor = vec4(col, 1.0);
}