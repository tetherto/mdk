/**
 * Runnable example for Slider (Radix Slider re-export).
 */
import { useState } from 'react'
import { Slider } from '@tetherto/mdk-react-devkit'

export const SliderExample = () => {
  const [value, setValue] = useState([60])
  const [range, setRange] = useState([20, 80])

  return (
    <div className="mdk-example-col">
      <div>
        <p>Fan Speed: {value[0]}%</p>
        <Slider.Root
          value={value}
          onValueChange={setValue}
          min={0}
          max={100}
          step={1}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            userSelect: 'none',
            width: '300px',
            height: '20px',
          }}
        >
          <Slider.Track
            style={{
              position: 'relative',
              flexGrow: 1,
              borderRadius: '9999px',
              height: '4px',
              background: 'var(--mdk-color-bg-tertiary)',
            }}
          >
            <Slider.Range
              style={{
                position: 'absolute',
                height: '100%',
                borderRadius: '9999px',
                background: 'var(--mdk-color-primary)',
              }}
            />
          </Slider.Track>
          <Slider.Thumb
            style={{
              display: 'block',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--mdk-color-primary)',
            }}
            aria-label="Fan speed"
          />
        </Slider.Root>
      </div>

      <div>
        <p>
          Hash Rate Range: {range[0]}–{range[1]} TH/s
        </p>
        <Slider.Root
          value={range}
          onValueChange={setRange}
          min={0}
          max={100}
          step={5}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            userSelect: 'none',
            width: '300px',
            height: '20px',
          }}
        >
          <Slider.Track
            style={{
              position: 'relative',
              flexGrow: 1,
              borderRadius: '9999px',
              height: '4px',
              background: 'var(--mdk-color-bg-tertiary)',
            }}
          >
            <Slider.Range
              style={{
                position: 'absolute',
                height: '100%',
                borderRadius: '9999px',
                background: 'var(--mdk-color-primary)',
              }}
            />
          </Slider.Track>
          <Slider.Thumb
            style={{
              display: 'block',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--mdk-color-primary)',
            }}
            aria-label="Min hash rate"
          />
          <Slider.Thumb
            style={{
              display: 'block',
              width: '16px',
              height: '16px',
              borderRadius: '50%',
              background: 'var(--mdk-color-primary)',
            }}
            aria-label="Max hash rate"
          />
        </Slider.Root>
      </div>
    </div>
  )
}
