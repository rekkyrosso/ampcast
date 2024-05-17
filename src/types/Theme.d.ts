export default interface Theme {
    readonly name: string;
    readonly frameColor: string;
    readonly frameTextColor: string;
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly selectedBackgroundColor: string;
    readonly selectedTextColor: string;
    readonly buttonColor?: string;
    readonly buttonTextColor?: string;
    readonly scrollbarColor?: string;
    readonly scrollbarTextColor?: string;
    readonly scrollbarThickness?: number;
    readonly mediaButtonColor?: string;
    readonly mediaButtonTextColor?: string;
    readonly roundness: number;
    readonly spacing: number;
    readonly flat: boolean;
}
