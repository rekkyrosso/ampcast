// https://www.shadertoy.com/view/4sVBWy
// Radiant Music Visualiser
// by Hazel Quantock 2018
// This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. http://creativecommons.org/licenses/by-nc-sa/4.0/

void mainImage( out vec4 fragColour, in vec2 fragCoord )
{
    vec2 uv = (fragCoord*2.-iResolution.xy)/iResolution.y;

    float l = length(uv)/length(iResolution.xy/iResolution.y);
    float a = atan(uv.x,uv.y)+iTime;
    float s = texture(iChannel0,vec2(abs(fract(5.*a/6.283)*2.-1.),.75)).r;

    float A = .4;
    float B = .45;
    if ( iMouse.z > 0. )
    {
        A = iMouse.x / iResolution.x; // strength of chromatic dispersion
        B = iMouse.y / iResolution.y; // strength of waveform
    }
    A *= A; // apply a curve so mouse movements feel better
    B *= B;

    fragColour.r = texture(iChannel0,vec2(pow(mix(mix(l,.0,A),    s ,B),2.),.25)).r;
    fragColour.g = texture(iChannel0,vec2(pow(mix(mix(l,.5,A),(1.-s),B),2.),.25)).r;
    fragColour.b = texture(iChannel0,vec2(pow(mix(mix(l,1.,A),    s ,B),2.),.25)).r;

    // tweak the contrast
    fragColour.rgb = smoothstep(.05,1.,fragColour.rgb+.2*l);
    fragColour.rgb = pow( fragColour.rgb, vec3(2) );

    fragColour.a = 1.;
}
