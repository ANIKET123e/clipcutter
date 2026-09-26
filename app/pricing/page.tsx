import Link from 'next/link';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const plans = [
  {
    name: 'Free',
    price: '$0',
    features: ['Uploads up to the free file-size limit', 'Shorter max clip duration', 'Up to 1080p', 'One job at a time', '10 jobs / day']
  },
  {
    name: 'Premium',
    price: '$12/mo',
    features: ['Much larger uploads', 'Longer max clip duration', 'Up to 8K resolution', 'Multiple concurrent jobs', 'Higher daily job limit', 'Higher API rate limits']
  }
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-grid-glow px-6 py-16">
      <div className="max-w-3xl mx-auto text-center mb-12">
        <h1 className="font-display text-3xl font-semibold">Simple, transparent pricing</h1>
        <p className="text-zinc-400 mt-3">Start free. Upgrade when you need bigger files or longer clips.</p>
      </div>
      <div className="max-w-2xl mx-auto grid sm:grid-cols-2 gap-6">
        {plans.map((plan) => (
          <Card key={plan.name} className={plan.name === 'Premium' ? 'border-accent-violet/40' : ''}>
            <h2 className="font-display text-xl font-semibold">{plan.name}</h2>
            <p className="text-2xl font-display mt-2">{plan.price}</p>
            <ul className="mt-5 space-y-2 text-sm text-zinc-300">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-accent-blue mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link href="/register" className="block mt-6">
              <Button className="w-full" variant={plan.name === 'Premium' ? 'primary' : 'secondary'}>
                {plan.name === 'Premium' ? 'Upgrade' : 'Start free'}
              </Button>
            </Link>
          </Card>
        ))}
      </div>
      <p className="text-center text-xs text-zinc-500 mt-10">
        Billing is powered by Stripe. Premium upgrades will be available once billing is enabled for your account.
      </p>
    </div>
  );
}
