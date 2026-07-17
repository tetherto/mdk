import { useFinancialDateRange } from '@tetherto/mdk-react-devkit'

const FinancialDateRangeDisplay = () => {
  const { dateRange } = useFinancialDateRange({ defaultPeriod: 'monthly' as never })
  return (
    <div className="mdk-example-row">
      <pre>{JSON.stringify(dateRange, null, 2)}</pre>
    </div>
  )
}

export const UseFinancialDateRangeExample = () => <FinancialDateRangeDisplay />
