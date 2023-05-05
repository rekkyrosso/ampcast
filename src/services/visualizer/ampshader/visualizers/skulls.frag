// https://www.shadertoy.com/view/4ltcDj
// nabr
// https://www.shadertoy.com/view/4ltcDj
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.
// https://creativecommons.org/licenses/by-nc-sa/3.0/



#define time iTime
#define _ vec2((fragCoord.xy*2.001-iResolution.xy )/iResolution.y)

#define pi 3.14159265359
#define pi2 6.28318530718

float music(vec2 r){

    // ----- music texture https://www.shadertoy.com/view/Xds3Rr

 	// the sound texture is 512x2
    int tx = int( r.x * 512.0);

	// first row is frequency data (48Khz/4 in 512 texels, meaning 23 Hz per texel)
	float fft  = texelFetch( iChannel0, ivec2(tx,0), 0 ).x ;

    // second row is the sound wave, one texel is one mono sample
    return texelFetch( iChannel0, ivec2(tx,1), 0 ).x;
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // music texture
    float m = (music( abs(_) / 22.001 ))* .5 +.5 ;

    // make a tunnel
    float a = (.5+atan( length ( _ ), 1. ) * pi2);
    float r = clamp(  a - acos(  _.y * 1.18 ) / pi2, 0., 1.);

    // animate
    // https://en.wikipedia.org/wiki/Shadertoy#Usage
    vec2 uv =  vec2( 1./r + 0.2* time, m+a );
    float f = sin(uv.x) * cos ( time  - uv.y);

    // grid overlay
    float grid = abs(0.01/ sin(  f + _.x * 12.) - f * cos( _.y))
        		 - uv.y * abs(0.0015 / sin( f - _.y * 12.) - .081/cos(f*_.x));

    // shade
    vec3 col = (grid * 0.5) + (0.25 * cos(time- 0.25 + (pi2 * grid) + vec3( -pi/2., pi/2.6, pi )));

    fragColor.rgb =  grid + pow(col + 0.2 , 2.2 / vec3( uv.x, uv.y , 1.-(uv.x+uv.y) ) );
    fragColor.a = 1.;
}
