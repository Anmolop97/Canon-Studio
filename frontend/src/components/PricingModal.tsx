import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pricing5, type PricingPlan } from './ui/pricing-5';
import { X } from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PLANS: PricingPlan[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for casual storytelling, exploration, and interactive fiction.',
    monthlyPrice: 0,
    yearlyPrice: 0,
    currency: '₹',
    features: [
      { name: '10 AI stories/day' },
      { name: '3 concept art generations/day' },
      { name: 'Basic branching games' }
    ],
    buttonText: 'Current Plan',
    buttonVariant: 'outline'
  },
  {
    id: 'pro',
    name: 'Master Pro',
    description: 'High-velocity serialized narrative intelligence with canon memory.',
    monthlyPrice: 299,
    yearlyPrice: 2999,
    currency: '₹',
    isPopular: true,
    badge: 'My pick',
    features: [
      { name: '150 AI story generations/month' },
      { name: '30 FLUX concept arts/month' },
      { name: 'Priority AI models' },
      { name: 'Deep canon consistency' },
      { name: 'Advanced branching' }
    ],
    buttonText: 'Upgrade to Master Pro',
    buttonVariant: 'default'
  },
  {
    id: 'pro-plus',
    name: 'Master Pro Plus',
    description: 'Unlimited narrative volume and full creative universe continuity.',
    monthlyPrice: 599,
    yearlyPrice: 5999,
    currency: '₹',
    badge: 'Ultimate Power',
    features: [
      { name: '500 AI story generations/month' },
      { name: '100 concept arts/month' },
      { name: 'Priority generation' },
      { name: 'Advanced lore management' }
    ],
    buttonText: 'Get Master Pro Plus',
    buttonVariant: 'default'
  }
];

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
    >
      <div className="relative w-full max-w-6xl max-h-[92vh] overflow-y-auto bg-studio-card border border-studio-border rounded-3xl p-5 sm:p-10 shadow-2xl text-studio-text my-auto">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-20 p-2.5 rounded-full text-studio-muted hover:text-studio-text hover:bg-studio-raised transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Close pricing modal"
        >
          <X className="w-5 h-5" />
        </button>

        <Pricing5
          heading="Transparent Creator Pricing"
          subheading="Choose the tier that matches your storytelling ambition."
          plans={PLANS}
        />
      </div>
    </div>,
    document.body
  );
}
