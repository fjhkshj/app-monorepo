export enum EModalSettingRoutes {
  SettingListModal = 'SettingListModal',
  SettingCurrencyModal = 'SettingCurrencyModal',
  SettingAccountDerivationModal = 'SettingAccountDerivationModal',
  SettingHardwareSdkUrlModal = 'SettingHardwareSdkUrlModal',
  SettingSpendUTXOModal = 'SettingSpendUTXOModal',
  SettingAppAutoLockModal = 'SettingAppAutoLockModal',
  SettingProtectModal = 'SettingProtectModal',
  SettingSignatureRecordModal = 'SettingSignatureRecordModal',
  SettingDevFirmwareUpdateModal = 'SettingDevFirmwareUpdateModal',
}

export type IModalSettingParamList = {
  [EModalSettingRoutes.SettingListModal]: undefined;
  [EModalSettingRoutes.SettingCurrencyModal]: undefined;
  [EModalSettingRoutes.SettingAccountDerivationModal]: undefined;
  [EModalSettingRoutes.SettingHardwareSdkUrlModal]: undefined;
  [EModalSettingRoutes.SettingSpendUTXOModal]: undefined;
  [EModalSettingRoutes.SettingAppAutoLockModal]: undefined;
  [EModalSettingRoutes.SettingProtectModal]: undefined;
  [EModalSettingRoutes.SettingSignatureRecordModal]: undefined;
  [EModalSettingRoutes.SettingDevFirmwareUpdateModal]: undefined;
};
