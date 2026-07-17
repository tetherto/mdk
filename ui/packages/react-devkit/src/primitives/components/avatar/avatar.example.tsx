/**
 * Runnable example for Avatar.
 */
import { Avatar, AvatarFallback, AvatarImage } from '@tetherto/mdk-react-devkit'

export const AvatarExample = () => (
  <div className="mdk-example-row">
    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/40?img=1" alt="Alice" />
      <AvatarFallback>AL</AvatarFallback>
    </Avatar>

    <Avatar>
      <AvatarImage src="https://i.pravatar.cc/40?img=2" alt="Bob" />
      <AvatarFallback>BO</AvatarFallback>
    </Avatar>

    {/* Fallback shown when image fails to load */}
    <Avatar>
      <AvatarImage src="/broken-url.png" alt="Charlie" />
      <AvatarFallback>CH</AvatarFallback>
    </Avatar>
  </div>
)
