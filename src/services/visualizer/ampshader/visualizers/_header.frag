#version 300 es
#ifdef GL_OES_standard_derivatives
#extension GL_OES_standard_derivatives : enable
#endif
#ifdef GL_ES
precision highp float;
precision highp int;
precision mediump sampler3D;
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
