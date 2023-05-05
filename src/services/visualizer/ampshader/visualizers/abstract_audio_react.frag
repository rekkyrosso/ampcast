// https://www.shadertoy.com/view/7lscWM
// HELLO

#define sound (texture(iChannel0, vec2(0.001,0.25)).x)


//FORMES

float sdSphere(vec3 c,vec3 p, float r)
{
    //return distance(p, c) - r + texture(iChannel1,(p.xy/p.xz/p.xx/p.xx)*(p.zx/p.zy/p.zz)*(p.yx/p.yy/p.yz)*clamp(sound,0.2,0.8)).r;
    return distance(p, c) - r + (p.x/p.x/p.x/p.x/p.x)+(p.z/p.z/p.z/p.z/p.z)+(p.y/p.y/p.y/p.y/p.y)+clamp(sound,0.2,1.)*sound*2. ;
}

//DISPL
float getDist(vec3 p)
{
    // Setup scene
    return sdSphere(vec3(1.),p, 1.);
}

// ROTATION

mat4 rotation3d(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;

  return mat4(
        oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
        0.0,                                0.0,                                0.0,                                1.0
    );
}

vec3 rotate(vec3 v, vec3 axis, float angle) {
    return (rotation3d(axis, angle) * vec4(v, 1.0)).xyz;
}


// PALETTES

vec3 palette( float t, vec3 a, vec3 b, vec3 c, vec3 d )
{
    return a + b*cos( 61.28318*(c*t+d) );
}


float map(vec3 pos) // position 3d de la marche
{



    float volume = 0.0;

    pos.x+= sin(iTime);
    pos.y += cos(iTime);

    pos.z +=sound;
    float sphere = sdSphere( vec3(5.), pos +vec3(1.,-2.,0.) , 2.5);

    volume=sphere;
    return volume;
}


float CastRay(vec3 ro, vec3 rd)
{


    float c = 0.0; // contact
    for (int i = 0; i<60;i++)
    { // nombre de pas du ray
        float ray = map(ro+rd*c);
        if(ray<(0.0001*c))// distance min = contact
        {
            return float(i)/32.;
        }

        c+= ray;
    }

    return -1.0;

}

vec3 render(vec3 ro, vec3 rd)
{


    float contact = CastRay(ro,rd); // appel du raycast
    vec3 col = vec3(0.0); // couleur de base du pixel

    if (contact ==-1.)// sil ny a pas de contact
    {

        col=vec3(0.);// couleur du fond

    }
    else
    {
        //vec3 nor = GetNormal(ro+rd * contact);
        //col= vec3(1.-contact); // couleur du volume (blanc)

        float depth = vec3(1.-contact).r;
        col = palette(depth ,vec3(0.5),vec3(0.5),vec3(1.),vec3(clamp(sound,0.1,0.8),0.3,0.37));


    }

    return col;

}


void mainImage(out vec4 fragColor, in vec2 fragCoord)
{


    vec2 uv = 2.* fragCoord/iResolution.xy -1.;
    uv.x*=iResolution.x/iResolution.y;
    //vec2 mouse = (iMouse.xy/iResolution.xy)-0.5;


    // parametres camera
    vec3 cameraPos = vec3(10., 10., 10.);;


    vec3 cameraTar = vec3(0.0, 2.0, 0.0);

    // vecteur de direction depuis la cam

    vec3 forward= normalize(cameraTar- cameraPos);
    vec3 right = normalize (cross(vec3(0.,-1.,0.),forward));
    vec3 up = normalize (cross(right,forward));
    vec3 viewDir = normalize (uv.x* right + uv.y * up + 2. * forward);


    ///vec3 col;
    vec3 col = render(cameraPos,viewDir);



    //affichage des uv
    //vec3 col = render(cameraPos,viewDir);

    fragColor =vec4 (col,1.);




}
