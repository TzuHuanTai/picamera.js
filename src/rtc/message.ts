import { CameraPropertyType, CameraPropertyValue } from "./camera-property";
import { CommandType, MetadataCommand } from "./command";

export class RtcMessage {
  type: CommandType;
  message?: string;

  constructor(type: CommandType, message: string | number) {
    this.type = type;
    this.message = typeof message === 'string' ? message : String(message);
  }

  ToString(): string {
    return JSON.stringify(this);
  }
}

export class MetaCmdMessage {
  command: MetadataCommand;
  message: string;

  constructor(command: MetadataCommand, message: string = "") {
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

export class CameraCtlMessage {
  key: CameraPropertyType;
  value: CameraPropertyValue;

  constructor(key: CameraPropertyType, value: CameraPropertyValue) {
    this.key = key;
    this.value = value;
  }
}
