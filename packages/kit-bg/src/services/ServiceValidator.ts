import {
  backgroundClass,
  backgroundMethod,
} from '@onekeyhq/shared/src/background/backgroundDecorators';
import { noopObject } from '@onekeyhq/shared/src/utils/miscUtils';
import type { IAddressValidation } from '@onekeyhq/shared/types/address';

import { vaultFactory } from '../vaults/factory';

import ServiceBase from './ServiceBase';

@backgroundClass()
class ServiceValidator extends ServiceBase {
  constructor({ backgroundApi }: { backgroundApi: any }) {
    super({ backgroundApi });
  }

  @backgroundMethod()
  async validateAddress({
    networkId,
    address,
  }: {
    networkId: string;
    address: string;
  }): Promise<IAddressValidation> {
    noopObject(networkId);
    const vault = await vaultFactory.getChainOnlyVault({ networkId });
    const validation = await vault.validateAddress(address);
    return validation;
  }

  @backgroundMethod()
  async validateSendAmount({ amount }: { amount: string }): Promise<boolean> {
    noopObject(amount);
    const vault = await vaultFactory.getVault({
      networkId: 'evm--5',
      accountId: "hd-1--m/44'/60'/0'/0/0",
    });
    const validation = await vault.validateSendAmount();
    return validation;
  }

  @backgroundMethod()
  async validateAmountInputShown({
    networkId,
    toAddress,
  }: {
    networkId: string;
    toAddress: string;
  }) {
    const vault = await vaultFactory.getChainOnlyVault({ networkId });
    const validation = await vault.validateAmountInputShown({ toAddress });
    return validation;
  }
}

export default ServiceValidator;
