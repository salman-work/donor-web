import { CampaignForm } from '@/components/Form'
import PageClient from './page.client'

export default function Page() {
  return (
    <div>
      <PageClient />
      <CampaignForm formId="2" />
    </div>
  )
}
