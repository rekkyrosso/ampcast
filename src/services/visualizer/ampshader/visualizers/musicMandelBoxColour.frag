// Music MandelBox Colour by pixelbeast
// https://www.shadertoy.com/view/4s33Rj


// Iain Melvin, 2015
// fft distortions of mandlebox 3d, colour
// with help from:
// https://www.shadertoy.com/view/XsB3Rm  // Original Raymarch tutorial (iq)
// https://www.shadertoy.com/view/ldSGRK  // for mandlebox formula (klems)
// Raymarch tutorial: - iq/2013


float mandel3D(vec3 z,float fft) {
  const float scale=3.5; //2.0; // -1.5
  const float r=0.5;
  const float f=1.125;
  vec3 offset = z;
  const int niter = 13;
  float dr = 1.0;
  for (int i=0;i<niter;i++){
	//fold
	z = clamp(z, -1.0, 1.0) * 2.0 - z;
	//warp
	float l = length(z);
	if (l<r){
	  z/=r*r;
	}else if (l<1.0){
	  z/=l*l;
	}
	z*=scale;
	dr = dr * abs(scale) + 1.0;
	// scale by fft
	float fft_scale = 1.0-(fft*0.34);
	z*=fft_scale;
	//dr = dr * fft_scale; // I think there is something to do here
	z+=offset;
  }
  float zr = length(z);
  return zr / abs(dr);
}

vec2 map( in vec3 pos ) {
    float d = length(pos);
    float fft = 0.8*texture(iChannel0, vec2((d/32.0),0.3) )[0];
	return vec2(mandel3D(pos*1.5,fft),fft);
}

vec2 castRay( in vec3 ro, in vec3 rd, in float maxd ){
	float precis = 0.015;
    float h=precis*2.0;
    float t = 0.0;
    float m = -1.0;
    for( int i=0; i<120; i++ )
    {
        if( abs(h)<precis||t>maxd ) break;
        t += h;
	    vec2 res = map( ro+rd*t );
        h = res.x; //dist to solid
	    m = res.y; //fft
    }
    if (t>maxd) { t=-0.5; m=0.0; }
    return vec2( t, m );
}

vec3 calcNormal( in vec3 pos ){
	vec3 eps = vec3( 0.001, 0.0, 0.0 );
	vec3 nor = vec3(
	    map(pos+eps.xyy).x - map(pos-eps.xyy).x,
	    map(pos+eps.yxy).x - map(pos-eps.yxy).x,
	    map(pos+eps.yyx).x - map(pos-eps.yyx).x );
	return normalize(nor);
}

// iq's smooth hsv to rgb
vec3 hsv2rgb( in vec3 c ) {
    vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );
	rgb = rgb*rgb*(3.0-2.0*rgb);
	return c.z * mix( vec3(1.0), rgb, c.y);
}

vec3 render( in vec3 ro, in vec3 rd ) {
    vec3 col = vec3(0.0);
    vec2 res = castRay(ro,rd,15.0);
    float t = res.x; // dist to func
	float m = res.y; // fft intense at collision
    vec3 pos = ro + t*rd;
    vec3 nor = calcNormal( pos );
    if (t==-0.5) { nor=vec3(1.0,0.0,0.0); }

	col = hsv2rgb(vec3(m*2.0,1.0,1.0)); // hue sat lum

    float ao = 1.0;

	vec3 lig = normalize( vec3(-0.6, 0.7, -0.5) );
	float amb = clamp( 0.5+0.5*nor.y, 0.0, 1.0 );
    float dif = clamp( dot( nor, lig ), 0.0, 1.0 );
    float bac = clamp( dot( nor, normalize(vec3(-lig.x,0.0,-lig.z))), 0.0, 1.0 )*clamp( 1.0-pos.y,0.0,1.0);
	float sh = 1.0;

	vec3 brdf = vec3(0.0);
	brdf += 0.20*amb*vec3(0.10,0.11,0.13)*ao;
    brdf += 0.20*bac*vec3(0.15,0.15,0.15)*ao;
    brdf += 2.20*dif*vec3(1.00,0.90,0.70);

	float pp = clamp( dot( reflect(rd,nor), lig ), 0.0, 1.0 );
	float spe = sh*pow(pp,16.0);
	float fre = ao*pow( clamp(1.0+dot(nor,rd),0.0,1.0), 2.0 );

	col = col*brdf + vec3(1.0)*col*spe + 0.2*fre*(0.5+0.5*col);

	return vec3( clamp(col,0.0,10.0) );
}

void main(void) {
	vec2 q = gl_FragCoord.xy/iResolution.xy;
    vec2 p = -1.0+2.0*q;
	p.x *= iResolution.x/iResolution.y;
    vec2 mo = iResolution.xy/iResolution.xy;

	float time = -55.0; //+ time;

    vec3 d = vec3(0.25*mo.x,0.25*mo.y,0.0);

    d.x += 5.5*(1.0-cos(0.6*time));
    d.y += 2.5*(1.0-cos(0.05*time));

	// camera
	vec3 ro = vec3( d.x, d.y, 6.0 );
    vec3 ta = vec3( -0.0, -0.0, 0.0 );

	// camera tx
	vec3 cw = normalize( ta-ro );
	vec3 cp = vec3( 0.0, 1.0, 0.0 );
	vec3 cu = normalize( cross(cw,cp) );
	vec3 cv = normalize( cross(cu,cw) );
	vec3 rd = normalize( p.x*cu + p.y*cv + 2.0*cw );

    vec3 col = render( ro, rd );
	col = sqrt( col );

    gl_FragColor=vec4( col, 1.0 );
}
