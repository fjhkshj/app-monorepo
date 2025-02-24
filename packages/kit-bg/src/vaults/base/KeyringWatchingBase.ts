/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/require-await */

import type { EAddressEncodings, ISignedTxPro } from '@onekeyhq/core/src/types';
import {
  InvalidAddress,
  OneKeyInternalError,
} from '@onekeyhq/shared/src/errors';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { checkIsDefined } from '@onekeyhq/shared/src/utils/assertUtils';

import { EDBAccountType } from '../../dbs/local/consts';
import { EVaultKeyringTypes } from '../types';

import { KeyringBase } from './KeyringBase';

import type {
  IDBAccount,
  IDBSimpleAccount,
  IDBUtxoAccount,
} from '../../dbs/local/types';
import type { IPrepareWatchingAccountsParams } from '../types';

export abstract class KeyringWatchingBase extends KeyringBase {
  override keyringType: EVaultKeyringTypes = EVaultKeyringTypes.watching;

  async signTransaction(): Promise<ISignedTxPro> {
    throw new OneKeyInternalError(
      'signTransaction is not supported for watching accounts',
    );
  }

  async signMessage(): Promise<string[]> {
    throw new OneKeyInternalError(
      'signMessage is not supported for watching accounts',
    );
  }

  async basePrepareUtxoWatchingAccounts(
    params: IPrepareWatchingAccountsParams,
  ): Promise<IDBUtxoAccount[]> {
    const {
      address,
      xpub,
      networks,
      createAtNetwork,
      name,
      deriveInfo,
      isUrlAccount,
    } = params;
    if (!address && !xpub) {
      throw new Error(
        'basePrepareUtxoWatchingAccounts ERROR: address and xpub are not defined',
      );
    }
    const networkInfo = await this.getCoreApiNetworkInfo();

    const settings = await this.getVaultSettings();
    const coinType = settings.coinTypeDefault;

    // xpub build
    const addressEncoding: EAddressEncodings | undefined =
      deriveInfo?.addressEncoding;

    const id = accountUtils.buildWatchingAccountId({
      coinType,
      address,
      xpub,
      addressEncoding,
      isUrlAccount,
    });
    let addressFromXpub = '';
    let xpubSegwit = xpub;
    if (!address && xpub) {
      checkIsDefined(this.coreApi);
      // use first relPath 0/0 as xpub account address
      const result = await this.coreApi?.getAddressFromPublic({
        publicKey: xpub,
        addressEncoding,
        networkInfo,
      });
      addressFromXpub = result?.address || '';
      xpubSegwit = result?.xpubSegwit || xpubSegwit || xpub;
    }

    const account: IDBUtxoAccount = {
      id,
      name,
      type: EDBAccountType.UTXO,
      relPath: '0/0',
      coinType,
      impl: settings.impl,
      networks,
      createAtNetwork,
      address: addressFromXpub || address || '',
      xpub: xpub || '',
      xpubSegwit,
      path: '',
      addresses: {},
    };
    return [account];
  }

  async basePrepareSimpleWatchingAccounts(
    params: IPrepareWatchingAccountsParams,
    options: {
      onlyAvailableOnCertainNetworks?: boolean;
      impl?: string;
      coinType?: string;
      // accountType?: EDBAccountType;
    } = {},
  ): Promise<IDBAccount[]> {
    const { address, name, networks, createAtNetwork, isUrlAccount } = params;
    if (!address) {
      throw new InvalidAddress();
    }
    if (!createAtNetwork) {
      throw new Error(
        'basePrepareSimpleWatchingAccounts ERROR: createAtNetwork is not defined',
      );
    }
    const { onlyAvailableOnCertainNetworks = false } = options;
    const settings = await this.getVaultSettings();
    const coinType = options.coinType || settings.coinTypeDefault;
    const impl = options.impl || settings.impl;

    const id = accountUtils.buildWatchingAccountId({
      coinType,
      address,
      isUrlAccount,
    });
    const account: IDBSimpleAccount = {
      id,
      name: name || '',
      type: EDBAccountType.SIMPLE,
      coinType,
      impl,
      networks: onlyAvailableOnCertainNetworks ? networks : undefined,
      createAtNetwork,
      address,
      pub: '',
      path: '',
    };
    return Promise.resolve([account]);
  }
}
