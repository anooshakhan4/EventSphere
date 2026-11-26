import { notFound } from 'next/navigation';
import { EVENTS, getEvent } from '@/lib/data';
import { SeatsView } from '@/components/event/SeatsView';

export const generateStaticParams = () => EVENTS.map((e) => ({ slug: e.slug }));

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();
  return <SeatsView event={event} />;
}
