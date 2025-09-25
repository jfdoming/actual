import {
  type AverageTemplate,
  type CopyTemplate,
  type PercentageTemplate,
  type ScheduleTemplate,
  type PeriodicTemplate,
  type LimitTemplate,
} from 'loot-core/types/models/templates';

export const displayTemplateTypes = [
  ['cap', 'Cap and refill'] as const,
  ['week', 'Fixed (weekly)'] as const,
  ['schedule', 'Existing schedule'] as const,
  ['percentage', 'Percent of category'] as const,
  ['historical', 'Copy past budgets'] as const,
];

export type DisplayTemplateType = (typeof displayTemplateTypes)[number][0];

export type ReducerState =
  | {
      template: LimitTemplate;
      displayType: 'cap';
    }
  | {
      template: PeriodicTemplate;
      displayType: 'week';
    }
  | {
      template: ScheduleTemplate;
      displayType: 'schedule';
    }
  | {
      template: PercentageTemplate;
      displayType: 'percentage';
    }
  | {
      template: CopyTemplate | AverageTemplate;
      displayType: 'historical';
    };
