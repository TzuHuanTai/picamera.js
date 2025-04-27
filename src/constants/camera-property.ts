
export enum CameraPropertyType {
	AE_ENABLE = 1,
	AE_LOCKED = 2,
	AE_METERING_MODE = 3,
	AE_CONSTRAINT_MODE = 4,
	AE_EXPOSURE_MODE = 5,
	EXPOSURE_VALUE = 6,
	EXPOSURE_TIME = 7,
	ANALOGUE_GAIN = 8,
	AE_FLICKER_MODE = 9,
	AE_FLICKER_PERIOD = 10,
	AE_FLICKER_DETECTED = 11,
	BRIGHTNESS = 12,
	CONTRAST = 13,
	LUX = 14,
	AWB_ENABLE = 15,
	AWB_MODE = 16,
	AWB_LOCKED = 17,
	COLOUR_GAINS = 18,
	COLOUR_TEMPERATURE = 19,
	SATURATION = 20,
	SENSOR_BLACK_LEVELS = 21,
	SHARPNESS = 22,
	FOCUS_FO_M = 23,
	COLOUR_CORRECTION_MATRIX = 24,
	SCALER_CROP = 25,
	DIGITAL_GAIN = 26,
	FRAME_DURATION = 27,
	FRAME_DURATION_LIMITS = 28,
	SENSOR_TEMPERATURE = 29,
	SENSOR_TIMESTAMP = 30,
	AF_MODE = 31,
	AF_RANGE = 32,
	AF_SPEED = 33,
	AF_METERING = 34,
	AF_WINDOWS = 35,
	AF_TRIGGER = 36,
	AF_PAUSE = 37,
	LENS_POSITION = 38,
	AF_STATE = 39,
	AF_PAUSE_STATE = 40,
	HDR_MODE = 41,
	HDR_CHANNEL = 42,
	GAMMA = 43,
	DEBUG_METADATA_ENABLE = 44,
	FRAME_WALL_CLOCK = 45,
};

export enum AeMeteringModeEnum {
	MeteringCentreWeighted = 0,
	MeteringSpot = 1,
	MeteringMatrix = 2,
	MeteringCustom = 3,
};

export enum AeConstraintModeEnum {
	ConstraintNormal = 0,
	ConstraintHighlight = 1,
	ConstraintShadows = 2,
	ConstraintCustom = 3,
};

export enum AeExposureModeEnum {
	ExposureNormal = 0,
	ExposureShort = 1,
	ExposureLong = 2,
	ExposureCustom = 3,
};

export enum AeFlickerModeEnum {
	FlickerOff = 0,
	FlickerManual = 1,
	FlickerAuto = 2,
};

export enum AwbModeEnum {
	AwbAuto = 0,
	AwbIncandescent = 1,
	AwbTungsten = 2,
	AwbFluorescent = 3,
	AwbIndoor = 4,
	AwbDaylight = 5,
	AwbCloudy = 6,
	AwbCustom = 7,
};

export enum AfModeEnum {
	AfModeManual = 0,
	AfModeAuto = 1,
	AfModeContinuous = 2,
};

export enum AfRangeEnum {
	AfRangeNormal = 0,
	AfRangeMacro = 1,
	AfRangeFull = 2,
};

export enum AfSpeedEnum {
	AfSpeedNormal = 0,
	AfSpeedFast = 1,
};

export enum AfMeteringEnum {
	AfMeteringAuto = 0,
	AfMeteringWindows = 1,
};

export enum AfTriggerEnum {
	AfTriggerStart = 0,
	AfTriggerCancel = 1,
};

export enum AfPauseEnum {
	AfPauseImmediate = 0,
	AfPauseDeferred = 1,
	AfPauseResume = 2,
};

export enum AfStateEnum {
	AfStateIdle = 0,
	AfStateScanning = 1,
	AfStateFocused = 2,
	AfStateFailed = 3,
};

export enum AfPauseStateEnum {
	AfPauseStateRunning = 0,
	AfPauseStatePausing = 1,
	AfPauseStatePaused = 2,
};

export enum HdrModeEnum {
	HdrModeOff = 0,
	HdrModeMultiExposureUnmerged = 1,
	HdrModeMultiExposure = 2,
	HdrModeSingleExposure = 3,
	HdrModeNight = 4,
};

export enum HdrChannelEnum {
	HdrChannelNone = 0,
	HdrChannelShort = 1,
	HdrChannelMedium = 2,
	HdrChannelLong = 3,
};

export type CameraPropertyValue = HdrChannelEnum | HdrModeEnum | AfPauseStateEnum | AfStateEnum | AfPauseEnum | AfTriggerEnum | AfMeteringEnum | AfSpeedEnum | AfRangeEnum | AfModeEnum | AwbModeEnum | AeFlickerModeEnum | AeExposureModeEnum | AeConstraintModeEnum | AeMeteringModeEnum;
