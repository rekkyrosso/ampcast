// https://www.shadertoy.com/view/7slGWj
float RAYS = 54.0;
//https://soundcloud.com/castorcinema/beat-of-broken-hearts-feat
//https://soundcloud.com/clemenswenners/africa
//https://soundcloud.com/noa-edwardsson/we-are-the-ones
//https://soundcloud.com/br-ndon-kucharek/rings-of-saturn-utopia
//https://soundcloud.com/mukunda-mtandari/smooth-and-sexy-smooth-jazz-for-lovers

float R21(vec2 uv)
{
    float a = abs(sin(uv.x*1.1));
    float b = abs(cos(uv.y*104.7));
    return(a*b);
}


//Avståndet mellan punkten p och linjen från a till b
float DistLine(vec2 p, vec2 a, vec2 b)
{
    vec2 ap = p-a;
    vec2 ab = b-a;
    //Längden av skuggan av ap utmed ab
    float lShadow = dot(ap, ab);
    //Längden av ab
    float lab = dot(ab, ab);
    //Låt t bli kvoten (andelen) av ab som skuggan utgör
    //Se till att den inte blir negativ
    float t = clamp(lShadow/lab, 0.0, 1.0);
    //Ta fram vektorn från punkten p till toppen av skuggan,
    vec2 sp = ap - ab*t;
    //returnera längden av den nya vektorn
    return length(sp);
}

float GetDist(vec2 uv, vec2 rayP)
{
    vec2 origin = vec2(0.0,0.0);
    float d = DistLine(uv, origin, rayP);
    float w = 0.05;
    float wz = 0.01;
    float c = smoothstep(w/RAYS, w/RAYS+wz, d);
    /*
    vec2 top = vec2(0.0, 5.0 );
    vec2 bottom = vec2(0.0, -5.0);
    vec2 lef = vec2(-5.0, 0.0);
    vec2 rig = vec2(5.0, 0.0);
    float d1 = DistLine(uv, top, bottom);
    float d2 = DistLine(uv, lef, rig);
    c = min(d1,d2);
    */
    //return smoothstep(0.5, 0.0, c);
    return c;
}

vec2 GetRayPoint(float rayNumber, float length)
{
    float angle = rayNumber/RAYS*6.28;
    float x = cos(angle)*length;
    float y = sin(angle)*length;
    vec2 p = vec2(x,y);
    return p;
}

vec2 Rotate(vec2 uv, float angle){
    float s = sin(angle);
    float c = cos(angle);
    float x = c*uv.x + s*uv.y;
    float y = s*uv.x - c*uv.y;
    return vec2(x,y);
}

float GetRayNumber(vec2 uv)
{
    //Beräkna en vinkel som går från -0.5 till 0.5
    float angle = (atan(uv.y, uv.x)/6.28);
    //Multiplicera med antalet strålar
    float ray = angle*RAYS;
    return ray;
}

float GetRayWheel(vec2 uv, float freqOffset, float raylength, float rotate)
{
    uv = Rotate(uv, rotate);
    float ray = GetRayNumber(uv);
    //Raycenter är ett heltal från -antal strålar/2 till +RAYS/2
    float raycenter = floor(ray);
    //Ta fram längden på strålen från frekvensspektrat i musiken
    float frequency = raycenter + RAYS/2.0;
    if (frequency < 0.1) frequency = RAYS;
    frequency += freqOffset;
    float fft = raylength * texelFetch(iChannel0, ivec2(frequency, 0), 0).x;

    //Beräkna avståndet till de två närmaste strålarna
    vec2 p = GetRayPoint(raycenter, fft);
    float d = (1.0-GetDist(uv, p));
    //Första halva topp-punkten
    float pSize = 0.99;
    float pc = smoothstep(pSize, 1.0, 1.0-length(uv-p));
    //Blinkning till topp-punkten
    float pcBlink = 0.5 + 0.5*sin(iTime*20.0+raycenter);
    pc *=pcBlink;

    raycenter = ceil(ray);
    frequency = raycenter + RAYS/2.0;
    if (frequency < 0.1) frequency = RAYS;
    frequency += freqOffset;
    //Ta fram längden på strålen från frekvensspektrat i musiken
    fft = raylength * texelFetch(iChannel0, ivec2(frequency, 0), 0).x;
    p = GetRayPoint(raycenter, fft);
    d += (1.0-GetDist(uv, p));
    float c = d*length(uv);
    //Blinkning till topp-punkten
    if ((RAYS/2.0-raycenter)<0.1) raycenter = -raycenter;
    pcBlink = 0.5 + 0.5*sin(iTime*20.0+raycenter);
    //Andra halvan av topp-punkten
    pc += smoothstep(pSize, 1.0, 1.0-length(uv-p))*pcBlink;
    c *= R21(uv);
    return 10.0*c+25.0*pc;

}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    // Normalized pixel coordinates (from -0.5 to 0.5 vertically)
    vec2 uv = (fragCoord-0.5*iResolution.xy)/iResolution.y;
    //uv*=0.5;
    uv = Rotate(uv,-iTime*0.1);
    //vec3 col = vec3(0.9, 0.2 , 0.1);//röd-orange
    vec3 col = 0.3+0.3*vec3(sin(iTime*0.5),sin(iTime*0.4),sin(iTime*0.3));
    float c = GetRayWheel(uv, 0.0, 1.0, 0.0);
    //float rotation = 3.14/RAYS;
    //
    float rotation = -iTime*0.1;
    c += 1.4*GetRayWheel(uv, 2.0*RAYS, 0.4, rotation);
    //
    rotation = -iTime*0.2;
    c += 1.4*GetRayWheel(uv, RAYS, 0.75, rotation);
    col *= c;
    //en ljus cirkel
    float d = 1.0-length(uv);
    vec3 dcol = vec3(0.5, 0.5, 0.1);
    col += d*dcol;
    //en vit cirkel
    d = smoothstep(0.8, 1.0,1.0-length(uv));
    dcol = vec3(.5);
    col += d*dcol;
    //col = d*dcol;

    // Output to screen
    fragColor = vec4(col,1.0);
}
