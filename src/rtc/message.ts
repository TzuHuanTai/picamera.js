import { CameraOptionType, CameraOptionValue } from "./camera-options";
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

export class CameraOptionMessage {
  key: CameraOptionType;
  value: CameraOptionValue;

  constructor(key: CameraOptionType, value: CameraOptionValue) {
    this.key = key;
    this.value = value;
  }
}
