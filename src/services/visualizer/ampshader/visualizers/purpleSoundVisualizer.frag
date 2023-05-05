// https://www.shadertoy.com/view/fsKyzd
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float majorAxis = max(iResolution.x, iResolution.y);
    vec2 uv = fragCoord/majorAxis;
    vec2 center = iResolution.xy/2.0/majorAxis;
    vec2 rel = uv-center;
    vec2 disp = abs(rel) * 1.2 + length(rel) * .8;
    float d = max(disp.x,disp.y);
    d += 0.01 * d * cos(12.0 * atan(rel.y, rel.x));
    int n = int(512.0 * pow(d*.9+.1, 2.0));

    float fft = texelFetch(iChannel0, ivec2(n, 0), 0).x;

    vec3 col = vec3(
        pow(fft*1.2, 11.0 + 2.0*(1.0-d)),
        pow(fft*1.1, 12.0 + 2.0*(1.0-d)),
        pow(fft*1.3, 12.0 + 2.0*(1.0-d)));

    // Output to screen
    fragColor = vec4(col,1.0);
}
