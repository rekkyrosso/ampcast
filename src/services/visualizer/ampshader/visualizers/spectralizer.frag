//https://www.shadertoy.com/view/wXscWN
/*
|--------------------------------------------------------------------------------------------|
|     _____ _____  ______ _____ _______ _____            _      _____ ____________ _____     |
|    / ____|  __ \|  ____/ ____|__   __|  __ \     /\   | |    |_   _|___  /  ____|  __ \    |
|   | (___ | |__) | |__ | |       | |  | |__) |   /  \  | |      | |    / /| |__  | |__) |   |
|    \___ \|  ___/|  __|| |       | |  |  _  /   / /\ \ | |      | |   / / |  __| |  _  /    |
|    ____) | |    | |___| |____   | |  | | \ \  / ____ \| |____ _| |_ / /__| |____| | \ \    |
|   |_____/|_|    |______\_____|  |_|  |_|  \_\/_/    \_\______|_____/_____|______|_|  \_\   |
|                                                                                            |
|--------------------------------------------------------------------------------------------|                                                                                      
|                                      by chronos                                            |
|--------------------------------------------------------------------------------------------|



    ---------------------------------------------
    self link: https://www.shadertoy.com/view/wXscWN
    ---------------------------------------------
*/


float sRGBencode(float C_linear) { return C_linear > 0.0031308 ? (1.055 * pow(C_linear, 1./2.4) - 0.055) : (12.92 * C_linear); }
vec3 sRGBencode(vec3 C_linear) { C_linear = clamp(C_linear, 0., 1.); return vec3(sRGBencode(C_linear.x), sRGBencode(C_linear.y), sRGBencode(C_linear.z)); }

float audio_freq( in sampler2D channel, in float f) { return texture( channel, vec2(f, 0.25) ).x; }
float audio_ampl( in sampler2D channel, in float t) { return texture( channel, vec2(t, 0.75) ).x; }

float sdXor(float a, float b)
{
    return max(min(a,b), -max(a,b));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2. * fragCoord - iResolution.xy)/iResolution.y;

    vec3 color = vec3(0);

    float focal = 2.;
    vec3 ro = vec3(0,0,3);
    vec3 rd = normalize(vec3(uv, -focal));

    float time = .1*sin(iTime*.2);
    float time2 = iTime*.2;
    float c = cos(time), s = sin(time);
    float c2 = cos(time2), s2 = sin(time2);
    
    ro.xz *= mat2(c,s,-s,c);
    rd.xz *= mat2(c,s,-s,c);

    ro.xy *= mat2(c,s,-s,c);
    rd.xy *= mat2(c,s,-s,c);

    ro.zy *= mat2(c2,s2,-s2,c2);
    rd.zy *= mat2(c2,s2,-s2,c2);


    float t = .15 * texelFetch(iChannel1, ivec2(uvec2(ivec2(fragCoord)+iFrame*331)%1024u), 0).a;;
    vec3 p = ro;
    float transmission = 1.;
    for(float i = 0.; i <120.; i++)
    {
    
        float d = 
            sdXor(
                length(p+vec3(0, .125*sin(iTime*.2),0))-1.,
                min(    
                    min(
                        min(
                        length(p-vec3(1.2+.25*sin(iTime*.2),0,0))-.5,
                        length(p+vec3(1.2+.25*sin(iTime*.2),0,0))-.5
                        ),
                        min(
                        length(p-vec3(1.75+.25*cos(iTime*.2),0,0))-.25,
                        length(p+vec3(1.75+.25*cos(iTime*.2),0,0))-.25
                        )
                    ),
                    0.*9e9+1.*
                    min(
                        min(
                            length(p-vec3(c2, .35,s2)*1.8)-.05,
                            length(p+vec3(c2, .35,s2)*1.8)-.05
                        ),
                        min(
                            length(p-vec3(s2, -.35,c2)*1.8)-.05,
                            length(p-vec3(s2, -.35,c2)*1.8)-.05
                        )
                    )
                )
                
            );

        p += rd * d;

        float density = 5./(.025+abs(d));

        vec3 cmap = (sin(vec3(1,2,3) + t*.6+iTime*.1 - length(uv)*.3)*.5+.5);


        color += (1./120.) * transmission * cmap * density;
        transmission *= exp(-.1*abs(d)*density);

        #if 1
        for(float j = 3.; j < 9.; j++)
        {
            float scale = exp2(j);
            float f = audio_freq(iChannel0, 1./scale);
            p += (.25+f)*cos(p.yzx * scale + (f-.5) + 10.*iTime/scale) / scale;
        }
        #endif
        
        t += .75*abs(d) + 0.001;

        if(t > 1e3) break;
    }
    
    
    color = tanh(pow(color, vec3(1.3)));
    color = sRGBencode(color);
    fragColor = vec4(color, 1);
}