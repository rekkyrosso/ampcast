// https://www.shadertoy.com/view/ds2yWh
vec3 palette( float t ){


    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);

    return a + b*cos( 6.28318*(c*t+d) );
}

float sample_at(float f)
{
    return texture(iChannel0, vec2(f / 10.0, 0.25)).x;
}

float sm(float f)
{
    float delta = .1;
    return 0.2 * (sample_at(f - 2. * delta) + sample_at(f - delta) + sample_at(f) + sample_at(f + delta) + sample_at(f + 2. * delta));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (fragCoord *2.0 - iResolution.xy) / iResolution.y; //Centering and coord scaling

    vec2 uv0 = uv;//Temp storage

    vec3 finalColor = vec3(0.0, 0.0, 0.0);// backcolour

    for (float i = 0.0; i <2.0; i++){

        uv = fract(uv *sm(1.5)) - 0.5;//amount of fractals

        float d = length(uv) * sm(exp(-length(uv0))); //circle placement

        vec3 col = palette(length(uv0) + i*.4 + iTime*.4);//changing colour scheme

        d = sin(d*8. +iTime)/8.;//circle movement direction and speed
        d = abs(d); //ring brightness

        d = pow(0.01/ d, 1.2); //colour glow


        finalColor += col * d;// Applying the colour to the algorithm
    }

    fragColor =  vec4(finalColor, 1.0);//setting the output

}
