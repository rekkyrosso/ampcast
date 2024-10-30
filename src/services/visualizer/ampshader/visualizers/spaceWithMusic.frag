// https://www.shadertoy.com/view/X3K3zG
/*from https://www.shadertoy.com/view/lXy3Ry*/
#define R(p,a,r)mix(a*dot(p,a),p,cos(r))+sin(r)*cross(p,a)
#define H(h)(cos((h)*1.3+vec3(42,43,41))*2.5+.5)
vec3 rotx(vec3 r, float fi) {
    mat3 R = mat3( 1,0,0, 0,cos(fi),-sin(fi), 0,sin(fi),cos(fi) );
return R*r;
}
vec3 roty(vec3 r, float fi) {
mat3 R = mat3( cos(fi),0,sin(fi), 0,1,0, -sin(fi),0,cos(fi) );
return R*r;
}
vec3 rotz(vec3 r, float fi) {

    mat3 R = mat3( cos(fi), -sin(fi), 0,
                    sin(fi), cos(fi),  0,
                    0,       0,        1 );
return R*r;
}
float sdTorus( vec3 p, vec2 t )
{
  vec2 q = vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}

void mainImage(out vec4 O, vec2 C)
{
    O=vec4(0);
   
    vec2 uv = C/iResolution.xy;
    vec4 fragColor2 = vec4(0,0,0,1);
    vec4 O3 = vec4(0,0,0,1);
    vec3 m;
    m.xy = iMouse.xy/iResolution.xy;
    m.z = iMouse.z;
   
    float ss=0.,s=0.,st=1./4.;
    vec3 p, q, r = iResolution, t = iTime*.8+vec3(0,11,33);

    for(float z=0.; z<1.; z+=st) {
    for(float y=0.; y<1.; y+=st) {
    for(float x=0.; x<1.; x+=st) {
    
         s = 2.+10.*texture(iChannel0, vec2(x*y*z,.0)).r;
        ss = 2.*(sin(s * (x - 0.5) + s * (y - 0.5) + s * (z - 0.5)) * 0.01);
        
       
        vec3 c = (vec3(x,y,z)*(s*.6+0.01)) / 320. / 
            length((C+C-r.xy)/r.x+q.xy/(1.3+q.z));
        c = c*pow(c,vec3(3./s));
        
        p = vec3(x+ss,y+ss,z+ss) - 1.5/4.;
        q = p;
        q.yx*=mat2(cos(t.xyzx));
        q.zy*=mat2(cos(t.xyzx+iTime*.5));
       
        O.rgb+=c;
        
        }
       }
  } 
    
	 fragColor2 = O3; //mix(prev,O,.6);
     
    vec3 n1,q2,r2=iResolution,
    d=normalize(vec3((C*2.-r2.xy)/r2.y,1));  
    for(float i=0.,a,s,e,g=0.;
        ++i<110.;
        O.xyz+=mix(vec3(1),H(g*.1),sin(.8))*1./e/8e3
    )
    {
        n1=g*d;
        float a2;
             for(float z=0.; z<1.; z+=st) {
    for(float y=0.; y<1.; y+=st) {
    for(float x=0.; x<1.; x+=st) {
  
  a2=texture(iChannel0, vec2(x*y*z*0.1,.0)).r;
 }}}
        float c22 =sdTorus(n1, vec2(2.5,2.1));
        
        n1.z-=100.;
    
  
        a=30.*c22;
       
        n1=mod(n1-a,a*2.)-a;
        s=4.;
        for(int i=0;i++<8;){
            n1=.3-abs(n1);
           
            n1.x<n1.z?n1=n1.zyx:n1*c22;
            n1.z<n1.y?n1=n1.xzy:n1*c22;
            n1.y>n1.x?n1=n1.zyx:n1*c22;
           
            s*=e=1.4+sin(iTime*.234)*.1;
            n1=abs(n1)*e-
                vec3(
                    5.+cos(iTime*.3+.5*cos(iTime*.3))*3.,
                    120,
                    8.+cos(iTime*.5)*5.
                 )+a2*10.;
         }
         g+=e=length(n1.yz)/s;
        g+=e=length(n1.yx)/s;
    }
}

