// https://www.shadertoy.com/view/4f2fWD
/*
"Hilbert Color" Visualizer by: SED4906 - 2024-08-29
Based on https://www.shadertoy.com/view/ftVSWD
and...

2D LED Spectrum - Visualiser
Based on Led Spectrum Analyser by: simesgreen - 27th February, 2013 https://www.shadertoy.com/view/Msl3zr
2D LED Spectrum by: uNiversal - 27th May, 2015
Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
*/

const vec3 offsets[8] = vec3[8](
vec3(0,0,0), // 000
vec3(1,0,0), // 001
vec3(1,1,0), // 011
vec3(0,1,0), // 010
vec3(0,1,1), // 110
vec3(1,1,1), // 111
vec3(1,0,1), // 101
vec3(0,0,1)  // 100
);

vec3 HilbertColor(float c) {
    vec3 coord = vec3(0);
    
    float gray = c;
    int iters = 1;
    while (gray != 0.0) {
        int index = int(gray * 8.0) % 8;
        coord += offsets[index] / float(1 << iters);
        iters++;
        gray = fract(gray * 8.0);
    }
    
    return coord;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // create pixel coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;

    vec2 p;
    p.x = uv.x;
    p.y = uv.y;

    // read frequency data from first row of texture
    float fft  = texture( iChannel0, vec2(p.x,0.0) ).x;

    // led color
    vec3 color = HilbertColor(fft);

    // mask for bar graph
    float mask = (p.y < fft) ? p.y : 0.1;
    if (abs(p.y - fft) < 0.025) {
        mask = 1.0;
    }

    vec3 barColor = color*mask;

    // output final color
    fragColor = vec4(barColor, 1.0);
}
