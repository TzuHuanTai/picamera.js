import {
	AeConstraintModeEnum,
	AeExposureModeEnum,
	AeFlickerModeEnum,
	AeMeteringModeEnum,
	AeStateEnum,
	AfMeteringEnum,
	AfModeEnum,
	AfPauseEnum,
	AfPauseStateEnum,
	AfRangeEnum,
	AfSpeedEnum,
	AfStateEnum,
	AfTriggerEnum,
	AnalogueGainModeEnum,
	AwbModeEnum,
	CameraControlId,
	ExposureTimeModeEnum,
	HdrChannelEnum,
	HdrModeEnum
} from "../proto/camera_control";

export { CameraControlId };

export const CameraKeyLabels = {
	[CameraControlId.AE_ENABLE]: "Auto Exposure Enable",
	[CameraControlId.AE_METERING_MODE]: "AE Metering Mode",
	[CameraControlId.AE_CONSTRAINT_MODE]: "AE Constraint Mode",
	[CameraControlId.AE_EXPOSURE_MODE]: "AE Exposure Mode",
	[CameraControlId.EXPOSURE_VALUE]: "Exposure Value",
	[CameraControlId.EXPOSURE_TIME]: "Exposure Time",
	[CameraControlId.EXPOSURE_TIME_MODE]: "Exposure Time Mode",
	[CameraControlId.ANALOGUE_GAIN]: "Analogue Gain",
	[CameraControlId.ANALOGUE_GAIN_MODE]: "Analogue Gain Mode",
	[CameraControlId.AE_FLICKER_MODE]: "AE Flicker Mode",
	[CameraControlId.AE_FLICKER_PERIOD]: "AE Flicker Period",
	[CameraControlId.AE_FLICKER_DETECTED]: "AE Flicker Detected",
	[CameraControlId.BRIGHTNESS]: "Brightness",
	[CameraControlId.CONTRAST]: "Contrast",
	[CameraControlId.LUX]: "Lux",
	[CameraControlId.AWB_ENABLE]: "AWB Enable",
	[CameraControlId.AWB_MODE]: "AWB Mode",
	[CameraControlId.AWB_LOCKED]: "AWB Locked",
	[CameraControlId.COLOUR_GAINS]: "Colour Gains",
	[CameraControlId.COLOUR_TEMPERATURE]: "Colour Temperature",
	[CameraControlId.SATURATION]: "Saturation",
	[CameraControlId.SENSOR_BLACK_LEVELS]: "Sensor Black Levels",
	[CameraControlId.SHARPNESS]: "Sharpness",
	[CameraControlId.FOCUS_FO_M]: "Focus (FO_M)",
	[CameraControlId.COLOUR_CORRECTION_MATRIX]: "Colour Correction Matrix",
	[CameraControlId.SCALER_CROP]: "Scaler Crop",
	[CameraControlId.DIGITAL_GAIN]: "Digital Gain",
	[CameraControlId.FRAME_DURATION]: "Frame Duration",
	[CameraControlId.FRAME_DURATION_LIMITS]: "Frame Duration Limits",
	[CameraControlId.SENSOR_TEMPERATURE]: "Sensor Temperature",
	[CameraControlId.SENSOR_TIMESTAMP]: "Sensor Timestamp",
	[CameraControlId.AF_MODE]: "Auto Focus Mode",
	[CameraControlId.AF_RANGE]: "Auto Focus Range",
	[CameraControlId.AF_SPEED]: "Auto Focus Speed",
	[CameraControlId.AF_METERING]: "Auto Focus Metering",
	[CameraControlId.AF_WINDOWS]: "Auto Focus Windows",
	[CameraControlId.AF_TRIGGER]: "Auto Focus Trigger",
	[CameraControlId.AF_PAUSE]: "Auto Focus Pause",
	[CameraControlId.LENS_POSITION]: "Lens Position",
	[CameraControlId.AF_STATE]: "Auto Focus State",
	[CameraControlId.AF_PAUSE_STATE]: "Auto Focus Pause State",
	[CameraControlId.HDR_MODE]: "HDR Mode",
	[CameraControlId.HDR_CHANNEL]: "HDR Channel",
	[CameraControlId.GAMMA]: "Gamma",
	[CameraControlId.DEBUG_METADATA_ENABLE]: "Debug Metadata Enable",
	[CameraControlId.FRAME_WALL_CLOCK]: "Frame Wall Clock",
	[CameraControlId.AE_STATE]: "AE State",
};

export const CameraValueLabels = {

	[CameraControlId.AE_STATE]: {
		[AeStateEnum.AE_STATE_IDLE]: "Idle",
		[AeStateEnum.AE_STATE_SEARCHING]: "Searching",
		[AeStateEnum.AE_STATE_CONVERGED]: "Converged",
	},

	[CameraControlId.AE_METERING_MODE]: {
		[AeMeteringModeEnum.METERING_CENTRE_WEIGHTED]: "Centre Weighted",
		[AeMeteringModeEnum.METERING_SPOT]: "Spot",
		[AeMeteringModeEnum.METERING_MATRIX]: "Matrix",
		[AeMeteringModeEnum.METERING_CUSTOM]: "Custom",
	},

	[CameraControlId.AE_CONSTRAINT_MODE]: {
		[AeConstraintModeEnum.CONSTRAINT_NORMAL]: "Normal",
		[AeConstraintModeEnum.CONSTRAINT_HIGHLIGHT]: "Highlight",
		[AeConstraintModeEnum.CONSTRAINT_SHADOWS]: "Shadows",
		[AeConstraintModeEnum.CONSTRAINT_CUSTOM]: "Custom",
	},

	[CameraControlId.AE_EXPOSURE_MODE]: {
		[AeExposureModeEnum.EXPOSURE_NORMAL]: "Normal",
		[AeExposureModeEnum.EXPOSURE_SHORT]: "Short",
		[AeExposureModeEnum.EXPOSURE_LONG]: "Long",
		[AeExposureModeEnum.EXPOSURE_CUSTOM]: "Custom",
	},

	[CameraControlId.EXPOSURE_TIME_MODE]: {
		[ExposureTimeModeEnum.EXPOSURE_TIME_MODE_AUTO]: "Auto",
		[ExposureTimeModeEnum.EXPOSURE_TIME_MODE_MANUAL]: "Manual",
	},

	[CameraControlId.ANALOGUE_GAIN_MODE]: {
		[AnalogueGainModeEnum.ANALOGUE_GAIN_MODE_AUTO]: "Auto",
		[AnalogueGainModeEnum.ANALOGUE_GAIN_MODE_MANUAL]: "Manual",
	},

	[CameraControlId.AE_FLICKER_MODE]: {
		[AeFlickerModeEnum.FLICKER_OFF]: "Off",
		[AeFlickerModeEnum.FLICKER_MANUAL]: "Manual",
		[AeFlickerModeEnum.FLICKER_AUTO]: "Auto",
	},

	[CameraControlId.AWB_MODE]: {
		[AwbModeEnum.AWB_AUTO]: "Auto",
		[AwbModeEnum.AWB_INCANDESCENT]: "Incandescent",
		[AwbModeEnum.AWB_TUNGSTEN]: "Tungsten",
		[AwbModeEnum.AWB_FLUORESCENT]: "Fluorescent",
		[AwbModeEnum.AWB_INDOOR]: "Indoor",
		[AwbModeEnum.AWB_DAYLIGHT]: "Daylight",
		[AwbModeEnum.AWB_CLOUDY]: "Cloudy",
		[AwbModeEnum.AWB_CUSTOM]: "Custom",
	},

	[CameraControlId.AF_MODE]: {
		[AfModeEnum.AF_MODE_MANUAL]: "Manual",
		[AfModeEnum.AF_MODE_AUTO]: "Auto",
		[AfModeEnum.AF_MODE_CONTINUOUS]: "Continuous",
	},

	[CameraControlId.AF_RANGE]: {
		[AfRangeEnum.AF_RANGE_NORMAL]: "Normal",
		[AfRangeEnum.AF_RANGE_MACRO]: "Macro",
		[AfRangeEnum.AF_RANGE_FULL]: "Full",
	},

	[CameraControlId.AF_SPEED]: {
		[AfSpeedEnum.AF_SPEED_NORMAL]: "Normal",
		[AfSpeedEnum.AF_SPEED_FAST]: "Fast",
	},

	[CameraControlId.AF_METERING]: {
		[AfMeteringEnum.AF_METERING_AUTO]: "Auto",
		[AfMeteringEnum.AF_METERING_WINDOWS]: "Windows",
	},

	[CameraControlId.AF_TRIGGER]: {
		[AfTriggerEnum.AF_TRIGGER_START]: "Start",
		[AfTriggerEnum.AF_TRIGGER_CANCEL]: "Cancel",
	},


	[CameraControlId.AF_PAUSE]: {
		[AfPauseEnum.AF_PAUSE_IMMEDIATE]: "Immediate",
		[AfPauseEnum.AF_PAUSE_DEFERRED]: "Deferred",
		[AfPauseEnum.AF_PAUSE_RESUME]: "Resume",
	},


	[CameraControlId.AF_STATE]: {
		[AfStateEnum.AF_STATE_IDLE]: "Idle",
		[AfStateEnum.AF_STATE_SCANNING]: "Scanning",
		[AfStateEnum.AF_STATE_FOCUSED]: "Focused",
		[AfStateEnum.AF_STATE_FAILED]: "Failed",
	},


	[CameraControlId.AF_PAUSE_STATE]: {
		[AfPauseStateEnum.AF_PAUSE_STATE_RUNNING]: "Running",
		[AfPauseStateEnum.AF_PAUSE_STATE_PAUSING]: "Pausing",
		[AfPauseStateEnum.AF_PAUSE_STATE_PAUSED]: "Paused",
	},


	[CameraControlId.HDR_MODE]: {
		[HdrModeEnum.HDR_MODE_OFF]: "Off",
		[HdrModeEnum.HDR_MODE_MULTI_EXPOSURE_UNMERGED]: "Multi-Exposure (Unmerged)",
		[HdrModeEnum.HDR_MODE_MULTI_EXPOSURE]: "Multi-Exposure",
		[HdrModeEnum.HDR_MODE_SINGLE_EXPOSURE]: "Single Exposure",
		[HdrModeEnum.HDR_MODE_NIGHT]: "Night",
	},

	[CameraControlId.HDR_CHANNEL]: {
		[HdrChannelEnum.HDR_CHANNEL_NONE]: "None",
		[HdrChannelEnum.HDR_CHANNEL_SHORT]: "Short",
		[HdrChannelEnum.HDR_CHANNEL_MEDIUM]: "Medium",
		[HdrChannelEnum.HDR_CHANNEL_LONG]: "Long",
	},
};


export type CameraControlValue =
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
