import Action from './Action';

type PlayAction = Extract<Action, Action.PlayNow | Action.PlayNext | Action.Queue>;

export default PlayAction;
