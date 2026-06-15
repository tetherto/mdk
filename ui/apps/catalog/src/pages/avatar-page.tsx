import { Avatar, AvatarFallback, AvatarImage } from '@tetherto/mdk-react-devkit/core'

import type { JSX } from 'react'

export const AvatarPage = (): JSX.Element => {
  return (
    <section className="demo-section">
      <h2 className="demo-section__title">Avatar</h2>
      <div className="demo-section__avatars">
        <Avatar>
          <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
          <AvatarFallback>CN</AvatarFallback>
        </Avatar>
        <Avatar>
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    </section>
  )
}
