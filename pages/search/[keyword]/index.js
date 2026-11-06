export { default } from '../index'
import { searchPageProps } from '@/lib/server/contentIndex'
export async function getStaticProps({ params, locale }) { return { props: { ...await searchPageProps(locale), initialQuery: params.keyword }, revalidate: process.env.EXPORT ? undefined : 300 } }
export function getStaticPaths() { return { paths: [], fallback: process.env.EXPORT ? false : 'blocking' } }
