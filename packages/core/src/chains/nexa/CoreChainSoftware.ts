import bufferUtils from '@onekeyhq/shared/src/utils/bufferUtils';

import { CoreChainApiBase } from '../../base/CoreChainApiBase';
import { getUtxoAccountPrefixPath } from '../../utils';

import { getDisplayAddress, signEncodedTx } from './sdkNexa';

import { NotImplemented } from '@onekeyhq/shared/src/errors';
import type {
  ICoreApiGetAddressItem,
  ICoreApiGetAddressQueryImported,
  ICoreApiGetAddressQueryPublicKey,
  ICoreApiGetAddressesQueryHd,
  ICoreApiGetAddressesResult,
  ICoreApiPrivateKeysMap,
  ICoreApiSignBasePayload,
  ICoreApiSignTxPayload,
  ICurveName,
  ISignedTxPro,
} from '../../types';

const curve: ICurveName = 'secp256k1';
const firstAddressRelPath = '0/0';

export default class CoreChainSoftware extends CoreChainApiBase {
  override async getPrivateKeys(
    payload: ICoreApiSignBasePayload,
  ): Promise<ICoreApiPrivateKeysMap> {
    if (payload.credentials.hd) {
      payload.account.relPaths = payload.account.relPaths || [
        // NEXA use single address mode of utxo,
        //    so we should set first address relPaths
        firstAddressRelPath,
      ];
    }
    return this.baseGetPrivateKeys({
      payload,
      curve,
    });
  }

  override async signTransaction(
    payload: ICoreApiSignTxPayload,
  ): Promise<ISignedTxPro> {
    // throw new NotImplemented();;
    const { unsignedTx, account } = payload;
    const signer = await this.baseGetSingleSigner({
      payload,
      curve,
    });
    if (!account.address) {
      throw new Error('nexa signTransaction ERROR: account.address is required');
    }
    const result = await signEncodedTx(unsignedTx, signer, account.address);
    return result;
  }

  override async signMessage(): Promise<string> {
    throw new NotImplemented();
  }

  override async getAddressFromPrivate(
    query: ICoreApiGetAddressQueryImported,
  ): Promise<ICoreApiGetAddressItem> {
    const { privateKeyRaw } = query;
    const privateKey = bufferUtils.toBuffer(privateKeyRaw);
    const pub = this.baseGetCurve(curve).publicFromPrivate(privateKey);
    return this.getAddressFromPublic({
      publicKey: bufferUtils.bytesToHex(pub),
      networkInfo: query.networkInfo,
    });
  }

  override async getAddressFromPublic(
    query: ICoreApiGetAddressQueryPublicKey,
  ): Promise<ICoreApiGetAddressItem> {
    const { publicKey, networkInfo, publicKeyInfo } = query;
    const address = publicKey;

    const fullPath = publicKeyInfo?.path || '';

    const prefixPath = getUtxoAccountPrefixPath({
      fullPath,
    });

    const path = fullPath ? prefixPath : '';

    const displayAddress = getDisplayAddress({
      address,
      chainId: networkInfo.chainId,
    });

    return Promise.resolve({
      address,
      publicKey,
      xpub: '',
      path,
      addresses: { [networkInfo.networkId]: displayAddress },
      relPath: '0/0',
    });
  }

  override async getAddressesFromHd(
    query: ICoreApiGetAddressesQueryHd,
  ): Promise<ICoreApiGetAddressesResult> {
    // throw new NotImplemented();;
    return this.baseGetAddressesFromHd(query, {
      curve,
    });
  }
}
