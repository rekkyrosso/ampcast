// https://www.shadertoy.com/view/3l2Gzc
/* DOES NOT WORK (mat2x2) */
//License: CC BY 3.0
//Author: Jan Mróz (jaszunio15)

//1/512
#define FREQ_STEP (0.001953125 * 3.0)

#define PI 3.1415927
#define TWO_PI 6.283185

float pow2(in float x)
{
 	return x*x;
}

float pow3(in float x)
{
 	return x*x*x;
}

float pow4(in float x)
{
 	return x*x*x*x;
}

float hash1_2(vec2 x)
{
 	return fract(sin(dot(x, vec2(52.127, 61.2871))) * 521.582);
}

vec2 hash2_2(vec2 x)
{
    return fract(sin(x * mat2x2(20.52, 24.1994, 70.291, 80.171)) * 492.194);
}

//Simple interpolated noise
vec2 noise2_2(vec2 uv)
{
    vec2 f = smoothstep(0.0, 1.0, fract(uv));

 	vec2 uv00 = floor(uv);
    vec2 uv01 = uv00 + vec2(0,1);
    vec2 uv10 = uv00 + vec2(1,0);
    vec2 uv11 = uv00 + 1.0;
    vec2 v00 = hash2_2(uv00);
    vec2 v01 = hash2_2(uv01);
    vec2 v10 = hash2_2(uv10);
    vec2 v11 = hash2_2(uv11);

    vec2 v0 = mix(v00, v01, f.y);
    vec2 v1 = mix(v10, v11, f.y);
    vec2 v = mix(v0, v1, f.x);

    return v;
}

//Average band volume from nearest bands, more steps - smoother spectrum
float getAvgVolume(float v, int steps)
{
    float sum = 0.0;
    float x = 0.0;
	for (int i = 0; i < steps; i++)
    {
        x = fract(v + float(i) * FREQ_STEP);
        								//pow for non linear spectrum
        sum += texture(iChannel0, vec2(pow3(x), 0.0)).r * pow(x, 0.08) * (1.0 + v * 0.5);
    }

    return (sum / float(steps));
}

vec3 myHue(float hue)
{
    hue = fract(hue);
 	return clamp(vec3(sin(hue * TWO_PI),
                      sin(hue * TWO_PI + TWO_PI * 0.33),
                      sin(hue * TWO_PI + TWO_PI * 0.66)), 0.0, 1.0);
}

//Cell center from point on the grid
vec2 voronoiPointFromRoot(vec2 root, float deg)
{
  	vec2 point = hash2_2(root) - 0.5;
    float s = sin(deg);
    float c = cos(deg);
    point = mat2x2(s, c, -c, s) * point;
    point += root + 0.5;
    return point;
}

float degFromRootUV(vec2 uv, float animationOffset)
{
 	return (iTime + animationOffset) * (hash1_2(uv) + 0.2);
}

vec2 rotate(vec2 point, float deg)
{
 	float s = sin(deg);
    float c = cos(deg);
    return mat2x2(s, c, -c, s) * point;
}

//Main circle sync
float intensiveMomentSoft()
{
 	float introMod = smoothstep(0.0, 27.5, iChannelTime[0]);
    float introMod4 = pow2(introMod);

    float silence = 1.0 - smoothstep(120.0, 137.0, iChannelTime[0]);
    float drop = smoothstep(158.0, 165.5, iChannelTime[0]);
    drop = pow4(drop);
    float silence2 = 1.0 - smoothstep(260.5, 274.25, iChannelTime[0]);

    return introMod4 * silence + drop * silence2;
}

//Particle movment speed sync
float intensiveMomentMove()
{
    float intro = smoothstep(25.5, 27.6, iChannelTime[0]);
    float intro2 = smoothstep(81.5, 82.5, iChannelTime[0]);
    float silence = 1.0 - smoothstep(120.0, 137.0, iChannelTime[0]);
    float drop = smoothstep(164.5, 166.5, iChannelTime[0]);
    float drop2 = smoothstep(218.5, 219.5, iChannelTime[0]);
    float silence2 = 1.0 - smoothstep(260.5, 274.25, iChannelTime[0]);
    return (intro + intro2 * 0.5) * silence + (drop + drop2 * 0.5) * silence2;

}

//Particle zoom sync
float intensiveMomentZoom()
{
    float introMod = smoothstep(0.0, 27.5, iChannelTime[0]);
    float introMod2 = smoothstep(81.5, 82.5, iChannelTime[0]);
    float silence = 1.0 - smoothstep(120.0, 137.0, iChannelTime[0]);
    float drop = smoothstep(158.0, 165.5, iChannelTime[0]);
    float drop2 = smoothstep(218.5, 219.5, iChannelTime[0]);
    float silence2 = 1.0 - smoothstep(260.5, 274.25, iChannelTime[0]);

    return 1.0 - ((introMod + introMod2 * 0.5) * silence + (drop + drop2 * 0.5) * silence2);
}

//x - voronoi coordinates (grid step = 1)
float voronoi(vec2 uv, vec2 distProportions, float distRotation, float animationOffset)
{
    vec2 rootUV = floor(uv);
    float deg = degFromRootUV(rootUV, animationOffset);
    vec2 pointUV = voronoiPointFromRoot(rootUV, deg);

    vec2 tempRootUV;	//Used in loop only
    vec2 tempPointUV;	//Used in loop only
    vec2 closestPointUV = pointUV;
    float minDist = 2.0;
    float dist = 2.0;
    for (float x = -1.0; x <= 1.0; x+=1.0)
    {
     	for (float y = -1.0; y <= 1.0; y+=1.0)
        {
         	tempRootUV = rootUV + vec2(x, y);
            deg = degFromRootUV(tempRootUV, animationOffset);
            tempPointUV = voronoiPointFromRoot(tempRootUV, deg);
            tempPointUV = mix(tempPointUV, tempRootUV + 0.5, animationOffset);

            dist = length(rotate(uv - tempPointUV, distRotation) * distProportions);
            if(dist < minDist)
            {
             	closestPointUV = tempPointUV;
               	minDist = dist;
            }
        }
    }

    return minDist;
}

//Bokeh from voronoi
float bokehParticles(vec2 uv, float radius, vec2 dotProportions, float dotRotation, float animationOffset)
{
 	float voro = voronoi(uv, dotProportions, dotRotation, animationOffset);
    float particles = 1.0 - smoothstep(radius, radius * (2.0), voro);
    return particles;
}

//Layering particles to imitate 3D view
vec3 layeredParticles(vec2 uv, float radiusMod, float sizeMod, float alphaMod, int layers, vec2 dotProportions, float dotRotation, float animationOffset)
{
    vec3 particles = vec3(0);
    float size = 1.0;
    float alpha = 1.0;
    float radius = 0.04;
    vec2 offset = vec2(0.0);
    vec3 startColor = myHue(iTime * 0.05 + animationOffset * 0.5) + 0.3;
    vec3 endColor = myHue(iTime * 0.05 + 0.3 + animationOffset * 0.5) + 0.3 + animationOffset;
    vec3 color = startColor;
    for (int i = 0; i < layers; i++)
    {
		particles += bokehParticles(
            (uv * size + vec2(sin(iTime * 0.3), cos(iTime * 0.3)) * 6.0 * intensiveMomentMove() - animationOffset * 0.3) + offset,
            radius,
            dotProportions,
            dotRotation + offset.x,
            animationOffset
        	) * alpha * color;
        color = mix(startColor, endColor, float(i+1) / float(layers));
        offset += hash2_2(vec2(alpha, alpha)) * 10.0;
        alpha *= alphaMod;
        size *= sizeMod;
        radius *= radiusMod;
    }
    return particles;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float intensivity = intensiveMomentSoft();

    vec3 col = vec3(0);

    //Gathering the kick from the song
    float kick = getAvgVolume(0.08, 50);
    kick = sqrt(smoothstep(0.25, 0.5, pow4(kick))) * intensivity;

    //uv 0.0 at the screen center
    vec2 uv = (2.0 * fragCoord - iResolution.xy) / iResolution.x;
    uv *= 2.0;

    //Fish eye
    uv *= 1.0 - length(uv) * 0.2;

    //Displacement
    uv += (noise2_2(uv * 3.0 + iTime + kick) - 0.5) * 0.1 * kick;

    //Dots shape
    vec2 dotProportions = mix(vec2(1.0), vec2(0.07, 10.0), kick);

    //Particles
    vec3 particles = layeredParticles(
        uv,
        0.99 + kick * 0.01, //RadiusMod
        1.08 - kick * 0.02 - intensiveMomentZoom() * 0.1, //SizeMod
        0.93, //AlphaMod
        20, //Layers
        dotProportions,
        PI * 0.5 + (iTime - kick), //Dots rotation
        kick * 0.5	//Animation offset
    	) * 0.75;
    col += particles;

    //Coloring the darkness
    col += 0.05 * myHue(kick + iTime * 0.1);

  	//Center circle
    float circle = 1.0 - smoothstep(0.1 + (1.0 - intensivity) + kick * kick * 0.5, 0.1 + (1.0 - intensivity) + kick * kick * 0.5 + 0.01 + kick * 0.001, length(uv) * intensivity);

 	//Placing the circle
    col += circle * intensivity;

    //Inverting colors in the circle
    col = mix(col, (1.3 + kick * 0.4) - col, circle * intensivity);

    //Vigniete and addtitional lighting
    float vignete = 1.0 - smoothstep(1.0, 1.8, length(uv * vec2(1.0, iResolution.x / iResolution.y)));
    float lighting = 1.0 - smoothstep(0.0, 2.0, length(uv));
    float lighting2 = 1.0 - smoothstep(0.3, 0.8, length(uv));

    //Postrpocess
    col = smoothstep(-0.1, 0.9, col);

    //Vignete
    col *= vignete;

    //Lighting
    col += (lighting * kick * 0.1) + lighting2 * kick * 0.15;

    fragColor = vec4(col, 1.0);
}
