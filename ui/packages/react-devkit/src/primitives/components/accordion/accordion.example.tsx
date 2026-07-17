/**
 * Runnable example for Accordion.
 */
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionRoot,
  AccordionTrigger,
} from '@tetherto/mdk-react-devkit'

export const AccordionExample = () => (
  <div className="mdk-example-col">
    <Accordion title="Basic Accordion" isOpened>
      <p>Collapsed/expanded content goes here. Supports any React node as children.</p>
    </Accordion>

    <Accordion title="Solid Background" solidBackground>
      <p>This variant uses a solid background for the accordion panel.</p>
    </Accordion>

    <AccordionRoot type="multiple">
      <AccordionItem value="item-1">
        <AccordionTrigger toggleIconPosition="right">Custom trigger position</AccordionTrigger>
        <AccordionContent>
          <p>Content for item 1 using low-level Accordion primitives.</p>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="item-2">
        <AccordionTrigger>Another section</AccordionTrigger>
        <AccordionContent>
          <p>Content for item 2.</p>
        </AccordionContent>
      </AccordionItem>
    </AccordionRoot>
  </div>
)
