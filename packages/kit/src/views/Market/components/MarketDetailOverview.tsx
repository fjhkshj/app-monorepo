import type { INumberSizeableTextProps } from '@onekeyhq/components';
import {
  NumberSizeableText,
  Progress,
  SizableText,
  XStack,
  YStack,
} from '@onekeyhq/components';
import type {
  IMarketDetailPlatform,
  IMarketDetailPool,
  IMarketTokenDetail,
} from '@onekeyhq/shared/types/market';

import { MarketAbout } from './MarketAbout';
import { MarketTokenAddress } from './MarketTokenAddress';
import { PriceChangePercentage } from './PriceChangePercentage';

function OverviewPriceChange({
  title,
  children,
}: {
  title: string;
  children: INumberSizeableTextProps['children'];
}) {
  return (
    <YStack alignItems="center" flexBasis={0} flexGrow={1}>
      <SizableText color="$textSubdued" size="$bodySm">
        {title}
      </SizableText>
      <PriceChangePercentage size="$bodyMdMedium">
        {children}
      </PriceChangePercentage>
    </YStack>
  );
}

export function Overview24PriceChange({
  low,
  high,
}: {
  low: number;
  high: number;
}) {
  return (
    <YStack space="$2.5">
      <SizableText size="$bodyMd" color="$textSubdued">
        24H price range
      </SizableText>
      <Progress value={(low / high) * 100} height="$1" />
      <XStack jc="space-between">
        <XStack space="$1">
          <SizableText color="$textSubdued" size="$bodyMd">
            Low
          </SizableText>
          <NumberSizeableText
            size="$bodyMdMedium"
            formatter="price"
            formatterOptions={{ currency: '$' }}
          >
            {low}
          </NumberSizeableText>
        </XStack>
        <XStack space="$1">
          <SizableText color="$textSubdued" size="$bodyMd">
            High
          </SizableText>
          <NumberSizeableText
            size="$bodyMdMedium"
            formatter="price"
            formatterOptions={{ currency: '$' }}
          >
            {high}
          </NumberSizeableText>
        </XStack>
      </XStack>
    </YStack>
  );
}

function OverviewMarketVOLItem({
  title,
  rank,
  children,
  currency,
}: {
  title: string;
  rank?: number;
  currency?: boolean;
  children: INumberSizeableTextProps['children'];
}) {
  return (
    <YStack
      pb="$3"
      flexBasis={0}
      flexGrow={1}
      borderColor="$borderSubdued"
      borderBottomWidth="$px"
    >
      <SizableText color="$textSubdued" size="$bodySm">
        {title}
      </SizableText>
      <XStack space="$1" ai="center" pt="$0.5">
        <NumberSizeableText
          size="$bodyMdMedium"
          formatter="marketCap"
          formatterOptions={currency ? { currency: '$' } : undefined}
        >
          {children}
        </NumberSizeableText>
        {rank ? (
          <SizableText
            size="$bodySm"
            bg="$bgStrong"
            color="$textSubdued"
            borderRadius="$1"
            px="$1"
          >
            {`#${rank}`}
          </SizableText>
        ) : null}
      </XStack>
    </YStack>
  );
}

function OverviewMarketVOL({
  fdv,
  volume24h,
  marketCap,
  marketCapRank,
  maxSupply,
  totalSupply,
  circulatingSupply,
  detailPlatforms,
}: {
  fdv: number;
  volume24h: number;
  marketCap: number;
  marketCapRank: number;
  maxSupply: number;
  totalSupply: number;
  circulatingSupply: number;
  detailPlatforms: IMarketDetailPlatform;
}) {
  const keys = Object.keys(detailPlatforms).filter((i) => !!i);
  return (
    <YStack pt="$10">
      <YStack space="$3">
        <XStack space="$4">
          <OverviewMarketVOLItem currency title="24H VOL(USD)">
            {volume24h}
          </OverviewMarketVOLItem>
          <OverviewMarketVOLItem
            currency
            title="Market Cap"
            rank={marketCapRank}
          >
            {marketCap}
          </OverviewMarketVOLItem>
        </XStack>
        <XStack space="$4">
          <OverviewMarketVOLItem currency title="FDV">
            {fdv}
          </OverviewMarketVOLItem>
          <OverviewMarketVOLItem title="Circulating Supply">
            {circulatingSupply}
          </OverviewMarketVOLItem>
        </XStack>
        <XStack space="$4">
          <OverviewMarketVOLItem title="Total Supply">
            {totalSupply}
          </OverviewMarketVOLItem>
          <OverviewMarketVOLItem title="Max Supply">
            {maxSupply || '∞'}
          </OverviewMarketVOLItem>
        </XStack>
      </YStack>
      {keys.length ? (
        <YStack pt="$3" space="$2">
          <SizableText color="$textSubdued" size="$bodySm">
            Contract
          </SizableText>
          {keys.map((tokenName) => {
            const platform = detailPlatforms[tokenName];
            return (
              <MarketTokenAddress
                key={tokenName}
                tokenNameSize="$bodyMd"
                tokenNameColor="$textSubdued"
                addressSize="$bodyMdMedium"
                networkId={platform.onekeyNetworkId}
                tokenName={`${tokenName[0].toUpperCase()}${tokenName.slice(1)}`}
                address={platform.contract_address}
              />
            );
          })}
        </YStack>
      ) : null}
    </YStack>
  );
}

// function GoPlus() {
//   return (
//     <XStack jc="space-between" ai="center">
//       <YStack space="$1">
//         <SizableText size="$headingMd">GoPlus</SizableText>
//         <SizableText size="$bodyMd" color="$textSubdued">
//           No risk detected
//         </SizableText>
//       </YStack>
//       <Button h={38}>View</Button>
//     </XStack>
//   );
// }

export function MarketDetailOverview({
  token: {
    detail_platforms: detailPlatforms,
    stats: {
      maxSupply,
      totalSupply,
      circulatingSupply,
      performance,
      volume24h,
      marketCap,
      marketCapRank,
      fdv,
      low24h,
      high24h,
    },
    about,
  },
}: {
  token: IMarketTokenDetail;
  pools: IMarketDetailPool[];
}) {
  return (
    <YStack $gtMd={{ pb: '$10' }}>
      <XStack
        borderWidth="$px"
        borderRadius="$2"
        borderColor="$borderSubdued"
        py="$3"
        my="$6"
      >
        <OverviewPriceChange title="1H">
          {performance.priceChangePercentage1h}
        </OverviewPriceChange>
        <OverviewPriceChange title="24H">
          {performance.priceChangePercentage24h}
        </OverviewPriceChange>
        <OverviewPriceChange title="7D">
          {performance.priceChangePercentage7d}
        </OverviewPriceChange>
        <OverviewPriceChange title="30D">
          {performance.priceChangePercentage30d}
        </OverviewPriceChange>
      </XStack>
      <Overview24PriceChange low={low24h} high={high24h} />
      <OverviewMarketVOL
        volume24h={volume24h}
        fdv={fdv}
        marketCap={marketCap}
        marketCapRank={marketCapRank}
        maxSupply={maxSupply}
        totalSupply={totalSupply}
        circulatingSupply={circulatingSupply}
        detailPlatforms={detailPlatforms}
      />
      {/* <GoPlus /> */}
      <MarketAbout>{about}</MarketAbout>
    </YStack>
  );
}
