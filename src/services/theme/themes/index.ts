import Theme from 'types/Theme';
import astronaut from './astronaut.json';
import blackgold from './blackgold.json';
import boringDefault from './default.json';
import contrast from './contrast.json';
import debug from './debug.json';
import glacier from './glacier.json';
import indigo from './indigo.json';
import jeep from './jeep.json';
import lego from './lego.json';
import mellowyellow from './mellowyellow.json';
import moodyblue from './moodyblue.json';
import neon from './neon.json';
import palepink from './palepink.json';
import potpourri from './potpourri.json';
import proton from './proton.json';
import purplelicious from './purplelicious.json';
import radioactive from './radioactive.json';
import saddle from './saddle.json';
import treasure from './treasure.json';
import velvet from './velvet.json';
import winampClassic from './winamp-classic.json';
import winampModern from './winamp-modern.json';

export const emptyTheme: Required<Theme> = {
    name: '(none)',
    fontName: 'Arial',
    // required colors
    backgroundColor: 'black',
    textColor: 'white',
    frameColor: 'black',
    frameTextColor: 'white',
    selectedBackgroundColor: 'blue',
    selectedTextColor: 'white',
    // leave these empty
    buttonColor: '',
    buttonTextColor: '',
    scrollbarColor: '',
    scrollbarTextColor: '',
    scrollbarThickness: 1,
    mediaButtonColor: '',
    mediaButtonTextColor: '',
    spacing: 0,
    roundness: 0,
    flat: false,
};

export const defaultTheme: Required<Theme> = {
    ...emptyTheme,
    ...boringDefault,
};

const themes: readonly Theme[] = [
    defaultTheme,
    astronaut,
    blackgold,
    contrast,
    glacier,
    indigo,
    jeep,
    lego,
    mellowyellow,
    moodyblue,
    neon,
    palepink,
    potpourri,
    proton,
    purplelicious,
    radioactive,
    saddle,
    treasure,
    velvet,
    winampClassic,
    winampModern,
    debug,
];

export default themes;
