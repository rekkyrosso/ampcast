import Theme from 'types/Theme';
import ascii from './ascii.json';
import astronaut from './astronaut.json';
import blackgold from './blackgold.json';
import boringDefault from './default.json';
import carbon from './carbon.json';
import contrast from './contrast.json';
import debug from './debug.json';
import glacier from './glacier.json';
import mellowyellow from './mellowyellow.json';
import moodyblue from './moodyblue.json';
import notebook from './notebook.json';
import palepink from './palepink.json';
import polymer from './polymer.json';
import potpourri from './potpourri.json';
import proton from './proton.json';
import purplelicious from './purplelicious.json';
import radioactive from './radioactive.json';
import saddle from './saddle.json';
import treasure from './treasure.json';
import velvet from './velvet.json';
import winampClassic from './winamp-classic.json';

export const emptyTheme: Required<Theme> = {
    name: '(none)',
    fontName: 'Arial',
    content: {color: 'black', textColor: 'white'},
    frame: {color: 'black', textColor: 'white'},
    selected: {color: 'blue', textColor: 'white'},
    button: {},
    mediaButton: {},
    scrollbar: {},
    splitter: {},
    spacing: 0,
    roundness: 0,
    flat: false,
};

export const defaultTheme = boringDefault as Theme;

const themes = [
    defaultTheme,
    ascii,
    astronaut,
    blackgold,
    carbon,
    contrast,
    glacier,
    mellowyellow,
    moodyblue,
    notebook,
    palepink,
    polymer,
    potpourri,
    proton,
    purplelicious,
    radioactive,
    saddle,
    treasure,
    velvet,
    winampClassic,
    debug,
] as Theme[];

export default themes;
