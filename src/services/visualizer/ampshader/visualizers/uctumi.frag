// https://www.shadertoy.com/view/3slfR4
const float det=.005;
const float maxdist=13.;
const float pi=3.1459;
const vec4 blue=vec4(0.,0.3,1.,0.);
const vec4 cyan=vec4(.2,.7,1.5,1.);
const vec4 pink=vec4(1.,0.,1.,2.);
const vec4 yellow=vec4(1.,1.,0.,3.);
const vec4 green=vec4(0.,1.,0.,4.);
const vec4 white=vec4(.8, .8,.8,5.);
float id1,id2,id3,id4;
float gdist;
float hitplane;
float rotspeed;
#define iTime (iChannelTime[0]+step(iChannelTime[0],119.5)*step(118.5,iChannelTime[0])*abs(.5-fract(iChannelTime[0]*2.)))

float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}

mat2 rot(float a) {
	float s=sin(a), c=cos(a);
    return mat2(c,s,-s,c);
}


float eq(float a, float b) {
	return step(abs(a-b),.001);
}

float box( vec3 p, vec3 c)
{
  vec3 q = abs(p) - c + .05;
  return length(max(q,0.0)) + min(max(q.x,max(q.y,q.z)),0.0) - .05;
}

vec4 radialfold(vec3 p, float s, float o) {
	float id=floor(atan(p.x,p.z)/pi*s*.5+o+s*.5);
	p=vec3(abs(.5-fract(atan(p.x,p.z)/pi*s*.5+o)),p.y,length(p.xz));
    return vec4(p,id);
}

float ring1(vec3 p) {
	vec4 pp=radialfold(p,32.,0.);
    id1=0.;
    id1+=yellow.a*eq(pp.a,0.);
    id1+=yellow.a*eq(pp.a,6.);
    id1+=yellow.a*eq(pp.a,23.);
    id1+=pink.a*eq(pp.a,3.);
    id1+=pink.a*eq(pp.a,15.);
    id1+=pink.a*eq(pp.a,29.);
    id1+=green.a*eq(pp.a,11.);
    id1+=green.a*eq(pp.a,19.);
    id1+=green.a*eq(pp.a,27.);
    float d=box(pp.xyz-vec3(0.,0.,5.),vec3(.3));
    return d;
}

float ring2(vec3 p) {
	vec4 pp=radialfold(p,16.,.25);
    id2=0.;
    id2+=cyan.a*eq(pp.a,2.);
    id2+=cyan.a*eq(pp.a,7.);
    id2+=cyan.a*eq(pp.a,10.);
    id2+=cyan.a*eq(pp.a,14.);
    float d=box(pp.xyz-vec3(0.,0.,5.),vec3(.3));
    return d;
}

float ring3(vec3 p) {
	vec4 pp=radialfold(p,32.,0.);
    id3=0.;
    id3+=white.a*eq(pp.a,2.);
    id3+=white.a*eq(pp.a,4.);
    id3+=white.a*eq(pp.a,6.);
    id3+=white.a*eq(pp.a,8.);
    id3+=white.a*eq(pp.a,11.);
    id3+=white.a*eq(pp.a,13.);
    id3+=white.a*eq(pp.a,16.);
    id3+=white.a*eq(pp.a,18.);
    id3+=white.a*eq(pp.a,21.);
    id3+=white.a*eq(pp.a,23.);
    id3+=white.a*eq(pp.a,26.);
    id3+=white.a*eq(pp.a,30.);
    id3+=white.a*eq(pp.a,31.);
    float d=box(pp.xyz-vec3(0.,0.,5.),vec3(.2,.35,.3));
    return d;
}

float ring4(vec3 p) {
	vec4 pp=radialfold(p,18.,.2);
    id4=0.;
    id4+=pink.a*eq(pp.a,7.);
    id4+=pink.a*eq(pp.a,13.);
    id4+=pink.a*eq(pp.a,17.);
    id4+=yellow.a*eq(pp.a,10.);
    id4+=yellow.a*eq(pp.a,3.);
    float d=box(pp.xyz-vec3(0.,0.,5.),vec3(.3));
    return d;
}

vec3 getcolor(float id) {
	vec3 col=vec3(0.);
    col+=blue.rgb*eq(id,blue.a);
    col+=cyan.rgb*eq(id,cyan.a);
    col+=pink.rgb*eq(id,pink.a);
    col+=yellow.rgb*eq(id,yellow.a);
    col+=green.rgb*eq(id,green.a);
    col+=white.rgb*eq(id,white.a);
	return col;
}

float tex(vec3 p) {
    p=abs(.5-fract(p*.3));
    for (int i=0; i<6; i++) {
        p=abs(p)/(dot(p,p)+.1)-.8;
    }
    return abs(p.y)*.003;
}


float planes(vec3 p) {
    float t=tex(p);
    float d=p.y+t+.4;
    d=min(d,-p.y+t+7.5);
    return d;
}

vec3 rotscene(vec3 p) {
	p.xz*=rot(iTime*rotspeed);
    return p;
}


vec4 de(vec3 p) {
    p=rotscene(p);
	float r1=ring1(p);
	float r2=ring2(p+vec3(0.,-2.,0.));
	float r3=ring3(p+vec3(0.,-4.,0.));
	float r4=ring4(p+vec3(0.,-6.,0.));
    float d=min(r1,min(r2,min(r3,r4)));
    float pla=planes(p);
    d=min(d,pla);
    hitplane=step(pla,d);
	vec3 col=vec3(0.,0.,.5)*hitplane;
    col+=getcolor(id1)*eq(d,r1);
    col+=getcolor(id2)*eq(d,r2);
    col+=getcolor(id3)*eq(d,r3);
    col+=getcolor(id4)*eq(d,r4);
    return vec4(col,d);
}

vec3 normal(vec3 p) {
	vec2 d=vec2(0.,.01);
    return normalize(vec3(de(p+d.yxx).a,de(p+d.xyx).a,de(p+d.xxy).a)-de(p).a);
}



vec3 shade(vec3 p, vec3 dir, vec3 col) {
    vec3 pr=rotscene(p);
	if (col!=blue.rgb && hitplane<.5) return col;
    if (hitplane>.5) {
    	col*=1.+smoothstep(1.,5.,length(p.xz))*(max(0.,sin(atan(pr.x,pr.z)*3.)));
        col+=smoothstep(0.,5.,length(p.xz)-p.y)*.3;
    }
    vec3 n=normal(p);
	float amb=max(0.,dot(dir,-n))*.3;
    vec3 ref=reflect(vec3(1.,0.,0.),-n);
    float spe=pow(max(0.,dot(dir,-ref)),20.);
    float dif=max(0.,dot(normalize(vec3(1.,.5,0.)),-n));
    dif+=max(0.,dot(normalize(vec3(0.,-.5,-1.)),-n));
    return (amb+dif)*col+spe*.3;
}


vec3 march(vec3 from, vec3 dir) {
	vec4 d;
    float td=0.,ref=0.,std=0.;
    vec3 glow=vec3(0.);
    vec3 p=from, back=vec3(0.,0.,.1), col=back;
    vec3 savecol=vec3(0.);
    vec3 odir=dir;
    for (int i=0; i<100; i++) {
    	p+=dir*d.a;
        d=de(p);
        if ((d.a<det && (hitplane<.5 || ref>0.)) || td>maxdist) break;
        if (d.a<det && hitplane>.5) {
			vec3 n=normal(p);
            savecol=mix(shade(p, dir, d.rgb),back,smoothstep(5.,8.,length(p.xz)));
            dir=reflect(dir,n);
            p+=dir*.1;
            ref=.5;
        }
        td+=d.a;
    }
    if (d.a<det) {
    	p-=det*2.*dir;
        col=shade(p, dir, d.rgb);
    } else {
        p=from+dir*maxdist;
        p=rotscene(p);
        p.y-=2.;
    	col*=1.+pow(max(0.,dot(normalize(p),vec3(1.,0.,0.))),20.)*2.;
    	col*=1.+pow(max(0.,dot(normalize(p),vec3(-1.,0.,0.))),20.)*2.;
    }
    col=mix(col,savecol,ref);
    vec3 sp=p;
    p=from; d.a=0.;
    float gtd=0.;
    float h=hash12(gl_FragCoord.xy)*.05;
    for (int i=0; i<50; i++) {
    	p+=odir*(max(.15,d.a)+h);
        d=de(p);
        gtd+=d.a;
        if (td<maxdist && distance(from,p)>distance(from,sp)+.5) break;
        //if (length(p.xz)>6.) break;
        if (d.a<1. && d.rgb!=blue.rgb && hitplane < .5) glow+=d.rgb*exp(-7.*d.a)*(1.2-length(d.rgb)*.2);
    }
    
    float mus=pow(smoothstep(.0,.6,texture(iChannel0,vec2(.3)).r),3.);
    
    return col+glow*.3*mus;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv=(fragCoord-iResolution.xy*.5)/iResolution.y;
    vec3 dir, from;
    if (iTime < 32. || (iTime > 95.5 && iTime < 118.5) || (iTime > 150.)) {
	    rotspeed=.5;
        uv.y+=.1;
        from=vec3(0.,2.2+sin(iTime*.7)*2.2,-4.);
        dir=normalize(vec3(uv,.7));
        dir.yz*=rot(.05);
    }
    if ((iTime > 32. && iTime < 65.) || (iTime > 118.5 && iTime < 150.)) {
	    rotspeed=1.;
        float s=sin(iTime*.7)*2.5;
        from=vec3(0.,2.5+s,-6.3);
        dir=normalize(vec3(uv,.7));
        dir.yz*=rot(.05-(s+1.)*.1);
    }
    if (iTime > 65. && iTime < 95.5) {
	    rotspeed=-1.;
	    uv.y+=.1;
        from=vec3(0.,0.2,-4.);
        dir=normalize(vec3(uv,.7));
        dir.yz*=rot(.1);
    }


    vec3 col=march(from, dir);
    fragColor = vec4(col,1.0);
}