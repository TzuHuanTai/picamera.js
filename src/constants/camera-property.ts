
export enum CameraPropertyKey {
	AE_ENABLE = 1,
	AE_STATE = 2,
	AE_METERING_MODE = 3,
	AE_CONSTRAINT_MODE = 4,
	AE_EXPOSURE_MODE = 5,
	EXPOSURE_VALUE = 6,
	EXPOSURE_TIME = 7,
	EXPOSURE_TIME_MODE = 8,
	ANALOGUE_GAIN = 9,
	ANALOGUE_GAIN_MODE = 10,
	AE_FLICKER_MODE = 11,
	AE_FLICKER_PERIOD = 12,
	AE_FLICKER_DETECTED = 13,
	BRIGHTNESS = 14,
	CONTRAST = 15,
	LUX = 16,
	AWB_ENABLE = 17,
	AWB_MODE = 18,
	AWB_LOCKED = 19,
	COLOUR_GAINS = 20,
	COLOUR_TEMPERATURE = 21,
	SATURATION = 22,
	SENSOR_BLACK_LEVELS = 23,
	SHARPNESS = 24,
	FOCUS_FO_M = 25,
	COLOUR_CORRECTION_MATRIX = 26,
	SCALER_CROP = 27,
	DIGITAL_GAIN = 28,
	FRAME_DURATION = 29,
	FRAME_DURATION_LIMITS = 30,
	SENSOR_TEMPERATURE = 31,
	SENSOR_TIMESTAMP = 32,
	AF_MODE = 33,
	AF_RANGE = 34,
	AF_SPEED = 35,
	AF_METERING = 36,
	AF_WINDOWS = 37,
	AF_TRIGGER = 38,
	AF_PAUSE = 39,
	LENS_POSITION = 40,
	AF_STATE = 41,
	AF_PAUSE_STATE = 42,
	HDR_MODE = 43,
	HDR_CHANNEL = 44,
	GAMMA = 45,
	DEBUG_METADATA_ENABLE = 46,
	FRAME_WALL_CLOCK = 47,
};

enum AeStateEnum {
	AeStateIdle = 0,
	AeStateSearching = 1,
	AeStateConverged = 2,
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

export enum ExposureTimeModeEnum {
	ExposureTimeModeAuto = 0,
	ExposureTimeModeManual = 1,
};

export enum AnalogueGainModeEnum {
	AnalogueGainModeAuto = 0,
	AnalogueGainModeManual = 1,
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

export const CameraKeyLabels = {
	[CameraPropertyKey.AE_ENABLE]: "Auto Exposure Enable",
	[CameraPropertyKey.AE_METERING_MODE]: "AE Metering Mode",
	[CameraPropertyKey.AE_CONSTRAINT_MODE]: "AE Constraint Mode",
	[CameraPropertyKey.AE_EXPOSURE_MODE]: "AE Exposure Mode",
	[CameraPropertyKey.EXPOSURE_VALUE]: "Exposure Value",
	[CameraPropertyKey.EXPOSURE_TIME]: "Exposure Time",
	[CameraPropertyKey.EXPOSURE_TIME_MODE]: "Exposure Time Mode",
	[CameraPropertyKey.ANALOGUE_GAIN]: "Analogue Gain",
	[CameraPropertyKey.ANALOGUE_GAIN_MODE]: "Analogue Gain Mode",
	[CameraPropertyKey.AE_FLICKER_MODE]: "AE Flicker Mode",
	[CameraPropertyKey.AE_FLICKER_PERIOD]: "AE Flicker Period",
	[CameraPropertyKey.AE_FLICKER_DETECTED]: "AE Flicker Detected",
	[CameraPropertyKey.BRIGHTNESS]: "Brightness",
	[CameraPropertyKey.CONTRAST]: "Contrast",
	[CameraPropertyKey.LUX]: "Lux",
	[CameraPropertyKey.AWB_ENABLE]: "AWB Enable",
	[CameraPropertyKey.AWB_MODE]: "AWB Mode",
	[CameraPropertyKey.AWB_LOCKED]: "AWB Locked",
	[CameraPropertyKey.COLOUR_GAINS]: "Colour Gains",
	[CameraPropertyKey.COLOUR_TEMPERATURE]: "Colour Temperature",
	[CameraPropertyKey.SATURATION]: "Saturation",
	[CameraPropertyKey.SENSOR_BLACK_LEVELS]: "Sensor Black Levels",
	[CameraPropertyKey.SHARPNESS]: "Sharpness",
	[CameraPropertyKey.FOCUS_FO_M]: "Focus (FO_M)",
	[CameraPropertyKey.COLOUR_CORRECTION_MATRIX]: "Colour Correction Matrix",
	[CameraPropertyKey.SCALER_CROP]: "Scaler Crop",
	[CameraPropertyKey.DIGITAL_GAIN]: "Digital Gain",
	[CameraPropertyKey.FRAME_DURATION]: "Frame Duration",
	[CameraPropertyKey.FRAME_DURATION_LIMITS]: "Frame Duration Limits",
	[CameraPropertyKey.SENSOR_TEMPERATURE]: "Sensor Temperature",
	[CameraPropertyKey.SENSOR_TIMESTAMP]: "Sensor Timestamp",
	[CameraPropertyKey.AF_MODE]: "Auto Focus Mode",
	[CameraPropertyKey.AF_RANGE]: "Auto Focus Range",
	[CameraPropertyKey.AF_SPEED]: "Auto Focus Speed",
	[CameraPropertyKey.AF_METERING]: "Auto Focus Metering",
	[CameraPropertyKey.AF_WINDOWS]: "Auto Focus Windows",
	[CameraPropertyKey.AF_TRIGGER]: "Auto Focus Trigger",
	[CameraPropertyKey.AF_PAUSE]: "Auto Focus Pause",
	[CameraPropertyKey.LENS_POSITION]: "Lens Position",
	[CameraPropertyKey.AF_STATE]: "Auto Focus State",
	[CameraPropertyKey.AF_PAUSE_STATE]: "Auto Focus Pause State",
	[CameraPropertyKey.HDR_MODE]: "HDR Mode",
	[CameraPropertyKey.HDR_CHANNEL]: "HDR Channel",
	[CameraPropertyKey.GAMMA]: "Gamma",
	[CameraPropertyKey.DEBUG_METADATA_ENABLE]: "Debug Metadata Enable",
	[CameraPropertyKey.FRAME_WALL_CLOCK]: "Frame Wall Clock",
	[CameraPropertyKey.AE_STATE]: "AE State",
};

export const CameraValueLables = {

	[CameraPropertyKey.AE_STATE]: {
		[AeStateEnum.AeStateIdle]: "Idle",
		[AeStateEnum.AeStateSearching]: "Searching",
		[AeStateEnum.AeStateConverged]: "Converged",
	},

	[CameraPropertyKey.AE_METERING_MODE]: {
		[AeMeteringModeEnum.MeteringCentreWeighted]: "Centre Weighted",
		[AeMeteringModeEnum.MeteringSpot]: "Spot",
		[AeMeteringModeEnum.MeteringMatrix]: "Matrix",
		[AeMeteringModeEnum.MeteringCustom]: "Custom",
	},

	[CameraPropertyKey.AE_CONSTRAINT_MODE]: {
		[AeConstraintModeEnum.ConstraintNormal]: "Normal",
		[AeConstraintModeEnum.ConstraintHighlight]: "Highlight",
		[AeConstraintModeEnum.ConstraintShadows]: "Shadows",
		[AeConstraintModeEnum.ConstraintCustom]: "Custom",
	},

	[CameraPropertyKey.AE_EXPOSURE_MODE]: {
		[AeExposureModeEnum.ExposureNormal]: "Normal",
		[AeExposureModeEnum.ExposureShort]: "Short",
		[AeExposureModeEnum.ExposureLong]: "Long",
		[AeExposureModeEnum.ExposureCustom]: "Custom",
	},

	[CameraPropertyKey.EXPOSURE_TIME_MODE]: {
		[ExposureTimeModeEnum.ExposureTimeModeAuto]: "Auto",
		[ExposureTimeModeEnum.ExposureTimeModeManual]: "Manual",
	},

	[CameraPropertyKey.ANALOGUE_GAIN_MODE]: {
		[AnalogueGainModeEnum.AnalogueGainModeAuto]: "Auto",
		[AnalogueGainModeEnum.AnalogueGainModeManual]: "Manual",
	},

	[CameraPropertyKey.AE_FLICKER_MODE]: {
		[AeFlickerModeEnum.FlickerOff]: "Off",
		[AeFlickerModeEnum.FlickerManual]: "Manual",
		[AeFlickerModeEnum.FlickerAuto]: "Auto",
	},

	[CameraPropertyKey.AWB_MODE]: {
		[AwbModeEnum.AwbAuto]: "Auto",
		[AwbModeEnum.AwbIncandescent]: "Incandescent",
		[AwbModeEnum.AwbTungsten]: "Tungsten",
		[AwbModeEnum.AwbFluorescent]: "Fluorescent",
		[AwbModeEnum.AwbIndoor]: "Indoor",
		[AwbModeEnum.AwbDaylight]: "Daylight",
		[AwbModeEnum.AwbCloudy]: "Cloudy",
		[AwbModeEnum.AwbCustom]: "Custom",
	},

	[CameraPropertyKey.AF_MODE]: {
		[AfModeEnum.AfModeManual]: "Manual",
		[AfModeEnum.AfModeAuto]: "Auto",
		[AfModeEnum.AfModeContinuous]: "Continuous",
	},

	[CameraPropertyKey.AF_RANGE]: {
		[AfRangeEnum.AfRangeNormal]: "Normal",
		[AfRangeEnum.AfRangeMacro]: "Macro",
		[AfRangeEnum.AfRangeFull]: "Full",
	},

	[CameraPropertyKey.AF_SPEED]: {
		[AfSpeedEnum.AfSpeedNormal]: "Normal",
		[AfSpeedEnum.AfSpeedFast]: "Fast",
	},

	[CameraPropertyKey.AF_METERING]: {
		[AfMeteringEnum.AfMeteringAuto]: "Auto",
		[AfMeteringEnum.AfMeteringWindows]: "Windows",
	},

	[CameraPropertyKey.AF_TRIGGER]: {
		[AfTriggerEnum.AfTriggerStart]: "Start",
		[AfTriggerEnum.AfTriggerCancel]: "Cancel",
	},


	[CameraPropertyKey.AF_PAUSE]: {
		[AfPauseEnum.AfPauseImmediate]: "Immediate",
		[AfPauseEnum.AfPauseDeferred]: "Deferred",
		[AfPauseEnum.AfPauseResume]: "Resume",
	},


	[CameraPropertyKey.AF_STATE]: {
		[AfStateEnum.AfStateIdle]: "Idle",
		[AfStateEnum.AfStateScanning]: "Scanning",
		[AfStateEnum.AfStateFocused]: "Focused",
		[AfStateEnum.AfStateFailed]: "Failed",
	},


	[CameraPropertyKey.AF_PAUSE_STATE]: {
		[AfPauseStateEnum.AfPauseStateRunning]: "Running",
		[AfPauseStateEnum.AfPauseStatePausing]: "Pausing",
		[AfPauseStateEnum.AfPauseStatePaused]: "Paused",
	},


	[CameraPropertyKey.HDR_MODE]: {
		[HdrModeEnum.HdrModeOff]: "Off",
		[HdrModeEnum.HdrModeMultiExposureUnmerged]: "Multi-Exposure (Unmerged)",
		[HdrModeEnum.HdrModeMultiExposure]: "Multi-Exposure",
		[HdrModeEnum.HdrModeSingleExposure]: "Single Exposure",
		[HdrModeEnum.HdrModeNight]: "Night",
	},

	[CameraPropertyKey.HDR_CHANNEL]: {
		[HdrChannelEnum.HdrChannelNone]: "None",
		[HdrChannelEnum.HdrChannelShort]: "Short",
		[HdrChannelEnum.HdrChannelMedium]: "Medium",
		[HdrChannelEnum.HdrChannelLong]: "Long",
	},
};


export type CameraPropertyValue =
	AeStateEnum |
	AeMeteringModeEnum |
	AeConstraintModeEnum |
	AeExposureModeEnum |
	ExposureTimeModeEnum |
	AnalogueGainModeEnum |
	AeFlickerModeEnum |
	AwbModeEnum |
	AfModeEnum |
	AfRangeEnum |
	AfSpeedEnum |
	AfMeteringEnum |
	AfTriggerEnum |
	AfPauseEnum |
	AfStateEnum |
	AfPauseStateEnum |
	HdrModeEnum |
	HdrChannelEnum;
