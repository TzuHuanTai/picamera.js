export enum CommandType {
  CONNECT,
  SNAPSHOT,
  METADATA,
  RECORDING,
  CAMERA_CONTROL,
  BROADCAST,
  UNKNOWN
};

export enum MetadataCommand {
  LATEST,
  OLDER,
  SPECIFIC_TIME
};
