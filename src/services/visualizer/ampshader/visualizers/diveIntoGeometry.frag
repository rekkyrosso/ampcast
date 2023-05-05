// https://www.shadertoy.com/view/Ddc3zs
precision mediump float;

vec3 Field(vec3 Pos)
{
	Pos *= .1;

	for (int i = 0; i < 5; ++i)
	{
		Pos = abs(fract((Pos.yzx * mat3(.8, .6, .0, -.6, .8, .0, .0, .0, 1.)) + vec3(.123, .456, .789) * float(i)) - .5) * 2.;
	}

	Pos *= Pos;
	return sqrt(Pos + Pos.yzx) * .33;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
    vec3 Direction = vec3((fragCoord.xy - iResolution.xy * .5) / iResolution.x, 1.);
	vec3 Position = vec3(.5, .8, iTime * 3.);
	vec3 Color;

    // Sound (see shadertoy.com/view/Xds3Rr)
    float fft_SnareDrum;

    for (int n = 95; n<512; n += 100)
    {
        fft_SnareDrum += texelFetch(iChannel0, ivec2(n, 0), 0).x;
    }

    fft_SnareDrum /= 2.;

	for (int i = 0; i < 50; ++i)
	{
		vec3 f2 = Field(Position + (fft_SnareDrum * .5));
		Position += Direction * min(min(f2.x, f2.y), f2.z);
		Color += float(50 - i) / (f2 + .005);
	}

	Color = vec3(1. - 1. / (1. + Color * (-.06 * .0004)));
	Color *= Color * (fft_SnareDrum * 2.);
	fragColor = vec4(Color.r * 6., .0, fft_SnareDrum, 1.);
}
