import { ed25519 } from '@onekeyhq/core/src/secret';
import { NotImplemented, OneKeyInternalError } from '@onekeyhq/shared/src/errors';
import bufferUtils from '@onekeyhq/shared/src/utils/bufferUtils';

import { CoreChainApiBase } from '../../base/CoreChainApiBase';

import sdkAlgo from './sdkAlgo';

import type { ISdkAlgoEncodedTransaction } from './sdkAlgo';
import type { IEncodedTxAlgo } from './types';
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
import { ISigner } from '../../base/ChainSigner';
import { isArray } from 'lodash';

const curve: ICurveName = 'ed25519';

export default class CoreChainSoftware extends CoreChainApiBase {
  async _signAlgoTx({
    encodedTx,
    signer,
  }: {
    encodedTx: IEncodedTxAlgo;
    signer: ISigner;
  }) {
    const transaction = sdkAlgo.Transaction.from_obj_for_encoding(
      sdkAlgo.decodeObj(
        Buffer.from(encodedTx, 'base64'),
      ) as ISdkAlgoEncodedTransaction,
    );

    const [signature] = await signer.sign(transaction.bytesToSign());

    const txid: string = transaction.txID();
    const rawTx: string = Buffer.from(
      sdkAlgo.encodeObj({
        sig: signature,
        txn: transaction.get_obj_for_encoding(),
      }),
    ).toString('base64');
    return {
      txid,
      rawTx,
    };
  }

  override async getPrivateKeys(
    payload: ICoreApiSignBasePayload,
  ): Promise<ICoreApiPrivateKeysMap> {
    return this.baseGetPrivateKeys({
      payload,
      curve,
    });
  }

  override async signTransaction(
    payload: ICoreApiSignTxPayload,
  ): Promise<ISignedTxPro> {
    const { unsignedTx } = payload;
    const signer = await this.baseGetSingleSigner({
      payload,
      curve,
    });
    const encodedTx = unsignedTx.encodedTx as IEncodedTxAlgo;

    if (isArray(encodedTx)) {
      const signedTxs = await Promise.all(
        encodedTx.map((tx) =>
          this._signAlgoTx({
            encodedTx: tx,
            signer,
          }),
        ),
      );

      return {
        encodedTx: unsignedTx.encodedTx,
        txid: signedTxs.map((tx) => tx.txid).join(','),
        rawTx: signedTxs.map((tx) => tx.rawTx).join(','),
      };
    }

    const { txid, rawTx } = await this._signAlgoTx({ encodedTx, signer });
    return {
      encodedTx: unsignedTx.encodedTx,
      txid,
      rawTx,
    };
  }

  override async signMessage(): Promise<string> {
    throw new NotImplemented();;
  }

  override async getAddressFromPrivate(
    query: ICoreApiGetAddressQueryImported,
  ): Promise<ICoreApiGetAddressItem> {
    const { privateKeyRaw } = query;
    const privateKey = bufferUtils.toBuffer(privateKeyRaw);
    if (privateKey.length !== 32) {
      throw new OneKeyInternalError('Invalid private key.');
    }
    const pub = ed25519.publicFromPrivate(privateKey);
    return this.getAddressFromPublic({
      publicKey: bufferUtils.bytesToHex(pub),
      networkInfo: query.networkInfo,
    });
  }

  override async getAddressFromPublic(
    query: ICoreApiGetAddressQueryPublicKey,
  ): Promise<ICoreApiGetAddressItem> {
    const { publicKey } = query;
    const address = sdkAlgo.encodeAddress(bufferUtils.toBuffer(publicKey));
    return Promise.resolve({
      address,
      publicKey,
    });
  }

  override async getAddressesFromHd(
    query: ICoreApiGetAddressesQueryHd,
  ): Promise<ICoreApiGetAddressesResult> {
    return this.baseGetAddressesFromHd(query, {
      curve,
    });
  }
}
