// https://www.shadertoy.com/view/NfSXDc
// PAEz
// Variation from mosaic fractal circles by nayk
mat2 rot(float a) {
    return mat2(cos(a), -sin(a), sin(a), cos(a));
}

void mainImage(out vec4 O, vec2 F) {
    float T = iTime * 0.25;
    float a = 0.0;
    float r = 0.0;
    float t = iTime * 0.30;
    
    O = vec4(0.0);
    
    for (int iter = 0; iter < 70; iter++) {
        vec3 i = iResolution;
        vec3 p = r * normalize(vec3((F + F - i.xy) / i.y, 0.5));

        p.z -= 7.5;
        
        p.xz *= rot(t);
        p.yz *= rot(t * 0.5);
        
        // Cosmic Web folding
        for(int j = 0; j < 7; j++) {
            p = abs(p) - 0.7;
            p.xy *= rot(0.785 + T * 0.3);
            p.xz *= rot(3.5 + T * 0.25);
        }
        
        // Polar rep
        p.xy *= rot(round(atan(p.x, p.y) * 8.0) / 3.0);
            
        // Stardust Color & Audio Mapping
        float dist = length(p);
        dist = clamp(dist, 0.0, 1.0);
        
        float glow = texture(iChannel0, vec2(mod(1.1-dist,1.0), 0.0)).r;

        glow=0.00+pow(glow,4.0)*0.5;

        vec4 pal = 0.5 + 0.5 * cos(a * 0.05 + t + vec4(4.0, 2.0, 1.0, 0.0));
        
        // Mapping glow to intensity
        O += (0.35 * glow) * smoothstep(.0, 1.0, dist) * pal / (length(p.xy) + 0.01);
             
        // Gravitational lensing distortion
        p += normalize(p) * sin(length(p) * 20.0 - T * 3.0) * 0.01;
        
        float d1 = length(p.xy) - 0.1;
        float d2 = length(p.yz) - 0.1;
        
        r += min(d1, d2) * 0.5 + 0.06;
        a += 1.0;
    } 
    
    O = tanh(pow(O, vec4(1.5)));
}