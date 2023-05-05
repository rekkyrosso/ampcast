// https://www.shadertoy.com/view/sdjGWG
#define PI 3.14159

float expStep( float x, float k, float n )
{
    return exp( -k*pow(x,n) );
}

float cubicPulse( float c, float w, float x )
{
    x = abs(x - c);
    if( x>w ) return 0.0;
    x /= w;
    return 1.0 - x*x*(3.0-2.0*x);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // create pixel coordinates
	vec2 uv = fragCoord.xy / iResolution.xy;

    // diag symmetry
    // uv = length(uv.x + uv.y) < 1. ? uv : vec2(1.0 - uv.x, 1.0 - uv.y);

    // abs uv symmetry
    // uv = abs(uv * 2. - 1.);

    vec2 coords = uv;

    uv = uv * 2. - 1.;
    uv *= 2.;
    uv.x += 0.6;

    float ro = length(uv) - 0.05 * sin(iTime * 3.);
    float angle = atan(uv.y, uv.x);  // atan2
    vec2 range = vec2(-1. * PI, 1. * PI);  // The range of atan2 is [-pi / 1; pi / 1]
    float theta = smoothstep(range[0], range[1], angle);  // Normalize the range of atan to [0;1]
    theta = abs(2. * theta - 1.);
    theta += sin(iTime * 0.1) * 0.3;

    uv = vec2(theta, ro);

	// first texture row is frequency data

    float fftFrequency = .1;
    float fftCoord = sin(uv.x * fftFrequency) * uv.x;
	float fft  = texture( iChannel0, vec2(fftCoord,0.25) ).x * 1.1;

    // second texture row is the sound wave
	float wave = texture( iChannel0, vec2(uv.x,0.75) ).x * 0.1;

    float spectrumScale = 1.;
    float spectrum = 1.0 - smoothstep(fft - 0.2, fft, uv.y * spectrumScale);

    vec3 col = vec3(0.0);

    // add wave form
    float corol = (1.0 -  smoothstep( 0.0, coords.x, abs(wave - uv.y + coords.x * 0.2 + fft) ));

    // add fft
	col += vec3(1.0,fft,fft-.4) * (spectrum + corol) * (.5 + ro);

	// output final color
	fragColor = vec4(col, 1.0);
}
