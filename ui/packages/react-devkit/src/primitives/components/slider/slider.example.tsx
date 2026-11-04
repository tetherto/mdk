/**
 * Runnable example for Slider (Radix Slider re-export).
 */
import { useState } from 'react'
import { Slider } from '@tetherto/mdk-react-devkit'

export const SliderExample = () => {
  const [value, setValue] = useState([60])
  const [range, setRange] = useState([20, 80])
  const [fanOffset, setFanOffset] = useState([40])

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
          className="mdk-slider"
        >
          <Slider.Track className="mdk-slider__track">
            <Slider.Range className="mdk-slider__range" />
          </Slider.Track>
          <Slider.Thumb className="mdk-slider__thumb" aria-label="Fan speed" />
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
          className="mdk-slider"
        >
          <Slider.Track className="mdk-slider__track">
            <Slider.Range className="mdk-slider__range" />
          </Slider.Track>
          <Slider.Thumb className="mdk-slider__thumb" aria-label="Min hash rate" />
          <Slider.Thumb className="mdk-slider__thumb" aria-label="Max hash rate" />
        </Slider.Root>
      </div>

      <div>
        <p>Fan Curve Offset: {fanOffset[0]}%</p>
        {/* A vertical root fills its container's height, so give the container one */}
        <div className="mdk-example-tall">
          <Slider.Root
            value={fanOffset}
            onValueChange={setFanOffset}
            min={0}
            max={100}
            step={1}
            orientation="vertical"
            className="mdk-slider"
          >
            <Slider.Track className="mdk-slider__track">
              <Slider.Range className="mdk-slider__range" />
            </Slider.Track>
            <Slider.Thumb className="mdk-slider__thumb" aria-label="Fan curve offset" />
          </Slider.Root>
        </div>
      </div>
    </div>
  )
}
