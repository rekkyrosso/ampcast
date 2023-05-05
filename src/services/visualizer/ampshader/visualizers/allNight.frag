// https://www.shadertoy.com/view/3lsXRf
#define steps 10000.
#define opacity .5


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
        vec4 color;
        vec2 res=iResolution.xy;
        float t = iTime;
        float radialdist;
    	vec2 st = fragCoord/iResolution.xy;


    for (int i=0;i<3;i+=2) {
        vec2 uv,pos=fragCoord.xy/res;
        uv=pos;
        pos-=.5; //centers the image so it's radial. pos is relative to screen width so 0.5 is halfway
        pos.x*=res.x/res.y; //scales the aspect ratio
        radialdist=length(pos);

        //SOUND
        // the pow causes the rings in the center to be thicker.
        // raising radialdist to the power of totalsound creates thinner rings ie more
        // fragmentation at the center when the song gets more intense.
        float totalsound = texture(iChannel0,vec2(0,0)).r;
        float freq_bin = floor(steps*pow(radialdist,2.+1.*totalsound))/steps; //which bin this ring falls into.
        float sound = texture(iChannel0,vec2(1.0-freq_bin,0)).r; //get the sound amplitude at this bin.
        t += 1.*sound; //jump the "time" forward at this bin

        uv+=pos/radialdist*(sin(t))*sin(radialdist*9.-t*2.);
        color[i]=.01/length(abs(uv-0.5-0.2*(sin(t))));

        //make a more purple color
        if (i==2){
            color[0]+=.005/length(abs(uv-0.5-0.2*(sin(t))));
            color[2]+=.01/length(abs(uv-0.5-0.2*(sin(t))));
        }
    }
    color[3]=1.0;
    fragColor = color;
}
