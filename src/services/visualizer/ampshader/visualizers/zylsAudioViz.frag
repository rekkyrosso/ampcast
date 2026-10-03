// https://www.shadertoy.com/view/fcyGRV
vec3 pal( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ) {
    return a + b*cos( 6.28318*(c*t+d) );
}

vec3 bgColor(in vec3 p) {
    return pal( p.x * p.y * 0.3, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(1.0,1.0,1.0),vec3(0.0,0.10,0.20) );
}

vec3 gemColor(in vec3 p) {
    return pal( p.x * 0.6 + p.y * 0.4, vec3(0.5,0.5,0.5),vec3(0.5,0.5,0.5),vec3(2.0,1.0,0.0),vec3(0.5,0.20,0.25) );
}

float getAmp(in vec2 uv) {
    float f = 64.;
    float s = 1024.;
    
    float k = 1.0;
    f *= k; s *= k;
    
    float x = f*abs(uv.x);
    float y = f*abs(uv.y);
    
    vec2 tileSt = vec2(x, y);
    
    vec2 borderSt = fract(tileSt);
    vec2 lines = step(vec2(0.9), borderSt) + step(borderSt, vec2(0.1));
    float border = 1.0 - min(1.0, lines.x+lines.y);
    
    tileSt = floor(tileSt);
    float i = tileSt.x+tileSt.y*14.0;
    vec2 st =  vec2(i/s,0.0);
    return (2.5*texture(iChannel0, st).r-0.3) * border;
}



void mainImage( out vec4 fragColor, in vec2 fragCoord ) {
    vec2 uv = (fragCoord -.5*iResolution.xy)/iResolution.y;
    
    vec3 ray = normalize(vec3(uv, 0.5));
    
    vec3 camera = vec3(0.0, 0.0, 0.0);
    
    for (int i = 0; i < 100; i++) {
        
        
        camera += ray;
    }
    
    float amp = getAmp(uv);

    vec3 col = bgColor(abs(vec3(1.3*uv, uv.x)));
    
    col *= amp;
    
    col = pow(col, vec3(3.0));

    // Output to screen
    fragColor = vec4(col,1.0);
}
