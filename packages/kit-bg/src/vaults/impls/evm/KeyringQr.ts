import { TransactionTypes } from '@ethersproject/transactions';
import { verifyMessage } from '@ethersproject/wallet';
import HDKey from 'hdkey';

import type { CoreChainApiBase } from '@onekeyhq/core/src/base/CoreChainApiBase';
import {
  buildSignedTxFromSignatureEvm,
  packUnsignedTxForSignEvm,
} from '@onekeyhq/core/src/chains/evm/sdkEvm';
import type { IEncodedTxEvm } from '@onekeyhq/core/src/chains/evm/types';
import coreChainApi from '@onekeyhq/core/src/instance/coreChainApi';
import type {
  ICoreApiGetAddressItem,
  ISignedMessagePro,
  ISignedTxPro,
  IUnsignedMessage,
  IUnsignedMessageEth,
} from '@onekeyhq/core/src/types';
import type { AirGapUR } from '@onekeyhq/qr-wallet-sdk';
import {
  EAirGapAccountNoteEvm,
  EAirGapDataTypeEvm,
  getAirGapSdk,
} from '@onekeyhq/qr-wallet-sdk';
import type {
  IAirGapAccount,
  IAirGapGenerateSignRequestParamsEvm,
  IAirGapSignature,
} from '@onekeyhq/qr-wallet-sdk/src/types';
import { OneKeyErrorAirGapAccountNotFound } from '@onekeyhq/shared/src/errors';
import accountUtils from '@onekeyhq/shared/src/utils/accountUtils';
import { checkIsDefined } from '@onekeyhq/shared/src/utils/assertUtils';
import bufferUtils from '@onekeyhq/shared/src/utils/bufferUtils';
import hexUtils from '@onekeyhq/shared/src/utils/hexUtils';
import { WALLET_CONNECT_CLIENT_NAME } from '@onekeyhq/shared/src/walletConnect/constant';
import { EMessageTypesEth } from '@onekeyhq/shared/types/message';

import localDb from '../../../dbs/local/localDb';
import { KeyringQrBase } from '../../base/KeyringQrBase';

import type { IDBAccount } from '../../../dbs/local/types';
import type {
  IPrepareHardwareAccountsParams,
  ISignMessageParams,
  ISignTransactionParams,
} from '../../types';

export class KeyringQr extends KeyringQrBase {
  override coreApi: CoreChainApiBase = coreChainApi.evm.hd;

  override buildAirGapAccountChildPathTemplate(params: {
    airGapAccount: IAirGapAccount;
  }): string {
    const { airGapAccount } = params;
    if (airGapAccount.note === EAirGapAccountNoteEvm.Standard) {
      return '0/*';
    }
    return '';
  }

  override generateSignRequest(
    params: IAirGapGenerateSignRequestParamsEvm,
  ): Promise<AirGapUR> {
    if (!params.xfp) {
      throw new Error('xfp not found');
    }
    const sdk = getAirGapSdk();
    const signRequestUr = sdk.eth.generateSignRequest({
      ...params,
      origin: params.origin ?? WALLET_CONNECT_CLIENT_NAME,
    });
    return Promise.resolve(signRequestUr);
  }

  override parseSignature(ur: AirGapUR): Promise<IAirGapSignature> {
    const sdk = getAirGapSdk();
    const sig = sdk.eth.parseSignature(ur);
    return Promise.resolve(sig);
  }

  override signMessage(params: ISignMessageParams): Promise<ISignedMessagePro> {
    const { messages } = params;

    return Promise.all(
      messages.map(async (message: IUnsignedMessage) => {
        const msg = message as IUnsignedMessageEth;
        let dataType: EAirGapDataTypeEvm | undefined;
        if (msg.type === EMessageTypesEth.PERSONAL_SIGN) {
          dataType = EAirGapDataTypeEvm.personalMessage;
        }
        if (
          [
            EMessageTypesEth.TYPED_DATA_V1,
            EMessageTypesEth.TYPED_DATA_V3,
            EMessageTypesEth.TYPED_DATA_V4,
          ].includes(msg.type)
        ) {
          dataType = EAirGapDataTypeEvm.typedData;
        }

        if (!dataType) {
          throw new Error(
            `Unsupported message type: ${dataType || 'undefined'}`,
          );
        }

        return this.baseSignByQrcode(params, {
          signRequestUrBuilder: async ({
            path,
            account,
            chainId,
            requestId,
            xfp,
          }) => {
            let signData = hexUtils.stripHexPrefix(msg.message);
            if (dataType === EAirGapDataTypeEvm.typedData) {
              signData = hexUtils.stripHexPrefix(
                bufferUtils.textToHex(msg.message, 'utf-8'),
              );
            }
            const signRequestUr = await this.generateSignRequest({
              requestId,
              signData,
              dataType: checkIsDefined(dataType),
              path,
              xfp,
              chainId: Number(chainId),
              address: account.address,
            });
            return signRequestUr;
          },
          signedResultBuilder: async ({ signature }) => {
            const signatureHex = signature.signature;
            return hexUtils.addHexPrefix(signatureHex);
          },
        });
      }),
    );
  }

  override async signTransaction(
    params: ISignTransactionParams,
  ): Promise<ISignedTxPro> {
    const encodedTx = params.unsignedTx.encodedTx as IEncodedTxEvm;
    const { tx, serializedTxWithout0x } = packUnsignedTxForSignEvm({
      encodedTx,
    });
    let dataType = EAirGapDataTypeEvm.transaction;
    if (tx.type === TransactionTypes.eip1559) {
      dataType = EAirGapDataTypeEvm.typedTransaction;
    }

    return this.baseSignByQrcode(params, {
      signRequestUrBuilder: async ({
        path,
        account,
        chainId,
        requestId,
        xfp,
      }) => {
        const signRequestUr = await this.generateSignRequest({
          requestId,
          signData: serializedTxWithout0x,
          dataType,
          path,
          xfp,
          chainId: Number(chainId),
          address: account.address,
        });
        return signRequestUr;
      },
      signedResultBuilder: async ({ signature }) => {
        const signatureHex = signature.signature;

        const verifyMessageFn = verifyMessage;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const verifyResult = verifyMessageFn(
          hexUtils.stripHexPrefix(serializedTxWithout0x),
          hexUtils.addHexPrefix(signatureHex),
        ); // verify signature

        const r = hexUtils.addHexPrefix(signatureHex.slice(0, 32 * 2));
        const s = hexUtils.addHexPrefix(signatureHex.slice(32 * 2, 64 * 2));
        const v = signatureHex.slice(64 * 2); // do not add prefix 0x for v

        const { rawTx, txid } = buildSignedTxFromSignatureEvm({
          tx,
          signature: {
            r,
            s,
            v,
          },
        });
        return { txid, rawTx, encodedTx: params.unsignedTx.encodedTx };
      },
    });
  }

  override async prepareAccounts(
    params: IPrepareHardwareAccountsParams,
  ): Promise<IDBAccount[]> {
    const wallet = await localDb.getWallet({ walletId: this.walletId });

    return this.basePrepareHdNormalAccounts(params, {
      buildAddressesInfo: async ({ usedIndexes }) => {
        const ret: ICoreApiGetAddressItem[] = [];
        for (const index of usedIndexes) {
          const { fullPath, airGapAccount, childPathTemplate } =
            await this.findQrWalletAirGapAccount(params, { index, wallet });

          if (!airGapAccount) {
            throw new OneKeyErrorAirGapAccountNotFound();
          }

          let publicKey = airGapAccount?.publicKey;

          if (childPathTemplate) {
            const xpub = airGapAccount?.extendedPublicKey;
            if (!xpub) {
              throw new Error('xpub not found');
            }
            let hdk = HDKey.fromExtendedKey(xpub);
            const childPath = accountUtils.buildPathFromTemplate({
              template: childPathTemplate,
              index,
            });
            hdk = hdk.derive(`m/${childPath}`);
            publicKey = hdk.publicKey.toString('hex');
          }

          if (!publicKey) {
            throw new Error('publicKey not found');
          }

          const networkInfo = await this.getCoreApiNetworkInfo();
          const addressInfo = await this.coreApi.getAddressFromPublic({
            publicKey,
            networkInfo,
          });
          if (!addressInfo) {
            throw new Error('addressInfo not found');
          }
          const { normalizedAddress } = await this.vault.validateAddress(
            addressInfo.address,
          );
          addressInfo.address = normalizedAddress || addressInfo.address;
          addressInfo.path = fullPath;
          ret.push(addressInfo);
          console.log('KeyringQr prepareAccounts', {
            params,
            wallet,
            fullPath,
            airGapAccount,
            addressInfo,
          });
        }
        return ret;
      },
    });
  }
}
