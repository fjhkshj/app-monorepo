import {
  COINTYPE_DOT,
  IMPL_DOT,
  INDEX_PLACEHOLDER,
} from '@onekeyhq/shared/src/engine/engineConsts';

import { EDBAccountType } from '../../../dbs/local/consts';

import type { IAccountDeriveInfoMapBase, IVaultSettings } from '../../types';

const accountDeriveInfo: IAccountDeriveInfoMapBase = {
  default: {
    namePrefix: 'DOT',
    template: `m/44'/${COINTYPE_DOT}'/${INDEX_PLACEHOLDER}'/0'/0'`,
    coinType: COINTYPE_DOT,
  },
};

const settings: IVaultSettings = {
  impl: IMPL_DOT,
  coinTypeDefault: COINTYPE_DOT,
  accountType: EDBAccountType.VARIANT,

  importedAccountEnabled: true,
  hardwareAccountEnabled: true,
  externalAccountEnabled: false,
  watchingAccountEnabled: true,

  isUtxo: false,
  isSingleToken: false,
  NFTEnabled: false,
  nonceRequired: true,
  feeUTXORequired: false,
  editFeeEnabled: false,
  replaceTxEnabled: false,

  defaultFeePresetIndex: 0,

  accountDeriveInfo,
  networkInfo: {
    default: {
      curve: 'ed25519',
      addressPrefix: '0',
    },
    'dot--polkadot': {
      curve: 'ed25519',
      addressPrefix: '0',
    },
    'dot--astar': {
      curve: 'ed25519',
      addressPrefix: '5',
    },
    'dot--kusama': {
      curve: 'ed25519',
      addressPrefix: '2',
    },
    'dot--manta': {
      curve: 'ed25519',
      addressPrefix: '77',
    },
    'dot--joystream': {
      curve: 'ed25519',
      addressPrefix: '126',
    },
  },
};

export default Object.freeze(settings);
