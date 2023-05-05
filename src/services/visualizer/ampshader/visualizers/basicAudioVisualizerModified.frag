// https://www.shadertoy.com/view/DtfSDH
/* Simple audio visualizer by chronos
// Feel free to use any part of the code and/or improve it further
// Drop a link in the comments! :)
//
// Recommended tracks:
// https://soundcloud.com/kubbi/pathfinder
// https://soundcloud.com/wearecastor/rad
// https://soundcloud.com/jco-de/coronoid-soundtrack
//
*/

#define WIDTH 1.0

float audio_freq( in sampler2D channel, in float f) { return texture( channel, vec2(f, 0.25) ).x; }
float audio_ampl( in sampler2D channel, in float t) { return texture( channel, vec2(t, 0.75) ).x; }

vec3 B2_spline(vec3 x) { // returns 3 B-spline functions of degree 2
    vec3 t = 3.0 * x;
    vec3 b0 = step(0.0, t)     * step(0.0, 1.0-t);
	vec3 b1 = step(0.0, t-1.0) * step(0.0, 2.0-t);
	vec3 b2 = step(0.0, t-2.0) * step(0.0, 3.0-t);
	return 0.5 * (
    	b0 * pow(t, vec3(2.0)) +
    	b1 * (-2.0*pow(t, vec3(2.0)) + 6.0*t - 3.0) +
    	b2 * pow(3.0-t,vec3(2.0))
    );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 centered = 2.0 * uv - 1.0;
    centered.x *= iResolution.x / iResolution.y;

    float dist2 = dot(centered, centered);
    float clamped_dist = smoothstep(0.0, 1.0, dist2);
    float arclength    = abs(atan(centered.y, centered.x) / radians(360.0))+0.01;

    // Color variation functions
    float t = iTime / 100.0;
    float polychrome = (1.0 + sin(t*10.0))/2.0; // 0 -> uniform color, 1 -> full spectrum
    vec3 spline_args = fract(vec3(polychrome*uv.x-t) + vec3(0.0, -1.0/3.0, -2.0/3.0));
    vec3 spline = B2_spline(spline_args);

    float f = abs(centered.y);
    vec3 base_color  = vec3(1.0, 1.0, 1.0) - f*spline;
    vec3 flame_color = pow(base_color, vec3(3.0));
    vec3 disc_color  = 0.20 * base_color;
    vec3 wave_color  = 0.10 * base_color;
    vec3 flash_color = 0.05 * base_color;

    float sample1 = audio_freq(iChannel0, abs((uv.x - .5) / WIDTH) + 0.01);
    float sample2 = audio_ampl(iChannel0, clamped_dist);
    float sample3 = audio_ampl(iChannel0, arclength);

    float disp_dist = smoothstep(-0.2, -0.1, sample3-dist2);
    disp_dist *= (1.0 - disp_dist);

    vec3 color = vec3(0.0);

    // spline debug
    // vec3 s = smoothstep(-0.01, 0.01, spline-uv.y); color += (1.0-s) * s;

    float v = abs(uv.y - 0.5);
    color += flame_color * smoothstep(v, v*8.0, sample1);
    color += disc_color  * smoothstep(0.5, 1.0, sample2) * (1.0 - clamped_dist);
    color += flash_color * smoothstep(0.5, 1.0, sample3) * clamped_dist;
    color += wave_color  * disp_dist;
    color = pow(color, vec3(0.4545));
	fragColor = vec4(color, 1.0);
}
