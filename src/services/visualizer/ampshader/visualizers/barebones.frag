// https://www.shadertoy.com/view/cdtGW7
const float bpm = 120.;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = fragCoord/iResolution.xy;

    vec3 col;

    // Bin x into bars
    float p = .05;
    float frequency = round((uv.x + p/2.)/p)*p;

    // Find music values
    float amplitude = texture(iChannel0, vec2(frequency, 0.)).r;
    float beat_length = 60./bpm;

    // Base color depends on UV
    // TODO do the green modulation of 2. based on actual beat of the song maybe
    vec3 base = vec3(1.-uv.x+.1, uv.x, uv.y + .5*(sin(2.*beat_length*3.1415*iTime)+.5));

    // Draw bar or background
    if (uv.y <= amplitude) {
        col = amplitude * base;
    } else {
        col = .4*uv.y * base + vec3(.01, .1, .05) * sqrt(2.*amplitude);
    }

    fragColor = vec4(col,1.0);
}
