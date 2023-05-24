// https://www.shadertoy.com/view/ft2SWW

float stepping(float t){
    if(t<0.)return -1.+pow(1.+t,2.);
    else return 1.-pow(1.-t,2.);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
	vec2 uv = (fragCoord*2.-iResolution.xy)/iResolution.y;
    fragColor = vec4(0.);
    uv = normalize(uv) * length(uv);
    for(int i=0;i<10;i++){
        float t = iTime + float(i)+(5.+1.*stepping(cos(iTime*3.)));
        vec2 p = vec2((cos(t+iResolution.x)*(iMouse.x / iResolution.x)*2. , sin(t+iResolution.y)*(iMouse.y / iResolution.y)*2.), (sin(iResolution.x * .0005 + iResolution.y),cos(iResolution.y * .0005 + iResolution.x)));
        p *= cos(iTime + float(i)*3.141592*cos(iTime/10.));
        vec3 col = cos(vec3(0,1,-1)*3.141592*2./3.+3.141925*(iTime/2.+float(i)/9.)) * 0.5 + 0.5;
        int tx = int(p.x);
        float react = texelFetch( iChannel0, ivec2(tx,0), 0 ).x;

        fragColor += vec4(0.025 * react * 5.25/length(uv-p*1.5-react*.005)*col,1.0);
    }

    // fragColor.xyz = pow(fragColor.xyz,vec3(3.));
    // fragColor.w = 0.0;
    fragColor = vec4(pow(fragColor.xyz,vec3(3.)), 0.0);
}
