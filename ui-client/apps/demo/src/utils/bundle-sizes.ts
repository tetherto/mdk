/**
 * Verified Bundle Sizes (minified + gzipped)
 * Source: bundlephobia.com
 * Verified: February 24, 2026
 */

export type BundleSizeData = {
  formik: {
    gzip: number
    version: string
  }
  yup: {
    gzip: number
    version: string
  }
  reactHookForm: {
    gzip: number
    version: string
  }
  zod: {
    gzip: number
    version: string
  }
}

/**
 * Verified bundle sizes from bundlephobia.com
 * These are actual production bundle sizes (minified + gzipped)
 */
export const VERIFIED_BUNDLE_SIZES: BundleSizeData = {
  formik: {
    gzip: 13122, // 12.8 kB
    version: '2.4.x',
  },
  yup: {
    gzip: 13452, // 13.1 kB
    version: '1.6.x',
  },
  reactHookForm: {
    gzip: 11530, // 11.3 kB
    version: '7.x',
  },
  zod: {
    gzip: 58449, // 57.1 kB
    version: '3.x',
  },
}

/**
 * Format bytes to KB with 1 decimal place
 */
export function formatKB(bytes: number): string {
  return (bytes / 1024).toFixed(1)
}

/**
 * Get formatted bundle size strings
 */
export function getFormattedBundleSizes(): {
  formik: { total: string; details: string; bytes: number }
  reactHookForm: { total: string; details: string; bytes: number }
  comparison: { difference: number; percentageIncrease: number }
} {
  const formikTotal = VERIFIED_BUNDLE_SIZES.formik.gzip + VERIFIED_BUNDLE_SIZES.yup.gzip
  const rhfTotal = VERIFIED_BUNDLE_SIZES.reactHookForm.gzip + VERIFIED_BUNDLE_SIZES.zod.gzip

  return {
    formik: {
      total: `${formatKB(formikTotal)}kB`,
      details: `Formik ${formatKB(VERIFIED_BUNDLE_SIZES.formik.gzip)}kB + Yup ${formatKB(VERIFIED_BUNDLE_SIZES.yup.gzip)}kB`,
      bytes: formikTotal,
    },
    reactHookForm: {
      total: `${formatKB(rhfTotal)}kB`,
      details: `React Hook Form ${formatKB(VERIFIED_BUNDLE_SIZES.reactHookForm.gzip)}kB + Zod ${formatKB(VERIFIED_BUNDLE_SIZES.zod.gzip)}kB`,
      bytes: rhfTotal,
    },
    comparison: {
      difference: rhfTotal - formikTotal,
      percentageIncrease: ((rhfTotal - formikTotal) / formikTotal) * 100,
    },
  }
}
