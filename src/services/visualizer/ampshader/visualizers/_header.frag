#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
#extension GL_EXT_shader_texture_lod : enable
#ifdef GL_ES
precision highp float;
precision highp int;
#endif
uniform vec4 iTheme;
uniform float iTime;
uniform float iChannelTime[4];
uniform vec4 iDate;
uniform vec2 iResolution;
uniform sampler2D iChannel0;
uniform sampler2D iChannel1;
uniform sampler2D iChannel2;
uniform sampler2D iChannel3;
uniform float iSampleRate;
uniform float iTimeDelta;
uniform float iChannelResolution[4];
vec3 iMouse = vec3(0., 0., 0.);
#define iFrame (floor(iTime / 60))
float round( float x ) { return floor(x+0.5); }
vec2 round(vec2 x) { return floor(x + 0.5); }
vec3 round(vec3 x) { return floor(x + 0.5); }
vec4 round(vec4 x) { return floor(x + 0.5); }
vec4 texture(sampler2D s, vec2 c) { return texture2D(s,c); }
vec4 texture(sampler2D s, vec2 c, float b) { return texture2D(s,c,b); }
vec4 texture(samplerCube s, vec3 c ) { return textureCube(s,c); }
vec4 texture(samplerCube s, vec3 c, float b) { return textureCube(s,c,b); }
vec4 textureLod(sampler2D s, vec2 c, float b) { return texture2DLodEXT(s,c,b); }
vec4 textureGrad(sampler2D s, vec2 c, vec2 dx, vec2 dy) { return texture2DGradEXT(s,c,dx,dy); }
vec4 texelFetch( sampler2D s, ivec2 c, int l) { return texture2DLodEXT(s,(vec2(c)+0.5)/vec2(800,450),float(l)); }
float sinh(float x) { return (exp(x)-exp(-x))/2.; }
vec2 sinh(vec2 x) { return (exp(x)-exp(-x))/2.; }
vec3 sinh(vec3 x) { return (exp(x)-exp(-x))/2.; }
vec4 sinh(vec4 x) { return (exp(x)-exp(-x))/2.; }
float cosh(float x) { return (exp(x)+exp(-x))/2.; }
vec2 cosh(vec2 x) { return (exp(x)+exp(-x))/2.; }
vec3 cosh(vec3 x) { return (exp(x)+exp(-x))/2.; }
vec4 cosh(vec4 x) { return (exp(x)+exp(-x))/2.; }
float tanh(float x) { return sinh(x)/cosh(x); }
vec2 tanh(vec2 x) { return sinh(x)/cosh(x); }
vec3 tanh(vec3 x) { return sinh(x)/cosh(x); }
vec4 tanh(vec4 x) { return sinh(x)/cosh(x); }
