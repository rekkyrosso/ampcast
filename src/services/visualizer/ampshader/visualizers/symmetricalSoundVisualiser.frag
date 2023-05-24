// https://www.shadertoy.com/view/MdlSzB
void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
	if(uv.x > 0.5)
	{
		uv -= 0.5;
		uv *= 2.;
	}
	else
	{
		uv *= 2.;
		uv = 1. - uv;
	}

	float fft  = texture( iChannel0, vec2(uv.x,0.25) ).x;
	float dr = length(uv);
	float radius = 1.8;

	vec3 col = vec3(0.);
	if( abs(uv.y)<fft )
	{
		col = mix( vec3(0.), vec3( fft, fft*(1.0-fft), 1.0-fft ) * fft * fft, fft);
	}


	fragColor.x = 0.5 - smoothstep(dr, 0.0, radius * col.x);
	fragColor.y = 1.0 - smoothstep(dr, 0.0, radius * col.z);
	fragColor.z = 1.0 - smoothstep(dr, 0.0, radius * col.x);
}
