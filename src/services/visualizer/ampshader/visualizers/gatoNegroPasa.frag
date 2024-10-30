// https://www.shadertoy.com/view/WdB3zz
vec2 p_ojos=vec2(0.);
float col_ojos = 0.;
float col_pupilas = 0.;
float col_nariz = 0.;

#define time iChannelTime[0]
#define fade_in smoothstep(0.,15.,time)
#define ritmo1 sin(time*PI*1.61*2.+offset_ritmo)
#define ritmo2 sin(time)
#define PI 3.14159
#define tick floor(1.3+time*1.61)


float offset_ritmo=0.;
float sec_agua=0.;
float sec_mosaicos=0.;
float sec_montania=0.;
float sec_luz=0.;
float sec_baile=0.;
float sec_lluvia=0.;
float sec_horizonte=0.;
float sec_irvolver=0.;
float sec_rotacion=0.;
float sec_piso=0.;
float sec_loca=0.;
float sec_final=0.;
float sec_chaugato=0.;
float sec_constel=0.;

float rnd1(float n) {
	return fract(sin(n*.4324)*2343.324);
}

float rnd2(vec2 n) {
	return fract(sin(dot(vec2(1.23,.232),n)*232.21321)*2321.23);
}


mat2 rot(float a) {
	a = radians(a);
    float si = sin(a);
    float co = cos(a);
    return mat2(co,si,-si,co);
}

float fmod(float n) {
	return abs(1.-mod(n,2.));
}

vec2 fmod(vec2 p) {
	return abs(1.-mod(p,2.));
}


float shaper(float c) {
	return max(0., .001-c)/.001;
}

float ovalo(vec2 p, float l, float b) {
	p.y*=b;
    float d = length(p) - l;
    return d;
}

float bigote(vec2 p) {
    p.x-=.2;
    p.y*=1.+(p.x+.1)*10.;
	float d=abs(p.y)-.01;
    d=max(d,abs(p.x)-.13);
	return shaper(d);
}

float bigotes(vec2 p) {
    p.x=abs(p.x);
    p*=3.;
    p.x-=.3;
    p.y+=.15;
    float d=0.;
    p*=rot(-50.+p.y*40.);
    for (int i=0; i<4; i++) {
        p*=rot(15.);
        p*=1.+float(4-i)*.02;
        d+=bigote(p);
    }
return shaper(d);
}


float cuerpo(vec2 p) {
    p.x+=smoothstep(0.,1.,p.y)*ritmo2*.6*sec_baile;
    p.x+=p.y*.07;
    p.x*=1.+(pow(abs(p.y+.2),2.5))*10.;
    p.x*=2.6+(p.y-.4)*2.;
    p.y*=1.1;
	float d = length(p)-.25;
    return shaper(d);
}

float pies(vec2 p) {
    p.y-=.025;
    p.y-=p.x*ritmo1*.1*step(0.,p.x)*sec_baile;
    p.x=abs(p.x-.01);
    vec2 pp=p*rot(50.);
	pp+=vec2(.12,-.22);
    p.x-=.11;
    p.x*=1.+p.y*1.5;
    p.y+=.23;
	float d = shaper(length(p)-.03);
    float m = 0.;
    for (int i=0; i<4; i++) {
        m = max(m, shaper(abs(pp.x)-.005))*(1.-step(.1,p.y))*step(-.01,-p.y); 
    	pp*=rot(2.);
    }
    return d-m;
}

float segmentocola(vec2 p, float l, float g) {
    p.x+=l;
	float d = abs(p.y)-g;
    d=max(d,abs(p.x)-l);
    p.x+=l;
    d=min(d,length(p)-g);
    return d;
}

float cola(vec2 p) {
    p.x*=-1.;
    p.y+=.13;
    p.x+=.1;
    p*=2.;
    float d=0.;
    float t=10.+time*1.5;
    float s=1.+sec_baile*2.;
    float l=.015;
    float g=.04;
    float f=3.;
    p*=rot(-10.);
    float c = segmentocola(p,l,g);
    for (int i=0; i<20; i++) {
		float a = -(.2+sin(t)*.5)*s;
        p.x+=l*2.;
        c=min(c,segmentocola(p*rot(a),l,g));
        p*=rot(a);
        s*=1.15;
        g*=.95;
    }
    return shaper(c);
}


float orejas(vec2 p) {
	p.x=abs(p.x);
    p.x-=.1;
    p.y-=.1;
    p.x*=1.+p.y*5.;
    p.x-=p.y*.5;
    float d = ovalo(p,.04,.5);
    return d;
}

float ojos(vec2 p) {
    float s = sign(p.x);
    p.x=abs(p.x);
    p*=rot(15.);
    p.x-=.08;
    p.y+=.01;
    p.x*=1.+abs(p.y)*10.;
    p.y-=p.x*.1;
    p.y*=1.-p.x*5.;
    float d = ovalo(p,.05, 1.7+fade_in*rnd1(floor(time)));
    p.x-=.005;
    p*=rot(-20.);
    float mov=(rnd1(floor(time*.5))-.5)*.02*s*fade_in;
    float pupilas=-ovalo(p+vec2(mov,0.),.01,.3);
    col_pupilas=step(-5.,-shaper(pupilas))*step(0.,-d);
    d=max(d,pupilas);
    return shaper(d);
}

float nariz(vec2 p) {
    p.x=abs(p.x);
    float orif=ovalo(p*2.+vec2(-.02,0.07),.01,.8);
    p.y+=.03+abs(p.x)*.2;
    p.x+=p.y*.3;
	float d=abs(p.x-p.y);
    d=max(d,abs(p.y));
    return min(1.,shaper(d-.01)-shaper(orif))*(1.-sec_chaugato);
}

float cabeza(vec2 p) {
    float t=sin(time)+smoothstep(0.,3.,ritmo1);
    p.y-=.23+ritmo1*.015*(.2+sec_baile);
    p.x-=sec_baile*(-t*.05-ritmo2*.02-ritmo1 *.02)*.8;
    p*=rot(10.+t*20.*sec_baile);
    float d=ovalo(p*vec2(1.-p.y*1.5,1.), .17, 1.45);
    d=min(d,orejas(p));
    d=min(d,bigotes(p));
    float ojos=ojos(p);
    if (shaper(ojos)<1.) {
    	p_ojos=p;
        col_ojos=1.;
    }
    col_nariz = nariz(p);
    return shaper(d);

}

float gato(vec2 p) {
	float c = cuerpo(p);
    c = max(c, pies(p));
    c = max(c, cabeza(p));
    c = max(c, cola(p));
    return max(0.,1.-c*(1.-sec_chaugato));
}

float estrellas(vec2 p) {
	p+=sec_chaugato;
    p*=rot(time*5.);
    float m=1000.;
    for (int i=0; i<6; i++) {
    	p=abs(p)/dot(p,p)-1.;
    	float l=mix(length(p)-fmod(atan(p.y,p.x)*PI*.5)*.01,min(m,abs(p.y*p.x)),sec_constel);
        m=min(m,l);
    }
	return exp(-50.*m)*(1.-sec_constel*.6)*1.5*(1.+sec_final)*(1.-sec_loca);
}


float montania(vec2 p) {
	float t=sec_montania;
    float f=10.;
    float s=3.*t;
    p.y-= t*.4-(1.-sec_horizonte)+.05;
    p.y+=abs(p.x)*t*.6;
    for (int i=0; i<8; i++) {
    	p.y+=sin(p.x*f)*.01*s;
    	f*=1.5;
    	s*=.75;
	}    
	return smoothstep(0.,0.03,-p.y)-.2;
}

float piso(vec2 p) {
	float d=max(0.,p.y-.7);
    float fade=max(sec_loca*.7,smoothstep(0.025,.3,-p.y));
    return shaper(d)*fade;
}

float agua(vec2 p) {
    p.y+=.7-sec_agua*.65;
    float s=1.;
    float t=time*15.;
    for (int i=0; i<5; i++) {
        p.x-=3.234;
        p.x*=1.5;
        p.y+=sin(p.x*10.+t)*.005*s;
    	s*=.7;
        t*=.7;
    }
	float d = max(0.,p.y+-.3);
    return shaper(d)*step(0.1,sec_agua);
}

vec3 mosaicos(vec2 p) {
    p*=rot(-p.x*30.*sec_loca);
    float end=step(sec_piso-.8,p.y);
    float tiles=70.;
    float horiz=1.-smoothstep(.04,.06,abs(p.y));
    p.x*=.03-(.06+.01*sec_irvolver)/p.y;
	if (sec_loca<.5) p.y*=2.-abs(p.y+.25)*2.5;
	p.y-=sec_irvolver*.1;
	float lim=1.-step(0.17,abs(p.x))*(1.-sec_loca);
    p.x-=time*.1*sec_loca;
    vec2 til=floor(p*tiles*.5);
    vec2 z=til/tiles;
    float a=floor(pow(1.-texture(iChannel0,vec2(.5+z.x*.5,.01)).r,3.)*tiles*.5)-sec_irvolver*4.;
    float l=(1.-step(tiles*.3-a,-til.y))*(1.-sec_loca);
    float r=rnd1(til.x)+tick;
    float x=rnd2(til)+floor(time*5.);
    float m=rnd1(rnd2(til)+floor(iTime*10.));
    p=fmod(p*tiles);
    p*=1.-.2*sec_loca;
    float mos=(1.-pow(abs(max(p.x,p.y*1.2)),10.));
    vec3 c=mix(vec3(.3,.25,.5),normalize(vec3(rnd1(r),rnd1(r+1.),rnd1(r+2.))),l*2.*sec_mosaicos);
    c+=step(.5,m)*.15;
    c+=normalize(vec3(rnd1(x),rnd1(x+1.),rnd1(x+2.)))*sec_loca;
    //vec3 c=normalize(vec3(rnd1(r),rnd1(r+1.),rnd1(r+2.)))*(.5+.5*sec_luz)*(.5+l);
    return max(vec3(horiz*1.5*(1.-sec_chaugato)),c*mos*lim*end*(1.-sec_chaugato));
}


vec3 fondo(vec2 p) {
	p+=sec_final*.4;
    p*=1.-sec_final*.3;
    float l=length(p*vec2(1.,.6));
    float h=.1-p.y+sec_luz*.1+sec_final*.3;
    return h+pow(max(0.,1.-l),3.)*vec3(1.,.6,1.)*fade_in*1.3*(1.+sec_loca*sec_luz*1.5);
}



vec2 camara(vec2 p) {
	p*=min(1.,time*.1);
    p.y+=.25*(1.-fade_in);
    if (time>30. && time<40.) {
    	p*=.2;
        p.y+=.2;
        p.x+=.18;
    }
    if (time>54. && time<61.) {
    	p*=.5;
        p.y-=.2-smoothstep(55.,59.,time)*.4;
    }
    if (time>161. && time<181.5) {
        float c=pow(abs(.5-smoothstep(161.,180.,time))*2.,3.);
        //sec_constel=1.-c;
    	p*=.7-(1.-c)*.6;
        p+=vec2(-.5+c*.5,.2);
    }
    if ((time>112. && time<120.) || (time>200. && time<210.)) {
	    p*=.5;
        p.y+=.15;
    }
    if (time>150. && time<161.) {
        float a=smoothstep(150.,160.,time);
    	p*=.2+a*.2;
        p.x+=.25;
        p.y-=.05+a*.1;
   	}
    
    p.y+=sec_chaugato*.15;
    return p;
}


vec3 shade(vec2 p) {
	p*=rot(sec_rotacion*720.);
    p.y-=(pow(abs(.5-sec_rotacion)*2.,3.))*.3-.3;
    float agua=agua(p);
    if (agua>.1) {
        p*=.94;
    	p+=sin(p*30.+time*5.)*.005;
    }
    vec2 pp = floor(p*200.)/200.;
    p=camara(p);
    vec2 pg=p*(1.+sec_irvolver*.4);
    float montania=montania(p)*fade_in;
    float gato=gato(pg);
    float cabeza=cabeza(pg);
    float piso=piso(p);
    float estrellas=estrellas(p);
    vec2 pb=p+vec2(0.,-.25);
    vec3 fondo=fondo(p);
    vec3 mosaicos=mosaicos(p)*gato*piso;
    vec2 pr=p*rot(length(p)*200.+time*20.);
    float scanlines = abs(.5-mod(pr.y*50.,1.))*2.;
	vec3 c=fondo-montania*vec3(.1,.15,1.)*(2.+step(0.,montania)*rnd1(floor(time*5.+p.y*(80.+(p.y+.5)*100.)+sin(p.x*50.))));
    c*=gato;
    c+=(1.-gato)*sec_irvolver*.06;
    offset_ritmo=-length(p)*10.;
    c+=estrellas*step(0.,-max(montania,1.-gato))*.4*(1.5+ritmo1*(1.-sec_chaugato))*fade_in;
    c+=vec3(.6,1.,.4)*col_ojos*(1.2-p_ojos.y*20.)*(1.-sec_final)*(1.+sec_loca*2.);
    c+=col_nariz*.5*fade_in;
    c-=col_pupilas*.3*(1.-sec_final);
    c=mosaicos*(.5+estrellas*.5)+c*(1.-piso);
    c+=.1*fade_in;
    if (agua>.1) {
        c=mix(agua*vec3(.5,.6,1.),c*(1.-agua*.5),.6*(1.-gato*.5));
    }
    c=mix(vec3(rnd1(time+pp.x*2324.23432+pp.y*223.2332)),c,sec_lluvia);
    c=.05*gato+c;
    return c;
}

void secuencia() {
    sec_piso=1.-smoothstep(10.,20.,time);
    sec_agua=smoothstep(100.,110.,time)-smoothstep(120.,122.,time);
    sec_agua+=smoothstep(190.,200.,time)-smoothstep(220.,223.,time);
	sec_mosaicos=smoothstep(41.,42.,time);
    sec_montania=smoothstep(80.,88.,time)-smoothstep(120.,123.,time);
    sec_baile=.1+smoothstep(60.,62.,time)*.8;
    sec_baile+=.3*smoothstep(41.,42.,time);
    sec_baile*=1.-smoothstep(120.,123.,time)+smoothstep(140.,142.,time);
    sec_baile*=1.-smoothstep(220.,221.,time)+smoothstep(250.,251.,time);
    sec_baile*=1.-smoothstep(329.,331.,time);
    sec_baile*=1.-smoothstep(340.,342.,time);
    sec_horizonte=smoothstep(62.,80.,time)-smoothstep(120.,123.,time);
	sec_irvolver=(smoothstep(122.,126.,time)-smoothstep(138.,140.,time))*4.;
	sec_irvolver+=(smoothstep(220.,225.,time)-smoothstep(300.,305.,time))*4.;
    sec_constel=(smoothstep(220.,225.,time)-smoothstep(325.,332.,time));
    sec_rotacion=smoothstep(130.,141.,time);
    sec_final=smoothstep(347.,348.,time);
    sec_lluvia=min(.9,time*.2)-sec_final*.3*smoothstep(.5,1.,rnd1(floor(iTime*1.5)));
    sec_chaugato=smoothstep(340.,346.,time);
	sec_loca=smoothstep(250.,252.,time)-smoothstep(329.,331.,time);
	sec_luz=2.*pow(abs(ritmo1),.4)*step(0.,ritmo1)*step(61.5,time)*(1.-sec_irvolver/4.+sec_loca)*(1.-sec_chaugato);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    secuencia();
    vec2 uv = fragCoord/iResolution.xy;
    float text=texture(iChannel1,uv).r;
	uv-=.5;
    uv*=.8+length(uv)*.4;
    float borde=.95*pow(smoothstep(.45,.5,max(abs(uv.x*1.05),abs(uv.y*1.1))),3.);
    uv.x*=iResolution.x/iResolution.y;
    uv.y+=.1;
    vec3 c = shade(uv)*step(-0.05,-borde);
    c*=vec3(1.,.95,.9);
    c+=borde;
    c+=text;
    fragColor = vec4(c,1.);
}