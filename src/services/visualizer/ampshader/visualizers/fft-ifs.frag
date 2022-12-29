// FFT-IFS by nshelton
// https://www.shadertoy.com/view/4lyXWW


//#define MAX_ITER 20
#define MAX_ITER 50

mat3 rotationMatrix(vec3 axis, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    float oc = 1.0 - c;

    return mat3(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
                oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
                oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c);
}

float udBox( vec3 p, vec3 b )
{
  return length(max(abs(p)-b,0.0));
}

mat3 ir;

float DE(vec3 p)
{
	vec3 p_o = p;
    float d = 1e10;

    float s = 1.; //sin(iTime /60.0) / 10.0 + 0.6;
    vec3 t = vec3(0.1 + 0.2 * iResolution.xy/iResolution.xy, 0.1 + 0.1 * sin(iTime/200.));

    float fftVal = texture(iChannel0,vec2(length(p/5.), 0.2)).x *0.1;
    vec3 dim = vec3( fftVal, 0.9, fftVal);

    for ( int i = 0; i < 6; i ++)
    {
        p -= t*s;
        p = (ir * (p-t/s));

     	//d = min	(d, udBox(p*s, dim/s) /s);

 		p = abs(p);



        float circleSize = fftVal + 0.03 * (sin(iTime + length(p_o) * 5.) )
            + 0.01;
        d = min(d, length(p - t) - circleSize/s);
        s *= s;

    }


    return d;
}


float lighting( in vec3 ro, in vec3 rd)
{
    float res = 1.0;
    float t = 0.01;

    float k = 12.0;

    for( int i = 0; i < 2; i++ )
    {
        float h = DE(ro + rd*t);
        if( h<0.001 )
            return 0.0;

        res = min( res,k * h/t );
        t += h;
    }
    return res;
}

vec3 gradient(vec3 p) {
	vec2 e = vec2(0., 0.0001);

	return normalize(
		vec3(
			DE(p+e.yxx) - DE(p-e.yxx),
			DE(p+e.xyx) - DE(p-e.xyx),
			DE(p+e.xxy) - DE(p-e.xxy)
		)
	);
}




//https://iquilezles.org/articles/fog
vec3 applyFog( in vec3  rgb,      // original color of the pixel
               in float distance, // camera to point distance
               in vec3  rayDir,   // camera to point vector
               in vec3  sunDir )  // sun light direction
{
    float b = .9 + 20.0 / float(MAX_ITER);
    float fogAmount = 1.0 - exp( -distance*b );
    float sunAmount = max( dot( rayDir, sunDir ), 0.0 );
    vec3  fogColor  = mix( vec3(0.1,0.1,0.0),
                           vec3(1.0,0.9,0.7),
                           pow(sunAmount,8.0) );
    return mix( rgb, fogColor, fogAmount );
}


void main(void) {
	vec2 uv = gl_FragCoord.xy / iResolution.xy;
    uv -= 0.5;
    float aspect = iResolution.x/iResolution.y;
    uv.x *= aspect;

    vec3 cam = vec3(0,0, - sin(iTime /32. ) - 2.0);
    vec3 ray = normalize( vec3(uv, 1.0));

    vec3 color = vec3(0.1, 0.1, 0.2);
    vec3 p;
    float depth = 0.0;
    bool hit = false;
    float iter = 0.0;

    float fog = 0.0;
    vec3 sun = normalize( vec3(1,1,1));

    ir = rotationMatrix(normalize(vec3(sin(iTime/50.0),sin(iTime/100.0),sin(iTime/150.0))), 1.5 + iTime/30.0);

    mat3 mv = rotationMatrix(vec3(0,1,0), iTime/10.0);

    cam = mv * cam;
    ray = mv * ray;

    for( int i= 0; i < MAX_ITER; i ++) {
        p = depth * ray + cam;
        float dist = DE(p);


        	depth += dist * 0.9;


        if ( dist < 0.001)
        {
        	hit = true;
            break;
        }

        iter ++;
    }
    float fakeAO = 1.0 - iter / float(MAX_ITER);
    vec3 n = gradient(p);


    if (hit) {
    	color = vec3(fakeAO + dot(-ray,n) / 2.0);
    }


	color = applyFog(color, depth, ray, sun) ;

   //color *= vec3(1.0 - fog);

    color = pow(color, vec3(0.6));


	gl_FragColor = vec4(color ,1.0);
}
