const en_us = /^en(-us)?$/i.test(navigator.language);

export function t(string: string): string {
    // Let's keep this simple for now.
    if (string && !en_us) {
        return string
            .replaceAll(/(F)avorit(e[ds]?|ing)\b/gi, '$1avourit$2')
            .replaceAll(/iz(e[drs]?|ing)\b/gi, 'is$1');
    }
    return string;
}
