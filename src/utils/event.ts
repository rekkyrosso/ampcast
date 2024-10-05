type AnyEvent = Pick<Event, 'preventDefault' | 'stopPropagation'>;

export function cancelEvent(event: AnyEvent): void {
    event.preventDefault();
    event.stopPropagation();
}

export function preventDefault(event: AnyEvent): void {
    event.preventDefault();
}

export function stopPropagation(event: AnyEvent): void {
    event.stopPropagation();
}
