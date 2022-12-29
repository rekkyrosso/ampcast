// Radiant by TekF
// https://www.shadertoy.com/view/4sVBWy


// Radiant Music Visualiser
// by Hazel Quantock 2018
// This work is licensed under a Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International License. http://creativecommons.org/licenses/by-nc-sa/4.0/

void main(void) {
    vec2 uv = (gl_FragCoord.xy*2.-iResolution.xy)/iResolution.y;
    float l = length(uv)/length(iResolution.xy/iResolution.y);
    float a = atan(uv.x,uv.y)+iTime;
    float s = texture(iChannel0,vec2(abs(fract(5.*a/6.283)*2.-1.),.75)).r;
    // float A = .16;
    // float B = .2025;
    float A = .4;
    float B = .45;
    if (iMouse.z > 0.) {
        A = iMouse.x / iResolution.x; // strength of chromatic dispersion
        B = iMouse.y / iResolution.y; // strength of waveform
    }
    A *= A; // apply a curve so mouse movements feel better
    B *= B;
    gl_FragColor.r = texture(iChannel0,vec2(pow(mix(mix(l,.0,A),    s ,B),2.),.25)).r;
    gl_FragColor.g = texture(iChannel0,vec2(pow(mix(mix(l,.5,A),(1.-s),B),2.),.25)).r;
    gl_FragColor.b = texture(iChannel0,vec2(pow(mix(mix(l,1.,A),    s ,B),2.),.25)).r;
    // tweak the contrast
    gl_FragColor.rgb = smoothstep(.05,1.,gl_FragColor.rgb+.2*l);
    gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(2));
    gl_FragColor.a = 1.;
}
