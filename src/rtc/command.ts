export enum CommandType {
  CONNECT,
  SNAPSHOT,
  METADATA,
  RECORD,
  CAMERA_CONTROL,
  UNKNOWN
};

export enum MetadataCommand {
  LATEST,
  OLDER,
  SPECIFIC_TIME
};
