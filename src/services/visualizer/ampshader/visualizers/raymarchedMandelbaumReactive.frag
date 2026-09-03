// https://www.shadertoy.com/view/s3l3Wl
//
//         _                 _
//        | |               (_)
//     ___| |   ___   ___    _    ___   _ __
//    / __  |  / _ \ / __|  | |  / __| | '_ \
//   | (_|  | |  __/ \__ \  | |  \__ \ | | | |
//    \__,__|  \___| |___/  |_|  |___/ |_| |_|
//
// Raymarched 3D Kandinsky - "Ultra-Smooth Ambient A/V Build"
// Music (iChannel0) | Mic (iChannel1) | Mouse (iMouse)
//
// If you need customization for VJing, art installations or concerts contact me at desisn.com.

/*
Copyright (c) 2026 desisn.com

This shader is licensed under CC BY-NC 4.0.
You may use, copy, modify, and share it for non-commercial purposes only, with attribution.
Commercial use is not allowed unless you obtain prior written permission from desisn.com.
License: https://creativecommons.org/licenses/by-nc/4.0/
Contact for commercial licensing: nils@desisn.com
*/


#define MAX_STEPS 70      
#define MAX_DIST 15.0     
#define SURF_DIST 0.002

// Globals for Volumetrics and Audio
vec3 volGlow = vec3(0.0);
float g_bass = 0.0;
float g_treble = 0.0;
float g_mic = 0.0;

// --- Kandinsky Palette & Material Properties ---
vec3 getKandinsky(float id) {
    float m = fract(id * 0.6180339); 
    if(m < 0.20) return vec3(0.85, 0.10, 0.15); // Crimson Metal
    if(m < 0.40) return vec3(0.10, 0.35, 0.85); // Azure Metal
    if(m < 0.60) return vec3(0.95, 0.80, 0.10); // Solid Gold
    if(m < 0.80) return vec3(0.02, 0.02, 0.02); // Obsidian
    return vec3(0.90, 0.90, 0.92);              // Platinum
}

vec3 getGlowColor(float id) {
    float m = fract(id * 0.6180339); 
    if(m < 0.3) return vec3(1.0, 0.2, 0.0) * 2.0; 
    if(m < 0.6) return vec3(0.0, 0.8, 1.0) * 2.0; 
    return vec3(1.0, 0.8, 0.0) * 2.0;             
}

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}
float smax(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(a, b, h) + k * h * (1.0 - h);
}

// --- 3D Signed Distance Field (SDF) ---
vec2 map(vec3 pos) {
    // Ultra-low bound expansion to match the subtle movement
    float boundsDist = abs(pos.y) - (1.0 + g_bass * 0.05); 
    if (boundsDist > 0.1) return vec2(boundsDist, 0.0);

    vec2 p = pos.xz;
    
    // Treble jitter practically removed, leaving just a hint of atmospheric spin
    float ttm = cos(sin(iTime/8.0))*6.2831 + (g_treble * 0.03); 
    p *= mat2(cos(ttm), sin(ttm), -sin(ttm), cos(ttm));
    p -= vec2(cos(iTime/2.0)/2.0, sin(iTime/3.0)/5.0);
    
    // Barely noticeable zoom pulse
    float zm = (15.0 + sin(iTime/7.0)*5.0) - (g_bass * 0.1); 
    vec2 cc = vec2(-0.57735 + 0.004, 0.57735) + p/zm;

    vec2 z = vec2(0), dz = vec2(0);
    
    const int iter = 24; 
    int ik = iter; 
    
    for(int k=0; k<iter; k++){
        dz = mat2(z, -z.y, z.x)*dz*2.0 + vec2(1, 0); 
        z =  mat2(z, -z.y, z.x)*z + cc;
        if(dot(z, z) > 100.0){ ik = k; break; }
    }
    
    float d2 = sqrt(1.0/max(length(dz), 0.0001)) * log(dot(z, z)) * zm * 0.05;
    
    // Very subtle breathing extrusion
    float heightExtrusion = 0.05 + float(ik) * (0.02 + g_bass * 0.004); 
    
    vec2 w = vec2(d2 - 0.15, abs(pos.y) - heightExtrusion);
    float d3 = min(max(w.x, w.y), 0.0) + length(max(w, 0.0));
    
    vec2 tuv = z/150.0; 
    float tm = (-ttm*8.0);
    tuv *= mat2(cos(tm), sin(tm), -sin(tm), cos(tm));
    tuv = mod(tuv, 1.0/8.0) - 1.0/16.0; 
    
    float shapeID = mod(float(ik), 4.0);
    float patDist = 1.0;
    
    if (shapeID < 1.0) {
        float r = length(tuv); patDist = min(abs(r - 1.0/32.0), abs(r - 1.0/16.0));
    } else if (shapeID < 2.0) {
        vec2 tp = tuv; tp.y = -tp.y; patDist = max(abs(tp.x)*0.866 - tp.y*0.5, tp.y);
    } else if (shapeID < 3.0) {
        float l1 = abs(tuv.x * 0.866 + tuv.y * 0.5); float l2 = abs(tuv.x * -0.5 + tuv.y * 0.866 + 0.01);
        patDist = min(l1, l2);
    } else {
        patDist = length(tuv) - 1.0/40.0;
    }
    
    float carveDist = patDist * zm * 1.5 - 0.04;
    d3 = smax(d3, -carveDist, 0.05); 
    
    return vec2(d3 * 0.6, float(ik)); 
}

// --- Normal Calculation ---
vec3 calcNormal(vec3 p) {
    vec2 e = vec2(0.002, 0.0);
    return normalize(vec3(
        map(p + e.xyy).x - map(p - e.xyy).x,
        map(p + e.yxy).x - map(p - e.yxy).x,
        map(p + e.yyx).x - map(p - e.yyx).x
    ));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // --- AUDIO SAMPLING (Ultra-Smoothed) ---
    // Average 5 low-frequency bins to fully round out harsh drum transients
    g_bass = (texture(iChannel0, vec2(0.01, 0.25)).x + 
              texture(iChannel0, vec2(0.02, 0.25)).x + 
              texture(iChannel0, vec2(0.03, 0.25)).x + 
              texture(iChannel0, vec2(0.04, 0.25)).x + 
              texture(iChannel0, vec2(0.05, 0.25)).x) * 0.2;
              
    g_treble = texture(iChannel0, vec2(0.80, 0.25)).x;
    g_mic    = texture(iChannel0, vec2(0.10, 0.25)).x; 

    // --- MOUSE CONTROL ---
    float camRadius = 2.0;
    float rotYaw = iTime * 0.2; 
    float rotPitch = 0.5;
    
    if(iMouse.z > 0.0) {
        vec2 m = iMouse.xy / iResolution.xy;
        rotYaw = (m.x - 0.5) * 6.28; 
        rotPitch = (m.y - 0.5) * 3.14 + 0.5; 
    }
    
    // Micro-bounce for the camera
    vec3 ro = vec3(
        sin(rotYaw) * camRadius, 
        1.0 + rotPitch + (g_bass * 0.005), 
        cos(rotYaw) * camRadius
    );
    vec3 ta = vec3(0.0, -0.5 + rotPitch, 0.0); 
    
    vec3 cw = normalize(ta - ro);
    vec3 cu = normalize(cross(cw, vec3(0.0, 1.0, 0.0)));
    vec3 cv = cross(cu, cw);
    vec3 rd = normalize(uv.x * cu + uv.y * cv + 1.5 * cw); 

    float t = 0.0;
    float matID = 0.0;
    
    // --- RAYMARCHING ---
    for(int i=0; i<MAX_STEPS; i++) {
        vec3 p = ro + rd * t;
        vec2 res = map(p);
        
        if(res.x < 0.05) {
            // Glow response smoothed out significantly
            float pulse = 1.0 + pow(g_mic, 2.0) * 10.0 + g_bass * 0.5; 
            volGlow += getGlowColor(res.y) * (0.003 / (0.01 + abs(res.x))) * pulse;
        }

        if(res.x < SURF_DIST) { matID = res.y; break; }
        if(t > MAX_DIST) break;
        t += res.x;
    }

    vec3 bgFog = vec3(0.01, 0.01, 0.02); 
    vec3 col = bgFog;

    if (t < MAX_DIST) {
        vec3 p = ro + rd * t;
        vec3 n = calcNormal(p);
        
        vec3 lightPos = vec3(sin(iTime)*3.0, 4.0, cos(iTime)*3.0);
        vec3 l = normalize(lightPos - p);
        vec3 v = normalize(ro - p);
        vec3 h = normalize(l + v);
        vec3 ref = reflect(-v, n); 
        
        float shadow = 1.0;
        if(map(p + l * 0.05).x < 0.01) shadow = 0.1;
        
        vec3 albedo = getKandinsky(matID);
        
        float fresnel = pow(clamp(1.0 - dot(n, v), 0.0, 1.0), 4.0);
        vec3 specColor = mix(albedo, vec3(1.0), fresnel);
        
        vec3 envLight = mix(vec3(0.05, 0.1, 0.2), vec3(1.0, 0.9, 0.8), smoothstep(-0.2, 1.0, ref.y));
        envLight += albedo * max(0.0, -ref.y) * 0.5; 
        
        float specHighlight = pow(max(dot(n, h), 0.0), 64.0) * 3.0; 
        
        vec3 diffuse = albedo * max(dot(n, l), 0.0) * 0.15; 
        vec3 reflection = envLight * specColor * 1.5;        
        
        col = (diffuse + reflection + specHighlight) * shadow;
        
        float ao = clamp(map(p + n * 0.15).x * 6.0, 0.1, 1.0);
        col *= ao;
        
        col = mix(col, bgFog, smoothstep(MAX_DIST * 0.5, MAX_DIST, t));
    }

    col += volGlow * 0.04;
    vec2 q = fragCoord / iResolution.xy;
    col *= pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.3); 
    col = (col * (2.51 * col + 0.03)) / (col * (2.43 * col + 0.59) + 0.14);
    
    fragColor = vec4(col, 1.0);
}