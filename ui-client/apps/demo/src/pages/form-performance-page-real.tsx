import { Button, Card, Spinner } from '@mdk/core'
import { useEffect, useRef, useState } from 'react'
import type { RealBenchmarkResult } from '../utils/real-form-benchmark'
import { ReactHookFormTestComponent, runRealFormBenchmark } from '../utils/real-form-benchmark'
import { useDemoToast } from '../utils/use-demo-toast'
import styles from './form-performance-page-real.module.css'

const InfoCard = ({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}): React.ReactElement => {
  return (
    <Card className={styles.infoCard}>
      <h3 className={styles.infoCardTitle}>{title}</h3>
      {children}
    </Card>
  )
}

const MetricRow = ({
  label,
  value,
  highlight,
}: {
  label: string
  value: string
  highlight?: boolean
}): React.ReactElement => {
  return (
    <div className={styles.metricRow}>
      <span className={styles.metricLabel}>{label}</span>
      <span className={highlight ? styles.metricValueHighlight : styles.metricValue}>{value}</span>
    </div>
  )
}

export const FormPerformancePageReal = (): React.ReactElement => {
  const { showToast, ToasterSlot } = useDemoToast()
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<RealBenchmarkResult | null>(null)
  const [runCount, setRunCount] = useState(0)
  const [mountTestComponent, setMountTestComponent] = useState(false)
  const [isLoadedFromStorage, setIsLoadedFromStorage] = useState(false)
  const renderCountRef = useRef<number>(0)
  const cachedResultsRef = useRef<RealBenchmarkResult | null>(null)

  // Load cached results from localStorage on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('form-benchmark-results')
      if (cached) {
        const parsedResults = JSON.parse(cached) as RealBenchmarkResult
        setResults(parsedResults)
        cachedResultsRef.current = parsedResults
        setIsLoadedFromStorage(true)
      }
    } catch (error) {
      console.warn('Failed to load cached benchmark results:', error)
    }
  }, [])

  const runBenchmark = async (): Promise<void> => {
    setLoading(true)
    setResults(null)

    try {
      // If we have cached results, just display them instantly
      if (cachedResultsRef.current) {
        // Small delay to show loading animation
        await new Promise((resolve) => setTimeout(resolve, 200))
        setResults(cachedResultsRef.current)
        setRunCount((prev) => prev + 1)
        return
      }

      // First run: actually measure performance
      renderCountRef.current = 0

      // Small delay to show loading state
      await new Promise((resolve) => setTimeout(resolve, 300))

      // Mount the test component to count ACTUAL React renders
      setMountTestComponent(true)

      // Wait for component to mount and complete lifecycle
      await new Promise((resolve) => setTimeout(resolve, 100))

      // Unmount the test component
      setMountTestComponent(false)

      // Run benchmark with actual measured render count
      const benchmarkResults = await runRealFormBenchmark(renderCountRef.current)

      // Cache the results for instant subsequent runs
      cachedResultsRef.current = benchmarkResults

      // Save to localStorage for persistence across page reloads
      try {
        localStorage.setItem('form-benchmark-results', JSON.stringify(benchmarkResults))
      } catch (error) {
        console.warn('Failed to save benchmark results to localStorage:', error)
      }

      setResults(benchmarkResults)
      setRunCount((prev) => prev + 1)
      setIsLoadedFromStorage(false) // Mark as fresh run
    } catch (error) {
      console.error('Benchmark failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRenderCount = (count: number): void => {
    renderCountRef.current = count
  }

  const handleClearCache = (): void => {
    cachedResultsRef.current = null
    setResults(null)
    setRunCount(0)
    setIsLoadedFromStorage(false)

    // Clear localStorage
    try {
      localStorage.removeItem('form-benchmark-results')
    } catch (error) {
      console.warn('Failed to clear localStorage:', error)
    }

    showToast('Cache cleared! Next run will re-measure performance.', { variant: 'info' })
  }

  return (
    <div className={styles.container}>
      {/* Hidden test component for render counting */}
      {mountTestComponent && <ReactHookFormTestComponent onRenderCount={handleRenderCount} />}

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.headerTitle}>Form Performance Benchmark</h1>
        <p className={styles.headerDescription}>
          Real measurements of React Hook Form + Zod vs. documented Formik + Yup behavior
        </p>
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <div className={styles.actionsRow}>
          <Button onClick={runBenchmark} disabled={loading} variant="primary">
            {loading
              ? 'Running...'
              : runCount === 0 && !isLoadedFromStorage
                ? 'Run Benchmark'
                : 'Run Again'}
          </Button>
          {(runCount > 0 || isLoadedFromStorage) && (
            <>
              {runCount > 0 && <span className={styles.testsRunText}>Tests run: {runCount}</span>}
              {cachedResultsRef.current && (
                <Button onClick={handleClearCache} variant="secondary">
                  Clear Cache & Re-measure
                </Button>
              )}
            </>
          )}
        </div>
        {isLoadedFromStorage && runCount === 0 && (
          <div className={styles.cacheMessageLoaded}>
            💾 Results loaded from previous session. Click "Run Again" for instant replay, or "Clear
            Cache" to re-measure.
          </div>
        )}
        {cachedResultsRef.current && runCount > 0 && !isLoadedFromStorage && (
          <div className={styles.cacheMessageCached}>
            ⚡ Results cached. Click "Run Again" for instant replay, or "Clear Cache" to re-measure
            renders.
          </div>
        )}
      </div>

      {/* Loading State */}
      {loading && (
        <div className={styles.loadingContainer}>
          <Spinner />
          <span className={styles.loadingText}>Measuring performance...</span>
        </div>
      )}

      {/* Results */}
      {!loading && results && (
        <div className={styles.results}>
          {/* Summary Card */}
          <Card className={styles.summaryCard}>
            <h2 className={styles.summaryTitle}>Key Performance Improvements</h2>
            <div className={styles.summaryContent}>
              <div className={styles.summaryLabel}>Re-render Reduction</div>
              <div className={styles.summaryValue}>
                {results.comparison.renderReduction?.split(' ')[0] || 'N/A'}
              </div>
              <div className={styles.summaryDescription}>
                fewer component renders - the main performance benefit!
              </div>
            </div>
          </Card>

          {/* Measured React Hook Form Performance */}
          <InfoCard title="React Hook Form + Zod (Measured)">
            <div className={styles.metricsContainer}>
              <MetricRow
                label="Initialization Time"
                value={`${results.reactHookForm.measured.initializationTime.toFixed(3)}ms`}
              />
              <MetricRow
                label="Field Update Time"
                value={`${results.reactHookForm.measured.fieldUpdateTime.toFixed(3)}ms`}
              />
              <MetricRow
                label="Validation Time (Zod)"
                value={`${results.reactHookForm.measured.validationTime.toFixed(3)}ms`}
              />
              <MetricRow
                label="Total Renders (Full Lifecycle)"
                value={`${results.reactHookForm.measured.totalRenderCount} renders`}
                highlight
              />
              <MetricRow
                label="Bundle Size (gzipped)"
                value={results.reactHookForm.measured.bundleSize}
              />
            </div>
            <div className={styles.methodology}>
              Methodology: {results.reactHookForm.methodology}
              <br />
              Bundle sizes: ✓ Verified from bundlephobia.com (
              {results.bundleSizeSource.verificationDate})
            </div>
          </InfoCard>

          {/* Documented Formik Behavior */}
          <InfoCard title="Formik + Yup (Documented Behavior)">
            <div className={styles.metricsContainer}>
              <MetricRow
                label="Total Renders (Estimated)"
                value={`${results.formik.documented.renderCountMultiplier} renders`}
              />
              <MetricRow
                label="Validates On Change"
                value={results.formik.documented.validatesOnChange ? 'Yes ✓' : 'No'}
              />
              <MetricRow
                label="Controlled Inputs"
                value={results.formik.documented.controlledInputs ? 'Yes (State-based)' : 'No'}
              />
              <MetricRow
                label="Bundle Size (gzipped)"
                value={results.formik.documented.bundleSize}
              />
            </div>
          </InfoCard>

          {/* Architectural Benefits */}
          <InfoCard title="Why React Hook Form is Faster">
            <ul className={styles.benefitsList}>
              {results.comparison.architecturalBenefits.map((benefit, idx) => (
                <li key={idx} className={styles.benefitsItem}>
                  {benefit}
                </li>
              ))}
            </ul>
          </InfoCard>

          {/* Comparison Details */}
          <InfoCard title="Detailed Comparison">
            <div className={styles.comparisonGrid}>
              <div className={styles.comparisonSection}>
                <h4 className={styles.comparisonTitle}>Render Performance ⚡ Main Benefit</h4>
                <p className={styles.comparisonValue}>{results.comparison.renderReduction}</p>
                <p className={styles.comparisonDescription}>
                  React Hook Form's uncontrolled inputs eliminate unnecessary re-renders,
                  dramatically reducing component updates during form interaction. This is the
                  primary performance advantage.
                </p>
              </div>
              <div className={styles.comparisonSection}>
                <h4 className={styles.comparisonTitle}>Bundle Size (Honest Comparison)</h4>
                <p className={styles.comparisonValue}>{results.comparison.bundleSizeComparison}</p>
                <p className={styles.comparisonDescription}>{results.comparison.bundleSizeNote}</p>
              </div>
            </div>
          </InfoCard>

          {/* Disclaimer */}
          <Card className={styles.disclaimer}>
            <div className={styles.disclaimerText}>
              <strong>Note:</strong> React Hook Form metrics are measured directly using the
              browser's Performance API with actual React render counting. Formik metrics are based
              on documented behavior from official React Hook Form performance comparisons. Bundle
              sizes are verified from bundlephobia.com ({results.bundleSizeSource.verificationDate}
              ).
            </div>
          </Card>
        </div>
      )}
      <ToasterSlot />
    </div>
  )
}

export default FormPerformancePageReal
