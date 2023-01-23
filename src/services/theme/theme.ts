import type {Observable} from 'rxjs';
import {BehaviorSubject} from 'rxjs';
import {TinyColor, mostReadable} from '@ctrl/tinycolor';
import {ConditionalKeys, Writable} from 'type-fest';
import Theme from 'types/Theme';
import {LiteStorage} from 'utils';
import themes from './themes';
import defaultTheme from './themes/default.json';

class MainTheme implements Theme {
    private readonly storage = new LiteStorage('theme');
    private readonly sheet: CSSStyleSheet;
    private readonly rootStyle: CSSStyleDeclaration;
    private readonly appStyle: CSSStyleDeclaration;
    private readonly playheadStyle: CSSStyleDeclaration;
    private readonly app = document.getElementById('app') as HTMLElement;
    private readonly popup = document.getElementById('popup') as HTMLElement;
    private readonly system = document.getElementById('system') as HTMLElement;
    private readonly theme$ = new BehaviorSubject<Theme>(defaultTheme);

    constructor() {
        const style = document.createElement('style');
        document.head.append(style);
        this.sheet = style.sheet!;
        this.rootStyle = this.createStyle(':root');
        this.appStyle = this.createStyle('.app');
        this.playheadStyle = this.createStyle('#playhead');
        this.system.classList.toggle('selection-dark', true);
        this.restore();
    }

    observe(): Observable<Theme> {
        return this.theme$;
    }

    get backgroundColor(): string {
        return this.current.backgroundColor;
    }

    set backgroundColor(color: string) {
        this.setColor('backgroundColor', color);
        this.app.classList.toggle('dark', this.isDark);
        this.app.classList.toggle('light', this.isLight);
        this.popup.classList.toggle('dark', this.isDark);
        this.popup.classList.toggle('light', this.isLight);
    }

    get buttonColor(): string {
        return this.current.buttonColor;
    }

    set buttonColor(color: string) {
        this.setColor('buttonColor', color);
    }

    get buttonTextColor(): string {
        return this.current.buttonTextColor;
    }

    set buttonTextColor(color: string) {
        this.setColor('buttonTextColor', color);
    }

    get current(): Theme {
        return this.theme$.value;
    }

    get evenRowBackgroundColor(): string {
        return this.current.evenRowBackgroundColor;
    }

    set evenRowBackgroundColor(color: string) {
        this.setColor('evenRowBackgroundColor', color);
    }

    get flat(): boolean {
        return this.current.flat;
    }

    set flat(flat: boolean) {
        this.app.classList.toggle('flat', !!flat);
        this.popup.classList.toggle('flat', !!flat);
        this.theme$.next({...this.current, flat});
    }

    get fontSize(): number {
        return Number(this.rootStyle.getPropertyValue('--font-size')) || 16;
    }

    set fontSize(fontSize: number) {
        this.rootStyle.setProperty('--font-size', String(fontSize));
        this.createPlayheadSmiley();
    }

    get frameColor(): string {
        return this.current.frameColor;
    }

    set frameColor(color: string) {
        this.setColor('frameColor', color);
        this.app.classList.toggle('frame-light', this.isFrameLight);
        this.app.classList.toggle('frame-dark', this.isFrameDark);
        this.popup.classList.toggle('frame-light', this.isFrameLight);
        this.popup.classList.toggle('frame-dark', this.isFrameDark);
        this.createPlayheadSmiley();
    }

    get frameTextColor(): string {
        return this.current.frameTextColor;
    }

    set frameTextColor(color: string) {
        this.setColor('frameTextColor', color);
    }

    get mediaButtonColor(): string {
        return this.current.mediaButtonColor;
    }

    set mediaButtonColor(color: string) {
        this.setColor('mediaButtonColor', color);
    }

    get mediaButtonTextColor(): string {
        return this.current.mediaButtonTextColor;
    }

    set mediaButtonTextColor(color: string) {
        this.setColor('mediaButtonTextColor', color);
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

    get selectedBackgroundColor(): string {
        return this.current.selectedBackgroundColor;
    }

    set selectedBackgroundColor(color: string) {
        this.setColor('selectedBackgroundColor', color);
        if (this.selectedBackgroundColor) {
            const backgroundColor = new TinyColor(this.selectedBackgroundColor);
            this.setProperty(
                'selected-background-color-blurred',
                backgroundColor.desaturate(50).setAlpha(0.5).toRgbString()
            );
            this.app.classList.toggle('selection-dark', this.isSelectionDark);
            this.app.classList.toggle('selection-light', this.isSelectionLight);
        }
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

    get isFrameDark(): boolean {
        return new TinyColor(this.frameColor).isDark();
    }

    get isFrameLight(): boolean {
        return new TinyColor(this.frameColor).isLight();
    }

    get isSelectionDark(): boolean {
        return new TinyColor(this.selectedBackgroundColor).isDark();
    }

    get isSelectionLight(): boolean {
        return new TinyColor(this.selectedBackgroundColor).isLight();
    }

    load(preset: Theme | string): void {
        let theme: Theme | undefined;
        if (typeof preset === 'string') {
            theme = themes.find((theme) => theme.name === preset);
        } else {
            theme = preset;
        }
        if (theme) {
            Object.assign(this, this.applyDefaults(theme));
        }
    }

    restore(): void {
        const theme = this.storage.getJson('current', defaultTheme);
        Object.assign(this, this.applyDefaults(theme));
        this.fontSize = this.storage.getNumber('fontSize', 16);
        this.toggleClasses(this.app);
        this.toggleClasses(this.popup);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
        this.createPlayheadSmiley();
    }

    save(): void {
        this.storage.setNumber('fontSize', this.fontSize);
        this.storage.setJson('current', this.current);
        this.system.classList.toggle('dark', this.isDark);
        this.system.classList.toggle('light', this.isLight);
    }

    private toggleClasses(root: HTMLElement): void {
        root.classList.toggle('dark', this.isDark);
        root.classList.toggle('light', this.isLight);
        root.classList.toggle('frame-dark', this.isFrameDark);
        root.classList.toggle('frame-light', this.isFrameLight);
        root.classList.toggle('selection-dark', this.isSelectionDark);
        root.classList.toggle('selection-light', this.isSelectionLight);
    }

    private applyDefaults(theme: Writable<Theme>): Theme {
        if (!theme.selectedBackgroundColor) {
            const backgroundColor = new TinyColor(theme.textColor);
            const scale = backgroundColor.monochromatic();
            scale.sort((a, b) => a.getBrightness() - b.getBrightness());

            if (backgroundColor.isLight()) {
                theme.selectedBackgroundColor = scale[1].toHexString();
            } else {
                theme.selectedBackgroundColor = scale[scale.length - 2].toHexString();
            }

            scale.push(new TinyColor('white'), new TinyColor('black'));
            theme.selectedTextColor = mostReadable(theme.selectedBackgroundColor, scale, {
                includeFallbackColors: true,
                level: 'AA',
                size: 'large',
            })!.toHexString();
        }
        return theme;
    }

    private setColor(
        colorName: ConditionalKeys<Theme, string>,
        color: TinyColor | string | null
    ): void {
        const hslColorName = this.toDashName(colorName);
        if (color) {
            if (typeof color === 'string') {
                color = new TinyColor(color);
            }
            const hsl = color.toHsl();
            this.setProperty(`${hslColorName}-h`, String(hsl.h));
            this.setProperty(`${hslColorName}-s`, `${hsl.s * 100}%`);
            this.setProperty(`${hslColorName}-l`, `${hsl.l * 100}%`);
            this.theme$.next({...this.current, [colorName]: color.toHexString()});
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

    private get defaultMediaButtonColor(): string {
        const color = new TinyColor(this.frameColor).toHsl();
        color.s += 1 - color.s * 0.33;
        color.l += 1 - color.l * 0.5;
        return new TinyColor(color).toHexString();
    }

    private get defaultMediaButtonTextColor(): string {
        const color = new TinyColor(this.defaultMediaButtonColor).toHsl();
        color.s -= color.s * 0.5;
        color.l -= color.l * 0.9;
        return new TinyColor(color).toHexString();
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
}

export default new MainTheme();
