export default interface Theme {
    readonly name: string;
    readonly backgroundColor: string;
    readonly textColor: string;
    readonly frameColor: string;
    readonly frameTextColor: string;
    readonly buttonColor: string | null;
    readonly buttonTextColor: string | null;
    readonly mediaButtonColor: string | null;
    readonly mediaButtonTextColor: string | null;
    readonly selectedBackgroundColor: string | null;
    readonly selectedTextColor: string | null;
    readonly evenRowBackgroundColor: string | null;
    readonly roundness: number;
    readonly spacing: number;
    readonly flat: boolean;
}
