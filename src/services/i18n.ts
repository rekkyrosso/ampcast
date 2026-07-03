const en_us = /^en(-us)?$/i.test(navigator.language);

export function t(string: string): string {
    // Let's keep this simple for now.
    if (string && !en_us) {
        return string
            .replaceAll(/(F|f)avorit(e[ds]?|ing)\b/g, '$1avourit$2')
            .replaceAll(/(C|c)olor(s?)\b/g, '$1olour$2')
            .replaceAll(/(B|b)ehavior\b/g, '$1ehaviour')
            .replaceAll(/(C|c)atalog\b/g, '$1atalogue')
            .replaceAll(/iz(e[drs]?|ing)\b/g, 'is$1');
    }
    return string;
}
