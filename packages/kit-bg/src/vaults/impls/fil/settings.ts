import {
  COINTYPE_FIL,
  IMPL_FIL,
  INDEX_PLACEHOLDER,
} from '@onekeyhq/shared/src/engine/engineConsts';

import { EDBAccountType } from '../../../dbs/local/consts';

import type { IAccountDeriveInfoMapBase, IVaultSettings } from '../../types';

const accountDeriveInfo: IAccountDeriveInfoMapBase = {
  default: {
    namePrefix: 'EVM',
    labelKey: 'form__bip44_standard',
    template: `m/44'/${COINTYPE_FIL}'/0'/0/${INDEX_PLACEHOLDER}`,
    coinType: COINTYPE_FIL,
  },
};

const settings: IVaultSettings = {
  impl: IMPL_FIL,
  coinTypeDefault: COINTYPE_FIL,
  accountType: EDBAccountType.VARIANT,

  importedAccountEnabled: true,
  hardwareAccountEnabled: true,
  externalAccountEnabled: false,
  watchingAccountEnabled: true,

  isUtxo: false,
  isSingleToken: true,
  NFTEnabled: false,
  nonceRequired: true,
  feeUTXORequired: false,
  editFeeEnabled: false,
  replaceTxEnabled: false,

  defaultFeePresetIndex: 0,

  accountDeriveInfo,
  networkInfo: {
    default: {
      curve: 'secp256k1',
      addressPrefix: '',
    },
  },
};

export default Object.freeze(settings);
