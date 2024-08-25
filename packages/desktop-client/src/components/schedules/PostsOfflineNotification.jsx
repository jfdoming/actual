import React, { useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router-dom';

import i18next from 'i18next';

import { popModal } from 'loot-core/client/actions';
import { send } from 'loot-core/src/platform/client/fetch';

import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal2';
import { Paragraph } from '../common/Paragraph';
import { Stack } from '../common/Stack';
import { Text } from '../common/Text';
import { DisplayId } from '../util/DisplayId';

const interleaveArrays = (...arrays) =>
  Array.from(
    {
      length: Math.max(...arrays.map(array => array.length)),
    },
    (_, i) => arrays.map(array => array[i]),
  ).flat();

export function PostsOfflineNotification() {
  const { t } = useTranslation();

  const location = useLocation();
  const dispatch = useDispatch();

  const payees = (location.state && location.state.payees) || ['a', 'b'];

  async function onPost() {
    await send('schedule/force-run-service');
    dispatch(popModal());
  }

  const payeesList = payees.map(id => (
    <Text key={id} style={{ color: theme.pageTextPositive }}>
      <DisplayId id={id} type="payees" />
    </Text>
  ));

  const placeholders = useMemo(
    () => Array.from({ length: payees.length }, (_, i) => `<${i}>`),
    [payees.length],
  );

  const language = i18next.language;
  const formatter = useMemo(() => {
    return new Intl.ListFormat(language, {
      style: 'long',
      type: 'conjunction',
    });
  }, [language]);

  const i18nPayees = useMemo(() => {
    const formatted = formatter.format(placeholders);
    const parts = formatted.split(/<.*?>/g);
    return interleaveArrays(parts, payeesList);
  }, [formatter, placeholders, payeesList]);

  return (
    <Modal name="schedule-posts-offline-notification">
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Post transactions?')}
            rightContent={<ModalCloseButton onClick={close} />}
          />
          <Paragraph>
            <Text>
              <Trans count={payees.length}>
                The payees <span>{i18nPayees}</span> have schedules that are due
                today. Usually we automatically post transactions for these, but
                you are offline or syncing failed. In order to avoid duplicate
                transactions, we let you choose whether or not to create
                transactions for these schedules.
              </Trans>
            </Text>
          </Paragraph>
          <Paragraph>
            <Trans>
              Be aware that other devices may have already created these
              transactions. If you have multiple devices, make sure you only do
              this on one device or you will have duplicate transactions.
            </Trans>
          </Paragraph>
          <Paragraph>
            <Trans>
              You can always manually post a transaction later for a due
              schedule by selecting the schedule and clicking “Post transaction”
              in the action menu.
            </Trans>
          </Paragraph>
          <Stack
            direction="row"
            justify="flex-end"
            style={{ marginTop: 20 }}
            spacing={2}
          >
            <Button onPress={close}>
              <Trans>Decide later</Trans>
            </Button>
            <Button
              variant="primary"
              autoFocus
              onPress={() => {
                onPost();
                close();
              }}
            >
              <Trans>Post transactions</Trans>
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
