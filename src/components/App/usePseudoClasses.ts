import {useEffect} from 'react';
import {filter, fromEvent, Subscription} from 'rxjs';
import LinkBehavior from 'types/LinkBehavior';
import {browser, stopPropagation} from 'utils';
import {observePreferences} from 'services/preferences';

export default function usePseudoClasses(): void {
    useEffect(() => {
        let isFocusVisible = false;
        const app = document.getElementById('app')!;
        const system = document.getElementById('system')!;
        const subscription = new Subscription();
        const subscribeToFocusIn = (root: HTMLElement) =>
            fromEvent<FocusEvent>(root, 'focusin').subscribe(() => {
                const prevActiveElement = root.querySelector('.focus');
                if (prevActiveElement !== document.activeElement) {
                    prevActiveElement?.classList.toggle('focus', false);
                    document.activeElement?.classList.toggle('focus', true);
                }
            });
        document.activeElement?.classList.toggle('focus', true);
        subscription.add(
            fromEvent<KeyboardEvent>(document, 'keydown', {capture: true})
                .pipe(filter((event) => !event.repeat))
                .subscribe((event) => {
                    isFocusVisible = true;
                    document.body.classList.toggle('cmd-key', event[browser.cmdKey]);
                })
        );
        subscription.add(
            fromEvent<KeyboardEvent>(document, 'keyup', {capture: true}).subscribe(() => {
                document.body.classList.toggle('cmd-key', false);
            })
        );
        subscription.add(
            fromEvent<FocusEvent>(window, 'blur').subscribe(() => {
                isFocusVisible = false;
                document.body.classList.toggle('cmd-key', false);
            })
        );
        subscription.add(
            fromEvent<MouseEvent>(document, 'mousedown', {capture: true}).subscribe(() => {
                isFocusVisible = false;
                document.body.classList.toggle('focus-visible', false);
            })
        );
        subscription.add(
            fromEvent<FocusEvent>(document, 'focusin').subscribe(() => {
                document.body.classList.toggle('focus-visible', isFocusVisible);
            })
        );
        subscription.add(
            fromEvent<FocusEvent>(document, 'focusout').subscribe((event) => {
                if (!event.relatedTarget) {
                    const settingsDialog = document.querySelector('.system .settings-dialog');
                    const activeElements = (settingsDialog ? system : document).querySelectorAll(
                        '.focus'
                    );
                    for (const activeElement of activeElements) {
                        activeElement.classList.toggle('focus', false);
                    }
                }
            })
        );
        subscription.add(
            fromEvent<MouseEvent>(document, 'mouseup', {capture: true}).subscribe(() => {
                // The `active` classes are set by individual components.
                const activeElements = document.querySelectorAll('.active');
                for (const activeElement of activeElements) {
                    activeElement.classList.toggle('active', false);
                }
            })
        );
        subscription.add(fromEvent(system, 'mousedown').subscribe(stopPropagation));
        subscription.add(subscribeToFocusIn(app));
        subscription.add(subscribeToFocusIn(system));
        subscription.add(
            observePreferences().subscribe((preferences) => {
                const classList = document.body.classList;
                classList.toggle(
                    'link-behavior-cmd-key',
                    preferences.linkBehavior === LinkBehavior.CmdKey
                );
                classList.toggle(
                    'link-behavior-cmd-key-details',
                    preferences.linkBehavior === LinkBehavior.CmdKeyDetails
                );
            })
        );
        return () => subscription.unsubscribe();
    }, []);
}
