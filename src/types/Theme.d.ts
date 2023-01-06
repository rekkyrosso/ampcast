export default interface Theme {
    readonly name: string;
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly frameColor: string;
    readonly frameTextColor: string;
    readonly buttonColor: string;
    readonly buttonTextColor: string;
    readonly mediaButtonColor: string;
    readonly mediaButtonTextColor: string;
    readonly selectedBackgroundColor: string;
    readonly selectedTextColor: string;
    readonly evenRowBackgroundColor: string;
    readonly roundness: number;
    readonly spacing: number;
    readonly flat: boolean;
}
