// https://www.shadertoy.com/view/wldBD8
// ##### Audio Visualizer: Rainbow #####
// Made by Zi7ar21 (Discord: @Zi7ar21#2168)

/* I don't know what this is really, it has pretty colors and stuff...
I made it symetrical and stuff and it can take the Microphone/Soundcloud
Input in iChannel0. uamee's "COMRADE YOU JUST POSTED CRINGE" is used as
an example.*/

// UPDATE August 30th, 2021: Cleaned code, this looked horrifying lmao

// Anti-Aliasing (Super-Sampling Anti-Aliasing)
#define SSAA 4

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec2 uv = 2.0*(fragCoord.xy-0.5*iResolution.xy)/max(iResolution.x, iResolution.y);
    vec3 color = vec3(0.0);
    for(int x = -SSAA; x <= SSAA; x++) {
    for(int y = -SSAA; y <= SSAA; y++) {
        vec2 spos = vec2(x, y)/float(SSAA);
        uv = abs(2.0*((fragCoord.xy+spos)-0.5*iResolution.xy)/max(iResolution.x, iResolution.y));
        if(texture(iChannel0, vec2(uv.x, 0.0)).x*uv.y < 0.1)
        {
            color += clamp(vec3(uv.x, 1.0-uv.x, 1.0-uv.y), 0.0, 1.0);
        }
        if(texture(iChannel0, vec2(uv.x, 1.0)).x*uv.y < 0.1)
        {
            color += clamp(vec3(uv.x, 1.0-uv.x, 1.0-uv.y*2.0), 0.0, 1.0);
        }
    }
    }

    fragColor = vec4(color/float(SSAA*SSAA*8), 1.0);
}
