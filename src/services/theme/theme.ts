import type {Observable} from 'rxjs';
import {BehaviorSubject, distinctUntilChanged, filter, skipWhile, tap} from 'rxjs';
import {TinyColor} from '@ctrl/tinycolor';
import {OptionalKeysOf, RequiredKeysOf} from 'type-fest';
import Theme, {Button, MediaButton, Scrollbar, Splitter, Surface} from 'types/Theme';
import ampcastElectron from 'services/ampcastElectron';
import {LiteStorage, Logger} from 'utils';
import {fromLegacyTheme} from './legacyTheme';
import {emptyTheme, defaultTheme} from './themes';
import themeStore from './themeStore';
import fonts, {loadFont} from './fonts';

const logger = new Logger('theme');

export interface CurrentTheme extends Theme {
    readonly userTheme?: boolean;
}

const requiredProperties: Record<
    RequiredKeysOf<Theme>,
    'object' | 'string' | 'number' | 'boolean'
> = {
    name: 'string',
    fontName: 'string',
    frame: 'object',
    content: 'object',
    selected: 'object',
};

const optionalProperties: Record<
    OptionalKeysOf<Theme>,
    'object' | 'string' | 'number' | 'boolean'
> = {
    button: 'object',
    mediaButton: 'object',
    scrollbar: 'object',
    splitter: 'object',
    spacing: 'number',
    roundness: 'number',
    flat: 'boolean',
};

const defaultFontName = 'Arial';
const defaultFontSize = 17.2;
const fontSize$ = new BehaviorSubject(defaultFontSize);

class MainTheme implements CurrentTheme {
    private readonly storage = new LiteStorage('theme');
    private readonly sheet: CSSStyleSheet;
    private readonly rootStyle: CSSStyleDeclaration;
    private readonly appStyle: CSSStyleDeclaration;
    private readonly playheadStyle: CSSStyleDeclaration;
    private readonly app = document.getElementById('app') as HTMLElement;
    private readonly system = document.getElementById('system') as HTMLElement;
    private readonly theme$ = new BehaviorSubject<CurrentTheme>({} as CurrentTheme);
    private applyingUpdate = false;

    constructor() {
        const style = document.createElement('style');
        document.head.append(style);
        this.sheet = style.sheet!;
        this.rootStyle = this.createStyle(':root');
        this.appStyle = this.createStyle('.app');
        this.playheadStyle = this.createStyle('#playhead');
        this.system.classList.toggle('selection-dark', true);
        this.system.classList.toggle('buttons-convex', true);
        this.system.classList.toggle('scrollbar-buttons-convex', true);

        this.observe()
            .pipe(tap(() => this.applyStyles()))
            .subscribe(logger);

        this.load();
    }

    observe(): Observable<CurrentTheme> {
        return this.theme$.pipe(
            skipWhile((theme) => !theme.name),
            filter(() => !this.applyingUpdate)
        );
    }

    observeFontSize(this: unknown): Observable<number> {
        return fontSize$.pipe(distinctUntilChanged());
    }

    get backgroundColor(): string {
        return this.content.color;
    }

    get black(): string {
        if (this.isLight) {
            const color = new TinyColor(this.defaultButtonColor).toHsl();
            color.s -= color.s * 0.6;
            color.l -= color.l * 0.8;
            return this.fromHsl(color);
        } else {
            return new TinyColor(this.content.color).darken(33).toHexString();
        }
    }

    get button(): Button {
        return {...this.defaultButton, ...this.current.button};
    }

    set button(button: Partial<Button> | undefined) {
        this.theme$.next({...this.current, button});
    }

    get buttonColor(): string {
        return this.button.color;
    }

    get content(): Surface {
        return this.current.content;
    }

    set content(content: Surface) {
        this.theme$.next({...this.current, content});
    }

    get current(): CurrentTheme {
        return this.theme$.value;
    }

    get defaultMediaButtonColor(): string {
        return this.defaultMediaButton.color;
    }

    get edited(): boolean {
        return (
            JSON.stringify(this.toJSON()) !==
            JSON.stringify(
                this.toJSON(
                    this.userTheme
                        ? themeStore.getUserTheme(this.name)
                        : themeStore.getDefaultTheme(this.name)
                )
            )
        );
    }

    get flat(): boolean {
        return !!this.current.flat;
    }

    set flat(flat: boolean) {
        this.theme$.next({...this.current, flat});
    }

    get fontName(): string {
        return this.current.fontName || defaultFontName;
    }

    set fontName(fontName: string) {
        const font = fonts.find((font) => font.name === fontName) || fonts[0];
        this.rootStyle.setProperty('--font-family', font.value);
        this.theme$.next({...this.current, fontName});
        loadFont(font);
    }

    get fontSize(): number {
        return fontSize$.value;
    }

    set fontSize(fontSize: number) {
        this.rootStyle.setProperty('--font-size', String(fontSize));
        ampcastElectron?.setFontSize(fontSize);
        fontSize$.next(fontSize);
    }

    get frame(): Surface {
        return this.current.frame;
    }

    set frame(frame: Surface) {
        this.theme$.next({...this.current, frame});
    }

    get frameColor(): string {
        return this.frame.color;
    }

    get frameTextColor(): string {
        return this.frame.textColor;
    }

    get isDark(): boolean {
        return new TinyColor(this.backgroundColor).isDark();
    }

    get isLight(): boolean {
        return new TinyColor(this.backgroundColor).isLight();
    }

    get isButtonDark(): boolean {
        return new TinyColor(this.buttonColor).isDark();
    }

    get isButtonLight(): boolean {
        return new TinyColor(this.buttonColor).isLight();
    }

    get isFrameDark(): boolean {
        return new TinyColor(this.frameColor).isDark();
    }

    get isFrameLight(): boolean {
        return new TinyColor(this.frameColor).isLight();
    }

    get isFrameTextDark(): boolean {
        return new TinyColor(this.frameTextColor).isDark();
    }

    get isFrameTextLight(): boolean {
        return new TinyColor(this.frameTextColor).isLight();
    }

    get isMediaButtonLight(): boolean {
        return new TinyColor(this.mediaButtonColor).isLight();
    }

    get isScrollbarDark(): boolean {
        return new TinyColor(this.scrollbar.color).isDark();
    }

    get isScrollbarLight(): boolean {
        return new TinyColor(this.scrollbar.color).isLight();
    }

    get isSelectionDark(): boolean {
        return new TinyColor(this.selected.color).isDark();
    }

    get isSelectionLight(): boolean {
        return new TinyColor(this.selected.color).isLight();
    }

    get isTextDark(): boolean {
        return new TinyColor(this.textColor).isDark();
    }

    get isTextLight(): boolean {
        return new TinyColor(this.textColor).isLight();
    }

    get mediaButton(): MediaButton {
        return {...this.defaultMediaButton, ...this.current.mediaButton};
    }

    set mediaButton(mediaButton: Partial<MediaButton> | undefined) {
        this.theme$.next({...this.current, mediaButton});
    }

    get mediaButtonColor(): string {
        return this.mediaButton.color;
    }

    get name(): string {
        return this.current.name;
    }

    set name(name: string) {
        this.theme$.next({...this.current, name});
    }

    get roundness(): number {
        return this.current.roundness ?? 0.25;
    }

    set roundness(roundness: number) {
        this.theme$.next({...this.current, roundness});
    }

    get scrollbar(): Scrollbar {
        return {...this.defaultScrollbar, ...this.current.scrollbar};
    }

    set scrollbar(scrollbar: Partial<Scrollbar> | undefined) {
        this.theme$.next({...this.current, scrollbar});
    }

    get splitter(): Splitter {
        return {...this.defaultSplitter, ...this.current.splitter};
    }

    set splitter(splitter: Partial<Splitter> | undefined) {
        this.theme$.next({...this.current, splitter});
    }

    get selected(): Surface {
        return this.current.selected;
    }

    set selected(selected: Surface) {
        this.theme$.next({...this.current, selected});
    }

    get spacing(): number {
        return this.current.spacing ?? 0.375;
    }

    set spacing(spacing: number) {
        this.theme$.next({...this.current, spacing});
    }

    get textColor(): string {
        return this.content.textColor;
    }

    get userTheme(): boolean {
        return !!this.current.userTheme;
    }

    set userTheme(userTheme: boolean) {
        this.theme$.next({...this.current, userTheme});
    }

    apply(theme: Theme & {userTheme?: boolean}): void {
        this.applyingUpdate = true;
        const defaultValues = theme.userTheme ? {} : themeStore.getDefaultTheme(theme.name) || {};
        Object.assign(
            this,
            emptyTheme,
            defaultValues,
            {userTheme: undefined},
            fromLegacyTheme(theme)
        );
        this.applyingUpdate = false;
        this.theme$.next(this.current);
    }

    getVisualizerColors(): readonly string[] {
        const brightColor = new TinyColor(this.defaultMediaButtonColor);
        const primaryLightColor = this.isDark
            ? this.textColor
            : this.isFrameTextLight
              ? this.frameTextColor
              : this.backgroundColor;
        return [primaryLightColor, ...brightColor.tetrad().map((color) => color.toRgbString())];
    }

    load(): void {
        const theme = this.storage.getJson<Theme>('current', defaultTheme);
        this.apply(theme);
        this.fontSize = this.storage.getNumber('fontSize', defaultFontSize);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
    }

    save(): void {
        this.storage.setNumber('fontSize', this.fontSize);
        this.storage.setJson('current', this.current);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
    }

    toJSON(theme: Theme | string = this.current): Theme {
        if (typeof theme === 'string') {
            // This function was invoked by `JSON.stringify`.
            theme = this.current;
        } else {
            theme = fromLegacyTheme(theme);
        }
        const data = Object.keys(requiredProperties).reduce((data, key) => {
            data[key] = theme[key as keyof Theme];
            return data;
        }, {} as any);
        Object.keys(optionalProperties).forEach((key) => {
            const value = theme[key as keyof Theme];
            if (JSON.stringify(value) !== '{}') {
                data[key] = value;
            }
        });
        return data;
    }

    validate(data: any): data is Theme {
        if (!data || typeof data !== 'object' || 'length' in data) {
            return false;
        }
        data = fromLegacyTheme(data);
        return (
            Object.keys(requiredProperties).every(
                (key) =>
                    key in data &&
                    typeof data[key] === requiredProperties[key as RequiredKeysOf<Theme>]
            ) &&
            Object.keys(data).every(
                (key) =>
                    key in requiredProperties ||
                    typeof data[key] === optionalProperties[key as OptionalKeysOf<Theme>]
            )
        );
    }

    private get defaultButton(): Button {
        return {
            color: this.defaultButtonColor,
            textColor: this.frameTextColor,
            borderColor: this.black,
            borderWidth: 1,
            edgeStyle: 'chamfer+1',
            elevation: 0,
            surfaceStyle: 'flat',
        };
    }

    private get defaultButtonColor(): string {
        const color = new TinyColor(this.frameColor).toHsl();
        color.s += 0.05;
        color.l += 0.05;
        return this.fromHsl(color);
    }

    private get defaultMediaButton(): MediaButton {
        const color = new TinyColor(this.frameColor).toHsl();
        color.s += (1 - color.s) * 0.24;
        color.l += (1 - color.l) * 0.625;
        const textColor = new TinyColor(color).toHsl();
        textColor.s -= color.s * 0.5;
        textColor.l -= color.l * 0.9;
        return {
            ...this.button,
            color: this.fromHsl(color),
            textColor: this.fromHsl(textColor),
        };
    }

    private get defaultScrollbar(): Scrollbar {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const {elevation, ...button} = this.button;
        return {...button, size: 1};
    }

    private get defaultSplitter(): Splitter {
        return {
            color: this.defaultButtonColor,
            textColor: this.frameTextColor,
            edgeStyle: 'chamfer+1',
            size: 1,
        };
    }

    private applyStyles(): void {
        this.setColor('backgroundColor', this.backgroundColor);
        this.setColor('textColor', this.textColor);

        const themeKeys = Object.keys(requiredProperties)
            .concat(Object.keys(optionalProperties))
            .filter(
                (key) =>
                    key !== 'name' && key !== 'content' && key !== 'flat' && key !== 'userTheme'
            ) as (keyof Theme)[];

        for (const key of themeKeys) {
            const property = this[key];
            if (typeof property === 'object') {
                Object.keys(property).forEach((key2) => {
                    const value = property[key2 as keyof Surface];
                    if (key2 === 'edgeStyle') {
                        let chamfer = 0;
                        let fillet = 0;
                        switch (value) {
                            case 'chamfer+1':
                                chamfer = 1;
                                break;
                            case 'chamfer+2':
                                chamfer = 2;
                                break;
                            case 'chamfer-1':
                                chamfer = -1;
                                break;
                            case 'fillet+1':
                                fillet = 1;
                                break;
                            case 'fillet+2':
                                fillet = 2;
                                break;
                            case 'fillet-1':
                                fillet = -1;
                                break;
                        }
                        this.setProperty(`${key}-chamfer`, chamfer);
                        this.setProperty(`${key}-fillet`, fillet);
                    } else if (/^color$|Color$/i.test(key2)) {
                        this.setColor(`${key}-${key2}`, value as string);
                    } else {
                        this.setProperty(`${key}-${key2}`, value);
                    }
                });
            } else if (/Color$/.test(key)) {
                this.setColor(key, property as string);
            } else {
                this.setProperty(key, property);
            }
        }

        this.setProperty('black', this.black);
        this.toggleClasses();
        // TODO: Better colours (frame and content, high contrast)
        this.setProperty('focus-ring-color', this.name === 'Contrast' ? 'red' : null);
        this.createPlayheadSmiley();

        // Set chrome color for Electron/PWA.
        if (ampcastElectron) {
            ampcastElectron.setFrameColor(this.frameColor);
        } else {
            let themeColorMeta = document.head.querySelector('meta[name="theme-color"]');
            if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta');
                themeColorMeta.setAttribute('name', 'theme-color');
                document.head.append(themeColorMeta);
            }
            themeColorMeta.setAttribute('content', this.frameColor);
        }
    }

    private toggleClasses(): void {
        const classes = this.app.classList;
        const {flat, button, mediaButton, scrollbar} = this;
        classes.toggle('flat', flat);
        classes.toggle('dark', this.isDark);
        classes.toggle('light', this.isLight);
        classes.toggle('frame-dark', this.isFrameDark);
        classes.toggle('frame-light', this.isFrameLight);
        classes.toggle('frame-text-dark', this.isFrameTextDark);
        classes.toggle('frame-text-light', this.isFrameTextLight);
        classes.toggle('button-dark', this.isButtonDark);
        classes.toggle('button-light', this.isButtonLight);
        classes.toggle('scrollbar-dark', this.isScrollbarDark);
        classes.toggle('scrollbar-light', this.isScrollbarLight);
        classes.toggle('selection-dark', this.isSelectionDark);
        classes.toggle('selection-light', this.isSelectionLight);
        classes.toggle('buttons-concave', !flat && button.surfaceStyle === 'concave');
        classes.toggle('buttons-convex', !flat && button.surfaceStyle === 'convex');
        classes.toggle('media-buttons-concave', !flat && mediaButton.surfaceStyle === 'concave');
        classes.toggle('media-buttons-convex', !flat && mediaButton.surfaceStyle === 'convex');
        classes.toggle('scrollbar-buttons-concave', !flat && scrollbar.surfaceStyle === 'concave');
        classes.toggle('scrollbar-buttons-convex', !flat && scrollbar.surfaceStyle === 'convex');
    }

    private setColor(colorName: string, color: string): void {
        if (color) {
            const hsl = new TinyColor(color).toHsl();
            this.setProperty(`${colorName}-h`, String(hsl.h));
            this.setProperty(`${colorName}-s`, `${hsl.s * 100}%`);
            this.setProperty(`${colorName}-l`, `${hsl.l * 100}%`);
            this.setProperty(`${colorName}-l2`, hsl.l);
            this.setProperty(`${colorName}`, `hsl(${hsl.h},${hsl.s * 100}%,${hsl.l * 100}%)`);
        } else {
            this.setProperty(`${colorName}-h`, null);
            this.setProperty(`${colorName}-s`, null);
            this.setProperty(`${colorName}-l`, null);
            this.setProperty(`${colorName}-l2`, null);
            this.setProperty(`${colorName}`, null);
        }
    }

    private setProperty(propertyName: string, value: string | number | boolean | null): void {
        propertyName = propertyName.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);
        this.appStyle.setProperty(`--${propertyName}`, value == null ? null : String(value));
    }

    private createStyle(selector: string): CSSStyleDeclaration {
        const index = this.sheet.insertRule(`${selector}{}`);
        const rule = this.sheet.cssRules[index] as CSSStyleRule;
        return rule.style;
    }

    private createPlayheadSmiley(): void {
        const color = new TinyColor(this.mediaButton.textColor).toRgbString();
        const svgContent = [
            `<path fill='${color}' d='M 160.5,164.5 C 183.647,162.813 194.147,173.48 192,196.5C 186.494,211.009 175.994,216.842 160.5,214C 145.991,208.494 140.158,197.994 143,182.5C 145.683,173.318 151.517,167.318 160.5,164.5 Z'/>`,
            `<path fill='${color}' d='M 335.5,164.5 C 358.647,162.813 369.147,173.48 367,196.5C 361.494,211.009 350.994,216.842 335.5,214C 320.991,208.494 315.158,197.994 318,182.5C 320.683,173.318 326.517,167.318 335.5,164.5 Z'/>`,
            `<path fill='${color}' d='M 164.5,296.5 C 172.699,295.1 179.865,297.1 186,302.5C 201.99,327.582 224.823,341.582 254.5,344.5C 279.499,342.418 299.999,331.751 316,312.5C 318.955,308.756 321.789,304.922 324.5,301C 334.716,294.616 344.55,295.116 354,302.5C 358.296,308.845 359.63,315.845 358,323.5C 334.118,361.698 299.618,382.365 254.5,385.5C 209.382,382.365 174.882,361.698 151,323.5C 148.138,310.557 152.638,301.557 164.5,296.5 Z'/>`,
        ].join('');
        const url = this.createSVGUrl(512, 512, svgContent);
        this.playheadStyle.setProperty('--smiley', url);
    }

    private createSVGUrl(width: number, height: number, svgContent: string): string {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${svgContent}</svg>`;
        return `url("data:image/svg+xml;utf8,${svg}")`;
    }

    private fromHsl({h, s, l}: {h: number; s: number; l: number}): string {
        s = Math.min(Math.max(s, 0), 1);
        l = Math.min(Math.max(l, 0), 1);
        return new TinyColor({h, s, l}).toHexString();
    }
}

export default new MainTheme();
