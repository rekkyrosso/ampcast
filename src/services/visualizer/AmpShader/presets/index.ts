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
import nautilus from './nautilus.frag';
import musicMandelBoxColour from './musicMandelBoxColour.frag';
import otherworldy from './otherworldy.frag';
import quasicrystal from './quasicrystal.frag';
import radiant from './radiant.frag';
import rainbow from './rainbow.frag';
import soapBubble from './soapBubble.frag';
// import gameboy from './gameboy.frag';

const shaderToy = `https://www.shadertoy.com/view`;

const providerId = 'ampshader';

const presets: AmpShaderVisualizer[] = [
    {
        providerId,
        name: 'Creation by Silexars',
        externalUrl: `${shaderToy}/XsXXDn`,
        shader: `${header}${creation}`,
    },
    {
        providerId,
        name: 'Nautilus by weyland',
        externalUrl: `${shaderToy}/MdXGz4`,
        shader: `${header}${nautilus}`,
    },
    {
        providerId,
        name: 'Quasicrystal by Ebanflo',
        externalUrl: `${shaderToy}/4sXfzj`,
        shader: `${header}${quasicrystal}`,
    },
    {
        providerId,
        name: 'Rainbow by avin',
        externalUrl: `${shaderToy}/ttfGzH`,
        shader: `${header}${rainbow}`,
    },
    {
        providerId,
        name: 'Audio-Visualizer by CoolerZ',
        externalUrl: `${shaderToy}/wd3XzS`,
        shader: `${header}${audioVisualizer}`,
    },
    {
        providerId,
        name: 'Radiant by TekF',
        externalUrl: `${shaderToy}/4sVBWy`,
        shader: `${header}${radiant}`,
    },
    {
        providerId,
        name: 'ambilight 2.0 by MillhausVKodi',
        externalUrl: `${shaderToy}/ltc3WH`,
        shader: `${header}${ambilight}`,
    },
    {
        providerId,
        name: 'dot grid thing by laney',
        externalUrl: `${shaderToy}/Xd2cRG`,
        shader: `${header}${dotGridThing}`,
    },
    {
        providerId,
        name: 'Bubbles by liyouvane',
        externalUrl: `${shaderToy}/llXBWB`,
        shader: `${header}${bubbles}`,
    },
    {
        providerId,
        name: 'Soap Bubble by Ruzzyr',
        externalUrl: `${shaderToy}/XtVSDt`,
        shader: `${header}${soapBubble}`,
    },
    {
        providerId,
        name: 'Fractal Land by Kali',
        externalUrl: `${shaderToy}/XsBXWt`,
        shader: `${header}${fractalLand}`,
    },
    {
        providerId,
        name: 'Music MandelBox Colour by pixelbeast',
        externalUrl: `${shaderToy}/4s33Rj`,
        shader: `${header}${musicMandelBoxColour}`,
    },
    {
        providerId,
        name: 'FFT-IFS by nshelton',
        externalUrl: `${shaderToy}/4lyXWW`,
        shader: `${header}${fftIfs}`,
    },
    {
        providerId,
        name: 'I/O by movAX13h',
        externalUrl: `${shaderToy}/XsfGDS`,
        shader: `${header}${io}`,
    },
    {
        providerId,
        name: 'Otherworldy by lherm',
        externalUrl: `${shaderToy}/MlySWd`,
        shader: `${header}${otherworldy}`,
    },
    // {
    //     provider,
    //     name: 'gameboy by Gameboy by Inigo Quilez',
    //     externalUrl: `${shaderToy}/XdlGzr`,
    //     shader: `${header}${gameboy}`,
    // },
];

export default presets;
