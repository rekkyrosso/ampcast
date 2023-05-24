// https://www.shadertoy.com/view/Xd3yWB
#define EPS 0.0001
#define FAR 100.0
#define STEPS 2000

float trig( float dist, float decay, float frequency, float amplitude, float speed )
{

	return exp( -decay * dist ) *
   		   sin( dist * frequency + ( speed ) ) * amplitude;

}

float hash( float n )
{

    return fract( sin( n ) * 45843.349 );

}

float noise( in vec3 x )
{

    vec3 p = floor( x );
    vec3 k = fract( x );

    k *= k * k * ( 3.0 - 2.0 * k );

    float n = p.x + p.y * 57.0 + p.z * 113.0;

    float a = hash( n );
    float b = hash( n + 1.0 );
    float c = hash( n + 57.0 );
    float d = hash( n + 58.0 );

    float e = hash( n + 113.0 );
    float f = hash( n + 114.0 );
    float g = hash( n + 170.0 );
    float h = hash( n + 171.0 );

    float res = mix( mix( mix ( a, b, k.x ), mix( c, d, k.x ), k.y ),
                     mix( mix ( e, f, k.x ), mix( g, h, k.x ), k.y ),
                     k.z
    				 );

    return res;

}

float fbm( in vec3 p )
{

    float f = 0.0;
    f += 0.5000 * noise( p ); p *= 2.02;
    f += 0.2500 * noise( p ); p *= 2.03;
    f += 0.1250 * noise( p ); p *= 2.01;
    f += 0.0625 * noise( p );
    f += 0.0125 * noise( p );
    return f / 0.9375;

}

float map( vec3 p )
{

    float dis = length( p );
    float dec = 0.01;
    float fre = 5.0;
    float amp = 2.1;
    float spe = ( texture( iChannel0, vec2( 0.0, 0.25 ) ).x );
    float tri = trig( dis, dec, fre, amp, spe );
    return length( p ) - 0.0 + tri;

}

vec3 grad( vec3 p )
{

    vec2 e = vec2( 0.0, EPS );
    return vec3( map( p + e.xyy ) - map( p - e.xyy ),
                 map( p + e.yxy ) - map( p - e.yxy ),
                 map( p + e.yyx ) - map( p - e.yyx )
                );

}

float softShadows( in vec3 ro, in vec3 rd )
{

	float res = 1.0;
    for( float t = 0.1; t < 8.0; ++t )
    {

        float h = map( ro + rd * t );
        if( h < EPS ) return 0.0;
        res = min( res, 8.0 * h / t );
        t += h;

    }

    return res;

}

vec3 shade( vec3 ro, vec3 rd, float t )
{


    vec3 p = ro + rd * t;
    vec3 n = normalize( grad( p ) );
    vec3 col;
    vec3 lig = normalize( vec3( 0.3, 0.8, 0.7 ) );
    vec3 ref = reflect( rd, lig );

    float wav = ( texture( iChannel0, vec2( 0.0, 0.25 ) ).x );
    float amb = 0.5 + 0.5 * n.y;
    float sha = softShadows( p, lig );
    float dif = max( 0.0, dot( n, lig ) );
    float spe = pow( clamp( dot( lig, ref ), 0.0, 1.0 ), 16.0 );

    col += vec3( 0.8, 0.7, 0.8 ) * amb;
    col += dif * vec3( 0.8, 0.7, 0.8 ) * sha;
    col += 1.0 * spe;
    col *= mix( vec3( 0.2, 0.4, 0.6 ), vec3( 0.4, 0.2, 0.2 ), fbm( p + iTime + wav ) );
    return col;

}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from 0 to 1)
    vec2 uv = ( -iResolution.xy + 2.0 * fragCoord ) / iResolution.y;

    //vec3 ro = 3.0 * vec3( sin( iTime ), 0.0, cos( iTime ) );
    //vec3 rd = normalize( vec3( uv, -1.0 ) );
    vec3 ro = vec3( 0.0, 0.0, 3.0 );
    vec3 ww = normalize( vec3( 0.0 ) - ro );
    vec3 vv = normalize( cross( vec3( 0.0, 1.0, 0.0 ), ww ) );
    vec3 uu = normalize( cross( ww, vv ) );
    vec3 rd = normalize( uv.x * uu + uv.y * vv + 1.5 * ww );

    float t = 0.0; float d = EPS;
    for( int i = 0; i < STEPS; ++i )
    {

        d = map( ro + rd * t );
        if( d < EPS || t > FAR ) break;
        t += d;

    }

    // Time varying pixel color
    vec3 col = d < EPS ? shade( ro, rd, t ) : vec3( 0.0 );

    // Output to screen
    fragColor = vec4(col,1.0);
}
