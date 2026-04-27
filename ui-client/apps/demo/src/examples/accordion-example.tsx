import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@mdk/core'
import React from 'react'

export const AccordionExample: React.FC = () => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Accordion</h2>
      {/* Basic Opened Accordion */}
      <section>
        <Accordion isOpened title="Basic Opened Accordion">
          This is a basic opened accordion. You can put any content here, such as text, lists, or
          even other components.
        </Accordion>
      </section>

      <section>
        <Accordion toggleIconPosition="right" title="Accordion (with right toggle icons)">
          This is a basic opened accordion. You can put any content here, such as text, lists, or
          even other components.
        </Accordion>
      </section>

      <section>
        <Accordion
          isOpened
          customLabel="2025-01-15 14:32"
          title="Accordion with custom label (timestamp)"
        >
          This accordion uses a custom label to display additional information, such as a date or
          status. You can customize the label to show any React node.
        </Accordion>
      </section>

      {/* Multiple Accordion */}
      <section style={{ marginTop: '2rem' }}>
        <Accordion title="Multiple Accordion">
          <AccordionItem value="faq-1">
            <AccordionTrigger>What is Bitcoin mining?</AccordionTrigger>
            <AccordionContent>
              Bitcoin mining is the process of creating new bitcoins by solving complex mathematical
              problems that verify transactions in the currency. When a bitcoin is successfully
              mined, the miner receives a predetermined amount of bitcoin.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-2">
            <AccordionTrigger>What equipment do I need?</AccordionTrigger>
            <AccordionContent>
              You'll need specialized hardware called ASIC miners (Application-Specific Integrated
              Circuits), a reliable power supply, adequate cooling systems, and a stable internet
              connection.
            </AccordionContent>
          </AccordionItem>
          <AccordionItem value="faq-3">
            <AccordionTrigger>How much does it cost to start mining?</AccordionTrigger>
            <AccordionContent>
              Initial costs vary widely depending on the scale of your operation. A single ASIC
              miner can cost between $2,000 to $10,000+, plus ongoing electricity costs which can be
              substantial.
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </section>
    </section>
  )
}
