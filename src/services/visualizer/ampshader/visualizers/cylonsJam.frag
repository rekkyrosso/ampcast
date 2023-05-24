// https://www.shadertoy.com/view/XllSzB
// Created by Jason Yung - jayjayjay/2015
// License Creative Commons Attribution-NonCommercial-ShareAlike 3.0 Unported License.

#define time iTime/1.
#define cTime iChannelTime[0]/50.

#define AUDIO_LEN 75.0
#define ZOOM (sin(iChannelTime[0]/AUDIO_LEN)+.1)*2.
const float baseLvl = 2.0;
const int steps = 10;
const float step = 	1.0/float(steps);

const float stretch = 1.5;

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    float third = 1.0 / pow( 3., baseLvl);
    float cScalar = 1.0;

    vec2 uv = fragCoord.xy / iResolution.xy;
    uv -= .5;
    uv *= ZOOM;

    float absX = abs(uv.x);
    float absY = abs(uv.y);

    // first texture row is frequency data
    float fft  = texture( iChannel0, vec2(abs(absX)*2.0,0.25) ).x;

    // second texture row is the sound wave
    float wave = texture( iChannel0, vec2(abs(absX -.5)*2.0,0.75) ).x; //-.5 to center

    //small = zoom out
    float step = 1.0/float(wave*(sin(time)+2.0)*10.0);

    //make it wider and smaller
    float t = sin(cTime)*stretch;

    third /= pow( 3., pow(t,2.0));

    for(int i = 0; i< steps; i++) {
        float y = float(i) * step;
        if(y > absY) {
            break; //dont iterate past uv.y
        }
    	cScalar = mod( floor( (abs(uv.x)) / third) + 1.0, 2.0 );
        if(cScalar == 0.0) {
            break;
        }else{
        	third /= 3.0;
        }
    }

    float w = absY / step;
    float lvl = floor(w);
    float diff = w-lvl;

    float freqScalar = 1.0-fft;

   //loat lvlScalar = 1.0-uv.y;
    float lvlScalar = 1.0;

    float scalar = 10.;
    float z = 1.0 - abs(diff-.5) * (freqScalar * lvlScalar) * scalar; //for centering in row, remember that diff is proportional (0<diff<1) ! since w and lvl are!
    //z = 1.0-z; //invert ratio

    float b = (lvl+1.0)/float(steps);

    fragColor = vec4(1.0-b,b,abs(.5-b),1.0) * cScalar * z;

}
