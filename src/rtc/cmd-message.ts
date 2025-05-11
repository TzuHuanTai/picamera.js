import { CameraPropertyKey, CameraPropertyValue } from "../constants/camera-property";

export enum CmdType {
  CONNECT,
  SNAPSHOT,
  METADATA,
  RECORDING,
  CAMERA_CONTROL,
  BROADCAST,
  CUSTOM
};

export enum MetadataCmd {
  LATEST,
  OLDER,
  SPECIFIC_TIME
};

export class CmdMessage {
  type: CmdType;
  message?: string;

  constructor(type: CmdType, message: string | number) {
    this.type = type;
    this.message = typeof message === 'string' ? message : String(message);
  }

  ToString(): string {
    return JSON.stringify(this);
  }
}

export class MetaCmdMessage {
  command: MetadataCmd;
  message: string;

  constructor(command: MetadataCmd, message: string = "") {
    this.command = command;
    this.message = message;
  }

  ToString(): string {
    return JSON.stringify(this);
  }
}

export type VideoMetadata = {
  duration: string;
  image: string;
  path: string;
}

export class CameraCtrlMessage {
  key: CameraPropertyKey;
  value: CameraPropertyValue;

  constructor(key: CameraPropertyKey, value: CameraPropertyValue) {
    this.key = key;
    this.value = value;
  }
}
