// https://www.shadertoy.com/view/MtB3zd
//-----------------------------------------------------
// Radial Sound Visualizer                     5/2015
// Based on 'Input-Sound' by IQ
// now switch between 2 views
//-----------------------------------------------------

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // create pixel coordinates
	vec2 uv = (fragCoord.xy / iResolution.xy);

    // for radial view click to left side,
    // for xy view click to right side
    if (iMouse.x / iResolution.x < 0.5)
      uv = vec2( 2.0*length(uv-0.5), atan(abs(uv.y-0.5), abs(uv.x-0.5)) );

    float value, fft, wave;
    value = abs(uv.x-0.5);

    // first texture row is frequency data
	fft  = texture( iChannel0, vec2(value,0.25) ).x;

  	// second texture row is the sound wave
	wave = texture( iChannel0, vec2(value,0.75) ).x;

	// convert frequency to colors
	vec3 col = vec3( 4.0*fft*(1.0-fft)*(0.2+0.4*sin(iTime))
                    , fft+0.3*sin(0.22*iTime)
                    , 0.5-fft-0.4*sin(0.33*iTime) ) * fft;

    // add wave form on top
	value = (uv.y < 1.0) ? uv.y : uv.y - 1.0;
	col += 0.8 -  smoothstep( 0.0, 0.15, abs(wave - value) );

	// output final color
	fragColor = vec4(col,1.0);
}
