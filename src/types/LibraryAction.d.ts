import Action from './Action';

type LibraryAction = Extract<Action, Action.AddToLibrary | Action.RemoveFromLibrary | Action.Rate>;

export default LibraryAction;
