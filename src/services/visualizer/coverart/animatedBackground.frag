// https://www.shadertoy.com/view/llcXW7
// Made by k-mouse (2016-11-23)
// Modified from David Hoskins (2013-07-07) and joltz0r (2013-07-04)
// Modified even more by ampcast.app.

#define TAU 6.28318530718

#define TILING_FACTOR 1.0
#define MAX_ITER 24

float waterHighlight(vec2 p, float time, float foaminess)
{
    vec2 i = vec2(p);
	float c = 0.0;
    float foaminess_factor = mix(1.0, 6.0, foaminess);
	float inten = .005 * foaminess_factor;

	for (int n = 0; n < MAX_ITER; n++)
	{
		float t = time * (1.0 - (3.5 / float(n+1)));
		i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
		c += 1.0/length(vec2(p.x / (sin(i.x+t)),p.y / (cos(i.y+t))));
	}
	c = 0.2 + c / (inten * float(MAX_ITER));
	c = 1.17-pow(c, 1.4);
    c = pow(abs(c), 8.0);
	return c / sqrt(foaminess_factor);
}

float sampleMusic() {
	return clamp(0.5 * (
        texture( iChannel0, vec2( 0.15, 0.25 ) ).x +
        texture( iChannel0, vec2( 0.30, 0.25 ) ).x
    ), 0.15, 1.0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
	float time = iTime * 0.1+23.0;
	vec2 uv = fragCoord.xy / iResolution.xy;
	vec2 uv_square = vec2(uv.x * iResolution.x / iResolution.y, uv.y);
    float dist_center = pow(1.2*length(uv - 0.5), 2.0);

    float foaminess = smoothstep(0.4, 1.4, dist_center);
    float clearness = 0.1 + 0.9*smoothstep(0.1, 0.5, dist_center);

	vec2 p = mod(uv_square*TAU*TILING_FACTOR, TAU)-250.0;

    float c = waterHighlight(p, time, foaminess);
	vec3 color = vec3(c * sampleMusic());

    color = clamp((iBackgroundColor/255.) - color, 0.0, 1.0);
    color = mix((iBackgroundColor/255.), color, -clearness);

	fragColor = vec4(color, 1.0);
}
