// https://www.shadertoy.com/view/4dycW1
float audio_power_f( in sampler2D channel, in float f, in float p) {
    return texture( channel, vec2(f, p) ).x;
}

#define audio_power(x) audio_power_f(iChannel0, x, 0.0)
#define audio_power_p(x,p) audio_power_f(iChannel0, x, p)
#define pi 3.141592

vec3 freq_bar(vec2 FC) {
    vec2 uv = FC.xy / iResolution.xy;
    float power = audio_power(uv.x);

 	return smoothstep(power, 0.0, uv.y)*vec3(power,0.5,0.5);
}

vec3 freq_circle(vec2 FC) {
 	vec2 uv = FC.xy - 0.5*iResolution.xy;
    uv *= 2.0/iResolution.y;

    float angle = sign(uv.x)*atan(uv.x,uv.y);

    float power, power_c;
    power_c = 1.0 - audio_power_p(angle/pi, 1.0) ;
    power = audio_power( angle/pi );

    uv = 0.2*uv/(1.0- (1.7 + 0.3*power_c)*length(uv));



    float ref_size = 0.2;
    vec3 color;
    float shade;
    shade = smoothstep(0.2,power*0.8 + 0.25, length(uv));
    shade *= smoothstep(0.0, 0.2+ 0.5*power, (1.0 - length(uv)));

    color = vec3(power*power_c, power*0.5 + 0.5, power_c + 0.4);
    return shade*color;
}


void mainImage( out vec4 fragColor, in vec2 FC ) {


    fragColor = vec4(freq_bar(FC), 1.0);
    fragColor = vec4(freq_circle(FC), 1.0);

}
