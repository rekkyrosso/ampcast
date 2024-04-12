import type {Observable} from 'rxjs';
import {BehaviorSubject, filter, tap} from 'rxjs';
import {TinyColor} from '@ctrl/tinycolor';
import Theme from 'types/Theme';
import {LiteStorage, Logger, browser} from 'utils';
import {emptyTheme, defaultTheme} from './themes';
import themeStore from './themeStore';

const logger = new Logger('theme');
const isElectron = browser.isElectron;
const ampcastElectron = window.ampcastElectron;

export interface CurrentTheme extends Required<Theme> {
    readonly userTheme?: boolean;
}

export type ThemeColorName =
    | 'backgroundColor'
    | 'buttonColor'
    | 'buttonTextColor'
    | 'frameColor'
    | 'frameTextColor'
    | 'mediaButtonColor'
    | 'mediaButtonTextColor'
    | 'scrollbarColor'
    | 'scrollbarTextColor'
    | 'selectedBackgroundColor'
    | 'selectedTextColor'
    | 'textColor';

class MainTheme implements CurrentTheme {
    readonly defaultFontSize = 17.2;
    private readonly storage = new LiteStorage('theme');
    private readonly sheet: CSSStyleSheet;
    private readonly rootStyle: CSSStyleDeclaration;
    private readonly appStyle: CSSStyleDeclaration;
    private readonly playheadStyle: CSSStyleDeclaration;
    private readonly app = document.getElementById('app') as HTMLElement;
    private readonly popup = document.getElementById('popup') as HTMLElement;
    private readonly system = document.getElementById('system') as HTMLElement;
    private readonly theme$ = new BehaviorSubject<CurrentTheme>(defaultTheme);
    private applyingUpdate = false;

    constructor() {
        const style = document.createElement('style');
        document.head.append(style);
        this.sheet = style.sheet!;
        this.rootStyle = this.createStyle(':root');
        this.appStyle = this.createStyle('.app');
        this.playheadStyle = this.createStyle('#playhead');
        this.system.classList.toggle('selection-dark', true);
        this.restore();

        this.observe()
            .pipe(tap(() => this.applyAppStyles()))
            .subscribe(logger);
    }

    observe(): Observable<CurrentTheme> {
        return this.theme$.pipe(filter(() => !this.applyingUpdate));
    }

    get backgroundColor(): string {
        return this.current.backgroundColor;
    }

    set backgroundColor(color: string) {
        this.setColor('backgroundColor', color);
    }

    get black(): string {
        if (this.isLight) {
            const color = new TinyColor(this.defaultButtonColor).toHsl();
            color.s -= color.s * 0.6;
            color.l -= color.l * 0.8;
            return this.fromHsl(color);
        } else {
            return new TinyColor(this.backgroundColor).darken(33).toHexString();
        }
    }

    get buttonColor(): string {
        return this.current.buttonColor;
    }

    set buttonColor(color: string) {
        this.setColor('buttonColor', color, this.defaultButtonColor);
        this.scrollbarColor = this.current.scrollbarColor;
    }

    get buttonTextColor(): string {
        return this.current.buttonTextColor;
    }

    set buttonTextColor(color: string) {
        this.setColor('buttonTextColor', color, this.defaultButtonTextColor);
        this.scrollbarTextColor = this.current.scrollbarTextColor;
    }

    get current(): CurrentTheme {
        return this.theme$.value;
    }

    get defaultButtonColor(): string {
        const color = new TinyColor(this.frameColor).toHsl();
        color.s += 0.05;
        color.l += 0.05;
        return this.fromHsl(color);
    }

    get defaultButtonTextColor(): string {
        return this.frameTextColor;
    }

    get defaultMediaButtonColor(): string {
        const color = new TinyColor(this.frameColor).toHsl();
        color.s += (1 - color.s) * 0.33;
        color.l += (1 - color.l) * 0.5;
        return this.fromHsl(color);
    }

    get defaultMediaButtonTextColor(): string {
        const color = new TinyColor(this.mediaButtonColor || this.defaultMediaButtonColor).toHsl();
        color.s -= color.s * 0.5;
        color.l -= color.l * 0.9;
        return this.fromHsl(color);
    }

    get defaultScrollbarColor(): string {
        return this.buttonColor || this.defaultButtonColor;
    }

    get defaultScrollbarTextColor(): string {
        return this.buttonTextColor || this.defaultButtonTextColor;
    }

    get edited(): boolean {
        const originalTheme = this.userTheme
            ? themeStore.getUserTheme(this.name)
            : themeStore.getDefaultTheme(this.name);
        return originalTheme
            ? !Object.keys(originalTheme).every(
                  (propertyName) =>
                      originalTheme[propertyName as keyof Theme] ===
                      this[propertyName as keyof Theme]
              )
            : false;
    }

    get flat(): boolean {
        return this.current.flat;
    }

    set flat(flat: boolean) {
        this.app.classList.toggle('flat', !!flat);
        this.popup.classList.toggle('flat', !!flat);
        this.theme$.next({...this.current, flat});
    }

    get focusRingColor(): string {
        if (this.isFrameDark) {
            return new TinyColor(
                this.isMediaButtonLight ? this.mediaButtonColor : this.defaultMediaButtonColor
            )
                .triad()[1]
                .saturate(20)
                .lighten(20)
                .toHexString();
        } else {
            return new TinyColor(this.frameColor).triad()[2].saturate(33).darken(50).toHexString();
        }
    }

    get fontSize(): number {
        return Number(this.rootStyle.getPropertyValue('--font-size')) || this.defaultFontSize;
    }

    set fontSize(fontSize: number) {
        this.rootStyle.setProperty('--font-size', String(fontSize));
        this.createPlayheadSmiley();
        if (isElectron) {
            ampcastElectron?.setFontSize(fontSize);
        }
    }

    get frameColor(): string {
        return this.current.frameColor;
    }

    set frameColor(color: string) {
        this.setColor('frameColor', color);
        this.buttonColor = this.current.buttonColor;
        this.mediaButtonColor = this.current.mediaButtonColor;
        if (isElectron) {
            ampcastElectron?.setFrameColor(color);
        } else {
            let themeColorMeta = document.head.querySelector('meta[name="theme-color"]');
            if (!themeColorMeta) {
                themeColorMeta = document.createElement('meta');
                themeColorMeta.setAttribute('name', 'theme-color');
                document.head.append(themeColorMeta);
            }
            themeColorMeta.setAttribute('content', color);
        }
    }

    get frameTextColor(): string {
        return this.current.frameTextColor;
    }

    set frameTextColor(color: string) {
        this.setColor('frameTextColor', color);
        this.buttonTextColor = this.current.buttonTextColor;
        if (isElectron) {
            ampcastElectron?.setFrameTextColor(color);
        }
    }

    get mediaButtonColor(): string {
        return this.current.mediaButtonColor;
    }

    set mediaButtonColor(color: string) {
        this.setColor('mediaButtonColor', color, this.defaultMediaButtonColor);
        this.mediaButtonTextColor = this.current.mediaButtonTextColor;
    }

    get mediaButtonTextColor(): string {
        return this.current.mediaButtonTextColor;
    }

    set mediaButtonTextColor(color: string) {
        this.setColor('mediaButtonTextColor', color, this.defaultMediaButtonTextColor);
        this.createPlayheadSmiley();
    }

    get name(): string {
        return this.current.name;
    }

    set name(name: string) {
        this.theme$.next({...this.current, name});
    }

    get roundness(): number {
        return this.current.roundness;
    }

    set roundness(roundness: number) {
        this.setProperty('roundness', roundness);
        this.theme$.next({...this.current, roundness});
    }

    get scrollbarColor(): string {
        return this.current.scrollbarColor;
    }

    set scrollbarColor(color: string) {
        this.setColor('scrollbarColor', color, this.defaultScrollbarColor);
    }

    get scrollbarTextColor(): string {
        return this.current.scrollbarTextColor;
    }

    set scrollbarTextColor(color: string) {
        this.setColor('scrollbarTextColor', color, this.defaultScrollbarTextColor);
    }

    get selectedBackgroundColor(): string {
        return this.current.selectedBackgroundColor;
    }

    set selectedBackgroundColor(color: string) {
        this.setColor('selectedBackgroundColor', color);
        const backgroundColor = new TinyColor(color);
        this.setProperty(
            'selected-background-color-blurred',
            backgroundColor.desaturate(50).setAlpha(0.75).toRgbString()
        );
    }

    get selectedTextColor(): string {
        return this.current.selectedTextColor;
    }

    set selectedTextColor(color: string) {
        this.setColor('selectedTextColor', color);
    }

    get spacing(): number {
        return this.current.spacing;
    }

    set spacing(spacing: number) {
        this.setProperty('spacing', spacing);
        this.theme$.next({...this.current, spacing});
    }

    get textColor(): string {
        return this.current.textColor;
    }

    set textColor(color: string) {
        this.setColor('textColor', color);
    }

    get isDark(): boolean {
        return new TinyColor(this.backgroundColor).isDark();
    }

    get isLight(): boolean {
        return new TinyColor(this.backgroundColor).isLight();
    }

    get isButtonDark(): boolean {
        return new TinyColor(this.buttonColor || this.defaultButtonColor).isDark();
    }

    get isButtonLight(): boolean {
        return new TinyColor(this.buttonColor || this.defaultButtonColor).isLight();
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
        return new TinyColor(this.scrollbarColor || this.defaultScrollbarColor).isDark();
    }

    get isScrollbarLight(): boolean {
        return new TinyColor(this.scrollbarColor || this.defaultScrollbarColor).isLight();
    }

    get isSelectionDark(): boolean {
        return new TinyColor(this.selectedBackgroundColor).isDark();
    }

    get isSelectionLight(): boolean {
        return new TinyColor(this.selectedBackgroundColor).isLight();
    }

    get isTextDark(): boolean {
        return new TinyColor(this.textColor).isDark();
    }

    get isTextLight(): boolean {
        return new TinyColor(this.textColor).isLight();
    }

    get userTheme(): boolean {
        return !!this.current.userTheme;
    }

    set userTheme(userTheme: boolean) {
        this.theme$.next({...this.current, userTheme});
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

    apply(theme: Theme): void {
        this.applyingUpdate = true;
        const values = {...emptyTheme, userTheme: undefined, ...theme};
        this.frameColor = values.frameColor;
        this.frameTextColor = values.frameTextColor;
        Object.assign(this, values);
        this.applyingUpdate = false;
        this.theme$.next(this.current);
        if (isElectron) {
            ampcastElectron?.setTheme(this.current);
        }
    }

    private applyAppStyles(): void {
        this.setProperty('black', this.black);
        this.setProperty('focus-ring-color', this.focusRingColor);
        this.toggleClasses(this.app);
        this.toggleClasses(this.popup);
    }

    restore(): void {
        const theme = this.storage.getJson<Theme>('current', defaultTheme);
        this.apply(theme);
        this.fontSize = this.storage.getNumber('fontSize', this.defaultFontSize);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
    }

    save(): void {
        this.storage.setNumber('fontSize', this.fontSize);
        this.storage.setJson('current', this.current);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
    }

    validate(data: any): data is Theme {
        if (!data || typeof data !== 'object' || 'length' in data) {
            return false;
        }
        type ThemeSchema = Partial<Record<keyof Theme, 'string' | 'number' | 'boolean'>>;
        const required: ThemeSchema = {
            name: 'string',
            frameColor: 'string',
            frameTextColor: 'string',
            backgroundColor: 'string',
            textColor: 'string',
            selectedBackgroundColor: 'string',
            selectedTextColor: 'string',
        };
        const optional: ThemeSchema = {
            mediaButtonColor: 'string',
            mediaButtonTextColor: 'string',
            buttonColor: 'string',
            buttonTextColor: 'string',
            scrollbarColor: 'string',
            scrollbarTextColor: 'string',
            spacing: 'number',
            roundness: 'number',
            flat: 'boolean',
        };
        return (
            Object.keys(required).every(
                (key) => key in data && typeof data[key] === required[key as keyof Theme]
            ) &&
            Object.keys(data).every(
                (key) => key in required || typeof data[key] === optional[key as keyof Theme]
            )
        );
    }

    private toggleClasses(root: HTMLElement): void {
        const classList = root.classList;
        classList.toggle('dark', this.isDark);
        classList.toggle('light', this.isLight);
        classList.toggle('frame-dark', this.isFrameDark);
        classList.toggle('frame-light', this.isFrameLight);
        classList.toggle('frame-text-dark', this.isFrameTextDark);
        classList.toggle('frame-text-light', this.isFrameTextLight);
        classList.toggle('button-dark', this.isButtonDark);
        classList.toggle('button-light', this.isButtonLight);
        classList.toggle('scrollbar-dark', this.isScrollbarDark);
        classList.toggle('scrollbar-light', this.isScrollbarLight);
        classList.toggle('selection-dark', this.isSelectionDark);
        classList.toggle('selection-light', this.isSelectionLight);
    }

    private setColor(
        colorName: ThemeColorName,
        value: TinyColor | string | null,
        defaultValue?: TinyColor | string | null
    ): void {
        const hslColorName = this.toDashName(colorName);
        let color = value || defaultValue;
        if (color) {
            if (typeof color === 'string') {
                color = new TinyColor(color);
            }
            const hsl = color.toHsl();
            this.setProperty(`${hslColorName}-h`, String(hsl.h));
            this.setProperty(`${hslColorName}-s`, `${hsl.s * 100}%`);
            this.setProperty(`${hslColorName}-l`, `${hsl.l * 100}%`);
            this.theme$.next({...this.current, [colorName]: value ? color.toHexString() : ''});
        } else {
            this.setProperty(`${hslColorName}-h`, null);
            this.setProperty(`${hslColorName}-s`, null);
            this.setProperty(`${hslColorName}-l`, null);
            this.theme$.next({...this.current, [colorName]: ''});
        }
    }

    private setProperty(propertyName: string, value: string | number | boolean | null): void {
        this.appStyle.setProperty(`--${propertyName}`, value == null ? null : String(value));
    }

    private createStyle(selector: string): CSSStyleDeclaration {
        const index = this.sheet.insertRule(`${selector}{}`);
        const rule = this.sheet.cssRules[index] as CSSStyleRule;
        return rule.style;
    }

    private get smileyColor(): string {
        return this.mediaButtonTextColor || this.defaultMediaButtonTextColor;
    }

    private createPlayheadSmiley(): void {
        const color = new TinyColor(this.smileyColor).toRgbString();
        const svgContent = [
            `<path fill='${color}' d='M 160.5,164.5 C 183.647,162.813 194.147,173.48 192,196.5C 186.494,211.009 175.994,216.842 160.5,214C 145.991,208.494 140.158,197.994 143,182.5C 145.683,173.318 151.517,167.318 160.5,164.5 Z'/>`,
            `<path fill='${color}' d='M 335.5,164.5 C 358.647,162.813 369.147,173.48 367,196.5C 361.494,211.009 350.994,216.842 335.5,214C 320.991,208.494 315.158,197.994 318,182.5C 320.683,173.318 326.517,167.318 335.5,164.5 Z'/>`,
            `<path fill='${color}' d='M 164.5,296.5 C 172.699,295.1 179.865,297.1 186,302.5C 201.99,327.582 224.823,341.582 254.5,344.5C 279.499,342.418 299.999,331.751 316,312.5C 318.955,308.756 321.789,304.922 324.5,301C 334.716,294.616 344.55,295.116 354,302.5C 358.296,308.845 359.63,315.845 358,323.5C 334.118,361.698 299.618,382.365 254.5,385.5C 209.382,382.365 174.882,361.698 151,323.5C 148.138,310.557 152.638,301.557 164.5,296.5 Z'/>`,
        ].join('');
        const url = this.createBase64SVG(512, 512, svgContent);
        this.playheadStyle.setProperty('--smiley', url);
        this.playheadStyle.setProperty('--thumb-size', `${Math.round(this.fontSize * 1.25)}px`);
    }

    private createBase64SVG(width: number, height: number, svgContent: string): string {
        const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'>${svgContent}</svg>`;
        return `url("data:image/svg+xml;utf8,${svg}")`;
    }

    private toDashName(text: string): string {
        return text.replace(/[A-Z]/g, (char: string) => `-${char.toLowerCase()}`);
    }

    private fromHsl({h, s, l}: {h: number; s: number; l: number}): string {
        s = Math.min(Math.max(s, 0), 1);
        l = Math.min(Math.max(l, 0), 1);
        return new TinyColor({h, s, l}).toHexString();
    }
}

export default new MainTheme();
