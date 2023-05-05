// https://www.shadertoy.com/view/slc3WX
// oringal createor https://www.shadertoy.com/user/ADOB
// remixer coder: https://www.shadertoy.com/user/gchipunov
float squared(float value) { return value * value; }

float getAmp(float frequency) { return texture(iChannel0, vec2(frequency / 512.0, 0)).x; }

float getWeight(float f) {
    return (+ getAmp(f-2.0) + getAmp(f-1.0) + getAmp(f+2.0) + getAmp(f+1.0) + getAmp(f)) / 5.0; }

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uvTrue = fragCoord.xy / iResolution.xy;
    vec2 uv = -1.0 + 2.0 * uvTrue;

	float lineIntensity;
    float glowWidth;
    vec3 color = vec3(0.0);

	for(float i = 0.0; i < 5.0; i++) {

		uv.y += (0.2 * sin(uv.x + i*7.0 - iTime * 5.6));
        float Y = uv.y + getWeight(squared(i) * 50.0) *
            (texture(iChannel0, vec2(uvTrue.x, 1)).x - 0.5);
        lineIntensity = 0.4 + squared(2.6 * abs(mod(uvTrue.x + i / 0.3 + iTime,2.0) - 1.0));
		glowWidth = abs(lineIntensity / (100.0 * Y));
       // float k = i;
        if(i== 0.)
       {
		color += vec3(glowWidth * (2.0 + tan(iTime * 0.13)),
                      glowWidth * (2.0 - sin(iTime * 0.23)),
                 //     glowWidth * (2.0 - cos(iTime * 0.19)));
                       glowWidth * (2.0 - tan(iTime * 0.19)));
       }
           else   if(i== 1.)
        {
 		color += vec3(glowWidth * (2.0 + sin(iTime * 0.13)),
                      glowWidth * (2.0 - sin(iTime * 0.01)),
                      glowWidth * (2.0 - cos(iTime * 0.01)));
               //        glowWidth * (2.0 - tan(iTime * 0.19)));
        }
         else   if(i== 2.)
        {
 		color += vec3(glowWidth * (2.0 + cos(iTime * 0.13)),
                      glowWidth * (2.0 - sin(iTime * 0.23)),
                      glowWidth * (2.0 - cos(iTime * 0.19)));
               //        glowWidth * (2.0 - tan(iTime * 0.19)));
        }
        else
        {
 		color += vec3(glowWidth/2.0 * (2.0 + tan(iTime * 0.13)),
                      glowWidth/2.0 * (2.0 - sin(iTime * 0.23)),
                      glowWidth/2.0 * (2.0 - cos(iTime * 0.19)));
               //        glowWidth * (2.0 - tan(iTime * 0.19)));
        }

	}
	color = color + cos(color)/44.0;
    color = color - tan(iTime * 0.13)/555.0;

	fragColor = vec4(color, 1.0);
}
