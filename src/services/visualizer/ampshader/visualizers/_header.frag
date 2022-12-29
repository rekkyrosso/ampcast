precision mediump float;
uniform float iTime;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
// uniform float iChannelTime[4];
vec3 iMouse = vec3(0., 0., 0.);
#define texture texture2D
