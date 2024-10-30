// https://www.shadertoy.com/view/XdlGzr
// Created by inigo quilez - iq/2013
// https://www.youtube.com/c/InigoQuilez
// https://iquilezles.org

// Adapted to use ampcast theme colours.

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = fragCoord.xy / iResolution.xy;
    vec2 uvo = uv;

	vec2 res = floor( 60.0*vec2(1.0,iResolution.y/iResolution.x) );

	vec3 col = iBackgroundColor;
	if( uv.x>0.03 && uv.x<0.97 )
	{
		uv.x = clamp( (uv.x-0.03)/0.94, 0.0, 1.0 );

        vec2 iuv = floor( uv * res )/res;

        float f = 1.0-abs(-1.0+2.0*fract( uv.x * res.x ));
        float g = 1.0-abs(-1.0+2.0*fract( uv.y * res.y ));

    	float fft = texture( iChannel0, vec2(iuv.x,0.25) ).x;
		fft = 0.8*fft*fft;
        if( iuv.y<fft )
        {
		    if( f>0.1 && g>0.1 ) col = iFrameColor;
		    if( f>0.5 && g>0.5 ) col = iFrameColor;
        }

        // float wave = texture( iChannel0, vec2(iuv.x*0.5,0.75) ).x;
        float wave = texture( iChannel0, vec2(iuv.x*0.5,0.75) ).x * 0.75 + 0.25;
        if( abs(iuv.y-wave)<=(1.0/res.y) )
        {
	        col = iColor;
        }

		col = mix( col, iFrameColor, 0. );
	}
	else
	{
		float g = 1.0-abs(-1.0+2.0*fract( uv.y * res.y*1.5 ));
		float f = 1.0-abs(-1.0+2.0*fract( uv.x * res.x + 0.5*floor(uv.y*res.y*1.5)));

		if( g<0.15 || f<0.15 ) col = iFrameColor;
	}

	fragColor = vec4( col/255.0,1.0 );
}
