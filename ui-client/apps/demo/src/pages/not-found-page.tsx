import { useNavigate } from 'react-router-dom'
import { NotFoundPage as NotFoundPageComponent } from '@tetherto/mdk-core-ui'

/**
 * 404 Page - handles all unmatched routes
 */
export const NotFoundPage = (): JSX.Element => {
  const navigate = useNavigate()

  const handleGoHome = (): void => {
    navigate('/')
  }

  return <NotFoundPageComponent onGoHome={handleGoHome} />
}
