// https://www.shadertoy.com/view/XXXyRH
// Neon Pyramid Visualzier by 0rblivius

// Source: https://shadertoy.com/view/4Xfyz8 
//         https://www.shadertoy.com/view/stsXDl 
//         https://www.shadertoy.com/view/MdS3Rw

#define R(p,a,r)mix(a*dot(p,a),p,cos(r))+sin(r)*cross(p,a)
#define H(h)(cos((h)*6.3+vec3(0,23,21))*.5+.5)
// ray marching
const int max_iterations = 128;
const float stop_threshold = 0.001;
const float grad_step = 0.01;
const float clip_far = 1000.0;

// ao
const int   ao_iterations = 5;
const float ao_step = 0.2;
const float ao_scale = 1.46;

// math
const float PI = 3.14159265359;
const float DEG_TO_RAD = PI / 180.0;
const float GOLDEN = 1.6180339887499;

const float r = 1.0 * 2.0 * 1.414214 / 1.732051;
const vec2 h = vec2( r, 0.01 );
const vec2 h2 = h * vec2( 0.73, 4.0 );

const vec3 cc0 = vec3( 0.333333, -0.333333, -0.333333 );
const vec3 cx0 = vec3( 0.707107, 0.000000, 0.707107 );
const vec3 cy0 = vec3( 0.408248, 0.816496, -0.408248 );
const vec3 cz0 = vec3( -0.577350, 0.577350, 0.577350 );
		
const vec3 cc1 = vec3( -0.333333, -0.333333, 0.333333 );
const vec3 cx1 = vec3( 0.707107, 0.000000, 0.707107 );
const vec3 cy1 = vec3( -0.408248, 0.816496, 0.408248 );
const vec3 cz1 = vec3( -0.577350, -0.577350, 0.577350 );
		
const vec3 cc2 = vec3( -0.333333, 0.333333, -0.333333 );
const vec3 cx2 = vec3( 0.707107, 0.707107, 0.000000 );
const vec3 cy2 = vec3( -0.408248, 0.408248, 0.816496 );
const vec3 cz2 = vec3( 0.577350, -0.577350, 0.577350 );
		
const vec3 cc3 = vec3( 0.333333, 0.333333, 0.333333 );
const vec3 cx3 = vec3( 0.000000, 0.707107, -0.707107 );
const vec3 cy3 = vec3( -0.816496, 0.408248, 0.408248 );
const vec3 cz3 = vec3( 0.577350, 0.577350, 0.577350 );

const vec3 c0 = vec3( 0.333333, 0.333333, -0.333333 );
const vec3 x0 = vec3( 0.572061, 0.218508, 0.790569 );
const vec3 y0 = vec3( -0.582591, 0.786715, 0.204124 );
const vec3 z0 = vec3( -0.577350, -0.577350, 0.577350 );

const vec3 c1 = vec3( 0.206011, -0.539344, 0.000000 );
const vec3 x1 = vec3( 0.572061, 0.218508, 0.790569 );
const vec3 y1 = vec3( -0.738528, -0.282093, 0.612372 );
const vec3 z1 = vec3( 0.356822, -0.934172, 0.000000 );

const vec3 c2 = vec3( -0.539344, 0.000000, -0.206011 );
const vec3 x2 = vec3( -0.218508, 0.790569, 0.572061 );
const vec3 y2 = vec3( -0.282093, -0.612372, 0.738528 );
const vec3 z2 = vec3( 0.934172, 0.000000, 0.356822 );

const vec3 c3 = vec3( 0.000000, 0.206011, 0.539344 );
const vec3 x3 = vec3( -0.790569, 0.572061, -0.218508 );
const vec3 y3 = vec3( -0.612372, -0.738528, 0.282093 );
const vec3 z3 = vec3( -0.000000, 0.356822, 0.934172 );

// distance function

// iq's Signed Triangular Prism distance function
float dist_triXY( vec3 p, vec2 h ) {
    vec3 q = abs(p);
    return max(q.z-h.y,max(q.x*0.866025+p.y*0.5,-p.y)-h.x*0.7);
}

float dist_tri( vec3 v, vec3 c, vec3 x, vec3 y, vec3 z ) {
	v -= c;	
  
	v = vec3( dot( v, (x) ), dot( (v), y ), dot( v, z ) );
	return ( dist_triXY( v, h  ), dist_triXY( v, h2 ) );
}

float dist_field( vec3 v ) {
	float b0, b1, b2, b3, b4;
	
	// cube

	float k = 1.+texture(iChannel0, vec2(0.1,0.0)).r;
    float r = 1.+1.3*texture(iChannel0, vec2(0.25,0.0)).r;
    float t = 1.+1.3*texture(iChannel0, vec2(0.5,0.0)).r;
    float w = 1.+1.3*texture(iChannel0, vec2(0.75,0.0)).r;
	// xyz
	{
        v.zx = -v.zx;	
    
		float d0 = dist_tri( v/k, c0*k, x0*k, y0*k, z0*k );
		float d1 = dist_tri( v/r, c1*r, x1*r, y1*r, z1*r );
		float d2 = dist_tri( v/t, c2*t, x2*t, y2*t, z2*t );
		float d3 = dist_tri( v/w, c3*w, x3*w, y3*w, z3*w );
		b1 = min( min( d0, d1 ), min( d2, d3 ) );
	}
	
	
	// yz
	

	
	return b1;
}

// ao
float ao( vec3 v, vec3 n ) {
	float sum = 0.0;
	float att = 1.0;
	float len = ao_step;
	for ( int i = 0; i < ao_iterations; i++ ) {
		sum += ( len - dist_field( v + n * len ) ) * att;
		
		len += ao_step;
		
		att *= 0.5;
	}
	
	return max( 1.0 - sum * ao_scale, 0.0 );
}


// get gradient in the world
vec3 gradient( vec3 v ) {
	const vec3 dx = vec3( grad_step, 0.0, 0.0 );
	const vec3 dy = vec3( 0.0, grad_step, 0.0 );
	const vec3 dz = vec3( 0.0, 0.0, grad_step );
	return normalize (
		vec3(
			dist_field( v + dx ) - dist_field( v - dx ),
			dist_field( v + dy ) - dist_field( v - dy ),
			dist_field( v + dz ) - dist_field( v - dz )			
		)
	);
}

// ray marching
float ray_marching( vec3 origin, vec3 dir, float start, float end ) {
	float depth = start;
	for ( int i = 0; i < max_iterations; i++ ) {
		float dist = dist_field( origin + dir * depth );
		if ( dist < stop_threshold ) {
			return depth;
		}
		depth += dist;
		if ( depth >= end) {
			return end;
		}
	}
	return end;
}

// shadow
float shadow( vec3 v, vec3 light ) {
	vec3 lv = v - light;
	float end = length( lv );
	lv /= end;
	
	float depth = ray_marching( light, lv, 0.0, end );
	
	return step( end - depth, 0.02 );
}

// phong shading
vec3 shading( vec3 v, vec3 n, vec3 eye ) {
	// ...add lights here...
	
	vec3 final = vec3( 0.0 );
	
	vec3 ev = normalize( v - eye );
	vec3 ref_ev = reflect( ev, n );
	
	// light 0
	{
		vec3 light_pos   = vec3( -15,-15,-15 );
	
		vec3 vl = normalize( light_pos - v );
	
		float diffuse  = max( 0.0, dot( vl, n ) );
		float specular = max( 0.0, dot( vl, ref_ev ) );
		specular = pow( specular, 3.0 );
		
		final += ( diffuse * 0.1 + specular * 0.9 ) ; 
	}
	
	// light 1
	{
		vec3 light_pos   = vec3(15,15,15);
	
		vec3 vl = normalize( light_pos - v );
	
		float diffuse  = max( 0.0, dot( vl, n ) );
		float specular = max( 0.0, dot( vl, ref_ev ) );
		specular = pow( specular, 3.0 );
		
		final += ( diffuse * 0.1 + specular  * 0.9 ); 
	}

	final += ao( v, n ) * vec3( .1 );
	
	return final;
}

// pitch, yaw
mat3 rot3xy( vec2 angle ) {
	vec2 c = cos( angle );
	vec2 s = sin( angle );
	
	return mat3(
		c.y      ,  0.0, -s.y,
		s.y * s.x,  c.x,  c.y * s.x,
		s.y * c.x, -s.x,  c.y * c.x
	);
}

// get ray direction
vec3 ray_dir( float fov, vec2 size, vec2 pos ) {
	vec2 xy = pos - size * 0.5;

	float cot_half_fov = tan( ( 90.0 - fov * 0.5 ) * DEG_TO_RAD );	
	float z = size.y * 0.5 * cot_half_fov;
	
	return normalize( vec3( xy, -z ) );
}


mat3 matRotate( vec3 xyz ) {
    vec3 si = sin(xyz);
    vec3 co = cos(xyz);
    
    return mat3(    co.y*co.z,                co.y*si.z,               -si.y,
                    si.x*si.y*co.z-co.x*si.z, si.x*si.y*si.z+co.x*co.z, si.x*co.y,
                    co.x*si.y*co.z+si.x*si.z, co.x*si.y*si.z-si.x*co.z, co.x*co.y );
}

vec3 aces(vec3 x) {
    return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
    }

vec3 hueShift(vec3 col, float shift){
vec3 m = vec3(cos(shift), -sin(shift) * .57735, 0);
m = vec3(m.xy, -m.y) + (1. - m.x) * .33333;
return mat3(m, m.zxy, m.yzx) * col;
}



void mainImage(out vec4 O, vec2 C)
{
    vec4 OX=vec4(0);
    vec3 n1,q,r=iResolution,
    d=normalize(vec3((C*2.-r.xy)/r.y,1));  
    for(float i=0.,a,s,e,g=2.;
        ++i<20.;
        OX.xyz+=mix(vec3(0.5,0.2,1.),H(g*.1),.28)*3./e/8e3
    )
    {
        n1=g*d;
   
   float snd = texture(iChannel0, vec2(i/80.,0.25)).r+
            texture(iChannel0, vec2(i/100.+0.01,0.25)).r;
            
    for(float j=0.;j<10.;j++){
    n1.y+=iTime;
    j+=iTime+length(n1);
     n1.xz*=mat2(cos(j),sin(j),-sin(j),cos(j) );
          }
        a=30.;
        n1=mod(n1-a,a*2.)-a;
        s=5.+snd*snd;
  
   
        for(float i=0.;i++<10.;){
      
            n1=.3-abs(n1);
          n1.x<n1.z?n1=n1.zyx:n1;
            n1.z<n1.y?n1=n1.xzy:n1;
            s*=e=1.7+sin(iTime*.04)*.1;
            n1=abs(n1)*e-
                vec3(
                    10.*3.,
                    120,
                    8.*5.
                 );
         }
         g+=e=length(n1.yxz)/s;
    }
 
          
          
          
    O=vec4(0,0,0,1);
    vec4 O2=vec4(O.rgb,1.);
    vec3 dir = ray_dir( 45.0, iResolution.xy, C.xy );
	
	// default ray origin
	vec3 eye = vec3( 0.0, 0.0, 4.4 );

	// rotate camera
	//mat3 rot = rot3xy( vec2( -DEG_TO_RAD * 30.0, iTime ) );
    mat3 rot2 = matRotate( vec3(  DEG_TO_RAD * 10.0, iTime*.5, iTime*.4 ));
	dir = rot2 * dir;
	eye = rot2 * eye;
	
	// ray marching
	float depth = ray_marching( eye, dir, 0.0, clip_far );
	if ( depth >= clip_far ) {
		O2 = vec4( 0.0, 0.0, 1.0, 1.0 );
    } else if (depth > 0.0) {
		// shading
		vec3 pos = eye + dir * depth;
		vec3 n = gradient( pos );
		O2 = vec4( shading( pos, n, eye ) * 2.0, 1.0 );
    }
    vec3 p;
    q = vec3(0);
    r=iResolution,
    d=normalize(vec3((C*2.-r.xy)/r.y,1)); 
    
   float snd = 0.0;
    for(float i=0.,a,s,e,g=0.;
        ++i<60.;
        O.xyz+=mix(vec3(.5,.6,.7),H(g*1.1*d),.9)/e/8e2
    )
    {
        p=g*d;
        snd = texture(iChannel0, vec2(i/60.,0.25)).r+
            texture(iChannel0, vec2(i/100.+0.01,0.25)).r;
        p.z += iTime*10.;
        a=20.;
        p=mod(p-a,a*2.)-a;
        s=5.;
        for(int i=0;i++<8;){
            p=0.5-abs(p);
            p.x<p.z?p=p.zyx:p;
            p.z<p.y?p=p.xzy:p;
            s*=e=1.7+sin(iTime*.011)*.15;
            p=abs(p)*e-
                vec3(
                    5.*3.,
                    150,
                    (6.*snd+8.)*5.
                 )*(O2.xyz*2.);
         }
         g+=e=length(p.xyzz)/s;
    }
    O.rgb=(hueShift(O.rgb*O.rgb,-iTime*.2) + 
               0.2 * hueShift(OX.rgb*OX.rgb,iTime*.2));
}