import { Page, Stack } from '@onekeyhq/components';

import useAppNavigation from '../../../hooks/useAppNavigation';

export function FirmwareUpdatePageHeader() {
  return (
    <Page.Header
      dismissOnOverlayPress={false}
      // disableClose
      title="Hardware Update"
    />
  );
}

export const FirmwareUpdatePageFooter = Page.Footer;

export function FirmwareUpdatePageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const navigation = useAppNavigation();
  // () => navigation.popStack()

  return (
    <Stack>
      <FirmwareUpdatePageHeader />
      <Page.Body>
        <Stack p="$5">{children}</Stack>
      </Page.Body>
    </Stack>
  );
}
