// https://www.shadertoy.com/view/sslXzX
// ----------------CAUTION!!!--- FLASHING BRIGHT LIGHTS!!!-------------------------



// Credits - fractal zoom with smooth iter count adapted from - iq (Inigo quilez) - https://iquilezles.org/articles/msetsmooth
// Koch Snowflake symmetry from tutorial by Martijn Steinrucken aka The Art of Code/BigWings - 2020 - https://www.youtube.com/watch?v=il_Qg9AqQkE&ab_channel=TheArtofCode
//music - Sajanka (Official) Sajanka - Sun Is Coming

//Some notes - color is determined by date and not time - hour of day dependent.
//Move the mouse on the Y axis to change the symmetry.

//----------------------------------------------------------------------------------

//uncomment to sample audio input from MIC instead of SoundCloud.
//#define MIC_INPUT

//comment to make it less trippy and noisy.
//#define EXTRA_DMT


#define PI 3.14159265359



#define date iDate
#define time iTime
#define resolution iResolution

float freqs[4];


vec2 rot(vec2 p,float a){

    float c = cos(a);
    float s = sin(a);

    mat2 m = mat2(c,-s,s,c);

    p*=m;
    return p  ;
}

float localTime(){

float d = date.w / date.x;
return d;

}

vec3 randomCol(float sc){

 float d = localTime();
	float r = sin(sc * 1. * d)*.5+.5;
	float g = sin(sc * 2. * d)*.5+.5;
	float b = sin(sc * 4. * d)*.5+.5;

	vec3 col = vec3(r,g,b);
	col = clamp(col,0.,1.);

	return col;
	}


//--------------------------------------------------mandelbrot generator-----------https://iquilezles.org/articles/msetsmooth

	float mandelbrot(vec2 c )
{
    #if 1
    {
        float c2 = dot(c, c);
        // skip computation inside M1 - https://iquilezles.org/articles/mset1bulb
        if( 256.0*c2*c2 - 96.0*c2 + 32.0*c.x - 3.0 < 0.0 ) return 0.0;
        // skip computation inside M2 - https://iquilezles.org/articles/mset2bulb
        if( 16.0*(c2+2.0*c.x+1.0) - 1.0 < 0.0 ) return 0.0;
    }
    #endif


    const float B = 128.0;
    float l = 0.0;
    vec2 z  = vec2(0.0);
    for( int i=0; i<256; i++ )
    {
        z = vec2( z.x*z.x - z.y*z.y, 2.0*z.x*z.y ) + c;
        if( dot(z,z)>(B*B) ) break;
        l += 1.0;
    }

    if( l>255.0 ) return 0.0;


    // equivalent optimized smooth interation count
    float sl = l - log2(log2(dot(z,z))) + 4.0;



     return sl;
 }


vec3 mandelbrotImg(vec2 p)
{

    //uncomment to see unmaped set
	//p = (-resolution.xy + 2.0*gl_FragCoord.xy)/resolution.y;
    float mtime =  time;
    mtime -= freqs[3];
    float zoo = 0.62 + 0.38*cos(.1*mtime);
   float coa = cos( 0.015*(1.0-zoo)*mtime );
   float sia = sin( 0.015*(1.0-zoo)*mtime );
   zoo = pow( zoo,6.0);
   vec2 xy = vec2( p.x*coa-p.y*sia, p.x*sia+p.y*coa);
   vec2 c = vec2(-.745,.186) + xy*zoo;

        float l = mandelbrot(c);


	vec3 col1 = 0.5 + 0.5*cos( 3.0 + l*.15 + randomCol(.1));
    #ifdef EXTRA_DMT
    vec3 col2 = 0.5 + 0.5*cos( 3.0 + l*.15 / randomCol(.1));
    #else
    vec3 col2 = 0.5 + 0.5*cos( 3.0 + l*.15 * randomCol(.1));
    #endif
    vec3 col = mix(col1,col2,sin(mtime)*.5+.5);




return col;
}

//-----------------functions-----------

float remap(float a1, float a2 ,float b1, float b2, float t)
{
	return b1+(t-a1)*(b2-b1)/(a2-a1);
}


vec2 remap(float a1, float a2 ,float b1, float b2, vec2 t)
{
	return b1+(t-a1)*(b2-b1)/(a2-a1);
}


vec4 remap(float a1, float a2 ,float b1, float b2, vec4 t)
{
	return b1+(t-a1)*(b2-b1)/(a2-a1);
}





vec2 N(float angle) {
    return vec2(sin(angle), cos(angle));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord)
{
//--------get soundtrack frequencies----


    #ifdef MIC_INPUT
	freqs[0] = texture( iChannel1, vec2( 0.01, 0.25 ) ).x;
	freqs[1] = texture( iChannel1, vec2( 0.07, 0.25 ) ).x;
	freqs[2] = texture( iChannel1, vec2( 0.15, 0.25 ) ).x;
	freqs[3] = texture( iChannel1, vec2( 0.30, 0.25 ) ).x;
    #else
    freqs[0] = texture( iChannel0, vec2( 0.01, 0.25 ) ).x;
	freqs[1] = texture( iChannel0, vec2( 0.07, 0.25 ) ).x;
	freqs[2] = texture( iChannel0, vec2( 0.15, 0.25 ) ).x;
	freqs[3] = texture( iChannel0, vec2( 0.30, 0.25 ) ).x;
    #endif
    float avgFreq = (freqs[0] +freqs[1] +freqs[2] +freqs[3])/4.;

//--------image part---------
    vec2 uv = (fragCoord.xy-.5*resolution.xy)/resolution.y;
	vec2 mouse = 1. - iMouse.xy/resolution.xy; // 0 1
	vec2 ouv = uv;
    //uv.y -= .05;

    uv = rot(uv,(sin(iTime*.1) / freqs[0]*.1  ) * PI  ) ;
	uv *= 4.0 - (avgFreq * 1.5  );

    uv.x = abs(uv.x);

    vec3 col = vec3(0);
    float d;

    float angle = 0.;
    vec2 n = N((5./6.)*3.1415);

    uv.y += tan((5./6.)*3.1415)*.5;
   	d = dot(uv-vec2(.5, 0), n);
    uv -= max(0.,d)*n*2.;

    float scale = 1.;

    n = N( freqs[0]*(2./3.)*3.1415);
    uv.x += .5;
    for(int i=0; i<10; i++) {
        uv *= 3.;
        scale *= 3.;
        uv.x -= 1.5;

        uv.x = abs(uv.x);
        uv.x -= .5;
        d = dot(uv, n);
        uv -= min(0.,d)*n*2.;
    }

    d = length(uv/ clamp(freqs[2],0.1,.9 )- vec2(clamp(uv.x,-1., 1.), 0));
    col += smoothstep(10./resolution.y, .0, d/scale);
    uv /= scale;	// normalization


	vec3 manCol = mandelbrotImg(uv);
	 col += manCol;


 		// vignette effect
	  col *= 1.0 - 0.5*length(uv *0.5) * freqs[1];


    fragColor = vec4( col,1.0);
}
