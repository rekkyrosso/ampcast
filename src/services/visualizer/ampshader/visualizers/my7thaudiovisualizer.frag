// https://www.shadertoy.com/view/7slBWS
/* NOT CURRENTLY USED */
void mainImage( out vec4 fragColor, in vec2 fragCoord ){
    vec2 uv = (fragCoord.xy * 2.0 - iResolution.xy) / iResolution.x;
    float resolution = 1000.;
    float r = floor(length(uv*resolution))/resolution;

    float bass = texture(iChannel0, vec2(0,0)).x;
    if (iTime < 22.85){
        r = fract( 3.*(r-iTime*.1));
        } else {
        r = fract( 3.*bass*(r-iTime*.1));
        }
    vec4 spect = texture(iChannel0, vec2(r,r));
    float rate = 1.;
    fragColor = 2.*sqrt(spect.x*spect.x)*vec4(spect.x*.6, spect.x*.8, spect.x*.9, 0.);
}