import {AmpShaderVisualizer} from 'types/Visualizer';
import header from './_header.frag';
import ambilight from './ambilight.frag';
import audioVisualizer from './audioVisualizer.frag';
import bubbles from './bubbles.frag';
import creation from './creation.frag';
import dotGridThing from './dotGridThing.frag';
import fftIfs from './fft-ifs.frag';
import fractalLand from './fractalLand.frag';
import io from './io.frag';
import mandelKoch from './mandelKoch.frag';
import musicMandelBoxColour from './musicMandelBoxColour.frag';
import nautilus from './nautilus.frag';
import otherworldy from './otherworldy.frag';
import quasicrystal from './quasicrystal.frag';
import radiant from './radiant.frag';
import rainbow from './rainbow.frag';
import soapBubble from './soapBubble.frag';

const shaderToyView = `https://www.shadertoy.com/view`;

const providerId = 'ampshader';

const visualizers: AmpShaderVisualizer[] = [
    {
        providerId,
        name: 'MandelKoch - Music Visualiser by Pelegefen',
        externalUrl: `${shaderToyView}/sslXzX`,
        shader: `${header}${mandelKoch}`,
    },
    {
        providerId,
        name: 'Creation by Silexars',
        externalUrl: `${shaderToyView}/XsXXDn`,
        shader: `${header}${creation}`,
    },
    {
        providerId,
        name: 'Nautilus by weyland',
        externalUrl: `${shaderToyView}/MdXGz4`,
        shader: `${header}${nautilus}`,
    },
    {
        providerId,
        name: 'Quasicrystal by Ebanflo',
        externalUrl: `${shaderToyView}/4sXfzj`,
        shader: `${header}${quasicrystal}`,
    },
    {
        providerId,
        name: 'Rainbow by avin',
        externalUrl: `${shaderToyView}/ttfGzH`,
        shader: `${header}${rainbow}`,
    },
    {
        providerId,
        name: 'Audio-Visualizer by CoolerZ',
        externalUrl: `${shaderToyView}/wd3XzS`,
        shader: `${header}${audioVisualizer}`,
    },
    {
        providerId,
        name: 'Radiant by TekF',
        externalUrl: `${shaderToyView}/4sVBWy`,
        shader: `${header}${radiant}`,
    },
    {
        providerId,
        name: 'ambilight 2.0 by MillhausVKodi',
        externalUrl: `${shaderToyView}/ltc3WH`,
        shader: `${header}${ambilight}`,
    },
    {
        providerId,
        name: 'dot grid thing by laney',
        externalUrl: `${shaderToyView}/Xd2cRG`,
        shader: `${header}${dotGridThing}`,
    },
    {
        providerId,
        name: 'Bubbles by liyouvane',
        externalUrl: `${shaderToyView}/llXBWB`,
        shader: `${header}${bubbles}`,
    },
    {
        providerId,
        name: 'Soap Bubble by Ruzzyr',
        externalUrl: `${shaderToyView}/XtVSDt`,
        shader: `${header}${soapBubble}`,
    },
    {
        providerId,
        name: 'Fractal Land by Kali',
        externalUrl: `${shaderToyView}/XsBXWt`,
        shader: `${header}${fractalLand}`,
    },
    {
        providerId,
        name: 'Music MandelBox Colour by pixelbeast',
        externalUrl: `${shaderToyView}/4s33Rj`,
        shader: `${header}${musicMandelBoxColour}`,
    },
    {
        providerId,
        name: 'FFT-IFS by nshelton',
        externalUrl: `${shaderToyView}/4lyXWW`,
        shader: `${header}${fftIfs}`,
    },
    {
        providerId,
        name: 'I/O by movAX13h',
        externalUrl: `${shaderToyView}/XsfGDS`,
        shader: `${header}${io}`,
    },
    {
        providerId,
        name: 'Otherworldy by lherm',
        externalUrl: `${shaderToyView}/MlySWd`,
        shader: `${header}${otherworldy}`,
    },
];

console.log('ampshader visualizers:', visualizers.length);

export default visualizers;
