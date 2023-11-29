// https://www.shadertoy.com/view/clVyWR
vec3 palette(float t)
{
    // [[0.802 0.201 0.691] [0.162 0.865 0.540] [0.223 0.275 0.791] [5.346 1.019 3.072]]
    vec3 a = vec3(0.802, 0.201, 0.691);
    vec3 b = vec3(0.162, 0.865, 0.540);
    vec3 c = vec3(0.223, 0.275, 0.79);
    vec3 d = vec3(5.346, 1.019, 3.072);

    return a + b*cos( 6.28318*(c*t+d) );
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = fragCoord / iResolution.xy * 2.0 - 1.0;
    uv.x *= iResolution.x / iResolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);



    for(float i=0.0;i < 4.; i++)
    {
        float wave = texture( iChannel0, vec2(uv.x,0.75) ).x;
        float fft  = texture( iChannel0, vec2(uv.x,0.25) ).x;
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));
        //vec3 col = palette(length(uv0) + i*.4 + iTime);



        d = sin(d*8. + iTime + wave)/8.;
        d = abs(d);
        d = pow(0.01/d, fft);

        vec3 col = vec3( fft, 4.0*fft*(1.0-fft), 1.0-fft ) * fft;
        finalColor += col*=d;
    }


    fragColor = vec4(finalColor, 1.0);
}
