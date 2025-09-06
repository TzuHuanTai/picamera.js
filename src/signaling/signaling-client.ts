import { ActionType } from '../pi-camera.types';

export interface ISignalingClient<
  TClient,
  TAction = ActionType
> {
  onConnect?: (conn: TClient) => void;
  connect: () => void;
  disconnect: () => void;
  send: (type: TAction, message: string) => void;
  isConnected: () => boolean;
}
