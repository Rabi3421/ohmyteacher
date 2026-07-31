import React from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  CreateDiscountDefinitionInput,
  CreateFeeHeadInput,
  CreateFineRuleInput,
  DiscountCategory,
  FeeApplicability,
  FeeFrequency,
  FeeHead,
  FeeStructureItemInput,
  FineRule,
} from '../../models/fee';
import type { FeeFormErrors } from '../../utils/feeValidation';
import { AppButton } from '../common/AppButton';
import { AppInput } from '../common/AppInput';
import { AppText } from '../common/AppText';

export function FeeHeadFormFields({
  value,
  onChange,
  errors = {},
  disabled,
}: {
  value: CreateFeeHeadInput;
  onChange: (value: CreateFeeHeadInput) => void;
  errors?: FeeFormErrors;
  disabled?: boolean;
}) {
  return (
    <View style={styles.fields}>
      <AppInput
        disabled={disabled}
        error={errors.name}
        label="Fee Head Name"
        onChangeText={name => onChange({ ...value, name })}
        required
        value={value.name}
      />
      <AppInput
        autoCapitalize="characters"
        disabled={disabled}
        error={errors.code}
        label="Fee Head Code"
        onChangeText={code => onChange({ ...value, code })}
        required
        value={value.code}
      />
      <AppInput
        disabled={disabled}
        label="Description"
        multiline
        onChangeText={description => onChange({ ...value, description })}
        value={value.description ?? ''}
      />
      <AppText variant="label">Type</AppText>
      <View style={styles.options}>
        {(['RECURRING', 'ONE_TIME'] as const).map(type => (
          <AppButton
            key={type}
            onPress={() =>
              onChange({
                ...value,
                defaultFrequency:
                  type === 'ONE_TIME' ? 'ONE_TIME' : 'MONTHLY',
                type,
              })
            }
            title={type.replace('_', ' ')}
            variant={value.type === type ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppText variant="label">Default Frequency</AppText>
      <View style={styles.options}>
        {(
          [
            'MONTHLY',
            'QUARTERLY',
            'HALF_YEARLY',
            'YEARLY',
            'ONE_TIME',
          ] as FeeFrequency[]
        ).map(frequency => (
          <AppButton
            disabled={
              disabled ||
              (value.type === 'ONE_TIME' && frequency !== 'ONE_TIME') ||
              (value.type === 'RECURRING' && frequency === 'ONE_TIME')
            }
            key={frequency}
            onPress={() => onChange({ ...value, defaultFrequency: frequency })}
            title={frequency.replace('_', ' ')}
            variant={
              value.defaultFrequency === frequency ? 'primary' : 'outline'
            }
          />
        ))}
      </View>
      <AppInput
        disabled={disabled}
        error={errors.displayOrder}
        keyboardType="number-pad"
        label="Display Order"
        onChangeText={text =>
          onChange({ ...value, displayOrder: Number(text) || 0 })
        }
        value={String(value.displayOrder || '')}
      />
      <View style={styles.options}>
        <AppButton
          onPress={() =>
            onChange({
              ...value,
              mandatoryByDefault: !value.mandatoryByDefault,
            })
          }
          title="Mandatory by Default"
          variant={value.mandatoryByDefault ? 'primary' : 'outline'}
        />
        <AppButton
          onPress={() => onChange({ ...value, refundable: !value.refundable })}
          title="Refundable"
          variant={value.refundable ? 'primary' : 'outline'}
        />
        <AppButton
          onPress={() =>
            onChange({
              ...value,
              status: value.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
            })
          }
          title={value.status}
          variant={value.status === 'ACTIVE' ? 'primary' : 'outline'}
        />
      </View>
    </View>
  );
}

export function FeeStructureItemEditor({
  item,
  head,
  fineRules = [],
  onChange,
  onRemove,
}: {
  item: FeeStructureItemInput;
  head: FeeHead;
  fineRules?: FineRule[];
  onChange: (item: FeeStructureItemInput) => void;
  onRemove: () => void;
}) {
  return (
    <View style={styles.editor}>
      <View style={styles.row}>
        <AppText style={styles.flex} variant="title">
          {head.name}
        </AppText>
        <AppButton onPress={onRemove} title="Remove" variant="ghost" />
      </View>
      <AppInput
        keyboardType="decimal-pad"
        label="Amount"
        onChangeText={text => onChange({ ...item, amount: Number(text) || 0 })}
        value={String(item.amount || '')}
      />
      <AppText variant="label">Frequency</AppText>
      <View style={styles.options}>
        {(
          head.type === 'ONE_TIME'
            ? ['ONE_TIME']
            : ['MONTHLY', 'QUARTERLY', 'HALF_YEARLY', 'YEARLY']
        ).map(value => {
          const frequency = value as FeeFrequency;
          return (
            <AppButton
              key={frequency}
              onPress={() => onChange({ ...item, frequency })}
              title={frequency.replace('_', ' ')}
              variant={item.frequency === frequency ? 'primary' : 'outline'}
            />
          );
        })}
      </View>
      <AppText variant="label">Applicability</AppText>
      <View style={styles.options}>
        {(
          [
            'ALL_STUDENTS',
            'OPTIONAL_SELECTION',
            'MANUAL_ASSIGNMENT',
          ] as FeeApplicability[]
        ).map(applicability => (
          <AppButton
            key={applicability}
            onPress={() => onChange({ ...item, applicability })}
            title={applicability.replace('_', ' ')}
            variant={item.applicability === applicability ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppButton
        onPress={() => onChange({ ...item, mandatory: !item.mandatory })}
        title={item.mandatory ? 'Mandatory' : 'Optional'}
        variant={item.mandatory ? 'primary' : 'outline'}
      />
      <AppText variant="label">Due Rule</AppText>
      <View style={styles.options}>
        <AppButton
          onPress={() =>
            onChange({
              ...item,
              dueRule: { day: 10, type: 'FIXED_DAY_OF_PERIOD' },
            })
          }
          title="Fixed Day"
          variant={
            item.dueRule.type === 'FIXED_DAY_OF_PERIOD'
              ? 'primary'
              : 'outline'
          }
        />
        <AppButton
          onPress={() =>
            onChange({
              ...item,
              dueRule: { date: '', type: 'FIXED_DATE' },
            })
          }
          title="Fixed Date"
          variant={item.dueRule.type === 'FIXED_DATE' ? 'primary' : 'outline'}
        />
      </View>
      {item.dueRule.type === 'FIXED_DAY_OF_PERIOD' ? (
        <AppInput
          keyboardType="number-pad"
          label="Due Day (1–28)"
          onChangeText={text =>
            onChange({
              ...item,
              dueRule: {
                day: Number(text) || 0,
                type: 'FIXED_DAY_OF_PERIOD',
              },
            })
          }
          value={String(item.dueRule.day || '')}
        />
      ) : (
        <AppInput
          helperText="YYYY-MM-DD"
          label="Due Date"
          onChangeText={date =>
            onChange({ ...item, dueRule: { date, type: 'FIXED_DATE' } })
          }
          value={item.dueRule.date}
        />
      )}
      {item.frequency === 'MONTHLY' ? (
        <AppInput
          helperText="Comma-separated month numbers in academic order"
          label="Applicable Months"
          onChangeText={text =>
            onChange({
              ...item,
              applicableMonths: text
                .split(',')
                .map(value => Number(value.trim()))
                .filter(Boolean),
            })
          }
          value={(item.applicableMonths ?? []).join(',')}
        />
      ) : null}
      {item.frequency !== 'MONTHLY' && item.frequency !== 'ONE_TIME' ? (
        <AppInput
          keyboardType="number-pad"
          label="Installment Count"
          onChangeText={text =>
            onChange({ ...item, installmentCount: Number(text) || 0 })
          }
          value={String(item.installmentCount ?? '')}
        />
      ) : null}
      <AppText variant="label">Fine Rule (optional)</AppText>
      <View style={styles.options}>
        <AppButton
          onPress={() => onChange({ ...item, fineRuleId: undefined })}
          title="None"
          variant={!item.fineRuleId ? 'primary' : 'outline'}
        />
        {fineRules
          .filter(rule => rule.status === 'ACTIVE')
          .map(rule => (
            <AppButton
              key={rule.id}
              onPress={() => onChange({ ...item, fineRuleId: rule.id })}
              title={rule.name}
              variant={item.fineRuleId === rule.id ? 'primary' : 'outline'}
            />
          ))}
      </View>
      <AppInput
        keyboardType="number-pad"
        label="Display Order"
        onChangeText={text =>
          onChange({ ...item, displayOrder: Number(text) || 0 })
        }
        value={String(item.displayOrder)}
      />
    </View>
  );
}

export function DiscountFormFields({
  value,
  onChange,
  errors = {},
}: {
  value: CreateDiscountDefinitionInput;
  onChange: (value: CreateDiscountDefinitionInput) => void;
  errors?: FeeFormErrors;
}) {
  return (
    <View style={styles.fields}>
      <AppInput
        error={errors.name}
        label="Discount Name"
        onChangeText={name => onChange({ ...value, name })}
        value={value.name}
      />
      <AppInput
        error={errors.code}
        label="Code"
        onChangeText={code => onChange({ ...value, code })}
        value={value.code}
      />
      <View style={styles.options}>
        {(['FIXED', 'PERCENTAGE'] as const).map(type => (
          <AppButton
            key={type}
            onPress={() => onChange({ ...value, type })}
            title={type}
            variant={value.type === type ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppText variant="label">Category</AppText>
      <View style={styles.options}>
        {(
          [
            'SCHOLARSHIP',
            'SIBLING',
            'STAFF_CHILD',
            'MERIT',
            'MANUAL',
            'OTHER',
          ] as DiscountCategory[]
        ).map(category => (
          <AppButton
            key={category}
            onPress={() => onChange({ ...value, category })}
            title={category.replace('_', ' ')}
            variant={value.category === category ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppInput
        error={errors.value}
        keyboardType="decimal-pad"
        label={value.type === 'FIXED' ? 'Amount' : 'Percentage'}
        onChangeText={text => onChange({ ...value, value: Number(text) || 0 })}
        value={String(value.value || '')}
      />
      <AppInput
        error={errors.maximumAmount}
        keyboardType="decimal-pad"
        label="Maximum Amount"
        onChangeText={text =>
          onChange({
            ...value,
            maximumAmount: text ? Number(text) : undefined,
          })
        }
        value={value.maximumAmount?.toString() ?? ''}
      />
      <AppInput
        helperText="Comma-separated Fee Head IDs; blank means all"
        label="Applicable Fee Heads"
        onChangeText={text =>
          onChange({
            ...value,
            applicableFeeHeadIds: text
              .split(',')
              .map(item => item.trim())
              .filter(Boolean),
          })
        }
        value={value.applicableFeeHeadIds.join(',')}
      />
      <AppInput
        error={errors.startDate}
        label="Start Date"
        onChangeText={startDate => onChange({ ...value, startDate })}
        value={value.startDate}
      />
      <AppInput
        error={errors.endDate}
        label="End Date"
        onChangeText={endDate =>
          onChange({ ...value, endDate: endDate || undefined })
        }
        value={value.endDate ?? ''}
      />
      <AppButton
        onPress={() =>
          onChange({ ...value, reasonRequired: !value.reasonRequired })
        }
        title="Reason Required"
        variant={value.reasonRequired ? 'primary' : 'outline'}
      />
    </View>
  );
}

export function FineRuleFormFields({
  value,
  onChange,
  errors = {},
}: {
  value: CreateFineRuleInput;
  onChange: (value: CreateFineRuleInput) => void;
  errors?: FeeFormErrors;
}) {
  return (
    <View style={styles.fields}>
      <AppInput
        error={errors.name}
        label="Fine Rule Name"
        onChangeText={name => onChange({ ...value, name })}
        value={value.name}
      />
      <AppInput
        error={errors.code}
        label="Code"
        onChangeText={code => onChange({ ...value, code })}
        value={value.code}
      />
      <View style={styles.options}>
        {(
          ['FIXED_AFTER_DUE', 'DAILY_AFTER_DUE', 'SLAB_BASED'] as const
        ).map(type => (
          <AppButton
            key={type}
            onPress={() => onChange({ ...value, type })}
            title={type.split('_').join(' ')}
            variant={value.type === type ? 'primary' : 'outline'}
          />
        ))}
      </View>
      <AppInput
        error={errors.graceDays}
        keyboardType="number-pad"
        label="Grace Days"
        onChangeText={text =>
          onChange({ ...value, graceDays: Number(text) || 0 })
        }
        value={String(value.graceDays)}
      />
      {value.type === 'FIXED_AFTER_DUE' ? (
        <AppInput
          error={errors.fixedAmount}
          keyboardType="decimal-pad"
          label="Fixed Amount"
          onChangeText={text =>
            onChange({ ...value, fixedAmount: Number(text) || 0 })
          }
          value={String(value.fixedAmount ?? '')}
        />
      ) : null}
      {value.type === 'DAILY_AFTER_DUE' ? (
        <AppInput
          error={errors.dailyAmount}
          keyboardType="decimal-pad"
          label="Daily Amount"
          onChangeText={text =>
            onChange({ ...value, dailyAmount: Number(text) || 0 })
          }
          value={String(value.dailyAmount ?? '')}
        />
      ) : null}
      <AppInput
        error={errors.maximumAmount}
        keyboardType="decimal-pad"
        label="Maximum Amount"
        onChangeText={text =>
          onChange({
            ...value,
            maximumAmount: text ? Number(text) : undefined,
          })
        }
        value={value.maximumAmount?.toString() ?? ''}
      />
      {value.type === 'SLAB_BASED' ? (
        <AppInput
          error={errors.slabs}
          helperText="Example: 1-10:50,11-20:100,21+:200"
          label="Fine Slabs"
          onChangeText={text =>
            onChange({
              ...value,
              slabs: text
                .split(',')
                .map(chunk => {
                  const [range, amount] = chunk.split(':');
                  const [from, to] = (range ?? '').split('-');
                  return {
                    amount: Number(amount) || 0,
                    fromDay: Number(from) || 0,
                    toDay:
                      !to || to.includes('+') ? undefined : Number(to) || 0,
                  };
                })
                .filter(item => item.fromDay > 0),
            })
          }
          value={(value.slabs ?? [])
            .map(
              item =>
                `${item.fromDay}-${item.toDay ?? '+'}:${item.amount}`,
            )
            .join(',')}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 12 },
  fields: { gap: 15 },
  flex: { flex: 1 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  row: { alignItems: 'center', flexDirection: 'row', gap: 8 },
});
