import Theme from 'types/Theme';
import astronaut from './astronaut.json';
import blackgold from './blackgold.json';
import boringDefault from './boringDefault.json';
import debug from './debug.json';
import glacier from './glacier.json';
import indigo from './indigo.json';
import moodyblue from './moodyblue.json';
import palepink from './palepink.json';
import purplelicious from './purplelicious.json';
import radioactive from './radioactive.json';
import saddle from './saddle.json';
import velvet from './velvet.json';
import winampClassic from './winamp-classic.json';
import winampModern from './winamp-modern.json';

export const emptyTheme: Required<Theme> = {
    name: '(none)',
    // basic colours
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
    glacier,
    indigo,
    moodyblue,
    palepink,
    purplelicious,
    radioactive,
    saddle,
    velvet,
    winampClassic,
    winampModern,
    debug,
];

export default themes;
