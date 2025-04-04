import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GridList, GridListItem } from 'react-aria-components';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Card } from '@actual-app/components/card';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { SvgLogo } from '@actual-app/components/icons/logo';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import {
  SvgArrowThinLeft,
  SvgArrowThinRight,
  SvgArrowThickRight,
  SvgCheveronRight,
} from '@actual-app/components/icons/v1';
import {
  SvgArrowButtonDown1,
  SvgCalendar,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Label } from '@actual-app/components/label';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import { css } from '@emotion/css';
import { AutoTextSize } from 'auto-text-size';
import memoizeOne from 'memoize-one';

import { collapseModals, pushModal } from 'loot-core/client/modals/modalsSlice';
import {
  envelopeBudget,
  trackingBudget,
  uncategorizedCount,
} from 'loot-core/client/queries';
import { useSpreadsheet } from 'loot-core/client/SpreadsheetProvider';
import * as monthUtils from 'loot-core/shared/months';
import { groupById, integerToCurrency } from 'loot-core/shared/util';

import { useCategories } from '../../../hooks/useCategories';
import { useFeatureFlag } from '../../../hooks/useFeatureFlag';
import { useLocale } from '../../../hooks/useLocale';
import { useLocalPref } from '../../../hooks/useLocalPref';
import { useNavigate } from '../../../hooks/useNavigate';
import { usePrevious } from '../../../hooks/usePrevious';
import { useSyncedPref } from '../../../hooks/useSyncedPref';
import { useUndo } from '../../../hooks/useUndo';
import { useDispatch } from '../../../redux';
import { BalanceWithCarryover } from '../../budget/BalanceWithCarryover';
import { makeAmountGrey, makeBalanceAmountStyle } from '../../budget/util';
import { MobilePageHeader, Page } from '../../Page';
import { PrivacyFilter } from '../../PrivacyFilter';
import { CellValue } from '../../spreadsheet/CellValue';
import { NamespaceContext } from '../../spreadsheet/NamespaceContext';
import { useFormat } from '../../spreadsheet/useFormat';
import { useSheetValue } from '../../spreadsheet/useSheetValue';
import { MOBILE_NAV_HEIGHT } from '../MobileNavTabs';
import { PullToRefresh } from '../PullToRefresh';

import { BudgetCell } from './BudgetCell';
import { IncomeGroup } from './IncomeGroup';
import { ListItem } from './ListItem';

export const PILL_STYLE = {
  borderRadius: 16,
  color: theme.pillText,
  backgroundColor: theme.pillBackgroundLight,
};

export function getColumnWidth({
  show3Cols = false,
  isSidebar = false,
  offset = 0,
} = {}) {
  // If show3Cols = 35vw | 20vw | 20vw | 20vw,
  // Else = 45vw | 25vw | 25vw,
  if (!isSidebar) {
    return show3Cols ? `${20 + offset}vw` : `${25 + offset}vw`;
  }
  return show3Cols ? `${35 + offset}vw` : `${45 + offset}vw`;
}

function ToBudget({ toBudget, onPress, show3Cols }) {
  const { t } = useTranslation();
  const amount = useSheetValue(toBudget);
  const format = useFormat();
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View>
          <Label
            title={amount < 0 ? t('Overbudgeted') : t('To Budget')}
            style={{
              ...(amount < 0 ? styles.smallText : {}),
              color: theme.formInputText,
              flexShrink: 0,
              textAlign: 'left',
            }}
          />
          <CellValue binding={toBudget} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color:
                        amount < 0
                          ? theme.errorText
                          : amount > 0
                            ? theme.noticeText
                            : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

function Saved({ projected, onPress, show3Cols }) {
  const { t } = useTranslation();
  const binding = projected
    ? trackingBudget.totalBudgetedSaved
    : trackingBudget.totalSaved;

  const saved = useSheetValue(binding) || 0;
  const format = useFormat();
  const isNegative = saved < 0;
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        width: sidebarColumnWidth,
      }}
    >
      <Button variant="bare" onPress={onPress}>
        <View style={{ alignItems: 'flex-start' }}>
          {projected ? (
            <View>
              <AutoTextSize
                as={Label}
                minFontSizePx={6}
                maxFontSizePx={12}
                mode="oneline"
                title="Projected savings"
                style={{
                  color: theme.formInputText,
                  textAlign: 'left',
                  fontSize: 12,
                }}
              />
            </View>
          ) : (
            <Label
              title={isNegative ? t('Overspent') : t('Saved')}
              style={{
                color: theme.formInputText,
                textAlign: 'left',
              }}
            />
          )}

          <CellValue binding={binding} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      textAlign: 'left',
                      fontSize: 12,
                      fontWeight: '700',
                      color: projected
                        ? theme.warningText
                        : isNegative
                          ? theme.errorTextDark
                          : theme.formInputText,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <SvgCheveronRight
          style={{
            flexShrink: 0,
            color: theme.mobileHeaderTextSubdued,
            marginLeft: 5,
          }}
          width={14}
          height={14}
        />
      </Button>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExpenseGroupPreview({ group, pending, style }) {
  return (
    <Card
      style={{
        marginTop: 7,
        marginBottom: 7,
        opacity: pending ? 1 : 0.4,
      }}
    >
      <ExpenseGroupHeader group={group} blank={true} />

      {group.categories.map((cat, index) => (
        <ExpenseCategory
          key={cat.id}
          category={cat}
          blank={true}
          index={index}
        />
      ))}
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ExpenseCategoryPreview({ name, pending, style }) {
  return (
    <ListItem
      style={{
        flex: 1,
        borderColor: 'transparent',
        borderRadius: 4,
      }}
    >
      <Text style={styles.smallText}>{name}</Text>
    </ListItem>
  );
}

const ExpenseCategory = memo(function ExpenseCategory({
  type,
  category,
  isHidden,
  goal,
  longGoal,
  budgeted,
  spent,
  balance,
  carryover,
  index,
  // gestures,
  blank,
  style,
  month,
  onEdit,
  onBudgetAction,
  show3Cols,
  showBudgetedCol,
}) {
  const opacity = blank ? 0 : 1;

  const { t } = useTranslation();
  const isGoalTemplatesEnabled = useFeatureFlag('goalTemplatesEnabled');
  const goalTemp = useSheetValue(goal);
  const goalValue = isGoalTemplatesEnabled ? goalTemp : null;

  const [budgetType = 'rollover'] = useSyncedPref('budgetType');
  const modalBudgetType = budgetType === 'rollover' ? 'envelope' : 'tracking';
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const onCarryover = useCallback(
    carryover => {
      onBudgetAction(month, 'carryover', {
        category: category.id,
        flag: carryover,
      });
      dispatch(
        collapseModals({ rootModalName: `${modalBudgetType}-balance-menu` }),
      );
    },
    [modalBudgetType, category.id, dispatch, month, onBudgetAction],
  );

  const catBalance = useSheetValue(
    type === 'rollover'
      ? envelopeBudget.catBalance(category.id)
      : trackingBudget.catBalance(category.id),
  );
  const budgetedtmp = useSheetValue(budgeted);
  const balancetmp = useSheetValue(balance);
  const isLongGoal = useSheetValue(longGoal) === 1;
  const budgetedValue = isGoalTemplatesEnabled
    ? isLongGoal
      ? balancetmp
      : budgetedtmp
    : null;

  const onTransfer = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'transfer',
          options: {
            title: category.name,
            categoryId: category.id,
            month,
            amount: catBalance,
            onSubmit: (amount, toCategoryId) => {
              onBudgetAction(month, 'transfer-category', {
                amount,
                from: category.id,
                to: toCategoryId,
              });
              dispatch(
                collapseModals({
                  rootModalName: `${modalBudgetType}-balance-menu`,
                }),
              );
              showUndoNotification({
                message: `Transferred ${integerToCurrency(amount)} from ${category.name} to ${categoriesById[toCategoryId].name}.`,
              });
            },
            showToBeBudgeted: true,
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    catBalance,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
  ]);

  const onCover = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: category.name,
            month,
            categoryId: category.id,
            onSubmit: fromCategoryId => {
              onBudgetAction(month, 'cover-overspending', {
                to: category.id,
                from: fromCategoryId,
              });
              dispatch(
                collapseModals({
                  rootModalName: `${modalBudgetType}-balance-menu`,
                }),
              );
              showUndoNotification({
                message: t(
                  `Covered {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                  {
                    toCategoryName: category.name,
                    fromCategoryName: categoriesById[fromCategoryId].name,
                  },
                ),
              });
            },
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    categoriesById,
    category.id,
    category.name,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
    t,
  ]);

  const onOpenBalanceMenu = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: `${modalBudgetType}-balance-menu`,
          options: {
            categoryId: category.id,
            month,
            onCarryover,
            ...(budgetType === 'rollover' && { onTransfer, onCover }),
          },
        },
      }),
    );
  }, [
    modalBudgetType,
    budgetType,
    category.id,
    dispatch,
    month,
    onCarryover,
    onCover,
    onTransfer,
  ]);

  const listItemRef = useRef();
  const format = useFormat();
  const navigate = useNavigate();
  const onShowActivity = useCallback(() => {
    navigate(`/categories/${category.id}?month=${month}`);
  }, [category.id, month, navigate]);

  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Cols });

  const content = (
    <ListItem
      style={{
        backgroundColor: 'transparent',
        borderBottomWidth: 0,
        borderTopWidth: index > 0 ? 1 : 0,
        opacity: isHidden ? 0.5 : undefined,
        ...style,
      }}
      data-testid="category-row"
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <Button
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(category.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
              }}
              data-testid="category-name"
            >
              {category.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      <View
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          flexDirection: 'row',
          opacity,
        }}
      >
        <View
          style={{
            ...(!show3Cols && !showBudgetedCol && { display: 'none' }),
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BudgetCell
            key={`${show3Cols}|${showBudgetedCol}`}
            binding={budgeted}
            type="financial"
            category={category}
            month={month}
            onBudgetAction={onBudgetAction}
          />
        </View>
        <View
          style={{
            ...(!show3Cols && showBudgetedCol && { display: 'none' }),
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <CellValue
            binding={spent}
            type="financial"
            aria-label={t('Spent amount for {{categoryName}} category', {
              categoryName: category.name,
            })} // Translated aria-label
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                style={{
                  ...PILL_STYLE,
                }}
                onPress={onShowActivity}
                aria-label={t(
                  'Show transactions for {{categoryName}} category',
                  { categoryName: category.name },
                )} // Translated aria-label
              >
                <PrivacyFilter>
                  <AutoTextSize
                    key={`${value}|${show3Cols}|${showBudgetedCol}`}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      ...makeAmountGrey(value),
                      maxWidth: columnWidth,
                      textAlign: 'right',
                      fontSize: 12,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </Button>
            )}
          </CellValue>
        </View>
        <View
          style={{
            width: columnWidth,
            justifyContent: 'center',
            alignItems: 'flex-end',
          }}
        >
          <BalanceWithCarryover
            aria-label={t('Balance for {{categoryName}} category', {
              categoryName: category.name,
            })} // Translated aria-label
            type="financial"
            carryover={carryover}
            balance={balance}
            goal={goal}
            budgeted={budgeted}
            longGoal={longGoal}
            CarryoverIndicator={({ style }) => (
              <View
                style={{
                  position: 'absolute',
                  right: '-3px',
                  top: '-5px',
                  borderRadius: '50%',
                  backgroundColor: style?.color ?? theme.pillText,
                }}
              >
                <SvgArrowThickRight
                  width={11}
                  height={11}
                  style={{ color: theme.pillBackgroundLight }}
                />
              </View>
            )}
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                style={{
                  ...PILL_STYLE,
                  maxWidth: columnWidth,
                }}
                onPress={onOpenBalanceMenu}
                aria-label={t(
                  'Open balance menu for {{categoryName}} category',
                  { categoryName: category.name },
                )} // Translated aria-label
              >
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={{
                      maxWidth: columnWidth,
                      ...makeBalanceAmountStyle(
                        value,
                        goalValue,
                        budgetedValue,
                      ),
                      textAlign: 'right',
                      fontSize: 12,
                    }}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </Button>
            )}
          </BalanceWithCarryover>
        </View>
      </View>
    </ListItem>
  );

  return <View>{content}</View>;

  // <Draggable
  //   id={category.id}
  //   type="category"
  //   preview={({ pending, style }) => (
  //     <BudgetCategoryPreview
  //       name={category.name}
  //       pending={pending}
  //       style={style}
  //     />
  //   )}
  //   gestures={gestures}
  // >
  //   <Droppable
  //     type="category"
  //     getActiveStatus={(x, y, { layout }, { id }) => {
  //       let pos = (y - layout.y) / layout.height;
  //       return pos < 0.5 ? 'top' : 'bottom';
  //     }}
  //     onDrop={(id, type, droppable, status) =>
  //       props.onReorder(id.replace('category:', ''), {
  //         aroundCategory: {
  //           id: category.id,
  //           position: status
  //         }
  //       })
  //     }
  //   >
  //     {() => content}
  //   </Droppable>
  // </Draggable>
});

const ExpenseGroupHeader = memo(function ExpenseGroupHeader({
  group,
  budgeted,
  spent,
  balance,
  editMode,
  onEdit,
  blank,
  show3Cols,
  showBudgetedCol,
  collapsed,
  onToggleCollapse,
  style,
}) {
  const opacity = blank ? 0 : 1;
  const listItemRef = useRef();
  const format = useFormat();
  const sidebarColumnWidth = getColumnWidth({
    show3Cols,
    isSidebar: true,
    offset: -3.5,
  });
  const columnWidth = getColumnWidth({ show3Cols });

  const amountStyle = {
    width: columnWidth,
    fontSize: 12,
    fontWeight: '500',
    paddingLeft: 5,
    textAlign: 'right',
  };

  const content = (
    <ListItem
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        opacity: !!group.hidden ? 0.5 : undefined,
        paddingLeft: 0,
        ...style,
      }}
      data-testid="category-group-row"
      innerRef={listItemRef}
    >
      <View
        style={{
          flex: 1,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          width: sidebarColumnWidth,
        }}
      >
        <Button
          variant="bare"
          className={css({
            flexShrink: 0,
            color: theme.pageTextSubdued,
            '&[data-pressed]': {
              backgroundColor: 'transparent',
            },
          })}
          onPress={() => onToggleCollapse?.(group.id)}
        >
          <SvgExpandArrow
            width={8}
            height={8}
            style={{
              flexShrink: 0,
              transition: 'transform .1s',
              transform: collapsed ? 'rotate(-90deg)' : '',
            }}
          />
        </Button>
        <Button
          variant="bare"
          style={{
            maxWidth: sidebarColumnWidth,
          }}
          onPress={() => onEdit?.(group.id)}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-start',
            }}
          >
            <Text
              style={{
                ...styles.lineClamp(2),
                width: sidebarColumnWidth,
                textAlign: 'left',
                ...styles.smallText,
                fontWeight: '500',
              }}
              data-testid="category-group-name"
            >
              {group.name}
            </Text>
            <SvgCheveronRight
              style={{ flexShrink: 0, color: theme.tableTextSubdued }}
              width={14}
              height={14}
            />
          </View>
        </Button>
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
          opacity,
          paddingRight: 5,
        }}
      >
        <View
          style={{ ...(!show3Cols && !showBudgetedCol && { display: 'none' }) }}
        >
          <CellValue binding={budgeted} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={amountStyle}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <View
          style={{ ...(!show3Cols && showBudgetedCol && { display: 'none' }) }}
        >
          <CellValue binding={spent} type="financial">
            {({ type, value }) => (
              <View>
                <PrivacyFilter>
                  <AutoTextSize
                    key={value}
                    as={Text}
                    minFontSizePx={6}
                    maxFontSizePx={12}
                    mode="oneline"
                    style={amountStyle}
                  >
                    {format(value, type)}
                  </AutoTextSize>
                </PrivacyFilter>
              </View>
            )}
          </CellValue>
        </View>
        <CellValue binding={balance} type="financial">
          {({ type, value }) => (
            <View>
              <PrivacyFilter>
                <AutoTextSize
                  key={value}
                  as={Text}
                  minFontSizePx={6}
                  maxFontSizePx={12}
                  mode="oneline"
                  style={amountStyle}
                >
                  {format(value, type)}
                </AutoTextSize>
              </PrivacyFilter>
            </View>
          )}
        </CellValue>
      </View>

      {/* {editMode && (
        <View>
          <Button
            onPointerUp={() => onAddCategory(group.id, group.is_income)}
            style={{ padding: 10 }}
          >
            <Add width={15} height={15} />
          </Button>
        </View>
      )} */}
    </ListItem>
  );

  if (!editMode) {
    return content;
  }

  return content;
  // <Droppable
  //   type="category"
  //   getActiveStatus={(x, y, { layout }, { id }) => {
  //     return 'bottom';
  //   }}
  //   onDrop={(id, type, droppable, status) =>
  //     props.onReorderCategory(id, { inGroup: group.id })
  //   }
  // >
  //   {() => content}
  // </Droppable>
});

const ExpenseGroup = memo(function ExpenseGroup({
  type,
  group,
  editMode,
  onEditGroup,
  onEditCategory,
  // gestures,
  month,
  // onReorderCategory,
  // onReorderGroup,
  onAddCategory,
  onBudgetAction,
  showBudgetedCol,
  show3Cols,
  showHiddenCategories,
  collapsed,
  onToggleCollapse,
}) {
  function editable(content) {
    if (!editMode) {
      return content;
    }

    return content;
    // <Draggable
    //   id={group.id}
    //   type="group"
    //   preview={({ pending, style }) => (
    //     <BudgetGroupPreview group={group} pending={pending} style={style} />
    //   )}
    //   gestures={gestures}
    // >
    //   <Droppable
    //     type="group"
    //     getActiveStatus={(x, y, { layout }, { id }) => {
    //       let pos = (y - layout.y) / layout.height;
    //       return pos < 0.5 ? 'top' : 'bottom';
    //     }}
    //     onDrop={(id, type, droppable, status) => {
    //       onReorderGroup(id, group.id, status);
    //     }}
    //   >
    //     {() => content}
    //   </Droppable>
    // </Draggable>
  }

  return editable(
    <Card
      style={{
        marginTop: 4,
        marginBottom: 4,
      }}
    >
      <ExpenseGroupHeader
        group={group}
        showBudgetedCol={showBudgetedCol}
        budgeted={
          type === 'report'
            ? trackingBudget.groupBudgeted(group.id)
            : envelopeBudget.groupBudgeted(group.id)
        }
        spent={
          type === 'report'
            ? trackingBudget.groupSumAmount(group.id)
            : envelopeBudget.groupSumAmount(group.id)
        }
        balance={
          type === 'report'
            ? trackingBudget.groupBalance(group.id)
            : envelopeBudget.groupBalance(group.id)
        }
        show3Cols={show3Cols}
        editMode={editMode}
        onAddCategory={onAddCategory}
        onEdit={onEditGroup}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        // onReorderCategory={onReorderCategory}
        style={{
          backgroundColor: monthUtils.isCurrentMonth(month)
            ? theme.budgetHeaderCurrentMonth
            : theme.budgetHeaderOtherMonth,
        }}
      />

      {group.categories
        .filter(
          category => !collapsed && (!category.hidden || showHiddenCategories),
        )
        .map((category, index) => {
          return (
            <ExpenseCategory
              key={category.id}
              index={index}
              show3Cols={show3Cols}
              type={type}
              category={category}
              isHidden={!!category.hidden || group.hidden}
              goal={
                type === 'report'
                  ? trackingBudget.catGoal(category.id)
                  : envelopeBudget.catGoal(category.id)
              }
              longGoal={
                type === 'report'
                  ? trackingBudget.catLongGoal(category.id)
                  : envelopeBudget.catLongGoal(category.id)
              }
              budgeted={
                type === 'report'
                  ? trackingBudget.catBudgeted(category.id)
                  : envelopeBudget.catBudgeted(category.id)
              }
              spent={
                type === 'report'
                  ? trackingBudget.catSumAmount(category.id)
                  : envelopeBudget.catSumAmount(category.id)
              }
              balance={
                type === 'report'
                  ? trackingBudget.catBalance(category.id)
                  : envelopeBudget.catBalance(category.id)
              }
              carryover={
                type === 'report'
                  ? trackingBudget.catCarryover(category.id)
                  : envelopeBudget.catCarryover(category.id)
              }
              style={{
                backgroundColor: monthUtils.isCurrentMonth(month)
                  ? theme.budgetCurrentMonth
                  : theme.budgetOtherMonth,
              }}
              showBudgetedCol={showBudgetedCol}
              editMode={editMode}
              onEdit={onEditCategory}
              // gestures={gestures}
              month={month}
              // onReorder={onReorderCategory}
              onBudgetAction={onBudgetAction}
            />
          );
        })}
    </Card>,
  );
});

function BudgetGroups({
  type,
  categoryGroups,
  onEditGroup,
  onEditCategory,
  editMode,
  gestures,
  month,
  onSaveCategory,
  onDeleteCategory,
  onAddCategory,
  onReorderCategory,
  onReorderGroup,
  onBudgetAction,
  showBudgetedCol,
  show3Cols,
  showHiddenCategories,
}) {
  const separateGroups = memoizeOne(groups => {
    return {
      incomeGroup: groups.find(group => group.is_income),
      expenseGroups: groups.filter(group => !group.is_income),
    };
  });

  const { incomeGroup, expenseGroups } = separateGroups(categoryGroups);
  const [collapsedGroupIds = [], setCollapsedGroupIdsPref] =
    useLocalPref('budget.collapsed');

  const onToggleCollapse = id => {
    setCollapsedGroupIdsPref(
      collapsedGroupIds.includes(id)
        ? collapsedGroupIds.filter(collapsedId => collapsedId !== id)
        : [...collapsedGroupIds, id],
    );
  };

  return (
    <View
      data-testid="budget-groups"
      style={{ flex: '1 0 auto', overflowY: 'auto', paddingBottom: 15 }}
    >
      {expenseGroups
        .filter(group => !group.hidden || showHiddenCategories)
        .map(group => {
          return (
            <ExpenseGroup
              key={group.id}
              type={type}
              group={group}
              showBudgetedCol={showBudgetedCol}
              gestures={gestures}
              month={month}
              editMode={editMode}
              onEditGroup={onEditGroup}
              onEditCategory={onEditCategory}
              onSaveCategory={onSaveCategory}
              onDeleteCategory={onDeleteCategory}
              onAddCategory={onAddCategory}
              onReorderCategory={onReorderCategory}
              onReorderGroup={onReorderGroup}
              onBudgetAction={onBudgetAction}
              show3Cols={show3Cols}
              showHiddenCategories={showHiddenCategories}
              collapsed={collapsedGroupIds.includes(group.id)}
              onToggleCollapse={onToggleCollapse}
            />
          );
        })}

      {incomeGroup && (
        <IncomeGroup
          group={incomeGroup}
          month={month}
          showHiddenCategories={showHiddenCategories}
          onEditGroup={onEditGroup}
          onEditCategory={onEditCategory}
          onBudgetAction={onBudgetAction}
          isCollapsed={collapsedGroupIds.includes(incomeGroup.id)}
          onToggleCollapse={onToggleCollapse}
        />
      )}
    </View>
  );
}

export function BudgetTable({
  type,
  categoryGroups,
  month,
  monthBounds,
  // editMode,
  onPrevMonth,
  onNextMonth,
  onCurrentMonth,
  onSaveGroup,
  onDeleteGroup,
  onAddCategory,
  onSaveCategory,
  onDeleteCategory,
  onReorderCategory,
  onReorderGroup,
  onShowBudgetSummary,
  onBudgetAction,
  onRefresh,
  onEditGroup,
  onEditCategory,
  onOpenBudgetPageMenu,
  onOpenBudgetMonthMenu,
}) {
  const { t } = useTranslation();
  const { width } = useResponsive();
  const show3Cols = width >= 360;

  // let editMode = false; // neuter editMode -- sorry, not rewriting drag-n-drop right now

  const [showSpentColumn = false, setShowSpentColumnPref] = useLocalPref(
    'mobile.showSpentColumn',
  );

  function toggleSpentColumn() {
    setShowSpentColumnPref(!showSpentColumn);
  }

  const [showHiddenCategories = false] = useLocalPref(
    'budget.showHiddenCategories',
  );

  return (
    <Page
      padding={0}
      header={
        <MobilePageHeader
          title={
            <MonthSelector
              month={month}
              monthBounds={monthBounds}
              onOpenMonthMenu={onOpenBudgetMonthMenu}
              onPrevMonth={onPrevMonth}
              onNextMonth={onNextMonth}
            />
          }
          leftContent={
            <Button
              variant="bare"
              style={{ margin: 10 }}
              onPress={onOpenBudgetPageMenu}
              aria-label={t('Budget page menu')}
            >
              <SvgLogo
                style={{ color: theme.mobileHeaderText }}
                width="20"
                height="20"
              />
              <SvgCheveronRight
                style={{ flexShrink: 0, color: theme.mobileHeaderTextSubdued }}
                width="14"
                height="14"
              />
            </Button>
          }
          rightContent={
            <Button
              variant="bare"
              onPress={onCurrentMonth}
              aria-label={t('Today')}
              style={{ margin: 10 }}
            >
              {!monthUtils.isCurrentMonth(month) && (
                <SvgCalendar width={20} height={20} />
              )}
            </Button>
          }
        />
      }
    >
      <Banners month={month} onBudgetAction={onBudgetAction} />
      <BudgetTableHeader
        type={type}
        month={month}
        show3Cols={show3Cols}
        showSpentColumn={showSpentColumn}
        toggleSpentColumn={toggleSpentColumn}
        onShowBudgetSummary={onShowBudgetSummary}
      />
      <PullToRefresh onRefresh={onRefresh}>
        <View
          data-testid="budget-table"
          style={{
            backgroundColor: theme.pageBackground,
            paddingBottom: MOBILE_NAV_HEIGHT,
          }}
        >
          <BudgetGroups
            type={type}
            categoryGroups={categoryGroups}
            showBudgetedCol={!showSpentColumn}
            show3Cols={show3Cols}
            showHiddenCategories={showHiddenCategories}
            month={month}
            // gestures={gestures}
            // editMode={editMode}
            onEditGroup={onEditGroup}
            onEditCategory={onEditCategory}
            onSaveCategory={onSaveCategory}
            onDeleteCategory={onDeleteCategory}
            onAddCategory={onAddCategory}
            onSaveGroup={onSaveGroup}
            onDeleteGroup={onDeleteGroup}
            onReorderCategory={onReorderCategory}
            onReorderGroup={onReorderGroup}
            onBudgetAction={onBudgetAction}
          />
        </View>
      </PullToRefresh>
    </Page>
  );
}

function Banner({ type = 'info', children }) {
  return (
    <Card
      style={{
        height: 50,
        marginTop: 10,
        marginBottom: 10,
        padding: 10,
        justifyContent: 'center',
        backgroundColor:
          type === 'critical'
            ? theme.errorBackground
            : type === 'warning'
              ? theme.warningBackground
              : theme.noticeBackground,
      }}
    >
      {children}
    </Card>
  );
}

function UncategorizedTransactionsBanner(props) {
  const count = useSheetValue(uncategorizedCount());
  const navigate = useNavigate();

  if (count === null || count <= 0) {
    return null;
  }

  return (
    <GridListItem textValue="Uncategorized transactions banner" {...props}>
      <Banner type="warning">
        <View
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Trans count={count}>
            You have {{ count }} uncategorized transactions
          </Trans>
          <Button
            onPress={() => navigate('/accounts/uncategorized')}
            style={PILL_STYLE}
          >
            <Text>
              <Trans>Categorize</Trans>
            </Text>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function OverbudgetedBanner({ month, onBudgetAction, ...props }) {
  const { t } = useTranslation();
  const toBudgetAmount = useSheetValue(envelopeBudget.toBudget);
  const dispatch = useDispatch();
  const { showUndoNotification } = useUndo();
  const { list: categories } = useCategories();
  const categoriesById = groupById(categories);

  const openCoverOverbudgetedModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'cover',
          options: {
            title: t('Cover overbudgeted'),
            month,
            showToBeBudgeted: false,
            onSubmit: categoryId => {
              onBudgetAction(month, 'cover-overbudgeted', {
                category: categoryId,
              });
              showUndoNotification({
                message: t('Covered overbudgeted from {{categoryName}}', {
                  categoryName: categoriesById[categoryId].name,
                }),
              });
            },
          },
        },
      }),
    );
  }, [
    categoriesById,
    dispatch,
    month,
    onBudgetAction,
    showUndoNotification,
    t,
  ]);

  if (!toBudgetAmount || toBudgetAmount >= 0) {
    return null;
  }

  return (
    <GridListItem textValue="Overbudgeted banner" {...props}>
      <Banner type="critical">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <SvgArrowButtonDown1 style={{ width: 15, height: 15 }} />
              <Text>
                <Trans>You have budgeted more than your available funds</Trans>
              </Text>
            </View>
          </View>
          <Button onPress={openCoverOverbudgetedModal} style={PILL_STYLE}>
            <Trans>Cover</Trans>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function OverspendingBanner({ month, onBudgetAction, ...props }) {
  const { t } = useTranslation();

  const { list: categories, grouped: categoryGroups } = useCategories();
  const categoriesById = groupById(categories);

  const categoryBalanceBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        envelopeBudget.catBalance(category.id),
      ]),
    [categories],
  );

  const categoryCarryoverBindings = useMemo(
    () =>
      categories.map(category => [
        category.id,
        envelopeBudget.catCarryover(category.id),
      ]),
    [categories],
  );

  const [overspentByCategory, setOverspentByCategory] = useState({});
  const [carryoverFlagByCategory, setCarryoverFlagByCategory] = useState({});
  const sheetName = useContext(NamespaceContext);
  const spreadsheet = useSpreadsheet();

  useEffect(() => {
    const unbindList = [];
    for (const [categoryId, carryoverBinding] of categoryCarryoverBindings) {
      const unbind = spreadsheet.bind(sheetName, carryoverBinding, result => {
        const isRolloverEnabled = Boolean(result.value);
        if (isRolloverEnabled) {
          setCarryoverFlagByCategory(prev => ({
            ...prev,
            [categoryId]: result.value,
          }));
        } else {
          // Update to remove covered category.
          setCarryoverFlagByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryCarryoverBindings, sheetName, spreadsheet]);

  useEffect(() => {
    const unbindList = [];
    for (const [categoryId, balanceBinding] of categoryBalanceBindings) {
      const unbind = spreadsheet.bind(sheetName, balanceBinding, result => {
        if (result.value < 0) {
          setOverspentByCategory(prev => ({
            ...prev,
            [categoryId]: result.value,
          }));
        } else if (result.value === 0) {
          // Update to remove covered category.
          setOverspentByCategory(prev => {
            const { [categoryId]: _, ...rest } = prev;
            return rest;
          });
        }
      });
      unbindList.push(unbind);
    }

    return () => {
      unbindList.forEach(unbind => unbind());
    };
  }, [categoryBalanceBindings, sheetName, spreadsheet]);

  const dispatch = useDispatch();

  // Ignore those that has rollover enabled.
  const overspentCategoryIds = Object.keys(overspentByCategory).filter(
    id => !carryoverFlagByCategory[id],
  );

  const categoryGroupsToShow = useMemo(
    () =>
      categoryGroups
        .filter(g =>
          g.categories?.some(c => overspentCategoryIds.includes(c.id)),
        )
        .map(g => ({
          ...g,
          categories:
            g.categories?.filter(c => overspentCategoryIds.includes(c.id)) ||
            [],
        })),
    [categoryGroups, overspentCategoryIds],
  );

  const { showUndoNotification } = useUndo();

  const onOpenCoverCategoryModal = useCallback(
    categoryId => {
      const category = categoriesById[categoryId];
      dispatch(
        pushModal({
          modal: {
            name: 'cover',
            options: {
              title: category.name,
              month,
              categoryId: category.id,
              onSubmit: fromCategoryId => {
                onBudgetAction(month, 'cover-overspending', {
                  to: category.id,
                  from: fromCategoryId,
                });
                showUndoNotification({
                  message: t(
                    `Covered {{toCategoryName}} overspending from {{fromCategoryName}}.`,
                    {
                      toCategoryName: category.name,
                      fromCategoryName:
                        fromCategoryId === 'to-budget'
                          ? 'To Budget'
                          : categoriesById[fromCategoryId].name,
                    },
                  ),
                });
              },
            },
          },
        }),
      );
    },
    [categoriesById, dispatch, month, onBudgetAction, showUndoNotification, t],
  );

  const onOpenCategorySelectionModal = useCallback(() => {
    dispatch(
      pushModal({
        modal: {
          name: 'category-autocomplete',
          options: {
            title: t('Cover overspending'),
            month,
            categoryGroups: categoryGroupsToShow,
            showHiddenCategories: true,
            onSelect: onOpenCoverCategoryModal,
            clearOnSelect: true,
            closeOnSelect: false,
          },
        },
      }),
    );
  }, [categoryGroupsToShow, dispatch, month, onOpenCoverCategoryModal, t]);

  const numberOfOverspentCategories = overspentCategoryIds.length;
  const previousNumberOfOverspentCategories = usePrevious(
    numberOfOverspentCategories,
  );

  useEffect(() => {
    if (numberOfOverspentCategories < previousNumberOfOverspentCategories) {
      // Re-render the modal when the overspent categories are covered.
      dispatch(collapseModals({ rootModalName: 'category-autocomplete' }));
      onOpenCategorySelectionModal();

      // All overspent categories have been covered.
      if (numberOfOverspentCategories === 0) {
        dispatch(collapseModals({ rootModalName: 'category-autocomplete' }));
      }
    }
  }, [
    dispatch,
    onOpenCategorySelectionModal,
    numberOfOverspentCategories,
    previousNumberOfOverspentCategories,
  ]);

  if (numberOfOverspentCategories === 0) {
    return null;
  }

  return (
    <GridListItem textValue="Overspent banner" {...props}>
      <Banner type="critical">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Text>
              <Trans count={numberOfOverspentCategories}>
                You have {{ count: numberOfOverspentCategories }} overspent
                categories
              </Trans>
            </Text>
          </View>
          <Button onPress={onOpenCategorySelectionModal} style={PILL_STYLE}>
            <Trans>Cover</Trans>
          </Button>
        </View>
      </Banner>
    </GridListItem>
  );
}

function Banners({ month, onBudgetAction }) {
  const { t } = useTranslation();
  const [budgetType = 'rollover'] = useSyncedPref('budgetType');

  // Limit to rollover for now.
  if (budgetType !== 'rollover') {
    return null;
  }

  return (
    <GridList
      aria-label={t('Banners')}
      style={{ backgroundColor: theme.mobilePageBackground }}
    >
      <UncategorizedTransactionsBanner />
      <OverspendingBanner month={month} onBudgetAction={onBudgetAction} />
      <OverbudgetedBanner month={month} onBudgetAction={onBudgetAction} />
    </GridList>
  );
}

function BudgetTableHeader({
  show3Cols,
  type,
  month,
  onShowBudgetSummary,
  showSpentColumn,
  toggleSpentColumn,
}) {
  const { t } = useTranslation();
  const format = useFormat();
  const buttonStyle = {
    padding: 0,
    backgroundColor: 'transparent',
    borderRadius: 'unset',
  };
  const sidebarColumnWidth = getColumnWidth({ show3Cols, isSidebar: true });
  const columnWidth = getColumnWidth({ show3Cols });

  const amountStyle = {
    color: theme.formInputText,
    textAlign: 'right',
    fontSize: 12,
    fontWeight: '500',
  };

  return (
    <View
      data-testid="budget-table-header"
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        padding: '10px 15px',
        paddingLeft: 10,
        backgroundColor: monthUtils.isCurrentMonth(month)
          ? theme.budgetHeaderCurrentMonth
          : theme.budgetHeaderOtherMonth,
        borderBottomWidth: 1,
        borderColor: theme.tableBorder,
      }}
    >
      <View
        style={{
          width: sidebarColumnWidth,
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
        }}
      >
        {type === 'report' ? (
          <Saved
            projected={month >= monthUtils.currentMonth()}
            onPress={onShowBudgetSummary}
            show3Cols={show3Cols}
          />
        ) : (
          <ToBudget
            toBudget={envelopeBudget.toBudget}
            onPress={onShowBudgetSummary}
            show3Cols={show3Cols}
          />
        )}
      </View>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          alignItems: 'center',
        }}
      >
        {(show3Cols || !showSpentColumn) && (
          <CellValue
            binding={
              type === 'report'
                ? trackingBudget.totalBudgetedExpense
                : envelopeBudget.totalBudgeted
            }
            type="financial"
          >
            {({ type: formatType, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Cols}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Cols && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title={t('Budgeted')}
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(type === 'report' ? value : -value, formatType)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        {(show3Cols || showSpentColumn) && (
          <CellValue
            binding={
              type === 'report'
                ? trackingBudget.totalSpent
                : envelopeBudget.totalSpent
            }
            type="financial"
          >
            {({ type, value }) => (
              <Button
                variant="bare"
                isDisabled={show3Cols}
                onPress={toggleSpentColumn}
                style={{
                  ...buttonStyle,
                  width: columnWidth,
                }}
              >
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    {!show3Cols && (
                      <SvgViewShow
                        width={12}
                        height={12}
                        style={{
                          flexShrink: 0,
                          color: theme.pageTextSubdued,
                          marginRight: 5,
                        }}
                      />
                    )}
                    <Label
                      title={t('Spent')}
                      style={{ color: theme.formInputText, paddingRight: 4 }}
                    />
                  </View>
                  <View>
                    <PrivacyFilter>
                      <AutoTextSize
                        key={value}
                        as={Text}
                        minFontSizePx={6}
                        maxFontSizePx={12}
                        mode="oneline"
                        style={{
                          ...amountStyle,
                          paddingRight: 4,
                        }}
                      >
                        {format(value, type)}
                      </AutoTextSize>
                    </PrivacyFilter>
                  </View>
                </View>
              </Button>
            )}
          </CellValue>
        )}
        <CellValue
          binding={
            type === 'report'
              ? trackingBudget.totalLeftover
              : envelopeBudget.totalBalance
          }
          type="financial"
        >
          {({ type, value }) => (
            <View style={{ width: columnWidth }}>
              <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Label
                  title={t('Balance')}
                  style={{ color: theme.formInputText }}
                />
                <View>
                  <PrivacyFilter>
                    <AutoTextSize
                      key={value}
                      as={Text}
                      minFontSizePx={6}
                      maxFontSizePx={12}
                      mode="oneline"
                      style={{
                        ...amountStyle,
                      }}
                    >
                      {format(value, type)}
                    </AutoTextSize>
                  </PrivacyFilter>
                </View>
              </View>
            </View>
          )}
        </CellValue>
      </View>
    </View>
  );
}

function MonthSelector({
  month,
  monthBounds,
  onOpenMonthMenu,
  onPrevMonth,
  onNextMonth,
}) {
  const locale = useLocale();
  const { t } = useTranslation();
  const prevEnabled = month > monthBounds.start;
  const nextEnabled = month < monthUtils.subMonths(monthBounds.end, 1);

  const arrowButtonStyle = {
    padding: 10,
    margin: 2,
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'row',
      }}
    >
      <Button
        aria-label={t('Previous month')}
        variant="bare"
        onPress={() => {
          if (prevEnabled) {
            onPrevMonth();
          }
        }}
        style={{ ...arrowButtonStyle, opacity: prevEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinLeft width="15" height="15" />
      </Button>
      <Button
        variant="bare"
        style={{
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}
        onPress={() => {
          onOpenMonthMenu?.(month);
        }}
        data-month={month}
      >
        <Text style={styles.underlinedText}>
          {monthUtils.format(month, 'MMMM ‘yy', locale)}
        </Text>
      </Button>
      <Button
        aria-label={t('Next month')}
        variant="bare"
        onPress={() => {
          if (nextEnabled) {
            onNextMonth();
          }
        }}
        style={{ ...arrowButtonStyle, opacity: nextEnabled ? 1 : 0.6 }}
      >
        <SvgArrowThinRight width="15" height="15" />
      </Button>
    </View>
  );
}
