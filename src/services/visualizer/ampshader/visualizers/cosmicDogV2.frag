// https://www.shadertoy.com/view/7X2XRG
//
//         _                 _
//        | |               (_)
//     ___| |   ___   ___    _    ___   _ __
//    / __  |  / _ \ / __|  | |  / __| | '_ \
//   | (_|  | |  __/ \__ \  | |  \__ \ | | | |
//    \__,__|  \___| |___/  |_|  |___/ |_| |_|
//
// Raymarched - "Cosmic Dog v2.0"
// Mouse (iMouse). Music reactive
//
// If you need customization for VJing, art installations or concerts contact me at desisn.com.

/*
Copyright (c) 2026 desisn.com

This shader is licensed under CC BY-NC 4.0.
You may use, copy, modify, and share it for non-commercial purposes only, with attribution.
Commercial use is not allowed unless you obtain prior written permission from desisn.com.
License: https://creativecommons.org/licenses/by-nc/4.0/
Contact for commercial licensing: nils@desisn.com
*/

//  iChannel0: Music / SoundCloud / microphone
//  Mouse / touchpad: move to steer; click, tap or drag for stronger response
//
//  QUALITY 0 = fastest, 1 = balanced, 2 = cleaner glow
//
#define QUALITY 1

#define TAU         6.28318530718
#define RING_COUNT  36.0
#define RING_START  0.190
#define RING_STEP   0.073
#define INV_RING    13.698630137
#define Z_SPACING   7.5
#define INV_Z       0.1333333333
#define MAX_DIST    16.0

#if QUALITY == 0
    #define MAX_STEPS 27
    #define MIN_STEP  0.028
    #define MAX_STEP  0.48
#elif QUALITY == 2
    #define MAX_STEPS 41
    #define MIN_STEP  0.014
    #define MAX_STEP  0.31
#else
    #define MAX_STEPS 33
    #define MIN_STEP  0.020
    #define MAX_STEP  0.39
#endif


// ------------------------------------------------------------
// Global per-fragment state
// ------------------------------------------------------------

vec4  gSpecLo;
vec4  gSpecHi;
vec4  gWave;

float gBass;
float gMid;
float gTreble;
float gLevel;

float gRoll;
float gTilt;
float gDiscScale;

float gDiscID;
float gLocalAngle;
float gLocalZ;

vec2  gPointer;
vec2  gPointerUV;

float gPointerActive;
float gPointerDown;
float gPointerAngle;
float gPointerRadius;
float gPointerEnergy;


// ------------------------------------------------------------
// Small utilities
// ------------------------------------------------------------

float sat(float x)
{
    return clamp(x, 0.0, 1.0);
}

void rotate2D(inout vec2 p, float angle)
{
    float sine = sin(angle);
    float cosine = cos(angle);

    p = mat2(
         cosine, -sine,
         sine,    cosine
    ) * p;
}

float ign(vec2 p)
{
    return fract(
        52.9829189 *
        fract(
            dot(
                p,
                vec2(0.06711056, 0.00583715)
            )
        )
    );
}

float hash11(float p)
{
    p = fract(p * 0.1031);
    p *= p + 33.33;
    p *= p + p;

    return fract(p);
}


// ------------------------------------------------------------
// Mouse / touchpad / touch input
// ------------------------------------------------------------

void initialisePointer()
{
    vec2 resolution = max(
        iResolution.xy,
        vec2(1.0)
    );

    // iMouse.xy receives mouse, touchpad cursor and touchscreen coordinates.
    // iMouse.z is positive while clicking, dragging or touching.
    gPointerActive = step(
        0.001,
        dot(iMouse.xy, iMouse.xy)
    );

    gPointerDown = step(
        0.001,
        iMouse.z
    );

    vec2 normalizedPointer =
        iMouse.xy /
        resolution;

    vec2 centeredPointer =
        normalizedPointer * 2.0 -
        1.0;


    // Softer centre response prevents twitchy touchpad movement.

    vec2 magnitude =
        abs(centeredPointer);

    centeredPointer =
        sign(centeredPointer) *

        mix(
            magnitude,

            magnitude *
            magnitude *
            (3.0 - 2.0 * magnitude),

            0.38
        );


    gPointer =
        clamp(
            centeredPointer,
            -1.0,
            1.0
        ) *
        gPointerActive;


    gPointerUV =
        (
            iMouse.xy -
            0.5 * resolution
        ) /
        resolution.y;

    gPointerUV *=
        gPointerActive;


    gPointerRadius = sat(
        length(gPointerUV) *
        1.35
    );


    gPointerAngle =
        dot(gPointerUV, gPointerUV) > 1e-8

        ? atan(
            gPointerUV.y,
            gPointerUV.x
        )

        : 0.0;


    gPointerEnergy =
        gPointerActive *
        (
            0.30 +
            0.70 * gPointerDown
        );
}


// ------------------------------------------------------------
// Audio
// ------------------------------------------------------------

float fftSample(float x)
{
    float value = texture(
        iChannel0,
        vec2(x, 0.25)
    ).x;

    return sqrt(
        clamp(
            value * 5.0,
            0.0,
            1.45
        )
    );
}

float waveSample(float x)
{
    float value = texture(
        iChannel0,
        vec2(x, 0.75)
    ).x;

    return abs(value - 0.5) * 2.0;
}

float spectrumValue(int index)
{
    return index < 4
        ? gSpecLo[index]
        : gSpecHi[index - 4];
}

float spectrumField(float x)
{
    float position =
        sat(x) * 7.0;

    int index =
        min(
            int(position),
            6
        );

    float interpolation =
        position -
        float(index);

    interpolation =
        interpolation *
        interpolation *
        (3.0 - 2.0 * interpolation);

    return mix(
        spectrumValue(index),
        spectrumValue(index + 1),
        interpolation
    );
}

float waveField(float x)
{
    float position =
        fract(x) * 4.0;

    int index =
        int(position);

    float interpolation =
        fract(position);

    interpolation =
        interpolation *
        interpolation *
        (3.0 - 2.0 * interpolation);

    return mix(
        gWave[index],
        gWave[(index + 1) % 4],
        interpolation
    );
}

void initialiseAudio()
{
    gSpecLo = vec4(
        fftSample(0.0080),
        fftSample(0.0156),
        fftSample(0.0304),
        fftSample(0.0592)
    );

    gSpecHi = vec4(
        fftSample(0.1153),
        fftSample(0.2246),
        fftSample(0.4375),
        fftSample(0.8520)
    );

    gWave = vec4(
        waveSample(0.09),
        waveSample(0.31),
        waveSample(0.57),
        waveSample(0.83)
    );


    float total =
        dot(gSpecLo, vec4(1.0)) +
        dot(gSpecHi, vec4(1.0));


    // Procedural animation when no audio input is connected.

    if (total < 0.025)
    {
        float time =
            iTime;

        gSpecLo =
            vec4(
                0.36,
                0.34,
                0.31,
                0.29
            ) +

            vec4(
                0.16,
                0.15,
                0.14,
                0.13
            ) *

            sin(
                vec4(
                    1.05,
                    1.27,
                    1.51,
                    1.79
                ) * time +

                vec4(
                    0.00,
                    0.80,
                    1.40,
                    2.10
                )
            );


        gSpecHi =
            vec4(
                0.27,
                0.24,
                0.22,
                0.20
            ) +

            vec4(
                0.12,
                0.11,
                0.10,
                0.09
            ) *

            sin(
                vec4(
                    2.11,
                    2.47,
                    2.91,
                    3.41
                ) * time +

                vec4(
                    2.80,
                    3.40,
                    4.00,
                    4.80
                )
            );


        gWave =
            vec4(
                0.30,
                0.31,
                0.28,
                0.27
            ) +

            vec4(
                0.20,
                0.18,
                0.19,
                0.17
            ) *

            sin(
                vec4(
                    2.30,
                    2.90,
                    3.50,
                    4.20
                ) * time +

                vec4(
                    0.00,
                    1.10,
                    2.00,
                    2.80
                )
            );
    }


    gBass =
        dot(
            gSpecLo.xyz,
            vec3(0.333333)
        );

    gMid =
        dot(
            vec4(
                gSpecLo.zw,
                gSpecHi.xy
            ),
            vec4(0.25)
        );

    gTreble =
        dot(
            gSpecHi.yzw,
            vec3(0.333333)
        );

    gLevel = min(
        gBass   * 0.43 +
        gMid    * 0.35 +
        gTreble * 0.22,
        1.4
    );

    gDiscScale =
        1.0 +
        0.08 * gBass;
}


// ------------------------------------------------------------
// Filament geometry
// ------------------------------------------------------------

float ringAudio(float id)
{
    float ringPosition =
        id *
        (1.0 / 35.0);

    float local =
        spectrumField(ringPosition);

    float broad = mix(
        mix(
            gBass,
            gTreble,
            ringPosition
        ),

        gMid,

        2.2 *
        ringPosition *
        (1.0 - ringPosition)
    );

    return min(
        local * 0.78 +
        broad * 0.22,
        1.5
    );
}

vec4 arcDistancePolar(
    float radial,
    float angle,
    float z,
    float id
)
{
    float ringPosition =
        id *
        (1.0 / 35.0);

    float audio =
        ringAudio(id);

    float waveform =
        waveField(
            angle * 0.15915494 +
            id * 0.137 +
            iTime * 0.012
        );

    float repetitions =
        1.0 +
        floor(
            id *
            (1.0 / 12.0)
        );

    float idNoise =
        hash11(id + 4.71);


    // Localized pointer influence.

    float pointerAngular =
        0.5 +
        0.5 *
        cos(
            angle -
            gPointerAngle
        );

    pointerAngular *=
        pointerAngular;

    pointerAngular *=
        pointerAngular;


    // At the centre the response becomes radial because the pointer angle is
    // undefined there.

    pointerAngular = mix(
        1.0,
        pointerAngular,

        smoothstep(
            0.06,
            0.28,
            gPointerRadius
        )
    );


    float pointerDelta =
        ringPosition -
        gPointerRadius;

    float pointerBand =
        1.0 /
        (
            1.0 +
            30.0 *
            pointerDelta *
            pointerDelta
        );

    float pointerInfluence =
        gPointerEnergy *
        pointerAngular *
        pointerBand;


    // Main radial structure.

    float radius =
        RING_START +
        id * RING_STEP;

    radius +=
        0.026 *
        audio *
        ringPosition *

        sin(
            angle * 3.0 +
            iTime * 2.0 +
            gDiscID
        );

    radius +=
        0.0045 *

        sin(
            id * 5.17 +
            iTime * 0.12
        );

    radius +=
        0.0090 *
        (0.25 + 0.75 * ringPosition) *
        audio *

        sin(
            angle *
            (1.0 + 0.5 * repetitions) +

            id * 1.31 -
            iTime * 0.16
        );

    radius +=
        0.0035 *
        waveform *

        sin(
            angle * repetitions -
            id * 0.73
        );


    // Mouse-hover ripple. Click/touch increases its depth.

    radius +=
        pointerInfluence *
        (
            0.010 +
            0.024 * gPointerDown
        ) *

        sin(
            iTime * 4.6 -
            id * 0.39 +
            angle * 1.7
        );


    float speed =
        mix(
            0.060,
            0.115,
            idNoise
        ) *

        (
            0.78 +
            0.52 * audio
        );


    float phase =
        angle * repetitions +
        iTime * speed +
        id * id * 0.355 +
        gDiscID * 2.1;

    phase +=
        0.21 *

        sin(
            id * 1.71 +
            iTime * 0.09
        );

    phase +=
        0.11 *
        audio *

        sin(
            id * 2.13 -
            iTime * 0.21
        );


    float cosineArc =
        cos(phase);

    float envelope =
        sat(
            (cosineArc + 0.12) *
            1.219512
        );

    float fragment =
        sat(
            (
                cos(
                    phase * 0.47 +
                    id * 1.93 -
                    iTime * 0.031
                ) +
                0.48
            ) *
            0.833333
        );

    envelope *= mix(
        1.0,
        fragment,
        0.18 + 0.34 * ringPosition
    );

    envelope =
        sqrt(envelope) *
        (0.82 + 0.24 * waveform);


    float separation =
        0.0070 +
        0.0035 * ringPosition +
        0.0020 * gTreble * ringPosition;


    float radialDistance =
        abs(radial - radius);

    radialDistance = min(
        radialDistance,
        abs(
            radial -
            radius -
            separation
        )
    );

    if (ringPosition > 0.16)
    {
        radialDistance = min(
            radialDistance,

            abs(
                radial -
                radius +
                separation
            )
        );
    }


    float thickness =
        0.0050 +
        0.0020 *
        hash11(id + 19.7);

    thickness +=
        0.0030 *
        audio *
        (0.28 + 0.72 * ringPosition);

    thickness +=
        0.0015 *
        gTreble *
        ringPosition;

    thickness +=
        0.0022 *
        pointerInfluence;

    thickness *=
        0.10 +
        0.90 *
        envelope *
        sqrt(envelope);


    float layerZ =
        0.012 *

        sin(
            id * 1.91 +
            iTime * 0.10
        );

    layerZ +=
        0.009 *
        ringPosition *

        sin(
            angle * 3.0 -
            id * 0.47 -
            iTime * 0.14
        ) *

        (0.25 + 0.75 * gMid);

    layerZ +=
        0.30 *
        audio *
        ringPosition *

        sin(
            angle * 4.0 +
            id * 0.8 -
            iTime * 3.0 +
            gDiscID
        );

    layerZ +=
        0.055 *
        pointerInfluence *

        sin(
            iTime * 3.2 +
            id * 0.31 -
            angle * 2.0
        );


    float tube =
        length(
            vec2(
                radialDistance,
                z - layerZ
            )
        ) -
        thickness;


    float clipDistance =
        -cosineArc *
        radius /
        repetitions *
        0.185;


    float distance =
        max(
            tube,
            clipDistance
        ) -

        (
            0.010 +
            0.004 * ringPosition
        );


    return vec4(
        distance,
        id,
        envelope,
        audio
    );
}

vec4 nearer(vec4 a, vec4 b)
{
    return a.x < b.x
        ? a
        : b;
}


// ------------------------------------------------------------
// Repeated disc field
// ------------------------------------------------------------

vec4 mapScene(vec3 position)
{
    float cell =
        position.z *
        INV_Z +
        0.5;

    gDiscID =
        floor(cell);


    vec3 localPosition =
        position;

    localPosition.z =
        (
            fract(cell) -
            0.5
        ) *
        Z_SPACING;


    float bound =
        length(localPosition) -
        3.65 * gDiscScale;

    if (bound > 0.34)
    {
        return vec4(
            bound,
            -1.0,
            0.0,
            0.0
        );
    }


    rotate2D(
        localPosition.xy,

        gRoll +
        gDiscID * 2.3
    );

    rotate2D(
        localPosition.yz,

        gTilt +

        0.40 *
        sin(
            gDiscID * 1.5 +
            iTime * 0.20
        )
    );


    localPosition /=
        gDiscScale;


    float planeBound =
        abs(localPosition.z) -
        1.55;

    if (planeBound > 0.24)
    {
        return vec4(
            planeBound *
            gDiscScale,

            -1.0,
            0.0,
            0.0
        );
    }


    float radial =
        length(localPosition.xy);

    float outerRadius =
        RING_START +
        (RING_COUNT - 1.0) *
        RING_STEP +
        0.10;


    if (radial > outerRadius)
    {
        return vec4(
            (
                radial -
                outerRadius
            ) *
            gDiscScale,

            -1.0,
            0.0,
            0.0
        );
    }


    float angle =
        atan(
            localPosition.y,
            localPosition.x
        );


    float twist =
        0.020 *

        sin(
            radial * 2.7 -
            iTime * 0.17
        ) *

        (
            0.25 +
            0.75 * gMid
        );

    twist +=
        0.010 *
        radial *

        sin(
            iTime * 0.11 +
            gBass * 1.7
        );


    float warpedAngle =
        angle +
        twist;


    float zDistortion =
        0.35 *
        gMid *
        radial *

        sin(
            angle * 2.5 +
            radial * 3.0 -
            iTime * 2.0 +
            gDiscID
        );

    zDistortion +=
        0.20 *
        gBass *

        sin(
            radial * 4.0 -
            iTime * 3.0
        );


    float fade =
        sat(
            (radial - 0.5) *
            0.6666667
        );

    fade =
        fade *
        fade *
        (3.0 - 2.0 * fade);


    float localZ =
        localPosition.z -
        zDistortion * fade;


    float ringIndex =
        (
            radial -
            RING_START
        ) *
        INV_RING;


    float baseID =
        clamp(
            floor(ringIndex),
            0.0,
            RING_COUNT - 1.0
        );

    float nextID =
        min(
            baseID + 1.0,
            RING_COUNT - 1.0
        );


    vec4 nearest = nearer(
        arcDistancePolar(
            radial,
            warpedAngle,
            localZ,
            baseID
        ),

        arcDistancePolar(
            radial,
            warpedAngle,
            localZ,
            nextID
        )
    );


    gLocalAngle =
        warpedAngle;

    gLocalZ =
        localZ;


    nearest.x *=
        gDiscScale;

    return nearest;
}


// ------------------------------------------------------------
// Colour and camera
// ------------------------------------------------------------

vec3 ringColour(
    float id,
    float audio
)
{
    float hue =
        id * 0.119 +
        gLocalAngle * 0.047 +
        iTime * 0.014 +
        gDiscID * 0.28;

    hue +=
        0.022 *

        sin(
            id * 1.73 +
            gLocalAngle * 2.0
        );

    hue +=
        0.020 *
        audio;

    hue +=
        0.018 *
        gPointer.x;

    hue +=
        0.012 *
        gPointerDown *

        sin(
            iTime * 2.2 +
            id
        );


    vec3 colour = max(
        0.55 +

        0.45 *

        cos(
            TAU *

            (
                hue +
                vec3(
                    0.00,
                    0.17,
                    0.34
                )
            )
        ),

        0.0
    );


    colour *=
        colour *
        colour;


    float frontLight =
        0.86 +

        0.22 *

        sat(
            (
                gLocalZ +
                0.055
            ) *
            9.09
        );


    return colour *
           frontLight;
}

vec3 backgroundColour(
    vec2 uv,
    vec3 rayDirection
)
{
    vec3 colour =
        vec3(
            0.0016,
            0.0022,
            0.0035
        );


    vec2 coolPosition =
        uv -
        vec2(
            -0.34,
             0.20
        );

    vec2 warmPosition =
        uv -
        vec2(
             0.18,
            -0.24
        );


    colour +=
        vec3(
            0.008,
            0.021,
            0.030
        ) *

        exp2(
            -4.04 *
            dot(
                coolPosition,
                coolPosition
            )
        );


    colour +=
        vec3(
            0.025,
            0.012,
            0.004
        ) *

        exp2(
            -5.77 *
            dot(
                warmPosition,
                warmPosition
            )
        );


    float upGlow =
        sat(
            rayDirection.y *
            0.5 +
            0.5
        );

    colour +=
        vec3(
            0.002,
            0.004,
            0.008
        ) *

        upGlow *
        upGlow *
        sqrt(upGlow);


    // Cursor-following background light.

    vec2 pointerOffset =
        uv -
        gPointerUV;

    float pointerGlow =
        gPointerEnergy *

        exp2(
            -18.0 *
            dot(
                pointerOffset,
                pointerOffset
            )
        );

    colour +=
        vec3(
            0.006,
            0.015,
            0.028
        ) *
        pointerGlow;


    return colour;
}

mat3 cameraMatrix(
    vec3 cameraPosition,
    vec3 target
)
{
    vec3 forward =
        normalize(
            target -
            cameraPosition
        );

    vec3 right =
        normalize(
            cross(
                forward,
                vec3(0.0, 1.0, 0.0)
            )
        );

    vec3 up =
        cross(
            right,
            forward
        );

    return mat3(
        right,
        up,
        forward
    );
}

vec3 acesToneMap(vec3 colour)
{
    return clamp(
        (
            colour *
            (2.51 * colour + 0.03)
        ) /
        (
            colour *
            (2.43 * colour + 0.59) +
            0.14
        ),
        0.0,
        1.0
    );
}


// ------------------------------------------------------------
// Volumetric raymarch
// ------------------------------------------------------------

vec3 renderScene(
    vec3 rayOrigin,
    vec3 rayDirection,
    vec2 uv,
    vec2 fragCoord
)
{
    vec3 radiance =
        vec3(0.0);

    float transmittance =
        1.0;

    float travel =
        ign(fragCoord) *
        0.42;


    for (
        int stepIndex = 0;
        stepIndex < MAX_STEPS;
        ++stepIndex
    )
    {
        vec3 position =
            rayOrigin +
            rayDirection * travel;

        vec4 scene =
            mapScene(position);

        float stepLength;


        if (scene.y < 0.0)
        {
            stepLength =
                clamp(
                    scene.x * 0.92,
                    0.09,
                    1.15
                );
        }
        else
        {
            float distance =
                abs(scene.x);

            float envelope =
                scene.z;

            float audio =
                scene.w;


            float wideDensity =
                exp2(
                    -distance *

                    (
                        36.0 -
                        8.5 * sat(audio)
                    )
                );


            float wideSquared =
                wideDensity *
                wideDensity;

            float tightDensity =
                wideSquared *
                wideSquared;

            float coreDensity =
                sat(
                    1.0 -
                    distance * 132.0
                );


            stepLength =
                clamp(
                    distance * 0.78 +
                    0.006,

                    MIN_STEP,
                    MAX_STEP
                );


            float response =
                0.42 +

                1.70 *
                sqrt(
                    max(audio, 0.0)
                ) +

                0.20 *
                gLevel;


            float depthFade =
                1.0 /

                (
                    1.0 +
                    0.020 *
                    travel *
                    travel
                );


            float shimmer =
                0.93 +

                0.07 *

                sin(
                    iTime *

                    (
                        2.4 +
                        0.12 * scene.y
                    ) +

                    scene.y * 4.17
                );


            vec3 filament =
                ringColour(
                    scene.y,
                    audio
                );


            vec3 whiteHot =
                mix(
                    filament,
                    vec3(1.0),

                    0.58 +
                    0.10 * gTreble
                );


            float glow =
                wideDensity * 0.92 +
                tightDensity * 3.75;


            vec3 sampleColour =
                filament * glow +

                whiteHot *
                coreDensity *
                24.0 *
                shimmer;


            radiance +=
                transmittance *
                sampleColour *
                envelope *
                stepLength *
                response *
                depthFade;


            transmittance *=
                exp2(
                    -coreDensity *
                    stepLength *
                    2.45
                );
        }


        travel +=
            stepLength;


        if (
            travel > MAX_DIST ||
            transmittance < 0.045
        )
        {
            break;
        }
    }


    vec3 colour =
        backgroundColour(
            uv,
            rayDirection
        );

    colour +=
        radiance *
        1.18;


    return sqrt(
        acesToneMap(
            colour * 1.30
        )
    );
}


// ------------------------------------------------------------
// Main image
// ------------------------------------------------------------

void mainImage(
    out vec4 fragColor,
    in vec2 fragCoord
)
{
    initialiseAudio();
    initialisePointer();


    vec2 uv =
        (
            fragCoord -
            0.5 * iResolution.xy
        ) /
        iResolution.y;

    uv.x -=
        0.035;


    // Touchpad or cursor movement works without clicking.

    float interactionGain =
        0.72 +
        0.28 * gPointerDown;


    gRoll =
        -0.555 +

        0.018 *
        sin(
            iTime * 0.071
        ) -

        0.46 *
        gPointer.x *
        interactionGain;


    gTilt =
        -0.42 *
        gPointer.y *
        interactionGain;


    float flySpeed =
        3.5 +
        0.5 * gBass;


    vec2 automaticOrbit =
        vec2(
            sin(iTime * 0.30) * 0.85,
            cos(iTime * 0.40) * 0.65
        );


    // True positional movement creates parallax rather than only rotating the
    // final screen image.

    vec2 pointerOrbit =
        vec2(
            gPointer.x * 1.05,
            gPointer.y * 0.78
        ) *
        interactionGain;


    vec3 cameraPosition =
        vec3(
            automaticOrbit +
            pointerOrbit,

            -iTime *
            flySpeed
        );


    vec3 target =
        cameraPosition +

        vec3(
            sin(iTime * 0.30 + 0.50) * 0.30 -
            gPointer.x * 0.24,

            cos(iTime * 0.40 + 0.50) * 0.30 -
            gPointer.y * 0.18,

            -1.0
        );


    mat3 camera =
        cameraMatrix(
            cameraPosition,
            target
        );


    float focalLength =
        1.27 -
        0.08 * gPointerDown +
        0.025 * gPointerRadius;


    vec3 rayDirection =
        normalize(
            camera *
            vec3(
                uv,
                focalLength
            )
        );


    vec3 colour =
        renderScene(
            cameraPosition,
            rayDirection,
            uv,
            fragCoord
        );


    float vignette =
        sat(
            1.0 -
            0.12 *
            dot(uv, uv)
        );

    vignette =
        0.84 +
        0.16 *
        sqrt(vignette);


    fragColor =
        vec4(
            colour * vignette,
            1.0
        );
}