import type { ITransferInfo } from '@onekeyhq/kit-bg/src/vaults/types';
import type { IFeeInfoUnit } from '@onekeyhq/shared/types/fee';
import type { IEncodedTxLightning } from '@onekeyhq/shared/types/lightning';
import type { ISwapTxInfo } from '@onekeyhq/shared/types/swap/types';

import type { ICurveName } from './coreTypesBase';
import type { IEncodedTxAda } from '../chains/ada/types';
import type { IEncodedTxAlgo, IEncodedTxGroupAlgo } from '../chains/algo/types';
import type { IEncodedTxBtc } from '../chains/btc/types';
import type { IEncodedTxCfx } from '../chains/cfx/types';
import type { IEncodedTxCkb } from '../chains/ckb/types';
import type { IEncodedTxCosmos } from '../chains/cosmos/types';
import type { IEncodedTxDnx } from '../chains/dnx/types';
import type { IEncodedTxDot } from '../chains/dot/types';
import type { IEncodedTxEvm } from '../chains/evm/types';
import type { IEncodedTxFil } from '../chains/fil/types';
import type { IEncodedTxKaspa } from '../chains/kaspa/types';
import type { IEncodedTxNear } from '../chains/near/types';
import type { IEncodedTxNexa } from '../chains/nexa/types';
import type { IEncodedTxNostr } from '../chains/nostr/types';
import type { IEncodedTxSui } from '../chains/sui/types';
import type { IEncodedTxTron } from '../chains/tron/types';
import type { IEncodedTxXmr } from '../chains/xmr/types';
import type { IEncodedTxXrp } from '../chains/xrp/types';
import type BigNumber from 'bignumber.js';

export type IEncodedTx =
  | string
  | IEncodedTxEvm
  | IEncodedTxBtc
  | IEncodedTxAda
  | IEncodedTxCfx
  | IEncodedTxCosmos
  | IEncodedTxFil
  | IEncodedTxKaspa
  | IEncodedTxSui
  | IEncodedTxXrp
  | IEncodedTxXmr
  | IEncodedTxTron
  | IEncodedTxNexa
  | IEncodedTxLightning
  | IEncodedTxNostr
  | IEncodedTxDot
  | IEncodedTxDnx
  | IEncodedTxNostr
  | IEncodedTxAlgo
  | IEncodedTxGroupAlgo
  | IEncodedTxCkb
  | IEncodedTxNear;
//   | IEncodedTxBtc
//   | IEncodedTxDot
//   | IEncodedTxSTC
//   | IEncodedTxAptos
//   | IEncodedTxCfx

export type INativeTx = object;
//   | INativeTxEvm
//   | INativeTxNear
//   | INativeTxBtc
//   | INativeTxSol;

export type IRawTx = string;

export type ITxUTXO = {
  txid: string;
  vout: number;
  value: BigNumber;
};
export type ITxInput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  utxo?: ITxUTXO;
  publicKey?: string; // used in stc
};
export type ITxOutput = {
  address: string;
  value: BigNumber;
  tokenAddress?: string;
  payload?: { [key: string]: any };
};
export type ITxInputToSign = {
  index: number;
  publicKey: string;
  address: string;
  sighashTypes?: number[];
};
// TODO remove
export type IUnsignedTx = {
  inputs?: ITxInput[];
  outputs?: ITxOutput[];
  type?: string;
  nonce?: number;
  feeLimit?: BigNumber;
  feeLimitForDisplay?: BigNumber;
  feePricePerUnit?: BigNumber;
  payload?: { [key: string]: any };
  totalFeeInNative?: string;
  tokensChangedTo?: { [key: string]: string };
};
export type IUnsignedTxPro = IUnsignedTx & {
  encodedTx: IEncodedTx;
  feeInfo?: IFeeInfoUnit | undefined;
  swapInfo?: ISwapTxInfo | undefined;
  txSize?: number;
  transfersInfo?: ITransferInfo[];
  rawTxUnsigned?: string;
  psbtHex?: string;
  inputsToSign?: ITxInputToSign[];
  // signerAccount: ISignerAccountEvm | ISignerAccountNear | ISignerAccountAptos
};
export type ISignedTx = {
  txid: string;
  rawTx: string;
  psbtHex?: string;
};
export type ISignedTxResult = ISignedTx & {
  signatureScheme?: ICurveName;
  signature?: string; // hex string
  publicKey?: string; // hex string
  digest?: string; // hex string
  txKey?: string; // hex string for Monero
  pendingTx?: boolean; // It is used for Aptos to wait for the chain to get the transaction state
  // for lightning network
  nonce?: number;
  randomSeed?: number;
  swapInfo?: ISwapTxInfo;
};
export type ISignedTxPro = ISignedTxResult & {
  encodedTx: IEncodedTx | null;
};
export type ISignedMessageItemPro = string;
export type ISignedMessagePro = ISignedMessageItemPro[];
export type IVerifiedMessagePro = {
  isValid: boolean;
  message: string;
  signature: string;
  address: string;
};
