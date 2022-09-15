precision mediump float;
uniform float time;
uniform vec2 resolution;
uniform sampler2D spectrum;

// For ShaderToy
vec3 iMouse = vec3(0., 0., 0.);
#define iTime time
#define iResolution resolution
#define iChannel0 spectrum
#define texture texture2D
