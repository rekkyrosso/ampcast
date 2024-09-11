// https://www.shadertoy.com/view/7ldczN
/* NOT CURRENTLY USED */
#define freq(f) texture(iChannel0, vec2(f, 0.25)).x * 0.8

float avgBassFreq() {
    float div = 0.0;
    float total = 0.0;
    for (float pos = 0.0; pos < 0.1; pos += 0.01) {
        div += 1.0;
        total += freq(pos);
    }
    return total / div;
}

float avgMedFreq() {
    float div = 0.0;
    float total = 0.0;
    for (float pos = 0.1; pos < 0.6; pos += 0.01) {
        div += 1.0;
        total += freq(pos);
    }
    return total / div;
}

float avgTopFreq() {
    float div = 0.0;
    float total = 0.0;
    for (float pos = 0.6; pos < 1.0; pos += 0.01) {
        div += 1.0;
        total += freq(pos);
    }
    return total / div;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{



    float aspect = iResolution.y/iResolution.x; //aspect ratio of viewport
    float value; //var
	vec2 uv = fragCoord.xy / iResolution.x; //vec ratio of fragment coordinate to width of viewport

    float bassFreq = pow(avgBassFreq(), 0.85);
    float medFreq = pow(avgMedFreq(), 0.85);
    float topFreq = pow(avgTopFreq(), 0.85);

    float rot = radians(45.0); // radians(45.0*sin(iTime)); //radians(45.0)
    float rot2 = radians(45.0*sin(iTime)); // radians(45.0*sin(iTime)); //radians(45.0)

    uv -= vec2(0.5, 0.5*aspect); //transform


    mat2 m = mat2(cos(rot), -sin(rot), sin(rot), cos(rot));
   	uv  = m * uv;
    uv *= vec2(1., 1.7*aspect);
    uv.y+=0.01*(2.0-aspect);
    vec2 pos = 200.0*uv;
    vec2 rep = fract(-0.9*tan(rot2)+cos(rot2/2.0)*pos);
    float dist = min(min(rep.x, rep.x), min(rep.y, 1.0-rep.y));
    float squareDist = length((floor(pos)+vec2(0.5)) - vec2(1.0) );

    float edge = 4.*sin(squareDist)*0.5+0.5;

    edge = ((iTime+bassFreq+medFreq)/20.-squareDist*((iTime*medFreq+topFreq)/50000.))*.4;
    edge = (medFreq)/(topFreq)*fract(edge*squareDist);
    //value = medFreq*abs(dist-bassFreq);
    //value = pow(dist, 2.0);
    value = fract (dist*2.0);
    value = mix(value, 1.0-value, step(1.0, edge));
    //value *= 1.0-0.5*edge;
    edge = pow(abs(1.0-edge), 2.0);

    edge = .5*(medFreq)-abs(1.0-edge)+topFreq;
    //value = smoothstep( edge-0.25, edge, 0.55*value);


    value += squareDist*.1;
    //fragColor = vec4(value);
    fragColor = mix(vec4(1.0,edge/2.,value/4.,1.0)*(cos(rot2)/4.0),vec4(0.5,0.75,1.0,1.), edge);
    fragColor.a = 0.25*clamp(edge, 0.0, 1.0);
    fragColor.b += sin(iTime+medFreq)*.5+.5;
    fragColor.r /= .8*bassFreq+sin(iTime+medFreq)*.1+.2;
    fragColor.g += topFreq*.1;
}
