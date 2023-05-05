// https://www.shadertoy.com/view/tdXcRl
#define PI 3.141592653589793238462643383279502884197169399375105820974

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float contribution = 0.0;
    fragColor = vec4(0.0);
    float phase = .5 * (1.0 + sin(iTime / (2.0 * PI)));
    phase = phase * phase;
    float scale = 1.0;
    for (int i = 0; i < 9; i++)
    {
        vec2 uv = ( fragCoord - .5*iResolution.xy ) / iResolution.y;

        float offset = phase * uv.x + uv.y;

        float distanceFromMiddle = length(uv) * .5 * (1.0 + sin(offset + iTime / scale * 0.25));

        // Time varying pixel color
        vec4 music = texture(iChannel0, vec2(distanceFromMiddle));
        vec3 col = length(music.rgb) * cos(scale*iTime/10.0+vec3(0,2,4));

        // Output to screen
        float colourfulness = clamp(length(col) + phase, 0.0, 1.0);
        float colourlessness = 1.0 - colourfulness;

        float localContribution = scale / (1.0 + pow(distanceFromMiddle, -phase));
        vec3 colourVector = clamp(col, .5 - scale, .5 + scale);
        vec3 colourlessVector = vec3(length(colourVector));

        fragColor += localContribution*vec4(colourfulness * colourVector + colourlessness * colourlessVector, 1.0);
        contribution += localContribution;
        scale /= 2.0;
    }
    fragColor /= contribution;
}
