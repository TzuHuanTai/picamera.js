import {
  CameraPropertyKey,
  AeMeteringModeEnum,
  AeConstraintModeEnum,
  AeExposureModeEnum,
  ExposureTimeModeEnum,
  AnalogueGainModeEnum,
  AeFlickerModeEnum,
  AwbModeEnum,
  AfModeEnum,
  AfRangeEnum,
  AfSpeedEnum,
  AfMeteringEnum,
  AfTriggerEnum,
  AfPauseEnum,
  AfStateEnum,
  AfPauseStateEnum,
  HdrModeEnum,
  HdrChannelEnum,
  CameraKeyLabels,
  CameraValueLables,
  CameraPropertyValue
} from './camera-property';

// Define local enum for AeStateEnum since it's not exported
enum AeStateEnumLocal {
  AeStateIdle = 0,
  AeStateSearching = 1,
  AeStateConverged = 2,
}

describe('Camera Property Constants', () => {
  describe('CameraPropertyKey', () => {
    it('should have correct values for all camera properties', () => {
      expect(CameraPropertyKey.AE_ENABLE).toBe(1);
      expect(CameraPropertyKey.AE_STATE).toBe(2);
      expect(CameraPropertyKey.AE_METERING_MODE).toBe(3);
      expect(CameraPropertyKey.AE_CONSTRAINT_MODE).toBe(4);
      expect(CameraPropertyKey.AE_EXPOSURE_MODE).toBe(5);
      expect(CameraPropertyKey.EXPOSURE_VALUE).toBe(6);
      expect(CameraPropertyKey.EXPOSURE_TIME).toBe(7);
      expect(CameraPropertyKey.EXPOSURE_TIME_MODE).toBe(8);
      expect(CameraPropertyKey.ANALOGUE_GAIN).toBe(9);
      expect(CameraPropertyKey.ANALOGUE_GAIN_MODE).toBe(10);
      expect(CameraPropertyKey.AE_FLICKER_MODE).toBe(11);
      expect(CameraPropertyKey.AE_FLICKER_PERIOD).toBe(12);
      expect(CameraPropertyKey.AE_FLICKER_DETECTED).toBe(13);
      expect(CameraPropertyKey.BRIGHTNESS).toBe(14);
      expect(CameraPropertyKey.CONTRAST).toBe(15);
      expect(CameraPropertyKey.LUX).toBe(16);
      expect(CameraPropertyKey.AWB_ENABLE).toBe(17);
      expect(CameraPropertyKey.AWB_MODE).toBe(18);
      expect(CameraPropertyKey.AWB_LOCKED).toBe(19);
      expect(CameraPropertyKey.COLOUR_GAINS).toBe(20);
      expect(CameraPropertyKey.COLOUR_TEMPERATURE).toBe(21);
      expect(CameraPropertyKey.SATURATION).toBe(22);
      expect(CameraPropertyKey.SENSOR_BLACK_LEVELS).toBe(23);
      expect(CameraPropertyKey.SHARPNESS).toBe(24);
      expect(CameraPropertyKey.FOCUS_FO_M).toBe(25);
      expect(CameraPropertyKey.COLOUR_CORRECTION_MATRIX).toBe(26);
      expect(CameraPropertyKey.SCALER_CROP).toBe(27);
      expect(CameraPropertyKey.DIGITAL_GAIN).toBe(28);
      expect(CameraPropertyKey.FRAME_DURATION).toBe(29);
      expect(CameraPropertyKey.FRAME_DURATION_LIMITS).toBe(30);
      expect(CameraPropertyKey.SENSOR_TEMPERATURE).toBe(31);
      expect(CameraPropertyKey.SENSOR_TIMESTAMP).toBe(32);
      expect(CameraPropertyKey.AF_MODE).toBe(33);
      expect(CameraPropertyKey.AF_RANGE).toBe(34);
      expect(CameraPropertyKey.AF_SPEED).toBe(35);
      expect(CameraPropertyKey.AF_METERING).toBe(36);
      expect(CameraPropertyKey.AF_WINDOWS).toBe(37);
      expect(CameraPropertyKey.AF_TRIGGER).toBe(38);
      expect(CameraPropertyKey.AF_PAUSE).toBe(39);
      expect(CameraPropertyKey.LENS_POSITION).toBe(40);
      expect(CameraPropertyKey.AF_STATE).toBe(41);
      expect(CameraPropertyKey.AF_PAUSE_STATE).toBe(42);
      expect(CameraPropertyKey.HDR_MODE).toBe(43);
      expect(CameraPropertyKey.HDR_CHANNEL).toBe(44);
      expect(CameraPropertyKey.GAMMA).toBe(45);
      expect(CameraPropertyKey.DEBUG_METADATA_ENABLE).toBe(46);
      expect(CameraPropertyKey.FRAME_WALL_CLOCK).toBe(47);
    });
  });

  describe('AeStateEnum', () => {
    it('should have correct values', () => {
      expect(AeStateEnumLocal.AeStateIdle).toBe(0);
      expect(AeStateEnumLocal.AeStateSearching).toBe(1);
      expect(AeStateEnumLocal.AeStateConverged).toBe(2);
    });
  });

  describe('AeMeteringModeEnum', () => {
    it('should have correct values', () => {
      expect(AeMeteringModeEnum.MeteringCentreWeighted).toBe(0);
      expect(AeMeteringModeEnum.MeteringSpot).toBe(1);
      expect(AeMeteringModeEnum.MeteringMatrix).toBe(2);
      expect(AeMeteringModeEnum.MeteringCustom).toBe(3);
    });
  });

  describe('AeConstraintModeEnum', () => {
    it('should have correct values', () => {
      expect(AeConstraintModeEnum.ConstraintNormal).toBe(0);
      expect(AeConstraintModeEnum.ConstraintHighlight).toBe(1);
      expect(AeConstraintModeEnum.ConstraintShadows).toBe(2);
      expect(AeConstraintModeEnum.ConstraintCustom).toBe(3);
    });
  });

  describe('AeExposureModeEnum', () => {
    it('should have correct values', () => {
      expect(AeExposureModeEnum.ExposureNormal).toBe(0);
      expect(AeExposureModeEnum.ExposureShort).toBe(1);
      expect(AeExposureModeEnum.ExposureLong).toBe(2);
      expect(AeExposureModeEnum.ExposureCustom).toBe(3);
    });
  });

  describe('ExposureTimeModeEnum', () => {
    it('should have correct values', () => {
      expect(ExposureTimeModeEnum.ExposureTimeModeAuto).toBe(0);
      expect(ExposureTimeModeEnum.ExposureTimeModeManual).toBe(1);
    });
  });

  describe('AnalogueGainModeEnum', () => {
    it('should have correct values', () => {
      expect(AnalogueGainModeEnum.AnalogueGainModeAuto).toBe(0);
      expect(AnalogueGainModeEnum.AnalogueGainModeManual).toBe(1);
    });
  });

  describe('AeFlickerModeEnum', () => {
    it('should have correct values', () => {
      expect(AeFlickerModeEnum.FlickerOff).toBe(0);
      expect(AeFlickerModeEnum.FlickerManual).toBe(1);
      expect(AeFlickerModeEnum.FlickerAuto).toBe(2);
    });
  });

  describe('AwbModeEnum', () => {
    it('should have correct values', () => {
      expect(AwbModeEnum.AwbAuto).toBe(0);
      expect(AwbModeEnum.AwbIncandescent).toBe(1);
      expect(AwbModeEnum.AwbTungsten).toBe(2);
      expect(AwbModeEnum.AwbFluorescent).toBe(3);
      expect(AwbModeEnum.AwbIndoor).toBe(4);
      expect(AwbModeEnum.AwbDaylight).toBe(5);
      expect(AwbModeEnum.AwbCloudy).toBe(6);
      expect(AwbModeEnum.AwbCustom).toBe(7);
    });
  });

  describe('AfModeEnum', () => {
    it('should have correct values', () => {
      expect(AfModeEnum.AfModeManual).toBe(0);
      expect(AfModeEnum.AfModeAuto).toBe(1);
      expect(AfModeEnum.AfModeContinuous).toBe(2);
    });
  });

  describe('AfRangeEnum', () => {
    it('should have correct values', () => {
      expect(AfRangeEnum.AfRangeNormal).toBe(0);
      expect(AfRangeEnum.AfRangeMacro).toBe(1);
      expect(AfRangeEnum.AfRangeFull).toBe(2);
    });
  });

  describe('AfSpeedEnum', () => {
    it('should have correct values', () => {
      expect(AfSpeedEnum.AfSpeedNormal).toBe(0);
      expect(AfSpeedEnum.AfSpeedFast).toBe(1);
    });
  });

  describe('AfMeteringEnum', () => {
    it('should have correct values', () => {
      expect(AfMeteringEnum.AfMeteringAuto).toBe(0);
      expect(AfMeteringEnum.AfMeteringWindows).toBe(1);
    });
  });

  describe('AfTriggerEnum', () => {
    it('should have correct values', () => {
      expect(AfTriggerEnum.AfTriggerStart).toBe(0);
      expect(AfTriggerEnum.AfTriggerCancel).toBe(1);
    });
  });

  describe('AfPauseEnum', () => {
    it('should have correct values', () => {
      expect(AfPauseEnum.AfPauseImmediate).toBe(0);
      expect(AfPauseEnum.AfPauseDeferred).toBe(1);
      expect(AfPauseEnum.AfPauseResume).toBe(2);
    });
  });

  describe('AfStateEnum', () => {
    it('should have correct values', () => {
      expect(AfStateEnum.AfStateIdle).toBe(0);
      expect(AfStateEnum.AfStateScanning).toBe(1);
      expect(AfStateEnum.AfStateFocused).toBe(2);
      expect(AfStateEnum.AfStateFailed).toBe(3);
    });
  });

  describe('AfPauseStateEnum', () => {
    it('should have correct values', () => {
      expect(AfPauseStateEnum.AfPauseStateRunning).toBe(0);
      expect(AfPauseStateEnum.AfPauseStatePausing).toBe(1);
      expect(AfPauseStateEnum.AfPauseStatePaused).toBe(2);
    });
  });

  describe('HdrModeEnum', () => {
    it('should have correct values', () => {
      expect(HdrModeEnum.HdrModeOff).toBe(0);
      expect(HdrModeEnum.HdrModeMultiExposureUnmerged).toBe(1);
      expect(HdrModeEnum.HdrModeMultiExposure).toBe(2);
      expect(HdrModeEnum.HdrModeSingleExposure).toBe(3);
      expect(HdrModeEnum.HdrModeNight).toBe(4);
    });
  });

  describe('HdrChannelEnum', () => {
    it('should have correct values', () => {
      expect(HdrChannelEnum.HdrChannelNone).toBe(0);
      expect(HdrChannelEnum.HdrChannelShort).toBe(1);
      expect(HdrChannelEnum.HdrChannelMedium).toBe(2);
      expect(HdrChannelEnum.HdrChannelLong).toBe(3);
    });
  });

  describe('CameraKeyLabels', () => {
    it('should have labels for each camera property key', () => {
      expect(CameraKeyLabels[CameraPropertyKey.AE_ENABLE]).toBe("Auto Exposure Enable");
      expect(CameraKeyLabels[CameraPropertyKey.AE_METERING_MODE]).toBe("AE Metering Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AE_CONSTRAINT_MODE]).toBe("AE Constraint Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AE_EXPOSURE_MODE]).toBe("AE Exposure Mode");
      expect(CameraKeyLabels[CameraPropertyKey.EXPOSURE_VALUE]).toBe("Exposure Value");
      expect(CameraKeyLabels[CameraPropertyKey.EXPOSURE_TIME]).toBe("Exposure Time");
      expect(CameraKeyLabels[CameraPropertyKey.EXPOSURE_TIME_MODE]).toBe("Exposure Time Mode");
      expect(CameraKeyLabels[CameraPropertyKey.ANALOGUE_GAIN]).toBe("Analogue Gain");
      expect(CameraKeyLabels[CameraPropertyKey.ANALOGUE_GAIN_MODE]).toBe("Analogue Gain Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AE_FLICKER_MODE]).toBe("AE Flicker Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AE_FLICKER_PERIOD]).toBe("AE Flicker Period");
      expect(CameraKeyLabels[CameraPropertyKey.AE_FLICKER_DETECTED]).toBe("AE Flicker Detected");
      expect(CameraKeyLabels[CameraPropertyKey.BRIGHTNESS]).toBe("Brightness");
      expect(CameraKeyLabels[CameraPropertyKey.CONTRAST]).toBe("Contrast");
      expect(CameraKeyLabels[CameraPropertyKey.LUX]).toBe("Lux");
      expect(CameraKeyLabels[CameraPropertyKey.AWB_ENABLE]).toBe("AWB Enable");
      expect(CameraKeyLabels[CameraPropertyKey.AWB_MODE]).toBe("AWB Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AWB_LOCKED]).toBe("AWB Locked");
      expect(CameraKeyLabels[CameraPropertyKey.COLOUR_GAINS]).toBe("Colour Gains");
      expect(CameraKeyLabels[CameraPropertyKey.COLOUR_TEMPERATURE]).toBe("Colour Temperature");
      expect(CameraKeyLabels[CameraPropertyKey.SATURATION]).toBe("Saturation");
      expect(CameraKeyLabels[CameraPropertyKey.SENSOR_BLACK_LEVELS]).toBe("Sensor Black Levels");
      expect(CameraKeyLabels[CameraPropertyKey.SHARPNESS]).toBe("Sharpness");
      expect(CameraKeyLabels[CameraPropertyKey.FOCUS_FO_M]).toBe("Focus (FO_M)");
      expect(CameraKeyLabels[CameraPropertyKey.COLOUR_CORRECTION_MATRIX]).toBe("Colour Correction Matrix");
      expect(CameraKeyLabels[CameraPropertyKey.SCALER_CROP]).toBe("Scaler Crop");
      expect(CameraKeyLabels[CameraPropertyKey.DIGITAL_GAIN]).toBe("Digital Gain");
      expect(CameraKeyLabels[CameraPropertyKey.FRAME_DURATION]).toBe("Frame Duration");
      expect(CameraKeyLabels[CameraPropertyKey.FRAME_DURATION_LIMITS]).toBe("Frame Duration Limits");
      expect(CameraKeyLabels[CameraPropertyKey.SENSOR_TEMPERATURE]).toBe("Sensor Temperature");
      expect(CameraKeyLabels[CameraPropertyKey.SENSOR_TIMESTAMP]).toBe("Sensor Timestamp");
      expect(CameraKeyLabels[CameraPropertyKey.AF_MODE]).toBe("Auto Focus Mode");
      expect(CameraKeyLabels[CameraPropertyKey.AF_RANGE]).toBe("Auto Focus Range");
      expect(CameraKeyLabels[CameraPropertyKey.AF_SPEED]).toBe("Auto Focus Speed");
      expect(CameraKeyLabels[CameraPropertyKey.AF_METERING]).toBe("Auto Focus Metering");
      expect(CameraKeyLabels[CameraPropertyKey.AF_WINDOWS]).toBe("Auto Focus Windows");
      expect(CameraKeyLabels[CameraPropertyKey.AF_TRIGGER]).toBe("Auto Focus Trigger");
      expect(CameraKeyLabels[CameraPropertyKey.AF_PAUSE]).toBe("Auto Focus Pause");
      expect(CameraKeyLabels[CameraPropertyKey.LENS_POSITION]).toBe("Lens Position");
      expect(CameraKeyLabels[CameraPropertyKey.AF_STATE]).toBe("Auto Focus State");
      expect(CameraKeyLabels[CameraPropertyKey.AF_PAUSE_STATE]).toBe("Auto Focus Pause State");
      expect(CameraKeyLabels[CameraPropertyKey.HDR_MODE]).toBe("HDR Mode");
      expect(CameraKeyLabels[CameraPropertyKey.HDR_CHANNEL]).toBe("HDR Channel");
      expect(CameraKeyLabels[CameraPropertyKey.GAMMA]).toBe("Gamma");
      expect(CameraKeyLabels[CameraPropertyKey.DEBUG_METADATA_ENABLE]).toBe("Debug Metadata Enable");
      expect(CameraKeyLabels[CameraPropertyKey.FRAME_WALL_CLOCK]).toBe("Frame Wall Clock");
      expect(CameraKeyLabels[CameraPropertyKey.AE_STATE]).toBe("AE State");
    });

    it('should have labels for all camera property keys', () => {
      const allValues = Object.values(CameraPropertyKey).filter(value => typeof value === 'number');
      for (const value of allValues) {
        const numericValue = value as number;
        expect((CameraKeyLabels as { [key: number]: string })[numericValue]).toBeDefined();
      }
    });
  });

  describe('CameraValueLables', () => {
    it('should have value labels for AE_STATE', () => {
      expect(CameraValueLables[CameraPropertyKey.AE_STATE]).toBeDefined();
      const aeStateLabels = CameraValueLables[CameraPropertyKey.AE_STATE];
      expect(aeStateLabels[AeStateEnumLocal.AeStateIdle]).toBe("Idle");
      expect(aeStateLabels[AeStateEnumLocal.AeStateSearching]).toBe("Searching");
      expect(aeStateLabels[AeStateEnumLocal.AeStateConverged]).toBe("Converged");
    });

    it('should have value labels for AE_METERING_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AE_METERING_MODE]).toBeDefined();
      const aeMeteringLabels = CameraValueLables[CameraPropertyKey.AE_METERING_MODE];
      expect(aeMeteringLabels[AeMeteringModeEnum.MeteringCentreWeighted]).toBe("Centre Weighted");
      expect(aeMeteringLabels[AeMeteringModeEnum.MeteringSpot]).toBe("Spot");
      expect(aeMeteringLabels[AeMeteringModeEnum.MeteringMatrix]).toBe("Matrix");
      expect(aeMeteringLabels[AeMeteringModeEnum.MeteringCustom]).toBe("Custom");
    });

    it('should have value labels for AE_CONSTRAINT_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AE_CONSTRAINT_MODE]).toBeDefined();
      const aeConstraintLabels = CameraValueLables[CameraPropertyKey.AE_CONSTRAINT_MODE];
      expect(aeConstraintLabels[AeConstraintModeEnum.ConstraintNormal]).toBe("Normal");
      expect(aeConstraintLabels[AeConstraintModeEnum.ConstraintHighlight]).toBe("Highlight");
      expect(aeConstraintLabels[AeConstraintModeEnum.ConstraintShadows]).toBe("Shadows");
      expect(aeConstraintLabels[AeConstraintModeEnum.ConstraintCustom]).toBe("Custom");
    });

    it('should have value labels for AE_EXPOSURE_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AE_EXPOSURE_MODE]).toBeDefined();
      const aeExposureLabels = CameraValueLables[CameraPropertyKey.AE_EXPOSURE_MODE];
      expect(aeExposureLabels[AeExposureModeEnum.ExposureNormal]).toBe("Normal");
      expect(aeExposureLabels[AeExposureModeEnum.ExposureShort]).toBe("Short");
      expect(aeExposureLabels[AeExposureModeEnum.ExposureLong]).toBe("Long");
      expect(aeExposureLabels[AeExposureModeEnum.ExposureCustom]).toBe("Custom");
    });

    it('should have value labels for EXPOSURE_TIME_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.EXPOSURE_TIME_MODE]).toBeDefined();
      const exposureTimeLabels = CameraValueLables[CameraPropertyKey.EXPOSURE_TIME_MODE];
      expect(exposureTimeLabels[ExposureTimeModeEnum.ExposureTimeModeAuto]).toBe("Auto");
      expect(exposureTimeLabels[ExposureTimeModeEnum.ExposureTimeModeManual]).toBe("Manual");
    });

    it('should have value labels for ANALOGUE_GAIN_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.ANALOGUE_GAIN_MODE]).toBeDefined();
      const analogueGainLabels = CameraValueLables[CameraPropertyKey.ANALOGUE_GAIN_MODE];
      expect(analogueGainLabels[AnalogueGainModeEnum.AnalogueGainModeAuto]).toBe("Auto");
      expect(analogueGainLabels[AnalogueGainModeEnum.AnalogueGainModeManual]).toBe("Manual");
    });

    it('should have value labels for AE_FLICKER_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AE_FLICKER_MODE]).toBeDefined();
      const aeFlickerLabels = CameraValueLables[CameraPropertyKey.AE_FLICKER_MODE];
      expect(aeFlickerLabels[AeFlickerModeEnum.FlickerOff]).toBe("Off");
      expect(aeFlickerLabels[AeFlickerModeEnum.FlickerManual]).toBe("Manual");
      expect(aeFlickerLabels[AeFlickerModeEnum.FlickerAuto]).toBe("Auto");
    });

    it('should have value labels for AWB_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AWB_MODE]).toBeDefined();
      const awbLabels = CameraValueLables[CameraPropertyKey.AWB_MODE];
      expect(awbLabels[AwbModeEnum.AwbAuto]).toBe("Auto");
      expect(awbLabels[AwbModeEnum.AwbIncandescent]).toBe("Incandescent");
      expect(awbLabels[AwbModeEnum.AwbTungsten]).toBe("Tungsten");
      expect(awbLabels[AwbModeEnum.AwbFluorescent]).toBe("Fluorescent");
      expect(awbLabels[AwbModeEnum.AwbIndoor]).toBe("Indoor");
      expect(awbLabels[AwbModeEnum.AwbDaylight]).toBe("Daylight");
      expect(awbLabels[AwbModeEnum.AwbCloudy]).toBe("Cloudy");
      expect(awbLabels[AwbModeEnum.AwbCustom]).toBe("Custom");
    });

    it('should have value labels for AF_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_MODE]).toBeDefined();
      const afModeLabels = CameraValueLables[CameraPropertyKey.AF_MODE];
      expect(afModeLabels[AfModeEnum.AfModeManual]).toBe("Manual");
      expect(afModeLabels[AfModeEnum.AfModeAuto]).toBe("Auto");
      expect(afModeLabels[AfModeEnum.AfModeContinuous]).toBe("Continuous");
    });

    it('should have value labels for AF_RANGE', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_RANGE]).toBeDefined();
      const afRangeLabels = CameraValueLables[CameraPropertyKey.AF_RANGE];
      expect(afRangeLabels[AfRangeEnum.AfRangeNormal]).toBe("Normal");
      expect(afRangeLabels[AfRangeEnum.AfRangeMacro]).toBe("Macro");
      expect(afRangeLabels[AfRangeEnum.AfRangeFull]).toBe("Full");
    });

    it('should have value labels for AF_SPEED', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_SPEED]).toBeDefined();
      const afSpeedLabels = CameraValueLables[CameraPropertyKey.AF_SPEED];
      expect(afSpeedLabels[AfSpeedEnum.AfSpeedNormal]).toBe("Normal");
      expect(afSpeedLabels[AfSpeedEnum.AfSpeedFast]).toBe("Fast");
    });

    it('should have value labels for AF_METERING', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_METERING]).toBeDefined();
      const afMeteringLabels = CameraValueLables[CameraPropertyKey.AF_METERING];
      expect(afMeteringLabels[AfMeteringEnum.AfMeteringAuto]).toBe("Auto");
      expect(afMeteringLabels[AfMeteringEnum.AfMeteringWindows]).toBe("Windows");
    });

    it('should have value labels for AF_TRIGGER', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_TRIGGER]).toBeDefined();
      const afTriggerLabels = CameraValueLables[CameraPropertyKey.AF_TRIGGER];
      expect(afTriggerLabels[AfTriggerEnum.AfTriggerStart]).toBe("Start");
      expect(afTriggerLabels[AfTriggerEnum.AfTriggerCancel]).toBe("Cancel");
    });

    it('should have value labels for AF_PAUSE', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_PAUSE]).toBeDefined();
      const afPauseLabels = CameraValueLables[CameraPropertyKey.AF_PAUSE];
      expect(afPauseLabels[AfPauseEnum.AfPauseImmediate]).toBe("Immediate");
      expect(afPauseLabels[AfPauseEnum.AfPauseDeferred]).toBe("Deferred");
      expect(afPauseLabels[AfPauseEnum.AfPauseResume]).toBe("Resume");
    });

    it('should have value labels for AF_STATE', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_STATE]).toBeDefined();
      const afStateLabels = CameraValueLables[CameraPropertyKey.AF_STATE];
      expect(afStateLabels[AfStateEnum.AfStateIdle]).toBe("Idle");
      expect(afStateLabels[AfStateEnum.AfStateScanning]).toBe("Scanning");
      expect(afStateLabels[AfStateEnum.AfStateFocused]).toBe("Focused");
      expect(afStateLabels[AfStateEnum.AfStateFailed]).toBe("Failed");
    });

    it('should have value labels for AF_PAUSE_STATE', () => {
      expect(CameraValueLables[CameraPropertyKey.AF_PAUSE_STATE]).toBeDefined();
      const afPauseStateLabels = CameraValueLables[CameraPropertyKey.AF_PAUSE_STATE];
      expect(afPauseStateLabels[AfPauseStateEnum.AfPauseStateRunning]).toBe("Running");
      expect(afPauseStateLabels[AfPauseStateEnum.AfPauseStatePausing]).toBe("Pausing");
      expect(afPauseStateLabels[AfPauseStateEnum.AfPauseStatePaused]).toBe("Paused");
    });

    it('should have value labels for HDR_MODE', () => {
      expect(CameraValueLables[CameraPropertyKey.HDR_MODE]).toBeDefined();
      const hdrModeLabels = CameraValueLables[CameraPropertyKey.HDR_MODE];
      expect(hdrModeLabels[HdrModeEnum.HdrModeOff]).toBe("Off");
      expect(hdrModeLabels[HdrModeEnum.HdrModeMultiExposureUnmerged]).toBe("Multi-Exposure (Unmerged)");
      expect(hdrModeLabels[HdrModeEnum.HdrModeMultiExposure]).toBe("Multi-Exposure");
      expect(hdrModeLabels[HdrModeEnum.HdrModeSingleExposure]).toBe("Single Exposure");
      expect(hdrModeLabels[HdrModeEnum.HdrModeNight]).toBe("Night");
    });

    it('should have value labels for HDR_CHANNEL', () => {
      expect(CameraValueLables[CameraPropertyKey.HDR_CHANNEL]).toBeDefined();
      const hdrChannelLabels = CameraValueLables[CameraPropertyKey.HDR_CHANNEL];
      expect(hdrChannelLabels[HdrChannelEnum.HdrChannelNone]).toBe("None");
      expect(hdrChannelLabels[HdrChannelEnum.HdrChannelShort]).toBe("Short");
      expect(hdrChannelLabels[HdrChannelEnum.HdrChannelMedium]).toBe("Medium");
      expect(hdrChannelLabels[HdrChannelEnum.HdrChannelLong]).toBe("Long");
    });
  });

  describe('CameraPropertyValue type', () => {
    it('should be a union of all enum types', () => {
      // This test ensures that CameraPropertyValue includes all enum types
      const aeMeteringValue: CameraPropertyValue = AeMeteringModeEnum.MeteringCentreWeighted;
      const aeConstraintValue: CameraPropertyValue = AeConstraintModeEnum.ConstraintNormal;
      const aeExposureValue: CameraPropertyValue = AeExposureModeEnum.ExposureNormal;
      const exposureTimeValue: CameraPropertyValue = ExposureTimeModeEnum.ExposureTimeModeAuto;
      const analogueGainValue: CameraPropertyValue = AnalogueGainModeEnum.AnalogueGainModeAuto;
      const aeFlickerValue: CameraPropertyValue = AeFlickerModeEnum.FlickerOff;
      const awbValue: CameraPropertyValue = AwbModeEnum.AwbAuto;
      const afModeValue: CameraPropertyValue = AfModeEnum.AfModeManual;
      const afRangeValue: CameraPropertyValue = AfRangeEnum.AfRangeNormal;
      const afSpeedValue: CameraPropertyValue = AfSpeedEnum.AfSpeedNormal;
      const afMeteringValue: CameraPropertyValue = AfMeteringEnum.AfMeteringAuto;
      const afTriggerValue: CameraPropertyValue = AfTriggerEnum.AfTriggerStart;
      const afPauseValue: CameraPropertyValue = AfPauseEnum.AfPauseImmediate;
      const afStateValue: CameraPropertyValue = AfStateEnum.AfStateIdle;
      const afPauseStateValue: CameraPropertyValue = AfPauseStateEnum.AfPauseStateRunning;
      const hdrModeValue: CameraPropertyValue = HdrModeEnum.HdrModeOff;
      const hdrChannelValue: CameraPropertyValue = HdrChannelEnum.HdrChannelNone;

      expect(aeMeteringValue).toBeDefined();
      expect(aeConstraintValue).toBeDefined();
      expect(aeExposureValue).toBeDefined();
      expect(exposureTimeValue).toBeDefined();
      expect(analogueGainValue).toBeDefined();
      expect(aeFlickerValue).toBeDefined();
      expect(awbValue).toBeDefined();
      expect(afModeValue).toBeDefined();
      expect(afRangeValue).toBeDefined();
      expect(afSpeedValue).toBeDefined();
      expect(afMeteringValue).toBeDefined();
      expect(afTriggerValue).toBeDefined();
      expect(afPauseValue).toBeDefined();
      expect(afStateValue).toBeDefined();
      expect(afPauseStateValue).toBeDefined();
      expect(hdrModeValue).toBeDefined();
      expect(hdrChannelValue).toBeDefined();
    });
  });

  describe('Consistency Checks', () => {
    it('should have all required property keys defined in CameraKeyLabels', () => {
      // Check if all CameraPropertyKey values have corresponding labels
      const allValues = Object.values(CameraPropertyKey).filter(value => typeof value === 'number');
      allValues.forEach(key => {
        const numericKey = key as number;
        expect((CameraKeyLabels as { [key: number]: string })[numericKey]).toBeDefined();
      });
    });

    it('should have value labels only for properties that support them', () => {
      // Check that only properties with associated enums have value labels
      const propertiesWithEnums = [
        CameraPropertyKey.AE_STATE,
        CameraPropertyKey.AE_METERING_MODE,
        CameraPropertyKey.AE_CONSTRAINT_MODE,
        CameraPropertyKey.AE_EXPOSURE_MODE,
        CameraPropertyKey.EXPOSURE_TIME_MODE,
        CameraPropertyKey.ANALOGUE_GAIN_MODE,
        CameraPropertyKey.AE_FLICKER_MODE,
        CameraPropertyKey.AWB_MODE,
        CameraPropertyKey.AF_MODE,
        CameraPropertyKey.AF_RANGE,
        CameraPropertyKey.AF_SPEED,
        CameraPropertyKey.AF_METERING,
        CameraPropertyKey.AF_TRIGGER,
        CameraPropertyKey.AF_PAUSE,
        CameraPropertyKey.AF_STATE,
        CameraPropertyKey.AF_PAUSE_STATE,
        CameraPropertyKey.HDR_MODE,
        CameraPropertyKey.HDR_CHANNEL,
      ];

      // All these properties should have value labels
      propertiesWithEnums.forEach(propertyKey => {
        const numericKey = propertyKey as number;
        expect((CameraValueLables as { [key: number]: { [key: number]: string } })[numericKey]).toBeDefined();
      });
    });
  });
});