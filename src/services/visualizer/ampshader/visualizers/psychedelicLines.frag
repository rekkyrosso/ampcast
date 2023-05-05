// https://www.shadertoy.com/view/XsXGRf
#define StepSize .5
#define LineCount 30

//Function to draw a line, taken from the watch shader
float line(vec2 p, vec2 a, vec2 b, float thickness, float extend )
{
	vec2 pa = p - a;
	vec2 ba = b - a;
	float h = clamp(dot(pa, ba) / dot(ba, ba),-extend,1.0 + extend);
	return 1.0 - smoothstep(thickness * 0.8, thickness * 1.2, length(pa - ba * h));
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (fragCoord.xy / iResolution.xy);

	vec2 wav = vec2(length(texture(iChannel0, vec2(uv.x, 1)).xyz),
					length(texture(iChannel0, vec2(uv.y, 1)).xyz));
    // wav *= 3.0;
    //vec4 spec = texture(iChannel0, vec2(uv.y, 0));

	uv *= 2.0 - 1.0 ;
    float extend  = wav.y;

	// convert the input coordinates by a cosinus
	// warpMultiplier is the frequency
	float warpMultiplier = (6.0 + 1.5 * sin(iTime * 0.125));
	vec2 warped = cos(uv * 6.28318530718 * warpMultiplier)-cos(uv.yx*17.77*sin(iTime)+iTime)+ 0.1*wav.xy-sin(uv.xy+iTime);


	float gt = iTime*2.0;//floor(iTime * 20.0) * StepSize;


	// blend between the warpeffect and no effect
	// don't go all the way to the warp effect
	float warpornot = smoothstep(.5, 18.0, 2.0*sin(iTime * .25)+warped.x+warped.y)*0.15;

	// Variate the thickness of the lines
	float thickness = pow(1.5- 1.45 * cos(iTime), 2.0) / iResolution.x - wav.x*0.003 + wav.y*0.003;
	// thickness *= .1 + (warpMultiplier * warpornot)  + wav.x + wav.y;

    float brighness = .2/pow(thickness,.5);
	// Add 10 lines to the pixel
	vec4 color = vec4(0.0, 0.0, 0.0, 1.0);
	for (int i = 0; i < LineCount; i++)
	{
		gt += StepSize;

		thickness *= 1.25;
        brighness *= 1.0/1.25;
		uv = mix(uv, warped, warpornot);

		//Calculate the next two points
		vec2 point1 = vec2(sin(gt * 0.39), cos(gt * 0.23));
		vec2 point2 = vec2(cos(gt * 0.29), sin(gt * 0.22));

		// Add new line
		color.rgb += line(	uv,
							point1, point2,
							thickness,extend)
					//With color
					* ( brighness +
						brighness * vec3(	sin(gt * 1.73),
									cos(gt * 2.19),
									sin(gt * 1.67)));
}

	// Clamp oversaturation
	fragColor = clamp(color, 0.0, 1.0);
}
