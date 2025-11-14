'use client'
import React, { useMemo, useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
// small icons use emoji to avoid adding new dependencies

type Campaign = {
  id?: string
  title?: string
  goal?: number
  amountRaised?: number
  slug?: string
}

type Props = {
  campaign: Campaign
}

export default function DonationForm({ campaign }: Props) {
  const goal = Number(campaign.goal ?? 0)
  const raised = Number(campaign.amountRaised ?? 0)
  const remaining = Math.max(0, goal - raised)
  const slug = campaign.slug || 'unknown-campaign'

  const [frequency, setFrequency] = useState<'once' | 'monthly'>('once')
  const [selectedAmount, setSelectedAmount] = useState<number>(0)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [tipPercent, setTipPercent] = useState<number>(10)
  const [showCustomTip, setShowCustomTip] = useState(false)
  const [customTipAmount, setCustomTipAmount] = useState<number | ''>('')
  const [paymentMethod, setPaymentMethod] = useState<string>('paypal')
  const [dontDisplayName, setDontDisplayName] = useState(false)
  const [cardName, setCardName] = useState<string>('')

  // Stripe promise for Elements provider
  // Use NEXT_PUBLIC_STRIPE_PK so the publishable key is available in the browser bundle
  const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK || '')

  // Child component that handles card input and confirmation using the React Stripe wrapper
  function CardPayment({
    slugProp,
    selectedAmountProp,
    frequencyProp,
    tipOverride,
  }: {
    slugProp: string
    selectedAmountProp: number
    frequencyProp: 'once' | 'monthly'
    tipOverride?: number | ''
  }) {
    const stripe = useStripe()
    const elements = useElements()
    const [loadingCard, setLoadingCard] = useState(false)

    const handleCardDonate = async () => {
      if (!stripe || !elements) {
        alert('Payment system is not ready. Please try again.')
        return
      }

      if (!selectedAmountProp || selectedAmountProp <= 0) {
        alert('Please select or enter a donation amount')
        return
      }

      setLoadingCard(true)
      try {
        const tip =
          frequencyProp === 'monthly'
            ? selectedAmountProp * 0.05
            : typeof tipOverride === 'number'
              ? Number(tipOverride)
              : selectedAmountProp * (tipPercent / 100)
        const total = Number((selectedAmountProp + (tip || 0)).toFixed(2))

        // Create a PaymentIntent on the server
        const resp = await fetch('/api/payments/stripe/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total }),
        })
        const data = await resp.json()
        const clientSecret = data?.clientSecret
        if (!clientSecret) {
          alert('Failed to initialize card payment')
          return
        }

        const cardElement = elements.getElement(CardElement)
        if (!cardElement) {
          alert('Card input not found')
          return
        }

        const result = await stripe.confirmCardPayment(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: { name: cardName || undefined },
          },
        })

        if (result.error) {
          console.error(result.error)
          alert(result.error.message || 'Payment failed')
          return
        }

        if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
          // TODO: call server to persist donation or show success page
          window.location.href = `/campaign/${slugProp}`
          return
        }
        alert('Payment was not completed')
      } catch (err) {
        console.error(err)
        alert('Payment initialization failed')
      } finally {
        setLoadingCard(false)
      }
    }

    return (
      <div className="mt-3 space-y-2">
        <input
          placeholder="Name on card"
          className="w-full p-2 border rounded"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
        />
        <div className="p-2 border rounded bg-white">
          <CardElement options={{ hidePostalCode: true }} />
        </div>
        <div className="text-xs text-gray-500">Secure card input powered by Stripe.</div>
        <button
          onClick={handleCardDonate}
          disabled={loadingCard}
          className={`w-full py-3 rounded font-semibold ${loadingCard ? 'opacity-60 cursor-wait' : 'bg-primary text-white'}`}
        >
          Donate with Card
        </button>
      </div>
    )
  }

  // compute amounts buttons (6 values)
  const amounts = useMemo(() => {
    const freqMax = frequency === 'monthly' ? 1000 : 2000
    const maxCap = Math.min(remaining || freqMax, freqMax)
    const step = maxCap > 1000 ? 100 : 10
    // compute base so that 6 * base approximates maxCap
    const rawBase = Math.max(step, Math.ceil(maxCap / 6 / step) * step)
    const arr = Array.from({ length: 6 }, (_, i) => Math.min(maxCap, rawBase * (i + 1)))
    // ensure strictly increasing and unique
    return Array.from(new Set(arr)).map((n) => Math.round(n))
  }, [remaining, frequency])

  useEffect(() => {
    // reset selected when frequency changes
    setSelectedAmount(0)
    setSelectedIndex(null)
    setTipPercent(10)
    setShowCustomTip(false)
    setCustomTipAmount('')
    // set default payment methods
    setPaymentMethod(frequency === 'monthly' ? 'paypal' : 'paypal')
  }, [frequency])

  const selectAmount = (amount: number, index: number) => {
    setSelectedAmount(amount)
    setSelectedIndex(index)
  }

  const displayedTip =
    showCustomTip && customTipAmount !== ''
      ? Number(customTipAmount)
      : selectedAmount * (tipPercent / 100)

  const toastMessage = useMemo(() => {
    if (selectedIndex == null) return ''
    if (selectedIndex <= 2) return '🎉 You are in the top 5 contributors — thank you!'
    return '🏆 Top 1% contributor — incredible support!'
  }, [selectedIndex])

  const paymentOptions =
    frequency === 'monthly'
      ? ['paypal', 'bank', 'card']
      : ['paypal', 'venmo', 'googlepay', 'bank', 'card']

  const [loading, setLoading] = useState(false)

  const handleDonate = async () => {
    if (!selectedAmount || selectedAmount <= 0) {
      alert('Please select or enter a donation amount')
      return
    }
    setLoading(true)
    try {
      // compute total (simple): for monthly use 5% recurring fee, for once use tip
      const tip =
        frequency === 'monthly'
          ? selectedAmount * 0.05
          : showCustomTip && customTipAmount !== ''
            ? Number(customTipAmount)
            : selectedAmount * (tipPercent / 100)
      const total = Number((selectedAmount + (tip || 0)).toFixed(2))
      console.log('Initiating donation', { total, frequency, paymentMethod, slug })
      if (paymentMethod === 'paypal') {
        const resp = await fetch('/api/payments/paypal/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: total }),
        })
        const data = await resp.json()
        if (data?.url) {
          window.location.href = data.url
          return
        }
        alert('PayPal create failed')
      } else if (paymentMethod === 'card') {
        // Card payments are handled by the embedded Stripe CardPayment component.
        alert('Please complete payment using the card form below.')
      } else {
        alert('Payment method not yet implemented for this provider')
      }
    } catch (e) {
      console.error(e)
      alert('Payment initialization failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full flex justify-center py-8">
      <div className="w-full max-w-2xl bg-white rounded-lg shadow p-6">
        {/* Row 1: two columns 20% / 80% */}
        <div className="flex items-center mb-4">
          <div className="w-1/5 flex items-center justify-center">
            {/* circular percent */}
            <svg viewBox="0 0 36 36" className="w-16 h-16">
              <path
                d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831"
                fill="none"
                stroke="#eee"
                strokeWidth="3.5"
              />
              <path
                d="M18 2.0845a15.9155 15.9155 0 1 1 0 31.831"
                fill="none"
                stroke="#10b981"
                strokeWidth="3.5"
                strokeDasharray={`${Math.min(100, Math.round((raised / (goal || 1)) * 100))}, 100`}
                strokeLinecap="round"
              />
              <text x="18" y="20" textAnchor="middle" fontSize="6" fill="#111">
                {goal > 0 ? Math.min(100, Math.round((raised / goal) * 100)) : '0'}%
              </text>
            </svg>
          </div>
          <div className="w-4/5 pl-4">
            <div className="text-lg font-bold">{campaign.title}</div>
          </div>
        </div>

        {/* Row 2 */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700">{`Amount left: $${remaining.toLocaleString()}`}</div>
          <div className="text-sm text-gray-500">
            Help get the momentum going — every gift matters.
          </div>
        </div>

        {/* Row 3: frequency buttons */}
        <div className="mb-3 flex gap-3">
          <button
            onClick={() => setFrequency('once')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${frequency === 'once' ? 'bg-primary text-white' : 'border'}`}
          >
            <span aria-hidden>⚡</span> Give once
          </button>
          <button
            onClick={() => setFrequency('monthly')}
            className={`flex items-center gap-2 px-4 py-2 rounded ${frequency === 'monthly' ? 'bg-primary text-white' : 'border'}`}
          >
            <span aria-hidden>🗓️</span> Monthly
          </button>
        </div>

        {/* Row 4: boost message */}
        <div className="mb-4 text-center text-sm text-gray-700">
          <div className="inline-block">
            Boost your impact by giving monthly{' '}
            <span className="inline-block transform rotate-12">↗</span>
          </div>
        </div>

        {/* Row 5: amount buttons */}
        <div className="mb-3 grid grid-cols-3 gap-2">
          {amounts.map((a, i) => (
            <button
              key={a}
              onClick={() => selectAmount(a, i)}
              className={`px-3 py-2 rounded border ${selectedAmount === a ? 'bg-primary text-white' : ''}`}
            >
              ${a}
            </button>
          ))}
        </div>

        {/* Row 6: currency + input */}
        <div className="mb-3 flex items-center gap-3">
          <div className="text-lg font-semibold">$ USD</div>
          <input
            value={selectedAmount || ''}
            readOnly
            className="flex-1 text-2xl font-bold text-right p-2 border rounded"
          />
        </div>

        {/* Row 7: toast */}
        {selectedIndex !== null && (
          <div className="mb-3 p-3 bg-green-50 text-green-800 rounded">{toastMessage}</div>
        )}

        {/* Tip / slider for Give once */}
        {frequency === 'once' && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Tip ({tipPercent}%)</div>
              <div className="text-sm text-gray-600">
                {displayedTip ? `$${Number(displayedTip).toFixed(2)}` : '$0.00'}
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={25}
              value={tipPercent}
              onChange={(e) => setTipPercent(Number(e.target.value))}
              className="w-full"
            />
            <div className="mt-2">
              <button
                className="text-sm text-blue-600 underline"
                onClick={() => setShowCustomTip((s) => !s)}
              >
                Custom tip
              </button>
              {showCustomTip && (
                <div className="mt-2 flex items-center gap-2">
                  <span>$</span>
                  <input
                    type="number"
                    value={customTipAmount}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setCustomTipAmount(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="p-2 border rounded w-32"
                  />
                </div>
              )}
            </div>
            <div className="mt-2 text-sm">
              {(showCustomTip && customTipAmount === '') || tipPercent === 0 ? (
                <div className="text-red-600">
                  Please consider leaving a tip to support this campaign.
                </div>
              ) : (
                <div className="text-green-600">Thank you for your generosity.</div>
              )}
            </div>
          </div>
        )}

        {/* Payment options */}
        <div className="mb-3">
          <div className="text-sm font-semibold mb-2">Payment Options</div>
          <div className="space-y-2">
            {paymentOptions.map((opt) => (
              <label key={opt} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="payment"
                  value={opt}
                  checked={paymentMethod === opt}
                  onChange={() => setPaymentMethod(opt)}
                />
                <span className="capitalize">{opt}</span>
              </label>
            ))}
          </div>

          {/* credit card fields (Stripe Elements) */}
          {paymentMethod === 'card' && (
            <Elements stripe={stripePromise}>
              <CardPayment
                slugProp={slug}
                selectedAmountProp={selectedAmount}
                frequencyProp={frequency}
                tipOverride={showCustomTip && customTipAmount !== '' ? customTipAmount : ''}
              />
            </Elements>
          )}
        </div>

        {/* Dont display my name */}
        <div className="mb-3 flex items-center gap-2">
          <input
            type="checkbox"
            id="anon"
            checked={dontDisplayName}
            onChange={(e) => setDontDisplayName(e.target.checked)}
          />
          <label htmlFor="anon">Do not display my name</label>
          <button className="text-sm text-gray-500 ml-2">i</button>
        </div>

        {/* Summary */}
        <div className="mb-3 border-t pt-3">
          <div className="text-sm font-semibold">Your donations</div>
          <div className="flex justify-between mt-2">
            <div>Your donation</div>
            <div>${selectedAmount.toFixed(2)}</div>
          </div>
          <div className="flex justify-between mt-1">
            <div>{frequency === 'monthly' ? 'Recurring fee (5%)' : 'Tip'}</div>
            <div>
              $
              {(frequency === 'monthly'
                ? selectedAmount * 0.05
                : displayedTip
                  ? Number(displayedTip)
                  : 0
              ).toFixed(2)}
            </div>
          </div>
          <div className="flex justify-between mt-1 font-bold">
            <div>Total due today</div>
            <div>
              $
              {(
                selectedAmount +
                (frequency === 'monthly'
                  ? selectedAmount * 0.05
                  : displayedTip
                    ? Number(displayedTip)
                    : 0)
              ).toFixed(2)}
            </div>
          </div>
          {frequency === 'monthly' && (
            <div className="text-xs text-gray-600 mt-2">
              By selecting monthly you agree to recurring charges until cancelled.{' '}
              <a className="underline">Terms</a>
            </div>
          )}
        </div>

        {/* Donate button for non-card methods (card handled by CardPayment) */}
        {paymentMethod !== 'card' && (
          <div className="mb-3">
            <button
              onClick={handleDonate}
              disabled={loading}
              className={`w-full py-3 rounded font-semibold ${loading ? 'opacity-60 cursor-wait' : 'bg-primary text-white'}`}
            >
              {paymentMethod === 'paypal'
                ? 'Pay via PayPal'
                : paymentMethod === 'bank'
                  ? 'Donate (Bank transfer)'
                  : 'Donate'}
            </button>
          </div>
        )}

        <hr className="my-3 border-gray-200" />
        <div className="text-xs text-gray-600">
          You will be eligible for a refund in case of rare fraud up to one year.{' '}
          <a className="underline">Terms & Conditions</a>
        </div>
      </div>
    </div>
  )
}
