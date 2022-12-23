// Gameboy by Inigo Quilez
// https://www.shadertoy.com/view/XdlGzr


// Created by inigo quilez - iq/2013
// https://www.youtube.com/c/InigoQuilez
// https://iquilezles.org

float text( vec2 p )
{
    // trick for encoding fonts from CPU
	p.x += 0.2*floor(10.0*(0.5+0.5*sin(time)))/10.0;

	float x = floor( p.x*100.0 ) - 23.0;
	float y = floor( p.y*100.0 ) - 82.0;

	if( y<0.0 || y> 5.0) return 0.0;
	if( x<0.0 || x>70.0) return 0.0;

    float v = 0.0;

         if( x>63.5 ) {           v=12288.0;
	                    if(y>2.5) v=30720.0;
	                    if(y>3.5) v=52224.0; }
	else if( x>47.5 ) {           v=12408.0;
	                    if(y>0.5) v=12492.0;
	                    if(y>4.5) v=64632.0; }
	else if( x>31.5 ) {           v=64716.0;
	                    if(y>0.5) v=49360.0;
	                    if(y>1.5) v=49400.0;
	                    if(y>2.5) v=63692.0;
	                    if(y>3.5) v=49356.0;
	                    if(y>4.5) v=64760.0; }
	else if( x>15.5 ) {           v=40184.0;
	                    if(y>0.5) v=40092.0;
	                    if(y>2.5) v=64668.0;
	                    if(y>3.5) v=40092.0;
	                    if(y>4.5) v=28920.0; }
	else	          {           v=30860.0;
    	                if(y>0.5) v=40076.0;
    	                if(y>1.5) v= 7308.0;
    	                if(y>2.5) v=30972.0;
    	                if(y>3.5) v=49292.0;
    	                if(y>4.5) v=30860.0; }

	return floor( mod(v/pow(2.0,15.0-mod( x, 16.0 )), 2.0) );
}

void main(void) {
	vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec2 uvo = uv;

	vec2 res = floor( 60.0*vec2(1.0,resolution.y/resolution.x) );

	vec3 col = vec3(131.0, 145.0, 0.0);
	if( uv.x>0.03 && uv.x<0.97 )
	{
		uv.x = clamp( (uv.x-0.03)/0.94, 0.0, 1.0 );

        vec2 iuv = floor( uv * res )/res;

        float f = 1.0-abs(-1.0+2.0*fract( uv.x * res.x ));
        float g = 1.0-abs(-1.0+2.0*fract( uv.y * res.y ));

    	float fft = texture2D( spectrum, vec2(iuv.x,0.25) ).x;
		fft = 0.8*fft*fft;
        if( iuv.y<fft )
        {
		    if( f>0.1 && g>0.1 ) col = vec3(40.0,44.0,4.0);
		    if( f>0.5 && g>0.5 ) col = vec3(74.0,82.0,4.0);
        }


        float wave = texture2D( spectrum, vec2(iuv.x*0.5,0.75) ).x;
        if( abs(iuv.y-wave)<=(1.0/res.y) )
        {
	        col = vec3(185.0, 200.0, 90.0);
        }

		float t = text( uvo );
		col = mix( col, vec3(40.0,44.0,4.0), t );
	}
	else
	{
		float g = 1.0-abs(-1.0+2.0*fract( uv.y * res.y*1.5 ));
		float f = 1.0-abs(-1.0+2.0*fract( uv.x * res.x + 0.5*floor(uv.y*res.y*1.5)));

		if( g<0.15 || f<0.15 ) col = vec3(40.0,44.0,4.0);
	}

	gl_FragColor = vec4( col/255.0,1.0 );
}