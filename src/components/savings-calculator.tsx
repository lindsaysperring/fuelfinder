interface SavingsCalculatorProps {
  basePrice: number;
  bestPrice: number;
  distance: number;
  travelCost: number;
  averageRefillLiters?: number;
}

export function SavingsCalculator({
  basePrice,
  bestPrice,
  distance,
  travelCost,
  averageRefillLiters = 40 // Default tank fill amount
}: SavingsCalculatorProps) {
  const baseCost = basePrice * averageRefillLiters;
  const totalCostWithTravel = bestPrice * averageRefillLiters + travelCost;
  const savings = baseCost - totalCostWithTravel;

  if (savings <= 0) return null;

  return (
    <div className='mt-4 rounded-lg bg-green-50 p-3 dark:bg-green-900/20'>
      <h3 className='text-sm font-medium text-green-800 dark:text-green-300'>
        Potential Savings
      </h3>
      <p className='text-sm text-green-700 dark:text-green-400'>
        You could save ${savings.toFixed(2)} on a {averageRefillLiters}L fill
        {distance > 0 && (
          <span> (including {distance.toFixed(1)}km travel cost)</span>
        )}
      </p>
    </div>
  );
}
