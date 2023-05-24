// https://www.shadertoy.com/view/Mlj3WV
/*
2D LED Spectrum - Visualiser
Based on Led Spectrum Analyser by: simesgreen - 27th February, 2013 https://www.shadertoy.com/view/Msl3zr
2D LED Spectrum by: uNiversal - 27th May, 2015
Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
*/

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // create pixel coordinates
    vec2 uv = fragCoord.xy / iResolution.xy;

    // quantize coordinates
    const float bands = 16.0;
    const float segs = 20.0;
    vec2 p;
    p.x = floor(uv.x*bands)/bands;
    p.y = floor(uv.y*segs)/segs;

    // read frequency data from first row of texture
    float fft  = texture( iChannel0, vec2(p.x,0.0) ).x;

    // led color
    vec3 color = mix(vec3(0.0, 2.0, 0.0), vec3(2.0, 0.0, 0.0), sqrt(uv.y));

    // mask for bar graph
    float mask = (p.y < fft) ? 1.0 : 0.0;

    // led shape
    vec2 d = fract((uv - p) *vec2(bands, segs)) - 0.5;
    float led = smoothstep(0.5, 0.35, abs(d.x)) *
                smoothstep(0.5, 0.35, abs(d.y));
    vec3 ledColor = led*color*mask;

    // output final color
    // fragColor = vec4(ledColor, 1.0); // opaque
    fragColor = vec4(ledColor, 0.0); // transparent
}
