import { fetchGlobalAllData } from '@/lib/db/SiteDataApi'
import { sanitizeClientProps } from '@/lib/utils/publicData'

export async function readerPageProps({ locale }) {
  const data = await fetchGlobalAllData({ from: 'reader-tools', locale })
  if (data.dataError) throw new Error('Content source unavailable')
  return {
    props: sanitizeClientProps(data),
    revalidate: process.env.EXPORT ? undefined : 300
  }
}
