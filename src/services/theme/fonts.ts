import {Writable} from 'type-fest';
import {loadStyleSheet} from 'utils';

export interface Font {
    readonly name: string;
    readonly value: string; // Valid value for CSS `font-family`.
    readonly url?: string;
    readonly loaded?: boolean;
}

const googleFont = (name: string, fallback = 'sans-serif'): Font => ({
    name,
    value: `"${name}",${fallback}`,
    url: `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}`,
});

const fonts: readonly Font[] = [
    {name: 'Arial', value: 'Arial,sans-serif'},
    googleFont('Bricolage Grotesque'),
    {name: 'Courier New', value: '"Courier New",Courier,monospace'},
    {name: 'Cursive', value: 'cursive'},
    {name: 'Georgia', value: 'Georgia,serif'},
    googleFont('Inter'),
    googleFont('Lato'),
    {name: 'Monospace', value: 'monospace'},
    googleFont('Montserrat'),
    googleFont('Muli'),
    googleFont('Nunito Sans'),
    googleFont('Open Sans'),
    googleFont('Overpass'),
    googleFont('Poppins'),
    googleFont('Roboto'),
    {name: 'System UI', value: 'system-ui,sans-serif'},
    {name: 'Tahoma', value: 'Tahoma,Verdana,sans-serif'},
    {name: 'Times New Roman', value: '"Times New Roman",Times,serif'},
    googleFont('Ubuntu'),
    {name: 'Verdana', value: 'Verdana,sans-serif'},
];

export async function loadFont(font: Writable<Font>): Promise<void> {
    if (font.url && font.loaded === undefined) {
        font.loaded = true;
        try {
            await loadStyleSheet(font.url);
        } catch (err) {
            console.log('Failed to load font:', font.name);
            console.error(err);
            font.loaded = false;
        }
    }
}

export async function loadAllFonts(): Promise<void> {
    await Promise.all(fonts.map(loadFont));
}

export default fonts;
