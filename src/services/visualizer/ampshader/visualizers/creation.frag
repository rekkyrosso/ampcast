// https://noisehack.com/build-music-visualizer-web-audio-api/ (adapted from)
// https://www.shadertoy.com/view/XsXXDn
// http://www.pouet.net/prod.php?which=57245
// If you intend to reuse this shader, please add credits to 'Danilo Guanabara'

void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec3 c;
    float z = 0.1 * iTime;
    vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 p = uv - 0.5;
    p.x *= iResolution.x / iResolution.y;
    float l = 0.2 * length(p);
    for (int i = 0; i < 3; i++) {
        z += 0.07;
        uv += p / l * (sin(z) + 1.0) * abs(sin(l * 9.0 - z * 2.0));
        c[i] = 0.01 / length(abs(mod(uv, 1.0) - 0.5));
    }
    float intensity = texture(iChannel0, vec2(l, 0.5)).x;
    fragColor = vec4(c / l * intensity, iTime);
}
