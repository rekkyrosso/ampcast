// Radiant by TekF
// https://www.shadertoy.com/view/4sVBWy


void main(void) {
    vec2 uv = (gl_FragCoord.xy*2.-resolution.xy)/resolution.y;
    float l = length(uv)/length(resolution.xy/resolution.y);
    float a = atan(uv.x,uv.y)+time;
    float s = texture2D(spectrum,vec2(abs(fract(5.*a/6.283)*2.-1.),.75)).r;
    float A = .16;
    float B = .2025;
    gl_FragColor.r = texture2D(spectrum,vec2(pow(mix(mix(l,.0,A),    s ,B),2.),.25)).r;
    gl_FragColor.g = texture2D(spectrum,vec2(pow(mix(mix(l,.5,A),(1.-s),B),2.),.25)).r;
    gl_FragColor.b = texture2D(spectrum,vec2(pow(mix(mix(l,1.,A),    s ,B),2.),.25)).r;
    // tweak the contrast
    gl_FragColor.rgb = smoothstep(.05,1.,gl_FragColor.rgb+.2*l);
    gl_FragColor.rgb = pow(gl_FragColor.rgb, vec3(2));
    gl_FragColor.a = 1.;
}
