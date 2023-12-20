const en_us = /^en(-us)?$/i.test(navigator.language);

export function t(string: string): string {
    // Let's keep this simple for now.
    if (string && !en_us) {
        return string.replaceAll(/(F)avorite(s?)/gi, '$1avourite$2');
    }
    return string;
}
