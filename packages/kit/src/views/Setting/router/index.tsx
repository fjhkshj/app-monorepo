import type { IModalFlowNavigatorConfig } from '@onekeyhq/components/src/layouts/Navigation/Navigator';
import { LazyLoadPage } from '@onekeyhq/kit/src/components/LazyLoadPage';
import type {
  EModalAddressBookRoutes,
  IModalAddressBookParamList,
  IModalSettingParamList,
} from '@onekeyhq/shared/src/routes';
import { EModalSettingRoutes } from '@onekeyhq/shared/src/routes';

import { ModalAddressBookRouter } from '../../AddressBook/router';

const SettingAccountDerivationModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/AccountDerivation'),
);

const SettingAppAutoLockModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/AppAutoLock'),
);

const SettingCurrencyModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/Currency'),
);
const SettingHardwareSdkUrlModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/HardwareSdkUrl'),
);
const SettingListModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/List'),
);
const SettingProtectionModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/Protection'),
);
const SettingSpendUTXOModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/SpendUTXO'),
);

const SettingSignatureRecordModal = LazyLoadPage(
  () => import('@onekeyhq/kit/src/views/Setting/pages/SignatureRecord'),
);

const FirmwareUpdateDevSettings = LazyLoadPage(
  () =>
    import('@onekeyhq/kit/src/views/Setting/pages/FirmwareUpdateDevSettings'),
);

export const ModalSettingStack: IModalFlowNavigatorConfig<
  EModalSettingRoutes | EModalAddressBookRoutes,
  IModalSettingParamList & IModalAddressBookParamList
>[] = [
  {
    name: EModalSettingRoutes.SettingListModal,
    component: SettingListModal,
    translationId: 'title__settings',
  },
  {
    name: EModalSettingRoutes.SettingCurrencyModal,
    component: SettingCurrencyModal,
    translationId: 'content__currency',
  },
  {
    name: EModalSettingRoutes.SettingSpendUTXOModal,
    component: SettingSpendUTXOModal,
    translationId: 'form__spend_dust_utxo',
  },
  {
    name: EModalSettingRoutes.SettingAccountDerivationModal,
    component: SettingAccountDerivationModal,
    translationId: 'form__theme',
  },
  {
    name: EModalSettingRoutes.SettingHardwareSdkUrlModal,
    component: SettingHardwareSdkUrlModal,
    translationId: 'form__hardware_bridge_sdk_url',
  },
  {
    name: EModalSettingRoutes.SettingAppAutoLockModal,
    component: SettingAppAutoLockModal,
    translationId: 'form__app_lock',
  },
  {
    name: EModalSettingRoutes.SettingProtectModal,
    component: SettingProtectionModal,
    translationId: 'action__protection',
  },
  {
    name: EModalSettingRoutes.SettingSignatureRecordModal,
    component: SettingSignatureRecordModal,
  },
  {
    name: EModalSettingRoutes.SettingDevFirmwareUpdateModal,
    component: FirmwareUpdateDevSettings,
  },
  ...(ModalAddressBookRouter as IModalFlowNavigatorConfig<
    EModalSettingRoutes | EModalAddressBookRoutes,
    IModalSettingParamList & IModalAddressBookParamList
  >[]),
];
