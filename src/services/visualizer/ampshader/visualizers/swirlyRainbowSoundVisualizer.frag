// https://www.shadertoy.com/view/WdKyzd
#define tao 6.283185307179586476925286766559

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord/max(iResolution.x, iResolution.y);
    vec2 ctr = iResolution.xy/2.0/max(iResolution.x, iResolution.y);
    vec2 disp = uv - ctr;

    vec2 polar = vec2(length(disp)*2.0, atan(disp.y, disp.x)/tao+.5);

    vec2 wave = texture(iChannel0, vec2(polar.x*2.0, 1)).xy;

    float smallAmp = .1*polar.x*pow(wave.x, 5.0);
    float bigAmp = .6*pow(polar.x, .9)*pow(wave.x, 7.0);

    float targetF =
        (1.0-abs(smallAmp+bigAmp))*polar.x
        -smallAmp*sin(iTime+polar.y*tao*24.0)
        -bigAmp*sin((.125+polar.y)*tao*2.0);
    float f = pow(targetF, 2.5);

    vec2 freq = texture(iChannel0, vec2(f, 0)).xy;

    vec3 col = 0.5 + 0.5*cos(
        .4*iTime
        -tao*(polar.x*sqrt(1.0+wave.x)+polar.y)
        +vec3(tao*.0,tao*.33,tao*.67)
   	);

    col *= vec3(.9, .9, 1.0);

    col *= pow(freq.x, 4.0);

    // Output to screen
    fragColor = vec4(col, 1.0);
}
