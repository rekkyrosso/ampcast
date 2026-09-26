// `lf` is the number of line feeds that represent a paragraph break.
export function getTextFromHtml(html = '', lf?: 1 | 2): string {
    const key = `{key-${Date.now()}}`;
    const element = document.createElement('p');
    let text = String(html ?? '')
        .replaceAll('\r', '')
        .split('\n')
        .map((line) => line.trim())
        .join('\n')
        .replace(/\n\n+/g, '\n\n');
    if (!lf) {
        lf = text.includes('\n\n') ? 2 : 1;
    }
    if (lf === 1) {
        text = text.replaceAll('\n', '\n\n');
    }
    element.innerHTML = text.replaceAll('\n', key);
    return element.textContent.replaceAll(key, '\n');
}

export async function loadLibrary(name: string): Promise<void> {
    if (!name.endsWith('.js')) {
        name += '.js';
    }
    return loadScript(`/v${__app_version__}/lib/${name}`);
}

export async function loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const loadedAttribute = 'ampcast-loaded';
        let script: HTMLScriptElement | null = document.querySelector(`script[src="${src}"]`);
        if (script?.hasAttribute(loadedAttribute)) {
            resolve();
            return;
        }
        if (!script) {
            script = document.createElement('script');
            script.async = true;
            script.src = src;
        }
        script.addEventListener('load', function () {
            this.setAttribute(loadedAttribute, '');
            resolve();
        });
        script.addEventListener('error', (event: ErrorEvent) => reject(event.message));
        if (!script.parentElement) {
            document.head.appendChild(script);
        }
    });
}

export async function loadStyleSheet(href: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const loadedAttribute = 'ampcast-loaded';
        let link: HTMLLinkElement | null = document.querySelector(`link[href="${href}"]`);
        if (link?.hasAttribute(loadedAttribute)) {
            resolve();
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
        }
        link.addEventListener('load', function () {
            this.setAttribute(loadedAttribute, '');
            resolve();
        });
        link.addEventListener('error', (event: ErrorEvent) => reject(event.message));
        if (!link.parentElement) {
            document.head.appendChild(link);
        }
    });
}

export function saveTextToFile(fileName: string, text: string, type = 'text/json'): void {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([text], {type}));
    link.download = fileName;
    link.type = type;
    link.click();
}
