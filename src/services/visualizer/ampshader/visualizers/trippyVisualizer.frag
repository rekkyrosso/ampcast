// https://www.shadertoy.com/view/WtV3Dd
//const float pi = 3.14159265358979323846264338327950288419716939937510; //just pi
const float ni = 3.0778979877877658472;

/*vec2 rot(vec2 a, float c){
float g = c*pi/180.0;
vec2 b = vec2(cos(g),sin(g));
return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}*/

vec2 rot(vec2 a, float c){ //mine
//acos 1 to -1 = 0 to pi
float p = length(a);
a = normalize(a);
float ang_x = atan(a.y,a.x);
ang_x +=  c*ni/180.0;
return vec2(p*cos(ang_x), p*sin(ang_x));
}


float box(vec3 p, vec3 s){//mine
vec3 a = abs(p)-s;
return max(max(a.x, a.y),a.z);
}

/*
vec3 r(vec3 p, vec3 c){//not originally thought by me
return mod(p,c)-0.5*c;
}
*/

vec3 r(vec3 p, vec3 c){
return ((p/c - floor(p/c))*c)-0.5*c;
}


float dis(vec3 p){
return min(length(mod(p,8.0)-4.0)-1.3,
          box(r(vec3(0.0, -4.0, 0.0)-p, vec3(20.0,20.0,3.0)), vec3(40.0,0.5,0.5))
          );
}

bool trac(out vec3 p, vec3 d, out float dd){
    for(int i = 0; i < 40; i++){
        dd = dis(p);
        if(dd < 0.01){return true;}
        p+=d*dd;
    }
    return false;
}

/*
vec3 norm(vec3 p){//not originally by me
vec2 k = vec2(0.1,0.0);
return normalize(
vec3(
dis(p+k.xyy)-dis(p-k.xyy),
dis(p+k.yxy)-dis(p-k.yxy),
dis(p+k.yyx)-dis(p-k.yyx)
));
}
*/

vec3 norm(vec3 p, float dist){
    return normalize(vec3(dist-dis(vec3(p.x-0.1,p.yz)),dist-dis(vec3(p.x,p.y-0.1,p.z)),
                          dist-dis(vec3(p.xy,p.z-0.1))));
}



vec3 shadow(vec3 p, vec3 lig){
    vec3 d = normalize(lig - p);
    float dist,lgg;
    for(int i = 0; i < 40; i++){
     lgg = length(lig-p)-1.3;
     dist = min(lgg, dis(p));
     if(dist < 0.01)break;
     p+=d*dist;
    }
    if(dist < 0.01 && dist == lgg){
    return vec3(1.0);
    }

    vec3 n = norm(p,dist);
    float ang = 1.0-dot(-d,n);
    vec3 c = vec3((cos(iTime-ang*2.0)+1.0)*0.5, (sin(iTime+ang*12.0)+1.0)*0.5, 0.5);
    return c*ang;
}

vec3 volumetrics(vec3 prevp, vec3 p, vec3 lig){
    const int iter = 7;
    vec3 dp = (p-prevp)/float(iter);

    vec3 vcol;

    for(int i = 0; i < iter; i++){
    vcol += shadow(prevp+dp*float(i+1), lig);
    }

    return vcol/float(iter);
}

float rough(float a, float c){
return exp(-pow(12.0*(1.0-a)*(c-1.0) - a ,2.0))/(ni*a);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float sp = texture(iChannel0, vec2(0.0 / 512.0, 0.0)).x;

    vec2 uv = fragCoord/iResolution.xy;
    uv -= vec2(0.5);
    uv.x *= iResolution.x/iResolution.y;
    uv *= vec2(2.0+sp*2.0);

    vec3 d = normalize(vec3(uv.x, 1.0, uv.y));
    vec2 mouse = iMouse.xy / iResolution.xy;
    mouse = mouse * 2.0 - 1.0;

    d = abs(-vec3(rot(d.xz, iTime*6.0),d.y));
    d.yz = rot(d.yz, cos(iTime*0.4 - sp*1.6)*90.0);
    d.xy = rot(d.xy, sin(iTime*0.2 + sp*1.3)*180.0);
    vec3 p = vec3(0.0);
    vec3 prevp = p;
    vec3 col = vec3(0.0);
    vec3 lig = vec3(sin(iTime)*5.0,10.0,2.0+cos(iTime)*6.0);
    float dd;
    if(trac(p,d,dd)){
        vec3 n = norm(p,dd);
        vec3 light = normalize(lig-p);

        col = vec3(0.6)*max(dot(n,light),0.1);
        col+= rough(0.4, dot(reflect(d,n),light));
        col*=shadow(p-d*0.1, lig);
    }

    col += volumetrics(prevp,p, lig)*0.7;
    //col = mix(volumetrics(prevp,p, lig), col, 0.5);

    float dist = abs(length(vec2(0.5) - fragCoord/iResolution.xy));
    col-= dist*dist*0.6;

    fragColor = vec4(col,1.0);
}
