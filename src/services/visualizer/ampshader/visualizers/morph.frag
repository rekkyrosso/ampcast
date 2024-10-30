// https://www.shadertoy.com/view/lfffzM
vec3 hash33(vec3 p3)
{
 p3 = fract(p3 * vec3(.1031,.11369,.13787));
    p3 += dot(p3, p3.yxz+19.19);
    return -1.0 + 2.0 * fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
}

float perlinNoise(vec3 p)
{
    vec3 pi = floor(p);
    vec3 pf = p - pi;
    
    vec3 w = pf * pf * (3.0 - 2.0 * pf);
    
    return  mix(
                mix(
                    mix(dot(pf - vec3(0, 0, 0), hash33(pi + vec3(0, 0, 0))), 
                        dot(pf - vec3(1, 0, 0), hash33(pi + vec3(1, 0, 0))),
                        w.x),
                    mix(dot(pf - vec3(0, 0, 1), hash33(pi + vec3(0, 0, 1))), 
                        dot(pf - vec3(1, 0, 1), hash33(pi + vec3(1, 0, 1))),
                        w.x),
                    w.z),
                mix(
                    mix(dot(pf - vec3(0, 1, 0), hash33(pi + vec3(0, 1, 0))), 
                        dot(pf - vec3(1, 1, 0), hash33(pi + vec3(1, 1, 0))),
                        w.x),
                    mix(dot(pf - vec3(0, 1, 1), hash33(pi + vec3(0, 1, 1))), 
                        dot(pf - vec3(1, 1, 1), hash33(pi + vec3(1, 1, 1))),
                        w.x),
                    w.z),
                w.y
             );
}


const vec3 color1 = vec3(255.0/255.0, 138.0/255.0, 28.0/255.0);
const vec3 color2 = vec3(255.0/255.0, 91.0/255.0, 33.0/255.0);
const vec3 color3 = vec3(255.0/255.0, 149.0/255.0, 50.0/255.0) / 3.0;
const float noiseScale = 1.5;
const float lightIntensity = 1.0;
const float noiseChangeSpeed = 0.5;
const float gradientSweepSweep = 0.5;

float light(float intensity, float attenuation, float dist)
{
    return intensity / (0.5 + dist * attenuation);
}

vec3 draw( in vec2 vector )
{
    vec4 music = texture(iChannel0, vec2(0.0, 0.0));
    float musicVolume = music.x;
    

    float angle = atan(vector.y, vector.x);
    float len = length(vector);

    // ring
    float noise = perlinNoise( vec3(vector * noiseScale, iTime * noiseChangeSpeed) ) * 2.5  * musicVolume + 0.5;
    float normalizedNoise = mix(0.3, 0.6, noise);
    float distanceInputFromNoisy = distance(vector, normalizedNoise / len * vector);
    
    float brightness = light(lightIntensity, 10.0, distanceInputFromNoisy / 2.);
    //brightness *= smoothstep(normalizedNoise - 0.1, distanceInputFromNoisy, len);
    brightness *= musicVolume * 0.5;
    float gradientSweep = len * cos(angle + iTime * gradientSweepSweep) * musicVolume;
    
    
    // Non normalized noise underground
    float undergroundNoize = smoothstep(2., noise * 1.2 * musicVolume, len);
    
    // color
    vec3 color = mix(color1, color2, gradientSweep);
    color = mix(color3, color, brightness);
    color = color * undergroundNoize;
    
    return color.rgb;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord )
{
    vec2 relativeCoordinates = (fragCoord * 2.0 - iResolution.xy) / iResolution.y;
    
    vec3 color = draw(relativeCoordinates);

    fragColor.rgb = color.rgb;
}